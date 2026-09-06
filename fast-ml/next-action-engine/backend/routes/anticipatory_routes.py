"""
DealFlow360 - Anticipatory Deal Engine
REST API Blueprint (/api/v1/anticipation/*)
"""

import json
import logging
from flask import Blueprint, request, jsonify

from anticipatory.core.events import BusinessEvent, BusinessEventType
from anticipatory.core.anticipatory_engine import AnticipatoryDealEngine
from anticipatory.twin.deal_digital_twin import DealDigitalTwin
from anticipatory.preparers.action_preparer_factory import ActionPreparerFactory
from database import get_db_connection

logger = logging.getLogger(__name__)

anticipation_bp = Blueprint("anticipation_bp", __name__, url_prefix="/api/v1/anticipation")


@anticipation_bp.route("/deals", methods=["GET"])
def get_all_deals():
    """Returns list of active deals in the workspace."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM deals ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    deals = [dict(r) for r in rows]
    for d in deals:
        if d.get("warehouse_stocks_json"):
            d["warehouse_stocks"] = json.loads(d["warehouse_stocks_json"])
    conn.close()
    return jsonify({"success": True, "deals": deals})


@anticipation_bp.route("/deals/<deal_id>", methods=["GET"])
def get_deal_by_id(deal_id):
    """Returns details and current simulation of a specific deal."""
    deal_state = AnticipatoryDealEngine._get_or_create_deal_state(deal_id)
    sim = DealDigitalTwin.simulate_deal_state(deal_state)
    return jsonify({
        "success": True,
        "deal": deal_state,
        "simulation": sim
    })


@anticipation_bp.route("/predict", methods=["POST"])
def predict_operation():
    """
    Ingests a business event and runs the full anticipation pipeline:
    Observe -> Understand -> Predict -> Simulate -> Prepare
    """
    data = request.get_json() or {}
    deal_id = data.get("deal_id", "DEAL-1001")
    event_type = data.get("event_type", BusinessEventType.QUOTATION_CREATED.value)
    user_id = data.get("user_id", "USER-101")
    metadata = data.get("metadata", {})
    previous_state = data.get("previous_state")
    new_state = data.get("new_state")

    event = BusinessEvent(
        deal_id=deal_id,
        event_type=event_type,
        user_id=user_id,
        metadata=metadata,
        previous_state=previous_state,
        new_state=new_state
    )

    result = AnticipatoryDealEngine.process_event(event)
    return jsonify({"success": True, "result": result})


@anticipation_bp.route("/simulate", methods=["POST"])
def simulate_operation():
    """
    Runs Deal Digital Twin what-if simulation for a hypothetical candidate action.
    """
    data = request.get_json() or {}
    deal_id = data.get("deal_id", "DEAL-1001")
    candidate_action = data.get("action", "RECOMMEND_DISCOUNT")
    candidate_params = data.get("params", {})

    deal_state = AnticipatoryDealEngine._get_or_create_deal_state(deal_id)
    sim_result = DealDigitalTwin.simulate_candidate_action(
        current_deal=deal_state,
        candidate_action=candidate_action,
        candidate_params=candidate_params
    )

    return jsonify({
        "success": True,
        "deal_id": deal_id,
        "candidate_action": candidate_action,
        "simulation": sim_result
    })


@anticipation_bp.route("/prepare", methods=["POST"])
def prepare_operation():
    """
    Constructs concrete operational payload for a specific candidate action.
    """
    data = request.get_json() or {}
    deal_id = data.get("deal_id", "DEAL-1001")
    action_name = data.get("action", "RECOMMEND_DISCOUNT")

    deal_state = AnticipatoryDealEngine._get_or_create_deal_state(deal_id)
    sim_result = DealDigitalTwin.simulate_deal_state(deal_state)
    prepared = ActionPreparerFactory.prepare_action(
        action_name=action_name,
        deal_data=deal_state,
        sim_result=sim_result
    )

    return jsonify({
        "success": True,
        "prepared_action": prepared
    })


@anticipation_bp.route("/confirm", methods=["POST"])
def confirm_operation():
    """
    Executes a user-confirmed prepared operation.
    Applies real deal updates, records feedback, and triggers follow-up anticipation cycle.
    """
    data = request.get_json() or {}
    prepared_id = data.get("prepared_id")
    deal_id = data.get("deal_id", "DEAL-1001")
    user_id = data.get("user_id", "USER-101")

    if not prepared_id:
        return jsonify({"success": False, "error": "prepared_id is required"}), 400

    result = AnticipatoryDealEngine.confirm_and_execute(
        prepared_id=prepared_id,
        deal_id=deal_id,
        user_id=user_id
    )

    return jsonify(result)


@anticipation_bp.route("/dismiss", methods=["POST"])
def dismiss_operation():
    """
    Dismisses a prepared action and records user feedback penalty.
    """
    data = request.get_json() or {}
    prepared_id = data.get("prepared_id")
    deal_id = data.get("deal_id", "DEAL-1001")
    user_id = data.get("user_id", "USER-101")
    reason = data.get("reason", "User dismissed")

    if not prepared_id:
        return jsonify({"success": False, "error": "prepared_id is required"}), 400

    result = AnticipatoryDealEngine.dismiss_action(
        prepared_id=prepared_id,
        deal_id=deal_id,
        user_id=user_id,
        reason=reason
    )

    return jsonify(result)


@anticipation_bp.route("/next-actions/<deal_id>", methods=["GET"])
def get_next_actions(deal_id):
    """
    Returns active prepared actions and top candidate recommendations for a deal.
    """
    actions = AnticipatoryDealEngine.get_next_best_actions(deal_id)
    deal_state = AnticipatoryDealEngine._get_or_create_deal_state(deal_id)
    sim = DealDigitalTwin.simulate_deal_state(deal_state)
    return jsonify({
        "success": True,
        "deal_id": deal_id,
        "prepared_actions": actions,
        "simulation": sim
    })


@anticipation_bp.route("/history/<deal_id>", methods=["GET"])
def get_deal_history(deal_id):
    """
    Returns audit trail of past events, predictions, simulations, and user decisions.
    """
    history = AnticipatoryDealEngine.get_deal_audit_history(deal_id)
    return jsonify({
        "success": True,
        "deal_id": deal_id,
        "audit_logs": history
    })


@anticipation_bp.route("/explanation/<prediction_id>", methods=["GET"])
def get_prediction_explanation(prediction_id):
    """
    Returns deep explainability dossier for why an operation was anticipated.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM next_action_predictions WHERE prediction_id = ?", (prediction_id,))
    pred_row = cursor.fetchone()

    if not pred_row:
        conn.close()
        return jsonify({"success": False, "error": "Prediction not found"}), 404

    cursor.execute("SELECT * FROM prepared_actions WHERE prediction_id = ?", (prediction_id,))
    prep_row = cursor.fetchone()
    conn.close()

    return jsonify({
        "success": True,
        "prediction": {
            "prediction_id": pred_row["prediction_id"],
            "deal_id": pred_row["deal_id"],
            "event_id": pred_row["event_id"],
            "predicted_action": pred_row["predicted_action"],
            "probability": pred_row["probability"],
            "confidence": pred_row["confidence"],
            "urgency": pred_row["urgency"],
            "business_impact": pred_row["business_impact"],
            "reasons": json.loads(pred_row["reasons_json"] or "[]"),
            "candidates": json.loads(pred_row["candidates_json"] or "[]"),
            "display_mode": pred_row["display_mode"],
            "timestamp": pred_row["timestamp"]
        },
        "prepared_action": dict(prep_row) if prep_row else None
    })
