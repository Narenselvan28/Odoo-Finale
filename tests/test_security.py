"""
Tests for Security, Immutability, and Deal Context Isolation
Verifies that the chatbot does NOT mutate the database directly,
requires explicit confirmation, and maintains quotation safety.
"""

from chatbot.conversation_manager import conversation_manager
from chatbot.intent_router import IntentRouter
from chatbot.entity_extractor import entity_extractor
from chatbot.intent_detector import intent_detector
from chatbot.schemas import ConversationState


def test_immutability_without_explicit_confirmation():
    deal = {
        "deal_id": "DEAL-SECURE-999",
        "customer_tier": "GOLD",
        "current_discount_percent": 10.0,
        "quantity": 20,
        "base_price": 500.0
    }
    conv_id = "test_sec_conv_1"
    session = conversation_manager.get_or_create(conv_id, "DEAL-SECURE-999")

    # Customer asks: "I want 20% discount"
    query = "I want 20% discount"
    entities = entity_extractor.extract_all(query)
    intents, primary = intent_detector.detect_intents(query, entities)

    resp, actions, state, proposal = IntentRouter.route_and_execute(deal, intents, entities, session)

    # 1. Must NOT be marked as ACTION_REQUESTED until confirmed
    assert state == ConversationState.WAITING_FOR_CONFIRMATION
    # 2. Proposal is staged, but deal data remains unmodified
    assert deal["current_discount_percent"] == 10.0
    assert proposal is not None
    assert proposal.get("requires_node_execution") is not True


def test_explicit_confirmation_flow():
    deal = {
        "deal_id": "DEAL-SECURE-999",
        "current_discount_percent": 10.0
    }
    conv_id = "test_sec_conv_2"
    session = conversation_manager.get_or_create(conv_id, "DEAL-SECURE-999")

    # Stage a proposal
    session.set_pending_proposal({
        "action": "MUTATE_DISCOUNT",
        "discount_percent": 18.0
    })

    # Customer confirms: "Yes, submit it"
    confirm_query = "Yes, submit it."
    entities = entity_extractor.extract_all(confirm_query)
    intents, primary = intent_detector.detect_intents(confirm_query, entities)

    resp, actions, state, mutation_payload = IntentRouter.route_and_execute(deal, intents, entities, session)

    # State advances to ACTION_REQUESTED and emits verified payload for Node.js
    assert state == ConversationState.ACTION_REQUESTED
    assert mutation_payload["status"] == "CONFIRMED_BY_CUSTOMER"
    assert mutation_payload["requires_node_execution"] is True
    assert session.pending_proposal is None
