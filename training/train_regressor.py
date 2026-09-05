"""
DealFlow360 - Discount Recommendation Regressor Training Pipeline
Trains an XGBoost Regressor on dealflow360_regressor_dataset.csv
Target: recommended_discount_percent
"""

import os
import json
import logging
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)
import xgboost as xgb

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def train_discount_recommendation_regressor(
    dataset_path="datasets/dealflow360_regressor_dataset.csv",
    model_output_dir="models",
    random_state=42
):
    """
    Trains the XGBoost Regressor pipeline and exports the artifacts and feature metadata.
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_dataset_path = os.path.join(base_dir, dataset_path)
    full_output_dir = os.path.join(base_dir, model_output_dir)
    os.makedirs(full_output_dir, exist_ok=True)

    logger.info(f"Loading regressor dataset from: {full_dataset_path}")
    df = pd.read_csv(full_dataset_path)
    logger.info(f"Loaded dataset with shape: {df.shape}")

    # Exclude targets and leakages/IDs/descriptions
    leakage_and_id_cols = [
        "invoice",
        "stockcode",
        "customer_id",
        "description",
        "recommended_discount_percent"
    ]

    target_col = "recommended_discount_percent"
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset.")

    y = df[target_col].astype(float)
    X = df.drop(columns=[c for c in leakage_and_id_cols if c in df.columns])

    # Identify categorical and numerical columns
    categorical_cols = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()
    numerical_cols = X.select_dtypes(include=["int64", "float64", "int32", "float32", "number"]).columns.tolist()
    feature_names = X.columns.tolist()

    logger.info(f"Total features: {len(feature_names)}")
    logger.info(f"Categorical features ({len(categorical_cols)}): {categorical_cols}")
    logger.info(f"Numerical features ({len(numerical_cols)}): {numerical_cols}")

    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state
    )
    logger.info(f"Train split: {X_train.shape[0]} samples, Test split: {X_test.shape[0]} samples")

    # Build preprocessing and regressor pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
            ("num", StandardScaler(), numerical_cols)
        ]
    )

    regressor = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=random_state,
        n_jobs=-1
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", regressor)
    ])

    logger.info("Training XGBoost Regressor pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluate model
    logger.info("Evaluating regressor on holdout test set...")
    y_pred = pipeline.predict(X_test)

    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)

    logger.info(f"--- Regressor Evaluation Metrics ---")
    logger.info(f"MAE:  {mae:.4f}")
    logger.info(f"MSE:  {mse:.4f}")
    logger.info(f"RMSE: {rmse:.4f}")
    logger.info(f"R²:   {r2:.4f}")

    # Save trained pipeline
    model_file_path = os.path.join(full_output_dir, "discount_recommendation_regressor.pkl")
    joblib.dump(pipeline, model_file_path)
    logger.info(f"Saved trained regressor pipeline to: {model_file_path}")

    # Feature metadata and sample schema
    feature_metadata = {
        "model_name": "discount_recommendation_regressor",
        "algorithm": "XGBoost Regressor",
        "target": target_col,
        "feature_count": len(feature_names),
        "feature_order": feature_names,
        "categorical_features": categorical_cols,
        "numerical_features": numerical_cols,
        "metrics": {
            "mae": round(float(mae), 4),
            "mse": round(float(mse), 4),
            "rmse": round(float(rmse), 4),
            "r2_score": round(float(r2), 4)
        },
        "sample_input": {col: float(X.iloc[0][col]) if col in numerical_cols else str(X.iloc[0][col]) for col in feature_names}
    }

    metadata_file_path = os.path.join(full_output_dir, "regressor_features.json")
    with open(metadata_file_path, "w", encoding="utf-8") as f:
        json.dump(feature_metadata, f, indent=4)
    logger.info(f"Saved regressor feature metadata to: {metadata_file_path}")

    return {
        "model_path": model_file_path,
        "metadata_path": metadata_file_path,
        "metrics": feature_metadata["metrics"]
    }


if __name__ == "__main__":
    train_discount_recommendation_regressor()
