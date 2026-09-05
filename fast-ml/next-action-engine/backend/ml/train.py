"""
DealFlow360 - Next Action Prediction Engine
Training Pipeline Module
Trains the Sequence Classifier and exports artifacts and evaluation metrics.
"""

import sys
import json
import logging
from datetime import datetime
from pathlib import Path
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

from config import Config
from ml.feature_engineering import FeatureEngineer
from ml.evaluate import evaluate_predictions

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def train_next_action_model(dataset_path=Config.DATASET_CSV):
    """
    Loads historical action sequences, constructs lookback features,
    fits Random Forest classifier, evaluates metrics, and saves model artifacts.
    """
    print("========================================")
    print("NEXT ACTION MODEL TRAINING")
    print("========================================")

    if not Path(dataset_path).exists():
        raise FileNotFoundError(f"Dataset not found at: {dataset_path}. Run generate_dataset.py first.")

    print(f"Loading dataset from: {dataset_path}")
    df = pd.read_csv(dataset_path)

    total_sessions = df["session_id"].nunique()
    total_actions = len(df)
    print(f"Sessions: {total_sessions}")
    print(f"Total Action Logs: {total_actions}")

    # 1. Feature Engineering
    print("\nGenerating sequence features (Lookback = 3)...")
    fe = FeatureEngineer(lookback=Config.LOOKBACK_WINDOW)
    features_df = fe.extract_sequences_from_df(df)
    total_transitions = len(features_df)
    print(f"Generated {total_transitions} state transitions for training.")

    # 2. Fit Encoders
    fe.fit_encoders(features_df)
    X, y = fe.transform_features(features_df)

    # 3. Train / Test Split (Stratified)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Train samples: {X_train.shape[0]}, Test samples: {X_test.shape[0]}")

    # 4. Train Classification Model
    print("\nTraining Random Forest Sequence Classifier...")
    model = RandomForestClassifier(
        n_estimators=120,
        max_depth=16,
        min_samples_split=4,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # 5. Evaluate on Holdout Test Set
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    metrics = evaluate_predictions(y_test, y_pred, y_proba, fe.label_encoder)

    print("\nEvaluation Results")
    print("----------------------------------------")
    print(f"Top-1 Accuracy : {metrics['top1_accuracy']}%")
    print(f"Top-3 Accuracy : {metrics['top3_accuracy']}%")
    print(f"Precision      : {metrics['precision']}%")
    print(f"Recall         : {metrics['recall']}%")
    print(f"F1 Score       : {metrics['f1_score']}%")
    print(f"Action Classes : {metrics['num_classes']}")
    print("----------------------------------------")

    # 6. Save Model Artifacts
    Config.MODELS_DIR.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, Config.MODEL_FILE)
    joblib.dump(fe.feature_encoder, Config.FEATURE_ENCODER_FILE)
    joblib.dump(fe.label_encoder, Config.LABEL_ENCODER_FILE)

    with open(Config.EVALUATION_JSON, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=4)

    metadata = {
        "model_name": "NextActionRandomForestClassifier",
        "version": "1.0",
        "trained_at": datetime.now().isoformat(),
        "training_samples": int(X_train.shape[0]),
        "test_samples": int(X_test.shape[0]),
        "total_transitions": total_transitions,
        "total_sessions": total_sessions,
        "lookback_window": Config.LOOKBACK_WINDOW,
        "metrics": metrics
    }
    with open(Config.MODEL_METADATA_JSON, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=4)

    print("\nModel and artifacts saved successfully to:")
    print(f" - {Config.MODEL_FILE}")
    print(f" - {Config.FEATURE_ENCODER_FILE}")
    print(f" - {Config.LABEL_ENCODER_FILE}")
    print(f" - {Config.EVALUATION_JSON}")
    print("========================================\n")

    return metrics


if __name__ == "__main__":
    train_next_action_model()
