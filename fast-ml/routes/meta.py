"""
DealFlow360 - Health and Metadata Routes
Exposes GET /health and GET /api/v1/ml/models endpoints.
"""

from flask import Blueprint, jsonify
from services.classifier_service import classifier_service
from services.regressor_service import regressor_service

meta_bp = Blueprint("meta_bp", __name__)


@meta_bp.route("/health", methods=["GET"])
def health_check():
    """
    Health check endpoint returning system status and model readiness.
    """
    clf_loaded = classifier_service.is_loaded()
    reg_loaded = regressor_service.is_loaded()
    all_healthy = clf_loaded and reg_loaded

    status_str = "healthy" if all_healthy else "degraded"
    status_code = 200 if all_healthy else 503

    return jsonify({
        "status": status_str,
        "service": "dealflow360-ml-api",
        "classifier_loaded": clf_loaded,
        "regressor_loaded": reg_loaded
    }), status_code


@meta_bp.route("/api/v1/ml/models", methods=["GET"])
def get_models_info():
    """
    Returns metadata about all registered ML models in DealFlow360.
    """
    clf_meta = classifier_service.get_metadata() or {}
    reg_meta = regressor_service.get_metadata() or {}

    return jsonify({
        "classifier": {
            "name": clf_meta.get("model_name", "discount_risk_classifier"),
            "algorithm": clf_meta.get("algorithm", "XGBoost Classifier"),
            "target": clf_meta.get("target", "risk_label"),
            "loaded": classifier_service.is_loaded()
        },
        "regressor": {
            "name": reg_meta.get("model_name", "discount_recommendation_regressor"),
            "algorithm": reg_meta.get("algorithm", "XGBoost Regressor"),
            "target": reg_meta.get("target", "recommended_discount_percent"),
            "loaded": regressor_service.is_loaded()
        }
    }), 200
