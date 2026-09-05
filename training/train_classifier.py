"""
DealFlow360 - Discount Risk Classifier Training Pipeline
Trains an XGBoost Classifier on dealflow360_classifier_dataset.csv
Target: risk_label (0 = NORMAL, 1 = HIGH)
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
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)
import xgboost as xgb

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def train_discount_risk_classifier(
    dataset_path="datasets/dealflow360_classifier_dataset.csv",
    model_output_dir="models",
    random_state=42
):
    """
    Trains the XGBoost Classifier pipeline and exports the artifacts and feature metadata.
    """
    # Resolve relative paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_dataset_path = os.path.join(base_dir, dataset_path)
    full_output_dir = os.path.join(base_dir, model_output_dir)
    os.makedirs(full_output_dir, exist_ok=True)

    logger.info(f"Loading classifier dataset from: {full_dataset_path}")
    df = pd.read_csv(full_dataset_path)
    logger.info(f"Loaded dataset with shape: {df.shape}")

    # Exclude targets and leakages
    leakage_and_id_cols = [
        "order_id",
        "order_item_id",
        "customer_id",
        "customer_unique_id",
        "product_id",
        "seller_id",
        "risk_score",
        "risk_label",
        "risk_category"
    ]

    target_col = "risk_label"
    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found in dataset.")

    y = df[target_col].astype(int)
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
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )
    logger.info(f"Train split: {X_train.shape[0]} samples, Test split: {X_test.shape[0]} samples")

    # Build preprocessing and classifier pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
            ("num", StandardScaler(), numerical_cols)
        ]
    )

    classifier = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=random_state,
        n_jobs=-1,
        eval_metric="logloss"
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", classifier)
    ])

    logger.info("Training XGBoost Classifier pipeline...")
    pipeline.fit(X_train, y_train)

    # Evaluate model
    logger.info("Evaluating classifier on holdout test set...")
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_proba)
    cm = confusion_matrix(y_test, y_pred).tolist()

    logger.info(f"--- Classifier Evaluation Metrics ---")
    logger.info(f"Accuracy:  {acc:.4f}")
    logger.info(f"Precision: {prec:.4f}")
    logger.info(f"Recall:    {rec:.4f}")
    logger.info(f"F1 Score:  {f1:.4f}")
    logger.info(f"ROC-AUC:   {roc_auc:.4f}")
    logger.info(f"Confusion Matrix: {cm}")
    logger.info(f"\nClassification Report:\n{classification_report(y_test, y_pred)}")

    # Save trained pipeline
    model_file_path = os.path.join(full_output_dir, "discount_risk_classifier.pkl")
    joblib.dump(pipeline, model_file_path)
    logger.info(f"Saved trained classifier pipeline to: {model_file_path}")

    # Feature metadata and sample schema
    feature_metadata = {
        "model_name": "discount_risk_classifier",
        "algorithm": "XGBoost Classifier",
        "target": target_col,
        "target_mapping": {
            "0": "NORMAL",
            "1": "HIGH"
        },
        "feature_count": len(feature_names),
        "feature_order": feature_names,
        "categorical_features": categorical_cols,
        "numerical_features": numerical_cols,
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(roc_auc), 4),
            "confusion_matrix": cm
        },
        "sample_input": {col: float(X.iloc[0][col]) if col in numerical_cols else str(X.iloc[0][col]) for col in feature_names}
    }

    metadata_file_path = os.path.join(full_output_dir, "classifier_features.json")
    with open(metadata_file_path, "w", encoding="utf-8") as f:
        json.dump(feature_metadata, f, indent=4)
    logger.info(f"Saved classifier feature metadata to: {metadata_file_path}")

    return {
        "model_path": model_file_path,
        "metadata_path": metadata_file_path,
        "metrics": feature_metadata["metrics"]
    }


if __name__ == "__main__":
    train_discount_risk_classifier()
