"""
DealFlow360 - Customer Intent Model Training Pipeline
Trains and evaluates:
1. Baseline: TF-IDF + Logistic Regression
2. Candidate: Sentence-Transformers (all-MiniLM-L6-v2) + Logistic Regression

Performs stratified train/test split, calculates Accuracy, Precision, Recall, Macro-F1,
measures inference latency, and saves the production model dictionary and metadata.
"""

import os
import sys
import json
import time
import logging
import joblib
import numpy as np
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support, confusion_matrix
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train-intent-model")


def load_dataset(dataset_path=None):
    if dataset_path is None:
        dataset_path = os.path.join(BASE_DIR, "training_data", "intents.json")

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Intents dataset not found at {dataset_path}")

    with open(dataset_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    texts = []
    labels = []
    intent_metadata = {}

    for item in data.get("intents", []):
        name = item["name"]
        examples = item.get("examples", [])
        intent_metadata[name] = {
            "description": item.get("description", ""),
            "confidence_threshold": item.get("confidence_threshold", 0.75),
            "required_entities": item.get("required_entities", []),
            "optional_entities": item.get("optional_entities", []),
            "supported_actions": item.get("supported_actions", [])
        }
        for ex in examples:
            clean_text = ex.strip()
            if clean_text:
                texts.append(clean_text)
                labels.append(name)

    logger.info(f"Loaded {len(texts)} utterances across {len(intent_metadata)} unique intents.")
    return texts, labels, intent_metadata


def train_baseline_tfidf(X_train, X_test, y_train, y_test):
    """Train Baseline: TF-IDF + LogisticRegression."""
    logger.info("--- Training Baseline: TF-IDF + LogisticRegression ---")
    start_time = time.time()
    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=1000, C=10.0, random_state=42))
    ])
    pipeline.fit(X_train, y_train)
    train_duration = time.time() - start_time

    # Inference latency
    t0 = time.time()
    y_pred = pipeline.predict(X_test)
    inference_duration_ms = ((time.time() - t0) / len(X_test)) * 1000

    acc = accuracy_score(y_test, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro", zero_division=0)

    logger.info(f"Baseline Results -> Accuracy: {acc:.4f}, Macro-P: {p:.4f}, Macro-R: {r:.4f}, Macro-F1: {f1:.4f}")
    logger.info(f"Baseline Latency: {inference_duration_ms:.2f} ms/sample")

    return {
        "model": pipeline,
        "accuracy": acc,
        "precision": p,
        "recall": r,
        "macro_f1": f1,
        "inference_latency_ms": inference_duration_ms,
        "y_pred": y_pred
    }


def train_sentence_transformer_lr(X_train, X_test, y_train, y_test, embedding_model_name="all-MiniLM-L6-v2"):
    """Train Candidate: SentenceTransformer + LogisticRegression."""
    logger.info(f"--- Training Candidate: SentenceTransformer ({embedding_model_name}) + LogisticRegression ---")

    logger.info(f"Loading embedding model: {embedding_model_name}...")
    embedder = SentenceTransformer(embedding_model_name)

    logger.info("Encoding training utterances...")
    start_time = time.time()
    X_train_emb = embedder.encode(X_train, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    X_test_emb = embedder.encode(X_test, batch_size=64, show_progress_bar=False, normalize_embeddings=True)

    clf = LogisticRegression(
        max_iter=1000,
        C=5.0,
        class_weight="balanced",
        random_state=42
    )
    clf.fit(X_train_emb, y_train)
    train_duration = time.time() - start_time

    # Latency test on individual encodes + predict
    t0 = time.time()
    sample_emb = embedder.encode(X_test[:50], show_progress_bar=False, normalize_embeddings=True)
    _ = clf.predict_proba(sample_emb)
    inference_duration_ms = ((time.time() - t0) / 50) * 1000

    y_pred = clf.predict(X_test_emb)
    acc = accuracy_score(y_test, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(y_test, y_pred, average="macro", zero_division=0)

    logger.info(f"Candidate Results -> Accuracy: {acc:.4f}, Macro-P: {p:.4f}, Macro-R: {r:.4f}, Macro-F1: {f1:.4f}")
    logger.info(f"Candidate Latency: {inference_duration_ms:.2f} ms/sample")

    return {
        "embedder": embedder,
        "classifier": clf,
        "accuracy": acc,
        "precision": p,
        "recall": r,
        "macro_f1": f1,
        "inference_latency_ms": inference_duration_ms,
        "y_pred": y_pred,
        "embedding_dim": X_train_emb.shape[1]
    }


def main():
    texts, labels, intent_metadata = load_dataset()

    # Stratified Train/Test Split (80% Train, 20% Test)
    X_train, X_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.20,
        random_state=42,
        stratify=labels
    )
    logger.info(f"Train size: {len(X_train)}, Test size: {len(X_test)}")

    # 1. Baseline Evaluation
    baseline_res = train_baseline_tfidf(X_train, X_test, y_train, y_test)

    # 2. Candidate Evaluation
    embedding_model_name = "all-MiniLM-L6-v2"
    candidate_res = train_sentence_transformer_lr(X_train, X_test, y_train, y_test, embedding_model_name)

    # 3. Print Detailed Classification Report for Candidate
    unique_labels = sorted(list(set(labels)))
    report = classification_report(y_test, candidate_res["y_pred"], target_names=unique_labels, digits=4)
    print("\n" + "=" * 60)
    print("CANDIDATE CLASSIFICATION REPORT (SentenceTransformer + LogisticRegression)")
    print("=" * 60)
    print(report)

    cm = confusion_matrix(y_test, candidate_res["y_pred"], labels=unique_labels)

    # 4. Save Artifacts
    models_dir = os.path.join(BASE_DIR, "models")
    os.makedirs(models_dir, exist_ok=True)

    intent_model_path = os.path.join(models_dir, "intent_model.pkl")
    metadata_path = os.path.join(models_dir, "model_metadata.json")
    config_path = os.path.join(models_dir, "embedding_model_config.json")

    # Fit candidate on full dataset for maximum production coverage
    logger.info("Fitting candidate model on full dataset for deployment...")
    embedder = candidate_res["embedder"]
    X_full_emb = embedder.encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    full_clf = LogisticRegression(max_iter=1000, C=5.0, class_weight="balanced", random_state=42)
    full_clf.fit(X_full_emb, labels)

    model_bundle = {
        "classifier": full_clf,
        "classes": full_clf.classes_.tolist(),
        "embedding_model_name": embedding_model_name,
        "embedding_dim": int(candidate_res["embedding_dim"])
    }
    joblib.dump(model_bundle, intent_model_path)
    logger.info(f"Saved production intent model bundle to: {intent_model_path}")

    # Save Model Metadata
    metadata = {
        "model_name": "DealFlow360 Customer Intent Classifier",
        "model_version": "customer-intent-v1.0.0",
        "training_date": datetime.now().isoformat(),
        "embedding_model": embedding_model_name,
        "classifier": "LogisticRegression(C=5.0, class_weight='balanced')",
        "total_training_samples": len(texts),
        "total_intents": len(unique_labels),
        "intents": unique_labels,
        "intent_metadata": intent_metadata,
        "evaluation_metrics": {
            "baseline_tfidf": {
                "accuracy": round(float(baseline_res["accuracy"]), 4),
                "macro_precision": round(float(baseline_res["precision"]), 4),
                "macro_recall": round(float(baseline_res["recall"]), 4),
                "macro_f1": round(float(baseline_res["macro_f1"]), 4),
                "inference_latency_ms": round(float(baseline_res["inference_latency_ms"]), 2)
            },
            "candidate_sentence_transformer": {
                "accuracy": round(float(candidate_res["accuracy"]), 4),
                "macro_precision": round(float(candidate_res["precision"]), 4),
                "macro_recall": round(float(candidate_res["recall"]), 4),
                "macro_f1": round(float(candidate_res["macro_f1"]), 4),
                "inference_latency_ms": round(float(candidate_res["inference_latency_ms"]), 2)
            }
        },
        "confusion_matrix": cm.tolist()
    }

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"Saved model metadata to: {metadata_path}")

    embedding_config = {
        "embedding_model": embedding_model_name,
        "dimension": int(candidate_res["embedding_dim"]),
        "normalize_embeddings": True,
        "pooling": "mean",
        "max_seq_length": 128
    }
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(embedding_config, f, indent=2)
    logger.info(f"Saved embedding model config to: {config_path}")

    print("\n" + "=" * 60)
    print("TRAINING & EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Dataset: {len(texts)} utterances, {len(unique_labels)} classes")
    print(f"Baseline (TF-IDF + LR)     -> Macro F1: {baseline_res['macro_f1']:.4f} | Latency: {baseline_res['inference_latency_ms']:.2f}ms")
    print(f"Candidate (MiniLM + LR)    -> Macro F1: {candidate_res['macro_f1']:.4f} | Latency: {candidate_res['inference_latency_ms']:.2f}ms")
    print("=" * 60)


if __name__ == "__main__":
    main()
