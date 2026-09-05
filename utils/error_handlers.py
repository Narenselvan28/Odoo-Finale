"""
DealFlow360 - Error Handlers and Custom Exceptions
Provides unified error JSON formatting and HTTP status mapping.
"""

import logging
from flask import jsonify

logger = logging.getLogger(__name__)


class APIException(Exception):
    """Base exception for API errors."""

    def __init__(self, message, status_code=400, error_code="API_ERROR", details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details

    def to_dict(self):
        error_dict = {
            "code": self.error_code,
            "message": self.message
        }
        if self.details:
            error_dict["details"] = self.details
        return {
            "success": false if False else False,
            "error": error_dict
        }


class MissingFeatureError(APIException):
    """Raised when one or more required features are missing (HTTP 400)."""

    def __init__(self, feature_name):
        super().__init__(
            message=f"Missing required feature: {feature_name}",
            status_code=400,
            error_code="MISSING_FEATURE",
            details={"missing_feature": feature_name}
        )


class InvalidFeatureValueError(APIException):
    """Raised when a feature value or type is invalid (HTTP 422)."""

    def __init__(self, feature_name, reason=None):
        msg = f"Invalid value for feature '{feature_name}'"
        if reason:
            msg += f": {reason}"
        super().__init__(
            message=msg,
            status_code=422,
            error_code="INVALID_FEATURE_VALUE",
            details={"feature": feature_name, "reason": reason}
        )


class ModelUnavailableError(APIException):
    """Raised when requested model file or pipeline is not loaded (HTTP 503)."""

    def __init__(self, model_name):
        super().__init__(
            message=f"Model '{model_name}' is currently unavailable or failed to load.",
            status_code=503,
            error_code="MODEL_UNAVAILABLE",
            details={"model": model_name}
        )


class PredictionError(APIException):
    """Raised when internal model inference fails (HTTP 500)."""

    def __init__(self, message="An error occurred during model prediction."):
        super().__init__(
            message=message,
            status_code=500,
            error_code="PREDICTION_ERROR"
        )


def register_error_handlers(app):
    """Registers standard error handlers on the Flask app."""

    @app.errorhandler(APIException)
    def handle_api_exception(error):
        logger.warning(f"APIException [{error.status_code}] ({error.error_code}): {error.message}")
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    @app.errorhandler(400)
    def handle_bad_request(error):
        logger.warning(f"HTTP 400 Bad Request: {error}")
        response = jsonify({
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": getattr(error, "description", "Malformed request or invalid JSON.")
            }
        })
        response.status_code = 400
        return response

    @app.errorhandler(404)
    def handle_not_found(error):
        response = jsonify({
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": "The requested endpoint was not found on this server."
            }
        })
        response.status_code = 404
        return response

    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        response = jsonify({
            "success": False,
            "error": {
                "code": "METHOD_NOT_ALLOWED",
                "message": "HTTP method not allowed for this endpoint."
            }
        })
        response.status_code = 405
        return response

    @app.errorhandler(Exception)
    def handle_unexpected_exception(error):
        # Server-side logging with traceback without leaking internal traceback to client
        logger.exception(f"Unhandled Server Error: {error}")
        response = jsonify({
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred."
            }
        })
        response.status_code = 500
        return response
