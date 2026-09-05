"""
Tests for Action Routing and Scenario Generation
Verifies 'Find Me a Better Deal', What-If Simulation, and Routing.
"""

from chatbot.action_planner import ActionPlanner
from chatbot.intent_router import IntentRouter
from chatbot.conversation_manager import conversation_manager
from chatbot.entity_extractor import entity_extractor
from chatbot.intent_detector import intent_detector


def test_find_better_deal_scenario_generator():
    deal = {
        "deal_id": "DEAL-1001",
        "category": "ELECTRONICS",
        "customer_tier": "GOLD",
        "quantity": 25,
        "base_price": 1000.0,
        "product_cost": 650.0,
        "current_discount_percent": 12.0,
        "required_delivery_days": 5
    }
    entities = entity_extractor.extract_all("Can you make this cheaper but I need it by Friday?")
    scenarios = ActionPlanner.generate_better_deal_scenarios(deal, entities)

    assert len(scenarios) == 3
    assert scenarios[0].discount_percent > 12.0
    assert scenarios[1].delivery_days > scenarios[0].delivery_days
    assert scenarios[0].is_fulfillment_feasible is True


def test_end_to_end_routing_discount_request():
    deal = {
        "deal_id": "DEAL-1001",
        "customer_tier": "GOLD",
        "quantity": 10,
        "base_price": 1000.0,
        "current_discount_percent": 10.0,
        "required_delivery_days": 5
    }
    conv_id = "test_e2e_routing_1"
    session = conversation_manager.get_or_create(conv_id, "DEAL-1001")

    query = "Can I get 18% discount?"
    entities = entity_extractor.extract_all(query)
    intents, primary = intent_detector.detect_intents(query, entities)

    resp, actions, state, proposal = IntentRouter.route_and_execute(deal, intents, entities, session)

    assert resp.type in ("SCENARIO_RESULT", "CONFIRMATION")
    assert proposal is not None
    assert proposal["discount_percent"] == 18.0
    assert any(a.requires_confirmation for a in actions)
