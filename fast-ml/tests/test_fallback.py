"""
Tests for Clarification and Safe Fallback Behavior
Verifies confidence thresholds and graceful responses to ambiguous queries.
"""

from chatbot.confidence import ConfidenceManager
from chatbot.schemas import IntentConfidence


def test_confidence_threshold_execution():
    high_intent = IntentConfidence(name="DISCOUNT_REQUEST", confidence=0.88)
    assert ConfidenceManager.evaluate_intent(high_intent) == "EXECUTE"


def test_confidence_threshold_clarification():
    borderline_intent = IntentConfidence(name="DISCOUNT_REQUEST", confidence=0.68)
    assert ConfidenceManager.evaluate_intent(borderline_intent) == "CLARIFY"


def test_confidence_threshold_fallback():
    low_intent = IntentConfidence(name="GENERAL_HELP", confidence=0.45)
    assert ConfidenceManager.evaluate_intent(low_intent) == "FALLBACK"


def test_clarification_generation():
    top_intents = [
        IntentConfidence(name="DISCOUNT_REQUEST", confidence=0.68),
        IntentConfidence(name="DELIVERY_REQUEST", confidence=0.52)
    ]
    clarification = ConfidenceManager.generate_clarification(top_intents)
    assert "discount" in clarification["message"].lower() or "delivery" in clarification["message"].lower()
    assert len(clarification["suggested_actions"]) >= 2
