"""
DealFlow360 - Recommended Discount Regressor Service
Loads the trained XGBoost Regressor pipeline and performs discount recommendation inference.
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

        # Validate input schema
        sanitized_data = validate_inference_request(data, self.metadata)

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
