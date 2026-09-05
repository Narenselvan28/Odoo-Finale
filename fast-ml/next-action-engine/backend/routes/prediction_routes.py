"""
DealFlow360 - Next Action Prediction Engine
Prediction & Feedback Routes
"""

from flask import Blueprint, request, jsonify
from services.action_service import action_service
from services.recommendation_service import recommendation_service
from database import get_db_connection

prediction_bp = Blueprint("prediction_bp", __name__)


@prediction_bp.route("/api/predict-next-action", methods=["POST"])
def predict_next_action():
    """
    Predicts next action given session ID and current action context.
    """
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id", "default_session")
    current_action = data.get("current_action")
    metadata = data.get("metadata", {})

    if not current_action:
        return jsonify({"success": False, "error": "current_action is required"}), 400

    recent_actions = action_service.get_recent_actions(session_id, limit=6)
    if not recent_actions or recent_actions[-1] != current_action:
        recent_actions.append(current_action)

    result = recommendation_service.evaluate_and_predict(
        session_id=session_id,
        current_action=current_action,
        recent_actions=recent_actions,
        metadata=metadata
    )

    return jsonify(result), 200


@prediction_bp.route("/api/recommendations/<session_id>", methods=["GET"])
def get_session_recommendations(session_id):
    """Retrieves all recommendation records for a session."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM recommendations WHERE session_id = ? ORDER BY id DESC",
        (session_id,)
    )
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return jsonify({
        "session_id": session_id,
        "recommendations": rows,
        "total": len(rows)
    }), 200


@prediction_bp.route("/api/recommendations/<int:rec_id>/click", methods=["POST"])
def record_recommendation_click(rec_id):
    """Records user acceptance/click on a recommendation popup."""
    recommendation_service.record_click(rec_id)
    return jsonify({
        "success": True,
        "recommendation_id": rec_id,
        "status": "clicked"
    }), 200


@prediction_bp.route("/api/recommendations/<int:rec_id>/dismiss", methods=["POST"])
def record_recommendation_dismiss(rec_id):
    """Records user dismissal on a recommendation popup."""
    recommendation_service.record_dismiss(rec_id)
    return jsonify({
        "success": True,
        "recommendation_id": rec_id,
        "status": "dismissed"
    }), 200


@prediction_bp.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    """Returns analytics and CTR performance for the dashboard."""
    stats = action_service.get_dashboard_stats()
    return jsonify(stats), 200
