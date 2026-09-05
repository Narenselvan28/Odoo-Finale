"""
Tests for Multi-Intent Detection
Verifies compound requests containing multiple intents (e.g. Discount + Delivery).
"""

from chatbot.intent_detector import intent_detector
from chatbot.entity_extractor import entity_extractor


def test_discount_and_delivery_multi_intent():
    query = "Can I get 18% discount and still receive it by Friday?"
    entities = entity_extractor.extract_all(query)
    intents, primary = intent_detector.detect_intents(query, entities)

    intent_names = [i.name for i in intents]
    assert "DISCOUNT_REQUEST" in intent_names
    assert "DELIVERY_REQUEST" in intent_names
    assert entities["discount_percent"].value == 18.0
    assert "delivery_date" in entities


def test_better_deal_and_delivery_constraint():
    query = "Can you make this cheaper, but I still need it by Friday?"
    entities = entity_extractor.extract_all(query)
    intents, primary = intent_detector.detect_intents(query, entities)

    intent_names = [i.name for i in intents]
    assert "BETTER_DEAL" in intent_names or "DISCOUNT_REQUEST" in intent_names
    assert "DELIVERY_REQUEST" in intent_names
    assert "delivery_date" in entities
