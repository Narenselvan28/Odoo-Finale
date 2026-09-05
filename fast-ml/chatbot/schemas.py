"""
DealFlow360 - Customer Chatbot Schemas
Pydantic data contracts for conversation state, entities, intents,
structured responses, actions, and API request/response formats.
"""

from typing import Dict, List, Optional, Any, Union
from enum import Enum
from pydantic import BaseModel, Field


class ConversationState(str, Enum):
    """Conversation state machine states."""
    IDLE = "IDLE"
    UNDERSTANDING = "UNDERSTANDING"
    INTENT_DETECTED = "INTENT_DETECTED"
    ENTITY_EXTRACTION = "ENTITY_EXTRACTION"
    FETCHING_QUOTE = "FETCHING_QUOTE"
    ANALYZING = "ANALYZING"
    SIMULATION = "SIMULATION"
    WAITING_FOR_CONFIRMATION = "WAITING_FOR_CONFIRMATION"
    ACTION_REQUESTED = "ACTION_REQUESTED"
    COMPLETED = "COMPLETED"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
    ERROR = "ERROR"


class IntentConfidence(BaseModel):
    """Identified intent with confidence score."""
    name: str
    confidence: float
    description: Optional[str] = None


class ExtractedEntity(BaseModel):
    """Normalized extracted entity with confidence and raw match."""
    value: Any
    normalized_value: Any
    source_text: str
    confidence: float = 1.0
    entity_type: str


class ChatAction(BaseModel):
    """Structured action for customer UI (quick actions or confirmation buttons)."""
    id: str
    label: str
    type: str = "BUTTON"  # BUTTON, QUICK_REPLY, LINK
    requires_confirmation: bool = False
    payload: Optional[Dict[str, Any]] = None


class ResponseSection(BaseModel):
    """Visual section within the structured response (e.g. key-value table)."""
    label: str
    current: Optional[str] = None
    proposed: Optional[str] = None
    value: Optional[str] = None
    status: Optional[str] = None  # normal, warning, critical


class FeasibleScenario(BaseModel):
    """Pre-computed scenario for 'Find a Better Deal' comparisons."""
    id: str
    title: str
    description: str
    discount_percent: float
    delivery_days: int
    estimated_margin_percent: float
    requires_approval: bool
    is_fulfillment_feasible: bool
    trade_off_explanation: str
    score: float


class StructuredResponse(BaseModel):
    """Complete customer-facing response layout for React frontend rendering."""
    type: str  # MESSAGE, SCENARIO_RESULT, COMPARISON, CONFIRMATION, CLARIFICATION, ERROR
    message: str
    sections: Optional[List[ResponseSection]] = None
    scenarios: Optional[List[FeasibleScenario]] = None
    warnings: Optional[List[str]] = None
    approval_status: Optional[Dict[str, Any]] = None
    explanation: Optional[Dict[str, Any]] = None


class CustomerChatRequest(BaseModel):
    """Request payload from Node.js / React for customer chat turn."""
    conversation_id: str
    deal_id: str
    message: str
    customer_id: Optional[str] = None
    context_override: Optional[Dict[str, Any]] = None


class CustomerChatResponse(BaseModel):
    """Structured JSON response returned by Python Flask Customer Chatbot."""
    conversation_id: str
    deal_id: str
    state: ConversationState
    intents: List[IntentConfidence]
    primary_intent: str
    entities: Dict[str, ExtractedEntity]
    response: StructuredResponse
    actions: List[ChatAction]
    pending_proposal: Optional[Dict[str, Any]] = None
    latency_ms: Optional[float] = None
