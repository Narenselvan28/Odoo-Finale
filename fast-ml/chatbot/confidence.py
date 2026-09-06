"""
DealFlow360 - Confidence & Threshold Policy Engine
Defines decision thresholds, confidence grading, clarification triggers, and fallback rules.
Implements Requirement 11 & 12:
- Confidence >= 0.80: execute intent directly.
- Confidence 0.60 - 0.79: ask customer for clarification.
- Confidence < 0.60: trigger safe fallback.
"""

from typing import Dict, Any, Tuple, List, Optional
from chatbot.schemas import IntentConfidence


class ConfidencePolicy:
    """Manages confidence score rules across intents and entities."""

    # Intent thresholds
    HIGH_CONFIDENCE = 0.80      # Direct execution
    MEDIUM_CONFIDENCE = 0.60    # Ask for confirmation or clarification
    LOW_CONFIDENCE = 0.50       # Controlled fallback

    # Critical action threshold (e.g. quote modification / confirmation submission)
    CRITICAL_ACTION_THRESHOLD = 0.85

    @classmethod
    def evaluate_intent(cls, intent) -> str:
        """
        Classifies intent confidence into execution level:
        Returns: 'EXECUTE', 'CLARIFY', or 'FALLBACK'
        """
        conf = intent.confidence if hasattr(intent, "confidence") else float(intent)
        if conf >= cls.HIGH_CONFIDENCE:
            return "EXECUTE"
        elif conf >= cls.MEDIUM_CONFIDENCE:
            return "CLARIFY"
        else:
            return "FALLBACK"

    @classmethod
    def evaluate_intent_confidence(cls, confidence: float, intent_name: str) -> Tuple[str, str]:
        """
        Classifies intent confidence into execution level:
        - EXECUTE: Proceed with direct execution
        - CLARIFY: Ask clarifying question
        - FALLBACK: Trigger gentle fallback menu
        """
        if confidence >= cls.HIGH_CONFIDENCE:
            return "EXECUTE", "Confidence is high; execute intent directly."
        elif confidence >= cls.MEDIUM_CONFIDENCE:
            return "CLARIFY", f"Confidence is moderate ({confidence:.2f}); request confirmation or clarification."
        else:
            return "FALLBACK", f"Confidence is low ({confidence:.2f}); provide safe guided fallback options."

    @classmethod
    def requires_confirmation_for_mutation(cls, intent_name: str, confidence: float) -> bool:
        """Determines if an intent requires explicit user confirmation before mutation."""
        mutation_intents = {"DISCOUNT_REQUEST", "CONFIRM_QUOTATION", "DELIVERY_REQUEST"}
        if intent_name in mutation_intents:
            return True
        return False

    @classmethod
    def generate_clarification(cls, top_intents: List[Any]) -> Dict[str, Any]:
        """Generates helpful clarification questions when intent is borderline."""
        if not top_intents:
            return {
                "message": "I want to make sure I understand your request. Would you like to check discounts, delivery, products, or quote details?",
                "suggested_actions": ["Request Discount", "Check Delivery", "Find Better Deal", "Summarize Quote"]
            }

        primary = top_intents[0]
        p_name = primary.name if hasattr(primary, "name") else str(primary)

        return {
            "message": f"Did you want to negotiate {p_name.replace('_', ' ').lower()} or explore options to optimize your quotation?",
            "suggested_actions": ["Find Better Deal", "Request Discount", "Check Delivery", "Summarize Quote"]
        }


# Alias for compatibility
ConfidenceManager = ConfidencePolicy
