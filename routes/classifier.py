"""
DealFlow360 - Discount Risk Classifier Route
Exposes the POST /api/v1/ml/discount-risk endpoint.
"""

from flask import Blueprint, request, jsonify
from services.classifier_service import classifier_service
from utils.error_handlers import APIException

classifier_bp = Blueprint("classifier_bp", __name__)


@classifier_bp.route("/api/v1/ml/discount-risk", methods=["POST"])
def predict_discount_risk():
    """
    Classifies the risk level (NORMAL or HIGH) and returns the risk probability percentage.
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

    result = classifier_service.predict_risk(payload)
    return jsonify(result), 200
