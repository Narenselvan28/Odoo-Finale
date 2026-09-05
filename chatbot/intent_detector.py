"""
DealFlow360 - Intent Detector & Multi-Intent Classifier
Loads Sentence-Transformer embedding model and LogisticRegression classifier once.
Performs semantic feature extraction, multi-intent prediction, and confidence scoring.
"""

import os
import sys
import json
import logging
import joblib
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from sentence_transformers import SentenceTransformer
from chatbot.schemas import IntentConfidence
from chatbot.confidence import ConfidencePolicy

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class IntentDetector:
    """Singleton intent detector loaded into memory on Flask startup."""

    _instance = None
    _embedder = None
    _classifier = None
    _classes = None
    _embedding_model_name = "all-MiniLM-L6-v2"
    _metadata: Dict[str, Any] = {}

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(IntentDetector, cls).__new__(cls)
            cls._instance._load_model()
        return cls._instance

    def _load_model(self):
        models_dir = os.path.join(BASE_DIR, "models")
        model_path = os.path.join(models_dir, "intent_model.pkl")
        metadata_path = os.path.join(models_dir, "model_metadata.json")

        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, "r", encoding="utf-8") as f:
                    self._metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata: {e}")

        if not os.path.exists(model_path):
            logger.warning(f"Intent model not found at {model_path}. Intent inference will use rule fallback.")
            return

        try:
            bundle = joblib.load(model_path)
            self._classifier = bundle["classifier"]
            self._classes = np.array(bundle["classes"])
            self._embedding_model_name = bundle.get("embedding_model_name", "all-MiniLM-L6-v2")

            logger.info(f"Loading SentenceTransformer: {self._embedding_model_name}...")
            self._embedder = SentenceTransformer(self._embedding_model_name)
            logger.info("SentenceTransformer and Intent Classifier loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load intent model: {str(e)}", exc_info=True)

    def is_loaded(self) -> bool:
        """Returns whether the model and sentence transformer are loaded."""
        return self._classifier is not None and self._embedder is not None

    @property
    def metadata(self) -> Dict[str, Any]:
        """Returns model metadata and version details."""
        return self._metadata or {
            "model_version": "customer-intent-v1.0.0",
            "embedding_model": self._embedding_model_name,
            "classes_count": len(self._classes) if self._classes is not None else 16
        }

    def extract_semantic_features(self, text: str) -> np.ndarray:
        """Extracts normalized 384-dimensional sentence embedding."""
        if self._embedder is None:
            return np.zeros((1, 384))
        return self._embedder.encode([text], normalize_embeddings=True)

    def extract_linguistic_features(self, text: str) -> Dict[str, Any]:
        """Extracts token counts, punctuation markers, and structural indicators."""
        clean = text.strip()
        tokens = clean.split()
        return {
            "message_length": len(clean),
            "token_count": len(tokens),
            "has_question_mark": "?" in clean,
            "has_exclamation_mark": "!" in clean,
            "has_percentage": "%" in clean or "percent" in clean.lower(),
            "has_money": any(s in clean for s in ["$", "€", "£", "₹", "USD", "INR", "EUR"]),
            "has_numbers": any(c.isdigit() for c in clean)
        }

    def detect_intents(
        self,
        text: str,
        entities: Optional[Dict[str, Any]] = None,
        min_confidence: float = 0.25
    ) -> Tuple[List[IntentConfidence], str]:
        """
        Detects primary and secondary intents. Supports multi-intent compound sentences.
        Returns: (List of IntentConfidence objects sorted by score, primary_intent_name)
        """
        clean_text = text.strip()
        if not clean_text:
            return [IntentConfidence(name="GENERAL_HELP", confidence=1.0, description="General Help")], "GENERAL_HELP"

        # Check explicit confirmation/negation keyword patterns first
        lower = clean_text.lower()
        if lower in ["yes", "yes please", "confirm", "proceed", "submit", "accept", "lock in", "i agree"]:
            return [IntentConfidence(name="CONFIRM_QUOTATION", confidence=0.98, description="Accept & Submit Proposal")], "CONFIRM_QUOTATION"

        # If model is loaded, compute embeddings and class probabilities
        if self._classifier is not None and self._embedder is not None:
            emb = self.extract_semantic_features(clean_text)
            probs = self._classifier.predict_proba(emb)[0]

            # Top sorted classes
            sorted_indices = np.argsort(probs)[::-1]
            primary_idx = sorted_indices[0]
            primary_intent = str(self._classes[primary_idx])
            primary_conf = float(probs[primary_idx])

            detected: List[IntentConfidence] = [
                IntentConfidence(name=primary_intent, confidence=round(primary_conf, 3))
            ]

            # Check for secondary intents (Multi-intent compound messages e.g. "discount + delivery")
            is_compound = any(w in lower for w in [" and ", " but ", " still ", " as well ", " also ", " while "])
            for idx in sorted_indices[1:4]:
                intent_name = str(self._classes[idx])
                conf = float(probs[idx])

                # Include secondary if confidence is high or compound sentence with distinct intent
                if conf >= 0.25 and (is_compound or conf >= 0.35) and intent_name != primary_intent:
                    detected.append(IntentConfidence(name=intent_name, confidence=round(conf, 3)))

            # Keyword-based multi-intent boost (e.g. mentions discount and Friday/delivery)
            has_discount_kw = any(w in lower for w in ["discount", "cheaper", "%", "off", "lower price", "reduce"])
            has_delivery_kw = any(w in lower for w in ["friday", "monday", "tomorrow", "deliver", "shipping", "receive", "next week"])

            intent_names = [d.name for d in detected]
            if has_discount_kw and has_delivery_kw:
                if "DISCOUNT_REQUEST" not in intent_names and "BETTER_DEAL" not in intent_names:
                    detected.append(IntentConfidence(name="DISCOUNT_REQUEST", confidence=0.85))
                if "DELIVERY_REQUEST" not in intent_names and "DELIVERY_STATUS" not in intent_names:
                    detected.append(IntentConfidence(name="DELIVERY_REQUEST", confidence=0.85))

            return detected, primary_intent

        # Rule-based fallback if ML model is unavailable
        return self._rule_based_fallback(clean_text)

    def _rule_based_fallback(self, text: str) -> Tuple[List[IntentConfidence], str]:
        lower = text.lower()
        if "discount" in lower or "%" in lower or "off" in lower:
            return [IntentConfidence(name="DISCOUNT_REQUEST", confidence=0.80)], "DISCOUNT_REQUEST"
        elif "deliver" in lower or "friday" in lower or "ship" in lower:
            return [IntentConfidence(name="DELIVERY_REQUEST", confidence=0.80)], "DELIVERY_REQUEST"
        elif "cheaper" in lower or "better deal" in lower:
            return [IntentConfidence(name="BETTER_DEAL", confidence=0.80)], "BETTER_DEAL"
        elif "what if" in lower or "simulate" in lower:
            return [IntentConfidence(name="WHAT_IF_SCENARIO", confidence=0.80)], "WHAT_IF_SCENARIO"
        elif "summary" in lower or "overview" in lower:
            return [IntentConfidence(name="QUOTE_SUMMARY", confidence=0.80)], "QUOTE_SUMMARY"
        elif "help" in lower or "hi" in lower or "hello" in lower:
            return [IntentConfidence(name="GENERAL_HELP", confidence=0.80)], "GENERAL_HELP"
        return [IntentConfidence(name="GENERAL_HELP", confidence=0.50)], "GENERAL_HELP"


# Global shared instance
intent_detector = IntentDetector()
