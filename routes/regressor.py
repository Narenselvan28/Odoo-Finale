"""
DealFlow360 - Recommended Discount Regressor Route
Exposes the POST /api/v1/ml/recommended-discount endpoint.
"""

from flask import Blueprint, request, jsonify
from services.regressor_service import regressor_service
from utils.error_handlers import APIException

regressor_bp = Blueprint("regressor_bp", __name__)


@regressor_bp.route("/api/v1/ml/recommended-discount", methods=["POST"])
def predict_recommended_discount():
    """
    Predicts the optimal recommended discount percentage using the trained XGBoost Regressor.
    """
    if not request.is_json:
        raise APIException(
            message="Request content-type must be application/json.",
            status_code=400,
            error_code="INVALID_CONTENT_TYPE"
        )

    payload = request.get_json(silent=True)
    if payload is None:
        raise APIException(
            message="Malformed or empty JSON body.",
            status_code=400,
            error_code="INVALID_JSON"
        )

    result = regressor_service.predict_discount(payload)
    return jsonify(result), 200
