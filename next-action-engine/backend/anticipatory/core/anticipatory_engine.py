"""
DealFlow360 - Anticipatory Deal Engine
Central Orchestration Engine: Observe -> Understand -> Predict -> Simulate -> Prepare -> Confirm -> Execute -> Learn
"""

import json
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from database import get_db_connection
from .events import BusinessEvent, BusinessEventType
from .workflow_state_machine import WorkflowStateMachine, WorkflowState
from ..twin.deal_digital_twin import DealDigitalTwin
from ..twin.rule_validator import RuleValidator
from ..ml.action_predictor import ActionPredictor
from ..decision.candidate_ranker import CandidateRanker
from ..decision.policy import InterventionPolicy
from ..preparers.action_preparer_factory import ActionPreparerFactory

logger = logging.getLogger(__name__)


class AnticipatoryDealEngine:
    """
    Core Anticipatory Deal Engine for DealFlow360.
    Predicts, simulates, pre-computes, and prepares business operations before the user asks.
    """

    @classmethod
    def process_event(cls, event: BusinessEvent) -> Dict[str, Any]:
        """
        Main entry point when a meaningful business event occurs.
        Executes: Observe -> Understand -> Predict -> Simulate -> Prepare -> Persist
        """
        logger.info(f"[AnticipatoryEngine] Processing event: {event.event_type} for deal: {event.deal_id}")

        # 1. UNDERSTAND - Retrieve Deal State
        deal_state = cls._get_or_create_deal_state(event.deal_id, event.metadata)

        # 2. SIMULATE current deal state via Digital Twin
        current_simulation = DealDigitalTwin.simulate_deal_state(deal_state)

        # 3. PREDICT candidate next business operations
        candidates = ActionPredictor.predict_next_candidates(
            last_event=event.event_type,
            deal_data=deal_state,
            sim_result=current_simulation
        )

        # 4. RANK candidates with Digital Twin consequence & Rule validation
        ranked_candidates = CandidateRanker.rank_candidates(
            candidates=candidates,
            deal_data=deal_state,
            sim_result=current_simulation
        )

        if not ranked_candidates:
            logger.info(f"[AnticipatoryEngine] No eligible candidates for event {event.event_type}")
            cls._persist_event(event)
            return {
                "event_id": event.event_id,
                "deal_id": event.deal_id,
                "prediction": None,
                "prepared_action": None,
                "display_mode": "SUPPRESSED",
                "message": "No actionable operation anticipated."
            }

        top_candidate = ranked_candidates[0]

        # 5. PREPARE concrete operation payload for top candidate
        prepared_action = ActionPreparerFactory.prepare_action(
            action_name=top_candidate["action"],
            deal_data=deal_state,
            sim_result=current_simulation
        )

        # 6. INTERVENE Policy check
        should_show, display_mode, policy_reason = InterventionPolicy.evaluate_intervention(
            deal_id=event.deal_id,
            event_type=event.event_type,
            top_action=top_candidate
        )

        # 7. PERSIST Event, Prediction, Prepared Action, and Audit Log
        prediction_id = f"pred_{uuid.uuid4().hex[:10]}"
        cls._persist_anticipation_cycle(
            event=event,
            deal_state=deal_state,
            prediction_id=prediction_id,
            top_candidate=top_candidate,
            all_candidates=ranked_candidates,
            current_simulation=current_simulation,
            prepared_action=prepared_action,
            display_mode=display_mode
        )

        result_payload = {
            "prediction_id": prediction_id,
            "event_id": event.event_id,
            "deal_id": event.deal_id,
            "event_type": event.event_type,
            "predicted_action": top_candidate["action"],
            "probability": top_candidate["probability"],
            "confidence": top_candidate["confidence"],
            "urgency": top_candidate["urgency"],
            "reasons": top_candidate["reasons"],
            "affected_modules": top_candidate["affected_modules"],
            "display_mode": display_mode,
            "should_show": should_show,
            "policy_reason": policy_reason,
            "prepared_action": prepared_action,
            "simulation": current_simulation,
            "all_candidates": ranked_candidates[:4]
        }

        return result_payload

    @classmethod
    def confirm_and_execute(cls, prepared_id: str, deal_id: str, user_id: str) -> Dict[str, Any]:
        """
        Executes a user-confirmed prepared operation, updates deal state, and creates new follow-up event.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Fetch prepared action
        cursor.execute("SELECT * FROM prepared_actions WHERE prepared_id = ?", (prepared_id,))
        row = cursor.fetchone()
        if not row:
            conn.close()
            return {"success": False, "error": f"Prepared action {prepared_id} not found."}

        action_name = row["action"]
        payload = json.loads(row["payload_json"] or "{}")

        # 2. Update status to EXECUTED
        cursor.execute("""
            UPDATE prepared_actions 
            SET status = 'EXECUTED', executed_at = ? 
            WHERE prepared_id = ?
        """, (datetime.utcnow().isoformat() + "Z", prepared_id))

        # 3. Record Action Feedback (User Accepted)
        cursor.execute("""
            INSERT INTO action_feedback (feedback_id, prepared_id, deal_id, user_id, action, user_decision, timestamp)
            VALUES (?, ?, ?, ?, ?, 'ACCEPTED', ?)
        """, (f"fb_{uuid.uuid4().hex[:8]}", prepared_id, deal_id, user_id, action_name, datetime.utcnow().isoformat() + "Z"))

        conn.commit()
        conn.close()

        # 4. Apply state changes to Deal
        deal_state = cls._get_or_create_deal_state(deal_id)
        next_event_type = None

        if action_name == "RECOMMEND_DISCOUNT":
            new_discount = payload.get("recommended_discount_percent", 10.0)
            deal_state["discount_percent"] = new_discount
            next_event_type = BusinessEventType.DISCOUNT_CHANGED.value

        elif action_name == "REQUEST_APPROVAL":
            deal_state["status"] = "APPROVAL_PENDING"
            next_event_type = BusinessEventType.APPROVAL_REQUIRED.value

        elif action_name == "ALLOCATE_WAREHOUSE":
            deal_state["status"] = "ALLOCATED"
            deal_state["allocation_plan"] = payload.get("allocations", [])
            shortage = payload.get("shortage_units", 0)
            if shortage > 0:
                next_event_type = BusinessEventType.STOCK_SHORTAGE_DETECTED.value
            else:
                next_event_type = BusinessEventType.WAREHOUSE_ALLOCATION_CHANGED.value

        elif action_name == "CREATE_REPLENISHMENT":
            deal_state["status"] = "REPLENISHMENT_ORDERED"
            next_event_type = BusinessEventType.REPLENISHMENT_REQUIRED.value

        elif action_name == "REVISE_QUOTATION":
            deal_state["status"] = "NEGOTIATION"
            deal_state["quote_version"] = deal_state.get("quote_version", 1) + 1
            next_event_type = BusinessEventType.QUOTATION_EDITED.value

        elif action_name == "CONFIRM_ORDER":
            deal_state["status"] = "CONFIRMED"
            next_event_type = BusinessEventType.ORDER_CONFIRMED.value

        elif action_name == "GENERATE_INVOICE":
            deal_state["status"] = "INVOICED"
            next_event_type = BusinessEventType.INVOICE_READY.value

        elif action_name == "CREATE_SUBSCRIPTION_BILLING":
            deal_state["status"] = "SUBSCRIPTION_ACTIVE"
            next_event_type = BusinessEventType.SUBSCRIPTION_CREATED.value

        # Update deal record
        cls._save_deal_state(deal_id, deal_state)

        logger.info(f"[AnticipatoryEngine] Executed action: {action_name} for deal: {deal_id}")

        # 5. Automatically trigger the Next Anticipatory Cycle if follow-up event exists
        next_cycle = None
        if next_event_type:
            followup_event = BusinessEvent(
                deal_id=deal_id,
                event_type=next_event_type,
                user_id=user_id,
                metadata={"executed_action": action_name, "payload": payload},
                previous_state=action_name,
                new_state=deal_state.get("status", "UPDATED")
            )
            next_cycle = cls.process_event(followup_event)

        return {
            "success": True,
            "executed_action": action_name,
            "deal_id": deal_id,
            "updated_deal_state": deal_state,
            "followup_event": next_event_type,
            "next_anticipatory_cycle": next_cycle
        }

    @classmethod
    def dismiss_action(cls, prepared_id: str, deal_id: str, user_id: str, reason: str = "") -> Dict[str, Any]:
        """
        Records user dismissal, applies anti-irritation penalty, and marks action as dismissed.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT action FROM prepared_actions WHERE prepared_id = ?", (prepared_id,))
        row = cursor.fetchone()
        action_name = row["action"] if row else "UNKNOWN"

        cursor.execute("""
            UPDATE prepared_actions 
            SET status = 'DISMISSED' 
            WHERE prepared_id = ?
        """, (prepared_id,))

        cursor.execute("""
            INSERT INTO action_feedback (feedback_id, prepared_id, deal_id, user_id, action, user_decision, feedback_notes, timestamp)
            VALUES (?, ?, ?, ?, ?, 'DISMISSED', ?, ?)
        """, (f"fb_{uuid.uuid4().hex[:8]}", prepared_id, deal_id, user_id, action_name, reason, datetime.utcnow().isoformat() + "Z"))

        conn.commit()
        conn.close()

        # Update dismissal penalties in policy
        InterventionPolicy.record_dismissal(deal_id, action_name)

        return {
            "success": True,
            "prepared_id": prepared_id,
            "action": action_name,
            "status": "DISMISSED"
        }

    @classmethod
    def get_next_best_actions(cls, deal_id: str) -> List[Dict[str, Any]]:
        """
        Returns active prepared actions and candidate suggestions for a deal.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM prepared_actions 
            WHERE deal_id = ? AND status = 'PREPARED' 
            ORDER BY created_at DESC LIMIT 5
        """, (deal_id,))
        rows = cursor.fetchall()

        results = []
        for r in rows:
            results.append({
                "prepared_id": r["prepared_id"],
                "action": r["action"],
                "deal_id": r["deal_id"],
                "title": r["title"],
                "summary": r["summary"],
                "payload": json.loads(r["payload_json"] or "{}"),
                "consequences": json.loads(r["consequences_json"] or "{}"),
                "created_at": r["created_at"],
                "status": r["status"]
            })

        conn.close()
        return results

    @classmethod
    def get_deal_audit_history(cls, deal_id: str) -> List[Dict[str, Any]]:
        """
        Returns the full audit trail of events, predictions, simulations, and user decisions for a deal.
        """
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT * FROM anticipation_audit_logs 
            WHERE deal_id = ? 
            ORDER BY id DESC LIMIT 20
        """, (deal_id,))
        rows = cursor.fetchall()

        history = []
        for r in rows:
            history.append({
                "audit_id": r["id"],
                "prediction_id": r["prediction_id"],
                "event_type": r["event_type"],
                "predicted_action": r["predicted_action"],
                "probability": r["probability"],
                "confidence": r["confidence"],
                "reasons": json.loads(r["reasons_json"] or "[]"),
                "simulation_result": json.loads(r["simulation_result_json"] or "{}"),
                "user_decision": r["user_decision"],
                "timestamp": r["timestamp"]
            })

        conn.close()
        return history

    @classmethod
    def _get_or_create_deal_state(cls, deal_id: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Retrieves deal state from database or instantiates with rich enterprise defaults."""
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM deals WHERE deal_id = ?", (deal_id,))
        row = cursor.fetchone()

        if row:
            state = {
                "deal_id": row["deal_id"],
                "customer_name": row["customer_name"],
                "customer_tier": row["customer_tier"],
                "product_name": row["product_name"],
                "product_category": row["product_category"],
                "unit_price": row["unit_price"],
                "quantity": row["quantity"],
                "discount_percent": row["discount_percent"],
                "status": row["status"],
                "warehouse_stocks": json.loads(row["warehouse_stocks_json"] or '{"WH-A": 40, "WH-B": 60, "WH-C": 15}')
            }
        else:
            # Create default deal record
            meta = metadata or {}
            state = {
                "deal_id": deal_id,
                "customer_name": meta.get("customer_name", "Acme Technologies"),
                "customer_tier": meta.get("customer_tier", "GOLD"),
                "product_name": meta.get("product_name", "ThinkPad X1 Carbon Enterprise Laptop"),
                "product_category": meta.get("product_category", "laptop"),
                "unit_price": float(meta.get("unit_price", 1850.0)),
                "quantity": int(meta.get("quantity", 10)),
                "discount_percent": float(meta.get("discount_percent", 0.0)),
                "status": meta.get("status", "DRAFT"),
                "warehouse_stocks": meta.get("warehouse_stocks", {"WH-A": 40, "WH-B": 60, "WH-C": 15})
            }
            cursor.execute("""
                INSERT OR REPLACE INTO deals (deal_id, customer_name, customer_tier, product_name, product_category, unit_price, quantity, discount_percent, status, warehouse_stocks_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                state["deal_id"], state["customer_name"], state["customer_tier"],
                state["product_name"], state["product_category"], state["unit_price"],
                state["quantity"], state["discount_percent"], state["status"],
                json.dumps(state["warehouse_stocks"]), datetime.utcnow().isoformat() + "Z"
            ))
            conn.commit()

        conn.close()
        return state

    @classmethod
    def _save_deal_state(cls, deal_id: str, state: Dict[str, Any]):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO deals (deal_id, customer_name, customer_tier, product_name, product_category, unit_price, quantity, discount_percent, status, warehouse_stocks_json, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            deal_id, state.get("customer_name", "Acme Technologies"), state.get("customer_tier", "GOLD"),
            state.get("product_name", "ThinkPad X1 Carbon"), state.get("product_category", "laptop"),
            float(state.get("unit_price", 1850.0)), int(state.get("quantity", 10)),
            float(state.get("discount_percent", 0.0)), state.get("status", "DRAFT"),
            json.dumps(state.get("warehouse_stocks", {})), datetime.utcnow().isoformat() + "Z"
        ))
        conn.commit()
        conn.close()

    @classmethod
    def _persist_event(cls, event: BusinessEvent):
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO workflow_events (event_id, deal_id, user_id, event_type, previous_state, new_state, metadata_json, source, correlation_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event.event_id, event.deal_id, event.user_id, event.event_type,
            event.previous_state, event.new_state, json.dumps(event.metadata),
            event.source, event.correlation_id, event.timestamp
        ))
        conn.commit()
        conn.close()

    @classmethod
    def _persist_anticipation_cycle(
        cls,
        event: BusinessEvent,
        deal_state: Dict[str, Any],
        prediction_id: str,
        top_candidate: Dict[str, Any],
        all_candidates: List[Dict[str, Any]],
        current_simulation: Dict[str, Any],
        prepared_action: Dict[str, Any],
        display_mode: str
    ):
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Persist Event
        cursor.execute("""
            INSERT INTO workflow_events (event_id, deal_id, user_id, event_type, previous_state, new_state, metadata_json, source, correlation_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event.event_id, event.deal_id, event.user_id, event.event_type,
            event.previous_state, event.new_state, json.dumps(event.metadata),
            event.source, event.correlation_id, event.timestamp
        ))

        # 2. Persist Prediction
        cursor.execute("""
            INSERT INTO next_action_predictions (prediction_id, event_id, deal_id, predicted_action, probability, confidence, urgency, business_impact, reasons_json, candidates_json, display_mode, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            prediction_id, event.event_id, event.deal_id, top_candidate["action"],
            top_candidate["probability"], top_candidate["confidence"], top_candidate["urgency"],
            top_candidate["business_impact"], json.dumps(top_candidate["reasons"]),
            json.dumps(all_candidates), display_mode, datetime.utcnow().isoformat() + "Z"
        ))

        # 3. Persist Prepared Action
        cursor.execute("""
            INSERT INTO prepared_actions (prepared_id, prediction_id, deal_id, action, title, summary, payload_json, consequences_json, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PREPARED', ?)
        """, (
            prepared_action["prepared_id"], prediction_id, event.deal_id,
            prepared_action["action"], prepared_action["title"], prepared_action["summary"],
            json.dumps(prepared_action["payload"]), json.dumps(prepared_action["consequences"]),
            prepared_action["created_at"]
        ))

        # 4. Persist Audit Log
        cursor.execute("""
            INSERT INTO anticipation_audit_logs (prediction_id, deal_id, event_id, event_type, predicted_action, probability, confidence, reasons_json, simulation_result_json, user_decision, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_USER_REVIEW', ?)
        """, (
            prediction_id, event.deal_id, event.event_id, event.event_type,
            top_candidate["action"], top_candidate["probability"], top_candidate["confidence"],
            json.dumps(top_candidate["reasons"]), json.dumps(current_simulation),
            datetime.utcnow().isoformat() + "Z"
        ))

        conn.commit()
        conn.close()
