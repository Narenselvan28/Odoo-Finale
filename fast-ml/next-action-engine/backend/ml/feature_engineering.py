"""
DealFlow360 - Next Action Prediction Engine
Feature Engineering Module
Converts sequential action streams into structured categorical sequence feature matrices.
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from config import Config


class FeatureEngineer:
    def __init__(self, lookback=Config.LOOKBACK_WINDOW, pad_token=Config.PAD_TOKEN):
        self.lookback = lookback
        self.pad_token = pad_token
        self.feature_encoder = None
        self.label_encoder = None
        self.feature_names = [f"prev_action_{i}" for i in range(1, lookback + 1)]

    def extract_sequences_from_df(self, df):
        """
        Extracts lookback transition rows from grouped session actions.
        For sequence [A, B, C, D]:
          - Input: [A, <START>, <START>], Target: B
          - Input: [B, A, <START>], Target: C
          - Input: [C, B, A], Target: D
        """
        rows = []
        for session_id, group in df.groupby("session_id"):
            actions = group.sort_values("step_index")["action"].tolist()
            if len(actions) < 2:
                continue

            for t in range(1, len(actions)):
                target_action = actions[t]
                feature_row = {}

                for i in range(1, self.lookback + 1):
                    idx = t - i
                    col_name = f"prev_action_{i}"
                    feature_row[col_name] = actions[idx] if idx >= 0 else self.pad_token

                feature_row["target_action"] = target_action
                rows.append(feature_row)

        return pd.DataFrame(rows)

    def fit_encoders(self, features_df):
        """Fits OneHotEncoder on categorical feature columns and LabelEncoder on target."""
        X_raw = features_df[self.feature_names]
        y_raw = features_df["target_action"]

        self.feature_encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
        self.feature_encoder.fit(X_raw)

        self.label_encoder = LabelEncoder()
        self.label_encoder.fit(y_raw)

        return self

    def transform_features(self, features_df):
        """Transforms raw feature dataframe into one-hot encoded matrix."""
        X_raw = features_df[self.feature_names]
        X_encoded = self.feature_encoder.transform(X_raw)

        y_encoded = None
        if "target_action" in features_df.columns:
            y_encoded = self.label_encoder.transform(features_df["target_action"])

        return X_encoded, y_encoded

    def prepare_inference_features(self, recent_actions):
        """
        Prepares a single-row feature vector from a list of recent actions.
        recent_actions: list of action strings, e.g. ["open_products", "purchase_laptop"]
        """
        if not recent_actions:
            recent_actions = [self.pad_token]

        feature_row = {}
        for i in range(1, self.lookback + 1):
            idx = len(recent_actions) - i
            col_name = f"prev_action_{i}"
            feature_row[col_name] = recent_actions[idx] if idx >= 0 else self.pad_token

        df_single = pd.DataFrame([feature_row])
        X_raw = df_single[self.feature_names]
        X_encoded = self.feature_encoder.transform(X_raw)
        return X_encoded
