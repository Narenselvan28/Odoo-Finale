"""
DealFlow360 - Recommended Discount Regressor Service
Loads the trained XGBoost Regressor pipeline and performs discount recommendation inference.
Handles fields for:
- Discount (requested, historical, tier bounds)
- Delivery date (lead time days, expedited status)
- Quantity (order volume, order value)
- Optional services (service type, count, fee)
- Selected products (category, tier, price, price band)
"""

import os
import json
import logging
import joblib
from utils.error_handlers import ModelUnavailableError, PredictionError
from utils.validation import validate_inference_request
from utils.preprocessing import prepare_input_dataframe

logger = logging.getLogger(__name__)


class RegressorService:
    """Service to manage model loading and prediction for Recommended Discount."""

    def __init__(self, model_dir=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.model_dir = model_dir or os.path.join(base_dir, "models")
        self.model_path = os.path.join(self.model_dir, "discount_recommendation_regressor.pkl")
        self.metadata_path = os.path.join(self.model_dir, "regressor_features.json")
        self.model = None
        self.metadata = None
        self.load_model()

    def load_model(self):
        """Loads model pipeline and metadata from disk."""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.metadata_path):
                logger.info(f"Loading regressor pipeline from: {self.model_path}")
                self.model = joblib.load(self.model_path)
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                logger.info("Discount Recommendation Regressor pipeline and metadata successfully loaded.")
            else:
                logger.error(f"Regressor files missing in {self.model_dir}")
                self.model = None
                self.metadata = None
        except Exception as e:
            logger.exception(f"Failed to load regressor model: {e}")
            self.model = None
            self.metadata = None

    def is_loaded(self):
        """Checks whether the regressor model is loaded and ready."""
        return self.model is not None and self.metadata is not None

    def get_metadata(self):
        """Returns model metadata or None."""
        return self.metadata

    def _normalize_payload(self, data):
        """Maps common quotation aliases and infers derived features."""
        if not isinstance(data, dict):
            return data
        payload = dict(data)

        # Delivery date aliases
        if "delivery_lead_time_days" not in payload:
            if "required_delivery_days" in payload:
                payload["delivery_lead_time_days"] = payload["required_delivery_days"]
            elif "delivery_days" in payload:
                payload["delivery_lead_time_days"] = payload["delivery_days"]
            elif "expected_delivery_days" in payload:
                payload["delivery_lead_time_days"] = payload["expected_delivery_days"]

        # Product & Price aliases
        if "price" not in payload and "base_price" in payload:
            payload["price"] = payload["base_price"]
        if "category" not in payload and "product_category" in payload:
            payload["category"] = payload["product_category"]

        # Discount aliases
        if "requested_discount_percent" not in payload:
            if "discount_percent" in payload:
                payload["requested_discount_percent"] = payload["discount_percent"]
            elif "current_discount_percent" in payload:
                payload["requested_discount_percent"] = payload["current_discount_percent"]

        if "customer_avg_previous_discount" not in payload and "customer_avg_discount" in payload:
            payload["customer_avg_previous_discount"] = payload["customer_avg_discount"]
        if "product_avg_previous_discount" not in payload and "product_avg_discount" in payload:
            payload["product_avg_previous_discount"] = payload["product_avg_discount"]

        # Derived fields if missing
        if "order_value" not in payload and "quantity" in payload and "price" in payload:
            try:
                payload["order_value"] = float(payload["quantity"]) * float(payload["price"])
            except Exception:
                pass

        if "is_expedited_delivery" not in payload and "delivery_lead_time_days" in payload:
            try:
                payload["is_expedited_delivery"] = 1.0 if float(payload["delivery_lead_time_days"]) <= 3.0 else 0.0
            except Exception:
                pass

        if "tier_discount" not in payload and "customer_tier" in payload:
            tier = str(payload["customer_tier"]).upper()
            tier_base = {"STANDARD": 5.0, "SILVER": 8.0, "GOLD": 12.0, "PLATINUM": 16.0}
            payload["tier_discount"] = tier_base.get(tier, 5.0)

        if "tier_max_discount" not in payload and "customer_tier" in payload:
            tier = str(payload["customer_tier"]).upper()
            tier_max = {"STANDARD": 12.0, "SILVER": 18.0, "GOLD": 24.0, "PLATINUM": 30.0}
            payload["tier_max_discount"] = tier_max.get(tier, 15.0)

        if "price_band" not in payload and "price" in payload:
            try:
                p = float(payload["price"])
                if p <= 15:
                    payload["price_band"] = "LOW"
                elif p <= 50:
                    payload["price_band"] = "MEDIUM"
                elif p <= 150:
                    payload["price_band"] = "HIGH"
                else:
                    payload["price_band"] = "PREMIUM"
            except Exception:
                pass

        return payload

    def predict_discount(self, data):
        """
        Validates input and performs discount recommendation using the loaded model.

        Args:
            data (dict): Request payload dictionary.

        Returns:
            dict: Structured prediction response.
        """
        if not self.is_loaded():
            raise ModelUnavailableError(model_name="discount_recommendation_regressor")

        # Normalize aliases and derive standard features
        normalized_data = self._normalize_payload(data)

        # Validate input schema
        sanitized_data = validate_inference_request(normalized_data, self.metadata)

        # Prepare DataFrame in exact training feature order
        feature_order = self.metadata.get("feature_order", [])
        input_df = prepare_input_dataframe(sanitized_data, feature_order)

        try:
            # Predict raw recommended discount percent
            raw_prediction = float(self.model.predict(input_df)[0])

            # Apply safety boundary [0.0, 100.0]
            bounded_discount = max(0.0, min(100.0, raw_prediction))
            recommended_discount_percent = round(bounded_discount, 2)

            return {
                "success": True,
                "model": "discount_recommendation_regressor",
                "prediction": {
                    "recommended_discount_percent": recommended_discount_percent
                }
            }
        except Exception as e:
            logger.exception(f"Regressor prediction failed: {e}")
            raise PredictionError(message=f"Discount recommendation failed: {str(e)}")


# Singleton instance for the application
regressor_service = RegressorService()
