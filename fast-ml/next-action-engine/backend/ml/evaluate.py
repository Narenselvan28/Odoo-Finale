"""
DealFlow360 - Next Action Prediction Engine
Model Evaluation Module
Computes Top-1, Top-3, Precision, Recall, and F1 Metrics.
"""

import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix


def evaluate_predictions(y_true, y_pred, y_proba, label_encoder):
    """
    Evaluates next-action predictions with top-1 and top-3 accuracy.
    """
    top1_acc = accuracy_score(y_true, y_pred)

    # Top-3 Accuracy calculation
    # y_proba has shape (N, num_classes)
    top3_preds = np.argsort(y_proba, axis=1)[:, -3:]
    top3_correct = [y_true[i] in top3_preds[i] for i in range(len(y_true))]
    top3_acc = float(np.mean(top3_correct))

    precision = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    recall = recall_score(y_true, y_pred, average="weighted", zero_division=0)
    f1 = f1_score(y_true, y_pred, average="weighted", zero_division=0)

    classes = list(label_encoder.classes_)
    cm = confusion_matrix(y_true, y_pred).tolist()

    metrics = {
        "top1_accuracy": round(float(top1_acc * 100), 2),
        "top3_accuracy": round(float(top3_acc * 100), 2),
        "precision": round(float(precision * 100), 2),
        "recall": round(float(recall * 100), 2),
        "f1_score": round(float(f1 * 100), 2),
        "total_test_samples": int(len(y_true)),
        "num_classes": int(len(classes)),
        "classes": classes
    }

    return metrics
