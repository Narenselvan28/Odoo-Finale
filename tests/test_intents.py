"""
Tests for Intent Classification Model
Verifies accuracy of single-intent classification on enterprise quotation utterances.
"""

import pytest
from chatbot.intent_detector import intent_detector


def test_intent_detector_loaded():
    assert intent_detector.is_loaded() is True


@pytest.mark.parametrize("query,expected_intent", [
    ("Can I get 15% off?", "DISCOUNT_REQUEST"),
    ("Can you lower the price?", "DISCOUNT_REQUEST"),
    ("Is there any discount available?", "DISCOUNT_REQUEST"),
    ("What happens at 18%?", "DISCOUNT_IMPACT"),
    ("What is the impact of a 15% discount?", "DISCOUNT_IMPACT"),
    ("What if I buy 20 units?", "WHAT_IF_SCENARIO"),
    ("Can you simulate 50 units?", "WHAT_IF_SCENARIO"),
    ("I need this by Friday.", "DELIVERY_REQUEST"),
    ("Can you deliver before Monday?", "DELIVERY_REQUEST"),
    ("When will I receive this?", "DELIVERY_STATUS"),
    ("What is the current delivery timeline?", "DELIVERY_STATUS"),
    ("Can you find something cheaper?", "BETTER_DEAL"),
    ("Find me a better deal.", "BETTER_DEAL"),
    ("Who is reviewing my request?", "APPROVAL_STATUS"),
    ("Has my discount been approved?", "APPROVAL_STATUS"),
    ("Why is this so expensive?", "QUOTE_PRICE_BREAKDOWN"),
    ("Can you break down the pricing?", "QUOTE_PRICE_BREAKDOWN"),
    ("Summarize my quotation.", "QUOTE_SUMMARY"),
    ("Give me a summary of everything.", "QUOTE_SUMMARY"),
    ("What can I negotiate?", "WHAT_CAN_I_CHANGE"),
    ("Yes, submit it.", "CONFIRM_QUOTATION"),
    ("I accept this option.", "CONFIRM_QUOTATION"),
    ("Hello, can you help me?", "GENERAL_HELP"),
    ("Our budget is constrained this quarter.", "NEGOTIATION_REASON"),
    ("Is there a cheaper laptop alternative?", "PRODUCT_ALTERNATIVE"),
    ("Tell me about the ThinkPad laptop.", "PRODUCT_INFORMATION")
])
def test_canonical_intents(query, expected_intent):
    intents, primary = intent_detector.detect_intents(query)
    assert primary == expected_intent
    assert intents[0].confidence >= 0.50
