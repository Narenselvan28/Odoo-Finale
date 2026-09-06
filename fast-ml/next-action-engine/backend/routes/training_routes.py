"""
DealFlow360 - Next Action Prediction Engine
Model Status & Training Routes
"""

from flask import Blueprint, jsonify
from ml.model_manager import model_manager

training_bp = Blueprint("training_bp", __name__)


@training_bp.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "dealflow360-next-action-engine",
        "model_loaded": model_manager.is_loaded()
    }), 200


@training_bp.route("/api/model/status", methods=["GET"])
def get_model_status():
    """Returns model status and evaluation metrics."""
    status = model_manager.get_status()
    return jsonify(status), 200


@training_bp.route("/api/model/train", methods=["POST"])
def retrain_model():
    """Triggers model retraining from historical dataset."""
    try:
        metrics = model_manager.retrain()
        return jsonify({
            "success": True,
            "message": "Model retrained and reloaded successfully",
            "metrics": metrics
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
