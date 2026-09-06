"""
DealFlow360 - Impact Analyzer
Computes quantitative deltas and categorical state transitions between current and simulated states.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class ImpactAnalyzer:
    """Analyzes the exact business and operational impact of a proposed what-if change."""

    @classmethod
    def analyze_impact(
        cls,
        current_state: Dict[str, Any],
        simulated_state: Dict[str, Any],
        current_rules: Dict[str, Any],
        simulated_rules: Dict[str, Any],
        current_fulfillment: Dict[str, Any],
        simulated_fulfillment: Dict[str, Any],
        current_health: Dict[str, Any],
        simulated_health: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates differences and status transitions.
        """
        curr_discount = float(current_state.get("discount_percent", 0.0))
        sim_discount = float(simulated_state.get("discount_percent", 0.0))
        discount_delta = sim_discount - curr_discount

        curr_margin_pct = float(current_state.get("margin_percent", 0.0))
        sim_margin_pct = float(simulated_state.get("margin_percent", 0.0))
        margin_delta = sim_margin_pct - curr_margin_pct

        curr_margin_amt = float(current_state.get("margin_amount", 0.0))
        sim_margin_amt = float(simulated_state.get("margin_amount", 0.0))
        margin_amount_delta = sim_margin_amt - curr_margin_amt

        curr_transport = float(current_fulfillment.get("transport_cost", 0.0))
        sim_transport = float(simulated_fulfillment.get("transport_cost", 0.0))
        transport_delta = sim_transport - curr_transport

        curr_fulfillment = float(current_fulfillment.get("fulfillment_cost", 0.0))
        sim_fulfillment_cost = float(simulated_fulfillment.get("fulfillment_cost", 0.0))
        fulfillment_delta = sim_fulfillment_cost - curr_fulfillment

        curr_health_score = int(current_health.get("score", 75))
        sim_health_score = int(simulated_health.get("score", 75))
        health_delta = sim_health_score - curr_health_score

        curr_approval = bool(current_rules.get("approval_required", False))
        sim_approval = bool(simulated_rules.get("approval_required", False))
        approval_status_changed = (curr_approval != sim_approval)

        curr_sla = bool(current_fulfillment.get("delivery_sla_met", True))
        sim_sla = bool(simulated_fulfillment.get("delivery_sla_met", True))
        delivery_status_changed = (curr_sla != sim_sla)

        return {
            "discount_delta": round(discount_delta, 2),
            "margin_delta": round(margin_delta, 2),
            "margin_amount_delta": round(margin_amount_delta, 2),
            "transport_cost_delta": round(transport_delta, 2),
            "fulfillment_cost_delta": round(fulfillment_delta, 2),
            "health_delta": health_delta,
            "approval_status_changed": approval_status_changed,
            "delivery_status_changed": delivery_status_changed
        }
