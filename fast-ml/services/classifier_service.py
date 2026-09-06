"""
DealFlow360 - Discount Risk Classifier Service
Loads the trained XGBoost Classifier pipeline and performs risk inference.
"""

import os
import json
import logging
import joblib
from utils.error_handlers import ModelUnavailableError, PredictionError
from utils.validation import validate_inference_request
from utils.preprocessing import prepare_input_dataframe

logger = logging.getLogger(__name__)


class ClassifierService:
    """Service to manage model loading and prediction for Discount Risk."""

    def __init__(self, model_dir=None):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.model_dir = model_dir or os.path.join(base_dir, "models")
        self.model_path = os.path.join(self.model_dir, "discount_risk_classifier.pkl")
        self.metadata_path = os.path.join(self.model_dir, "classifier_features.json")
        self.model = None
        self.metadata = None
        self.load_model()

    def load_model(self):
        """Loads model pipeline and metadata from disk."""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.metadata_path):
                logger.info(f"Loading classifier pipeline from: {self.model_path}")
                self.model = joblib.load(self.model_path)
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                logger.info("Discount Risk Classifier pipeline and metadata successfully loaded.")
            else:
                logger.error(f"Classifier files missing in {self.model_dir}")
                self.model = None
                self.metadata = None
        except Exception as e:
            logger.exception(f"Failed to load classifier model: {e}")
            self.model = None
            self.metadata = None

    def is_loaded(self):
        """Checks whether the classifier model is loaded and ready."""
        return self.model is not None and self.metadata is not None

    def get_metadata(self):
        """Returns model metadata or None."""
        return self.metadata

    def _normalize_payload(self, data):
        """Maps common quotation aliases and infers derived features."""
        if not isinstance(data, dict):
            return data
        payload = dict(data)

        # Aliases mapping
        if "category" not in payload and "product_category" in payload:
            payload["category"] = payload["product_category"]
        if "price" not in payload and "base_price" in payload:
            payload["price"] = payload["base_price"]
        if "discount_percent" not in payload and "discount" in payload:
            payload["discount_percent"] = payload["discount"]
        elif "discount_percent" not in payload and "current_discount_percent" in payload:
            payload["discount_percent"] = payload["current_discount_percent"]

        # Only derive secondary numeric metrics if primary inputs are present
        if "quantity" in payload and "price" in payload:
            try:
                qty = float(payload["quantity"])
                price = float(payload["price"])
                order_val = qty * price
                payload.setdefault("order_value", order_val)
                payload.setdefault("freight_value", 50.0)
                payload.setdefault("gross_order_value", order_val + 50.0)

                disc_pct = float(payload.get("discount_percent", 10.0))
                disc_amt = (order_val * disc_pct) / 100.0
                payload.setdefault("discount_amount", disc_amt)
                payload.setdefault("net_sales", order_val - disc_amt)
                payload.setdefault("product_cost", price * 0.65)
                payload.setdefault("margin_before_discount", price * 0.35 * qty)
                payload.setdefault("margin_after_discount", (price * 0.35 * qty) - disc_amt)
                payload.setdefault("payment_value", order_val - disc_amt)
            except Exception:
                pass

        # Fill in secondary defaults if missing
        secondary_defaults = {
            "customer_state": "SP",
            "seller_state": "SP",
            "customer_avg_discount": 10.0,
            "product_avg_discount": 10.0,
            "customer_product_avg_discount": 10.0,
            "recommended_discount_percent": 12.0,
            "discount_gap_percent": 0.0,
            "warehouse_count": 1.0,
            "available_stock": 500.0,
            "reserved_stock": 50.0,
            "warehouse_capacity": 1000.0,
            "stock_pressure": 0.5,
            "warehouse_utilization": 0.6,
            "transport_distance_km": 120.0,
            "transport_cost": 100.0,
            "expected_delivery_days": 4.0,
            "margin_percent": 20.0,
            "customer_transaction_count": 5.0,
            "customer_previous_orders": 5.0,
            "product_transaction_count": 20.0,
            "product_previous_orders": 20.0,
            "actual_delivery_days": 4.0,
            "estimated_delivery_days": 4.0,
            "delivery_delay_days": 0.0,
            "payment_installments": 1.0,
            "payment_type": "credit_card",
            "review_score": 4.5,
        }
        for k, v in secondary_defaults.items():
            payload.setdefault(k, v)

        return payload

    def predict_risk(self, data):
        """
        Validates input and performs risk prediction using the loaded model.

        Args:
            data (dict): Request payload dictionary.

        Returns:
            dict: Structured prediction response.
        """
        if not self.is_loaded():
            raise ModelUnavailableError(model_name="discount_risk_classifier")

        normalized_data = self._normalize_payload(data)

        # Validate input schema
        sanitized_data = validate_inference_request(normalized_data, self.metadata)

        # Prepare DataFrame in exact training feature order
        feature_order = self.metadata.get("feature_order", [])
        input_df = prepare_input_dataframe(sanitized_data, feature_order)

        try:
            # Predict probabilities
            probabilities = self.model.predict_proba(input_df)[0]
            high_risk_prob = float(probabilities[1])
            risk_percentage = round(high_risk_prob * 100, 2)

            # Determine risk label and category
            raw_label = int(self.model.predict(input_df)[0])
            risk_label = 1 if high_risk_prob >= 0.5 else 0
            risk_category = "HIGH" if risk_label == 1 else "NORMAL"

            return {
                "success": True,
                "model": "discount_risk_classifier",
                "prediction": {
                    "risk_label": risk_label,
                    "risk_category": risk_category,
                    "risk_percentage": risk_percentage
                }
            }
        except Exception as e:
            logger.exception(f"Classifier prediction failed: {e}")
            raise PredictionError(message=f"Risk classification failed: {str(e)}")


# Singleton instance for the application
classifier_service = ClassifierService()
