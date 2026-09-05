"""
DealFlow360 - Next Action Prediction Engine
Action Routes & ERP Data APIs
"""

from flask import Blueprint, request, jsonify
from services.action_service import action_service
from services.recommendation_service import recommendation_service
from database import get_db_connection

action_bp = Blueprint("action_bp", __name__)


@action_bp.route("/api/actions", methods=["POST"])
def log_action():
    """
    Logs user action and evaluates if a smart recommendation should be returned.
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id", "default_session")
    user_id = data.get("user_id", "user_001")
    action = data.get("action")
    metadata = data.get("metadata", {})

    if not action:
        return jsonify({"success": False, "error": "Action name is required"}), 400

    # 1. Track Action in SQLite
    action_service.track_action(session_id, user_id, action, metadata)

    # 2. Retrieve recent session action sequence
    recent_actions = action_service.get_recent_actions(session_id, limit=6)

    # 3. Two-Stage Recommendation Evaluation
    rec_result = recommendation_service.evaluate_and_predict(
        session_id=session_id,
        current_action=action,
        recent_actions=recent_actions,
        metadata=metadata
    )

    return jsonify({
        "success": True,
        "action_recorded": action,
        "session_id": session_id,
        "recommendation_eval": rec_result
    }), 200


@action_bp.route("/api/actions/session/<session_id>", methods=["GET"])
def get_session_actions(session_id):
    """Returns recent action history for a session."""
    actions = action_service.get_recent_actions(session_id, limit=20)
    return jsonify({
        "session_id": session_id,
        "actions": actions,
        "total": len(actions)
    }), 200


@action_bp.route("/api/erp/data", methods=["GET"])
def get_erp_data():
    """Returns ERP products, customers, quotations, and orders for the frontend."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM erp_products")
    products = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM erp_customers")
    customers = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM erp_quotations")
    quotations = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM erp_orders")
    orders = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return jsonify({
        "products": products,
        "customers": customers,
        "quotations": quotations,
        "orders": orders
    }), 200
