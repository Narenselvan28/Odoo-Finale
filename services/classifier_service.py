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

        # Validate input schema
        sanitized_data = validate_inference_request(data, self.metadata)

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
