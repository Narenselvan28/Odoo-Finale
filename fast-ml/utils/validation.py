"""
DealFlow360 - Request Payload Validation
Validates presence, schema, and types of inference request payloads.
"""

from utils.error_handlers import (
    APIException,
    MissingFeatureError,
    InvalidFeatureValueError
)


def validate_inference_request(payload, feature_metadata):
    """
    Validates the incoming JSON payload against the model's feature metadata.

    Args:
        payload (dict): Incoming JSON request body.
        feature_metadata (dict): Feature schema loaded from model's features JSON.

    Returns:
        dict: Sanitized dictionary of validated features.

    Raises:
        APIException: If JSON is invalid, missing required fields, or has invalid data types.
    """
    if not isinstance(payload, dict):
        raise APIException(
            message="Request body must be a valid JSON object.",
            status_code=400,
            error_code="INVALID_JSON"
        )

    required_features = feature_metadata.get("feature_order", [])
    categorical_features = set(feature_metadata.get("categorical_features", []))
    numerical_features = set(feature_metadata.get("numerical_features", []))

    # Check for missing features
    for feature in required_features:
        if feature not in payload:
            raise MissingFeatureError(feature_name=feature)

    sanitized_features = {}

    # Validate each feature type and value
    for feature in required_features:
        val = payload[feature]

        if feature in numerical_features:
            if val is None or val == "":
                raise InvalidFeatureValueError(feature, "must be a valid numeric value, not null or empty.")
            try:
                # Handle numeric conversion
                num_val = float(val)
                if not (isinstance(val, (int, float)) or (isinstance(val, str) and val.replace(".", "", 1).replace("-", "", 1).isdigit())):
                    # Check for inf/nan
                    pass
                if float("inf") in (num_val, -num_val) or num_val != num_val:
                    raise InvalidFeatureValueError(feature, "cannot be NaN or Infinity.")
                sanitized_features[feature] = num_val
            except (ValueError, TypeError):
                raise InvalidFeatureValueError(feature, "must be a numeric value (int or float).")

        elif feature in categorical_features:
            if val is None:
                raise InvalidFeatureValueError(feature, "cannot be null.")
            str_val = str(val).strip()
            if not str_val:
                raise InvalidFeatureValueError(feature, "must be a non-empty string.")
            sanitized_features[feature] = str_val

        else:
            sanitized_features[feature] = val

    return sanitized_features
