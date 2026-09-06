"""
DealFlow360 - Customer Chatbot Route
Flask Blueprint exposing the customer-facing conversational deal assistant.
Implements:
- POST /api/v1/intelligence/customer-chat
- GET  /api/v1/intelligence/customer-chat/health
- GET  /api/v1/intelligence/customer-chat/intents
- POST /api/v1/intelligence/customer-chat/confirm
- POST /api/v1/intelligence/customer-chat/cancel
"""

import time
import logging
from flask import Blueprint, request, jsonify

from chatbot.schemas import (
    CustomerChatRequest,
    CustomerChatResponse,
    ConversationState
)
from chatbot.intent_detector import intent_detector
from chatbot.entity_extractor import entity_extractor
from chatbot.conversation_manager import conversation_manager
from chatbot.intent_router import IntentRouter
from chatbot.confidence import ConfidenceManager
from chatbot.response_builder import ResponseBuilder

logger = logging.getLogger(__name__)

customer_chat_bp = Blueprint("customer_chat_bp", __name__)

DEFAULT_DEAL_CONTEXT = {
    "deal_id": "DEAL-1001",
    "customer_id": "CUST-101",
    "customer_tier": "GOLD",
    "category": "ELECTRONICS",
    "quantity": 500,
    "base_price": 1000.0,
    "product_cost": 650.0,
    "discount_percent": 12.0,
    "current_discount_percent": 12.0,
    "required_delivery_days": 4,
    "margin_percent": 19.2,
    "customer_avg_discount": 10.0,
    "customer_max_discount": 20.0,
    "warehouses": [
        {
            "warehouse_id": "WH-A",
            "available_stock": 400,
            "reserved_stock": 50,
            "capacity": 1000,
            "current_load": 600,
            "distance_km": 120,
            "transport_rate_per_km": 10,
            "processing_days": 1
        }
    ]
}


@customer_chat_bp.route("/api/v1/intelligence/customer-chat", methods=["POST"])
def customer_chat():
    """
    Main conversational endpoint for DealFlow360 Customer Chatbot.
    Accepts user utterance, extracts intent and entities, orchestrates intelligence,
    and returns structured JSON.
    """
    t0 = time.perf_counter()
    data = request.get_json(silent=True) or {}

    conversation_id = data.get("conversation_id", f"conv_{int(time.time())}")
    deal_id = data.get("deal_id", "DEAL-1001")
    user_message = (data.get("message") or "").strip()

    if not user_message:
        return jsonify({
            "error": "Message cannot be empty."
        }), 400

    # 1. Retrieve or initialize conversation session
    session = conversation_manager.get_or_create(conversation_id, deal_id, data.get("customer_id"))
    session.set_state(ConversationState.UNDERSTANDING)

    # 2. Extract Entities
    entities = entity_extractor.extract_all(user_message)
    session.set_state(ConversationState.ENTITY_EXTRACTION)

    # 3. Detect Intents (supports single and compound requests)
    intents, primary_intent = intent_detector.detect_intents(user_message, entities)
    session.set_state(ConversationState.INTENT_DETECTED)

    # 4. Resolve Deal Context (from payload override or default)
    deal_context = dict(DEFAULT_DEAL_CONTEXT)
    if "deal_id" in entities and entities["deal_id"].value:
        deal_context["deal_id"] = entities["deal_id"].value
    if data.get("context_override"):
        deal_context.update(data["context_override"])

    # 5. Route and execute intent
    session.set_state(ConversationState.ANALYZING)
    resp, actions, new_state, pending_proposal = IntentRouter.route_and_execute(
        deal_context, intents, entities, session
    )
    session.set_state(new_state)

    # 6. Record interaction history
    session.add_message("customer", user_message, intents=intents, entities=entities)
    session.add_message("assistant", getattr(resp, "message", ""), state=session.state)

    elapsed_ms = round((time.perf_counter() - t0) * 1000.0, 2)

    response_payload = {
        "conversation_id": conversation_id,
        "deal_id": deal_id,
        "state": session.state.value,
        "primary_intent": primary_intent,
        "intents": [i.model_dump() if hasattr(i, "model_dump") else (i.dict() if hasattr(i, "dict") else i) for i in intents],
        "entities": {k: (v.model_dump() if hasattr(v, "model_dump") else (v.dict() if hasattr(v, "dict") else v)) for k, v in entities.items()},
        "response": resp.model_dump() if hasattr(resp, "model_dump") else (resp.dict() if hasattr(resp, "dict") else resp),
        "actions": [a.model_dump() if hasattr(a, "model_dump") else (a.dict() if hasattr(a, "dict") else a) for a in actions],
        "pending_proposal": pending_proposal,
        "latency_ms": elapsed_ms
    }

    return jsonify(response_payload), 200


@customer_chat_bp.route("/api/v1/intelligence/customer-chat/health", methods=["GET"])
def customer_chat_health():
    """Health check for customer chatbot service."""
    classes_cnt = len(intent_detector._classes) if intent_detector._classes is not None else 16
    return jsonify({
        "status": "HEALTHY",
        "service": "dealflow360-customer-chat",
        "intent_model_loaded": intent_detector.is_loaded(),
        "classes_count": classes_cnt,
        "model_metadata": intent_detector.metadata
    }), 200


@customer_chat_bp.route("/api/v1/intelligence/customer-chat/intents", methods=["GET"])
def customer_chat_intents():
    """Returns list of all 16 supported intents and descriptions."""
    intents_meta = intent_detector.metadata.get("intent_metadata", {})
    return jsonify({
        "success": True,
        "total_intents": len(intents_meta),
        "intents": intents_meta
    }), 200


@customer_chat_bp.route("/api/v1/intelligence/customer-chat/confirm", methods=["POST"])
def customer_chat_confirm():
    """Explicitly confirms pending proposal and emits Node.js mutation event."""
    data = request.get_json(silent=True) or {}
    conv_id = data.get("conversation_id")
    session = conversation_manager.get_session(conv_id)

    if not session or not session.pending_proposal:
        return jsonify({
            "success": False,
            "error": "No pending proposal found for this conversation session."
        }), 404

    proposal = session.pending_proposal
    session.clear_pending_proposal()

    return jsonify({
        "success": True,
        "status": "MUTATION_DISPATCHED",
        "deal_id": session.deal_id,
        "confirmed_action": proposal,
        "message": "Quotation change confirmed. Forwarded to Node.js for database execution."
    }), 200


@customer_chat_bp.route("/api/v1/intelligence/customer-chat/cancel", methods=["POST"])
def customer_chat_cancel():
    """Cancels pending proposal without mutation."""
    data = request.get_json(silent=True) or {}
    conv_id = data.get("conversation_id")
    session = conversation_manager.get_session(conv_id)

    if session:
        session.clear_pending_proposal()

    return jsonify({
        "success": True,
        "status": "CANCELLED",
        "message": "Pending proposal cancelled. Quotation remains unchanged."
    }), 200
