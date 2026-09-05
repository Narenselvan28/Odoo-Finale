"""
DealFlow360 - Next Action Prediction Engine
Recommendation Service & Decision Layer
Implements Two-Stage Triggering, Cooldown Checks, Anti-Spam Rules, and Feedback Tracking.
"""

import time
import logging
from datetime import datetime
from config import Config
from database import get_db_connection
from ml.model_manager import model_manager
from services.explanation_service import get_explanation_for_action

logger = logging.getLogger(__name__)


class RecommendationService:
    def __init__(self):
        self.cooldown_seconds = Config.COOLDOWN_SECONDS
        self.confidence_threshold = Config.CONFIDENCE_THRESHOLD
        self.max_per_session = Config.MAX_RECOMMENDATIONS_PER_SESSION

    def evaluate_and_predict(self, session_id, current_action, recent_actions, metadata=None):
        """
        Executes ML prediction, runs the two-stage decision pipeline,
        and generates a formatted recommendation response if eligible.
        """
        metadata = metadata or {}

        # 1. Run ML Prediction
        try:
            prediction_result = model_manager.predict(recent_actions, top_k=3)
        except Exception as e:
            logger.exception(f"ML prediction error: {e}")
            return {
                "success": False,
                "should_show": False,
                "reason": "prediction_error",
                "message": str(e)
            }

        top_rec = prediction_result.get("recommendation")
        alternatives = prediction_result.get("alternatives", [])

        if not top_rec:
            return {
                "success": True,
                "should_show": False,
                "reason": "no_valid_prediction",
                "current_action": current_action,
                "recommendation": None
            }

        # 2. Evaluate Decision Rules (Two-Stage Recommendation Trigger)
        decision = self.should_show_recommendation(
            session_id=session_id,
            current_action=current_action,
            predicted_action=top_rec["action"],
            probability=top_rec["probability"]
        )

        explanation = get_explanation_for_action(
            action_name=top_rec["action"],
            current_action=current_action,
            metadata=metadata
        )

        rec_id = None
        if decision["show"]:
            # Record into SQLite recommendation table
            rec_id = self._log_recommendation(
                session_id=session_id,
                current_action=current_action,
                recommended_action=top_rec["action"],
                probability=top_rec["probability"],
                confidence=top_rec["confidence"]
            )

        return {
            "success": True,
            "session_id": session_id,
            "current_action": current_action,
            "should_show": decision["show"],
            "decision_reason": decision["reason"],
            "recommendation_id": rec_id,
            "recommendation": {
                "action": top_rec["action"],
                "probability": top_rec["probability"],
                "confidence": top_rec["confidence"],
                "explanation": explanation
            } if top_rec else None,
            "alternatives": alternatives
        }

    def should_show_recommendation(self, session_id, current_action, predicted_action, probability):
        """
        Backend Decision Function:
        Determines whether a recommendation card should be shown to the user.
        """
        # Rule 1: Action Priority / Eligibility Check
        if current_action not in Config.TRIGGERABLE_ACTIONS:
            return {
                "show": False,
                "reason": "action_not_eligible"
            }

        # Rule 2: Confidence Threshold Check
        if probability < self.confidence_threshold:
            return {
                "show": False,
                "reason": "low_confidence"
            }

        # Rule 3: Avoid recommending the exact same action that was just performed
        if predicted_action == current_action:
            return {
                "show": False,
                "reason": "redundant_action"
            }

        # Query past recommendations for this session from SQLite
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT * FROM recommendations WHERE session_id = ? ORDER BY id DESC",
            (session_id,)
        )
        session_recs = cursor.fetchall()
        conn.close()

        # Rule 4: Session Limit Check
        if len(session_recs) >= self.max_per_session:
            return {
                "show": False,
                "reason": "session_limit_reached"
            }

        if session_recs:
            last_rec = session_recs[0]
            last_time = datetime.fromisoformat(last_rec["timestamp"]).timestamp()
            now_time = time.time()

            # Rule 5: Time Cooldown Check
            if (now_time - last_time) < self.cooldown_seconds:
                return {
                    "show": False,
                    "reason": "cooldown_active"
                }

            # Rule 6: Duplicate Protection
            for rec in session_recs:
                # If already shown, clicked, or dismissed in this session
                if rec["recommended_action"] == predicted_action:
                    if rec["status"] in ["shown", "clicked", "dismissed"]:
                        return {
                            "show": False,
                            "reason": "duplicate_recommendation"
                        }

        return {
            "show": True,
            "reason": "high_confidence_business_action"
        }

    def _log_recommendation(self, session_id, current_action, recommended_action, probability, confidence):
        """Logs shown recommendation into SQLite database."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO recommendations (session_id, current_action, recommended_action, probability, confidence, status, timestamp)
            VALUES (?, ?, ?, ?, ?, 'shown', ?)
        """, (session_id, current_action, recommended_action, probability, confidence, datetime.now().isoformat()))
        conn.commit()
        rec_id = cursor.lastrowid
        conn.close()
        return rec_id

    def record_click(self, recommendation_id):
        """Marks recommendation as clicked/accepted by user."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE recommendations SET status = 'clicked' WHERE id = ?",
            (recommendation_id,)
        )
        conn.commit()
        conn.close()
        return True

    def record_dismiss(self, recommendation_id):
        """Marks recommendation as dismissed by user."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE recommendations SET status = 'dismissed' WHERE id = ?",
            (recommendation_id,)
        )
        conn.commit()
        conn.close()
        return True


recommendation_service = RecommendationService()
