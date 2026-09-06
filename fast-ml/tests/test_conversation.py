"""
Tests for Conversation State Machine & Lifecycle
Verifies transition across IDLE, SIMULATION, WAITING_FOR_CONFIRMATION, and ACTION_REQUESTED.
"""

from chatbot.conversation_manager import conversation_manager
from chatbot.schemas import ConversationState


def test_session_lifecycle():
    conv_id = "test_conv_lifecycle_101"
    deal_id = "DEAL-1001"

    session = conversation_manager.get_or_create(conv_id, deal_id)
    assert session.state == ConversationState.IDLE
    assert len(session.history) == 0

    # Add turn
    session.add_message("customer", "Can I get 18% discount?")
    assert len(session.history) == 1

    # Stage proposal
    session.set_pending_proposal({
        "action": "MUTATE_DISCOUNT",
        "discount_percent": 18.0,
        "projected_margin": 13.4
    })
    assert session.state == ConversationState.WAITING_FOR_CONFIRMATION
    assert session.pending_proposal["discount_percent"] == 18.0

    # Clear/Confirm
    session.clear_pending_proposal()
    assert session.state == ConversationState.COMPLETED
    assert session.pending_proposal is None
