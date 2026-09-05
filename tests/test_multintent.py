"""
DealFlow360 - Tests: Multi-Intent Detection & Action Planning
"""

import pytest
from chatbot.intent_detector import intent_detector
from chatbot.entity_extractor import EntityExtractor
from chatbot.action_planner import ActionPlanner


def test_compound_discount_and_delivery_intent():
    msg = "Can I get 18% discount and still receive it by Friday?"
    intents, primary = intent_detector.detect_intents(msg)
    entities = EntityExtractor.extract_all(msg)

    assert "discount_percent" in entities
    assert entities["discount_percent"].value == 18.0
    assert "delivery_date" in entities

    plan = ActionPlanner.plan(intents, entities)
    assert plan.primary_intent == "BETTER_DEAL"
    assert "simulate_discount_scenarios" in plan.steps
    assert "evaluate_delivery_feasibility" in plan.steps
    assert plan.parameters["discount_percent"] == 18.0


def test_compound_quantity_and_discount_what_if():
    msg = "What happens if I order 50 units and ask for 15% discount?"
    intents, primary = intent_detector.detect_intents(msg)
    entities = EntityExtractor.extract_all(msg)

    assert "quantity" in entities
    assert entities["quantity"].value == 50
    assert "discount_percent" in entities
    assert entities["discount_percent"].value == 15.0

    plan = ActionPlanner.plan(intents, entities)
    assert plan.primary_intent == "DISCOUNT_IMPACT"
    assert "run_deal_simulation" in plan.steps or "run_what_if_simulation" in plan.steps
