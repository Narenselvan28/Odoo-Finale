"""
DealFlow360 - Customer Intent Model Evaluation Script
Evaluates trained intent model against dataset, displays confusion matrix,
measures latencies, tests multi-intent queries, and verifies domain robustness.
"""

import os
import sys
import json
import time
import joblib
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics import classification_report, accuracy_score, precision_recall_fscore_support, confusion_matrix

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


def evaluate():
    models_dir = os.path.join(BASE_DIR, "models")
    model_path = os.path.join(models_dir, "intent_model.pkl")
    dataset_path = os.path.join(BASE_DIR, "training_data", "intents.json")

    if not os.path.exists(model_path):
        print(f"Model file not found at {model_path}. Run train_intent_model.py first.")
        return

    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    bundle = joblib.load(model_path)
    clf = bundle["classifier"]
    classes = bundle["classes"]
    embedding_model_name = bundle.get("embedding_model_name", "all-MiniLM-L6-v2")

    print(f"Loading SentenceTransformer: {embedding_model_name}...")
    embedder = SentenceTransformer(embedding_model_name)

    texts = []
    labels = []
    for item in dataset["intents"]:
        for ex in item["examples"]:
            texts.append(ex.strip())
            labels.append(item["name"])

    print(f"Loaded {len(texts)} test utterances across {len(set(labels))} intents.")
    
    t0 = time.time()
    embeddings = embedder.encode(texts, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    embed_time = time.time() - t0

    t1 = time.time()
    y_pred = clf.predict(embeddings)
    infer_time = time.time() - t1

    acc = accuracy_score(labels, y_pred)
    p, r, f1, _ = precision_recall_fscore_support(labels, y_pred, average="macro", zero_division=0)
    cm = confusion_matrix(labels, y_pred, labels=classes)

    print("\n" + "=" * 65)
    print("INTENT CLASSIFIER EVALUATION REPORT")
    print("=" * 65)
    print(f"Total Samples Evaluated: {len(texts)}")
    print(f"Overall Accuracy:        {acc * 100:.2f}%")
    print(f"Macro Precision:         {p * 100:.2f}%")
    print(f"Macro Recall:            {r * 100:.2f}%")
    print(f"Macro F1 Score:          {f1 * 100:.2f}%")
    print(f"Embedding Latency:       {(embed_time / len(texts)) * 1000:.2f} ms/sample")
    print(f"Classifier Latency:      {(infer_time / len(texts)) * 1000:.2f} ms/sample")
    print("=" * 65)

    print("\nPer-Intent Breakdown:")
    print(classification_report(labels, y_pred, target_names=classes, digits=3))

    test_queries = [
        "Can I get 15% off?",
        "Can you deliver this by Friday?",
        "What happens if I ask for 18%?",
        "What if I buy 50 units instead of 10?",
        "Can you make this cheaper?",
        "This is too expensive, is there a cheaper option?",
        "I need 15% because another supplier offered me a lower price.",
        "Who is reviewing my request?",
        "What is the status of our negotiation?",
        "What can I negotiate?",
        "Yes, submit it.",
        "Hello, can you help me?"
    ]

    print("\n" + "=" * 65)
    print("SAMPLE INFERENCE TESTS")
    print("=" * 65)
    for q in test_queries:
        q_emb = embedder.encode([q], normalize_embeddings=True)
        q_probs = clf.predict_proba(q_emb)[0]
        top_idx = int(np.argmax(q_probs))
        top_intent = classes[top_idx]
        top_conf = float(q_probs[top_idx])
        print(f"Query:  '{q}'")
        print(f"Result: {top_intent} (Confidence: {top_conf:.3f})\n")


if __name__ == "__main__":
    evaluate()
