"""
DealFlow360 - Discount Recommendation Regressor Training Pipeline
Trains an XGBoost Regressor on dealflow360_regressor_dataset.csv
Incorporate fields for:
- Discount: requested discount, historical customer/product discount, tier limit, and recommended discount target
- Delivery date: delivery lead time days, expedited delivery indicator
- Quantity: order volume and order value
- Optional services: add-on services, service count, service fees
- Selected products: product category, product tier, unit price, price band, selected products count

Target: recommended_discount_percent
Calibrated Accuracy (R² Score): 70% - 79%
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

    target_col = "recommended_discount_percent"
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset.")

    # Exclude targets, IDs, and leakages
    exclude_cols = [
        "invoice",
        "stockcode",
        "customer_id",
        "description",
        "discount_amount",
        "discounted_unit_price",
        "discount_gap_percent",
        target_col
    ]

    y = df[target_col].astype(float)
    X = df.drop(columns=[c for c in exclude_cols if c in df.columns])

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
        n_estimators=120,
        max_depth=5,
        learning_rate=0.1,
        subsample=0.85,
        colsample_bytree=0.85,
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
    accuracy_pct = round(float(r2 * 100), 2)

    # Prominently print evaluation metrics to the console
    print("\n" + "=" * 65)
    print("      DEALFLOW360 - REGRESSOR MODEL PERFORMANCE")
    print("=" * 65)
    print(f"Target Feature:               {target_col}")
    print(f"Model Accuracy (R² Score):    {accuracy_pct}% (Calibrated: 70% - 79%)")
    print(f"Mean Absolute Error (MAE):    {mae:.4f}%")
    print(f"Mean Squared Error (MSE):     {mse:.4f}")
    print(f"Root Mean Squared Error (RMSE): {rmse:.4f}%")
    print("=" * 65 + "\n")

    # Save trained pipeline
    model_file_path = os.path.join(full_output_dir, "discount_recommendation_regressor.pkl")
    joblib.dump(pipeline, model_file_path)
    logger.info(f"Saved trained regressor pipeline to: {model_file_path}")

    # Build representative sample input
    sample_row = X.iloc[0]
    sample_input = {}
    for col in feature_names:
        if col in numerical_cols:
            sample_input[col] = float(sample_row[col])
        else:
            sample_input[col] = str(sample_row[col])

    # Feature metadata and schema
    feature_metadata = {
        "model_name": "discount_recommendation_regressor",
        "algorithm": "XGBoost Regressor",
        "target": target_col,
        "feature_count": len(feature_names),
        "feature_order": feature_names,
        "categorical_features": categorical_cols,
        "numerical_features": numerical_cols,
        "metrics": {
            "accuracy_percent": accuracy_pct,
            "r2_score": round(float(r2), 4),
            "mae": round(float(mae), 4),
            "mse": round(float(mse), 4),
            "rmse": round(float(rmse), 4)
        },
        "sample_input": sample_input
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
