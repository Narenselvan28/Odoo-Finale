"""
DealFlow360 - Next Action Prediction Engine
Model Manager (Singleton Cache & Lifecycle)
Loads trained ML pipeline once at startup and manages inference and retraining.
"""

import json
import logging
from pathlib import Path
import joblib

from config import Config
from ml.predict import predict_next_actions
from ml.train import train_next_action_model

logger = logging.getLogger(__name__)


class ModelManager:
    """Manages the lifecycle of the Next Action ML Model."""

    def __init__(self):
        self.model = None
        self.feature_encoder = None
        self.label_encoder = None
        self.metadata = None
        self.load_model()

    def load_model(self):
        """Loads model artifacts from disk."""
        try:
            if Config.MODEL_FILE.exists() and Config.FEATURE_ENCODER_FILE.exists() and Config.LABEL_ENCODER_FILE.exists():
                logger.info(f"Loading Next Action model from {Config.MODEL_FILE}")
                self.model = joblib.load(Config.MODEL_FILE)
                self.feature_encoder = joblib.load(Config.FEATURE_ENCODER_FILE)
                self.label_encoder = joblib.load(Config.LABEL_ENCODER_FILE)

                if Config.MODEL_METADATA_JSON.exists():
                    with open(Config.MODEL_METADATA_JSON, "r", encoding="utf-8") as f:
                        self.metadata = json.load(f)
                else:
                    self.metadata = {"model_name": "NextActionClassifier", "version": "1.0"}

                logger.info("Next Action Prediction ML model loaded successfully.")
            else:
                logger.warning("Next Action model files not found on disk. Training required.")
                self.model = None
        except Exception as e:
            logger.exception(f"Failed to load Next Action model: {e}")
            self.model = None

    def is_loaded(self):
        """Checks if model is ready for inference."""
        return self.model is not None and self.feature_encoder is not None and self.label_encoder is not None

    def get_status(self):
        """Returns metadata status of the model."""
        if not self.is_loaded():
            return {
                "model_loaded": False,
                "message": "Model not loaded. Please train first."
            }
        
        return {
            "model_loaded": True,
            "model_name": self.metadata.get("model_name", "NextActionClassifier"),
            "model_version": self.metadata.get("version", "1.0"),
            "trained_at": self.metadata.get("trained_at", "N/A"),
            "training_samples": self.metadata.get("training_samples", 0),
            "test_samples": self.metadata.get("test_samples", 0),
            "metrics": self.metadata.get("metrics", {})
        }

    def predict(self, recent_actions, top_k=3):
        """Executes next action prediction for given sequence."""
        if not self.is_loaded():
            raise RuntimeError("ML model is not loaded.")
        return predict_next_actions(self.model, self.feature_encoder, self.label_encoder, recent_actions, top_k=top_k)

    def retrain(self):
        """Triggers model retraining and reloads artifacts."""
        metrics = train_next_action_model()
        self.load_model()
        return metrics


# Singleton instance
model_manager = ModelManager()
