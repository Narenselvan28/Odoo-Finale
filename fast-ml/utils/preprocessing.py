"""
DealFlow360 - Preprocessing Utilities
Prepares validated feature inputs into properly ordered DataFrames for model inference.
"""

import pandas as pd


def prepare_input_dataframe(sanitized_data, feature_order):
    """
    Constructs a single-row pandas DataFrame arranged in the exact feature order
    specified by the trained model pipeline.

    Args:
        sanitized_data (dict): Validated dictionary of feature values.
        feature_order (list): List of feature names in the exact training sequence.

    Returns:
        pd.DataFrame: A 1-row DataFrame ready for pipeline transformation and prediction.
    """
    ordered_dict = {col: [sanitized_data[col]] for col in feature_order}
    df = pd.DataFrame(ordered_dict)
    return df
