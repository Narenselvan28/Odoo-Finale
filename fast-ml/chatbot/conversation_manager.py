"""
DealFlow360 - Conversation State Manager
Manages in-memory session states, turn history, and explicit confirmation lifecycle.
Implements the 12-state conversation state machine.
"""

import time
import logging
from typing import Dict, List, Optional, Any
from chatbot.schemas import ConversationState

logger = logging.getLogger(__name__)


class ConversationSession:
    """Represents a single active conversation session for a deal negotiation."""

    def __init__(self, conversation_id: str, deal_id: str, customer_id: Optional[str] = None):
        self.conversation_id = conversation_id
        self.deal_id = deal_id
        self.customer_id = customer_id or "CUST-CURRENT"
        self.state: ConversationState = ConversationState.IDLE
        self.history: List[Dict[str, Any]] = []
        self.pending_proposal: Optional[Dict[str, Any]] = None
        self.last_simulation: Optional[Dict[str, Any]] = None
        self.negotiation_reasons: List[str] = []
        self.created_at: float = time.time()
        self.updated_at: float = time.time()

    def add_message(
        self,
        role: str,
        message: str,
        intents: Optional[List[Any]] = None,
        entities: Optional[Dict[str, Any]] = None,
        state: Optional[ConversationState] = None
    ):
        turn = {
            "turn_id": len(self.history) + 1,
            "timestamp": time.time(),
            "role": role,  # 'customer' or 'assistant'
            "message": message,
            "intents": [i.model_dump() if hasattr(i, "model_dump") else (i.dict() if hasattr(i, "dict") else i) for i in (intents or [])],
            "entities": {k: (v.model_dump() if hasattr(v, "model_dump") else (v.dict() if hasattr(v, "dict") else v)) for k, v in (entities or {}).items()},
            "state": (state or self.state).value
        }
        self.history.append(turn)
        self.updated_at = time.time()

    def set_state(self, new_state: ConversationState):
        self.state = new_state
        self.updated_at = time.time()

    def transition_to(self, new_state: ConversationState):
        self.set_state(new_state)

    def set_pending_proposal(self, proposal: Dict[str, Any]):
        self.pending_proposal = proposal
        self.state = ConversationState.WAITING_FOR_CONFIRMATION
        self.updated_at = time.time()

    def clear_pending_proposal(self):
        self.pending_proposal = None
        self.state = ConversationState.IDLE
        self.updated_at = time.time()

    def record_turn(self, user_message: str, response_payload: Dict[str, Any], intent: str, entities: Dict[str, Any]):
        self.add_message("customer", user_message, intents=[intent], entities=entities)
        self.add_message("assistant", str(response_payload.get("message", "")), state=self.state)


class ConversationManager:
    """Singleton session manager managing conversation state and proposals."""

    def __init__(self):
        self._sessions: Dict[str, ConversationSession] = {}

    def get_or_create(self, conversation_id: str, deal_id: str, customer_id: Optional[str] = None) -> ConversationSession:
        if conversation_id not in self._sessions:
            logger.info(f"Creating new conversation session {conversation_id} for deal {deal_id}")
            self._sessions[conversation_id] = ConversationSession(conversation_id, deal_id, customer_id)
        session = self._sessions[conversation_id]
        if deal_id and session.deal_id != deal_id:
            session.deal_id = deal_id
        return session

    def get_or_create_session(self, conversation_id: str, deal_id: str, customer_id: Optional[str] = None) -> ConversationSession:
        return self.get_or_create(conversation_id, deal_id, customer_id)

    def get_session(self, conversation_id: str) -> Optional[ConversationSession]:
        return self._sessions.get(conversation_id)

    def set_state(self, conversation_id: str, state: ConversationState):
        session = self._sessions.get(conversation_id)
        if session:
            session.set_state(state)

    def set_pending_proposal(self, conversation_id: str, proposal: Dict[str, Any]):
        session = self._sessions.get(conversation_id)
        if session:
            session.set_pending_proposal(proposal)

    def clear_pending_proposal(self, conversation_id: str):
        session = self._sessions.get(conversation_id)
        if session:
            session.clear_pending_proposal()

    def clear_all(self):
        """Utility for clearing sessions in tests."""
        self._sessions.clear()


# Singleton instance
conversation_manager = ConversationManager()
