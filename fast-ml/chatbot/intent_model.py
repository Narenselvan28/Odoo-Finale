"""
DealFlow360 - Intent Classifier Pipeline Class
Encapsulates embedding model and classifier for serialization and inference.
"""

import numpy as np


class IntentClassifierPipeline:
    """Wrapper encapsulating embedding transformation and classifier for inference."""

    def __init__(self, embedder_type: str, embedder, classifier, label_map: dict):
        self.embedder_type = embedder_type  # 'sentence_transformer' or 'tfidf'
        self.embedder = embedder
        self.classifier = classifier
        self.label_map = label_map
        self.id_to_label = {v: k for k, v in label_map.items()}

    def predict(self, text: str):
        """Predicts primary intent and confidence score."""
        probs = self.predict_proba(text)
        best_id = int(np.argmax(probs))
        return self.id_to_label[best_id], float(probs[best_id])

    def predict_proba(self, text: str):
        """Returns class probabilities vector."""
        if self.embedder_type == "sentence_transformer":
            feat = self.embedder.encode([text], show_progress_bar=False)
        else:
            feat = self.embedder.transform([text]).toarray()
        return self.classifier.predict_proba(feat)[0]

    def predict_top_k(self, text: str, k: int = 3):
        """Returns top K intents with probabilities for multi-intent detection."""
        probs = self.predict_proba(text)
        top_indices = np.argsort(probs)[::-1][:k]
        return [
            {"name": self.id_to_label[i], "confidence": round(float(probs[i]), 4)}
            for i in top_indices
        ]
