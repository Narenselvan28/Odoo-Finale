"""
DealFlow360 - Health Dimensions Scorer
Calculates multi-dimensional health scores across Commercial, Fulfillment,
Customer, Negotiation, Approval, and Lifecycle pillars.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class HealthDimensionsScorer:
    """Calculates weighted sub-scores (0-100) and statuses for each health dimension."""

    DEFAULT_WEIGHTS = {
        "commercial": 0.25,
        "fulfillment": 0.25,
        "customer": 0.20,
        "negotiation": 0.15,
        "approval": 0.10,
        "lifecycle": 0.05
    }

    @classmethod
    def get_status(cls, score: float) -> str:
        """Categorizes sub-score into standard status."""
        if score >= 80.0:
            return "HEALTHY"
        elif score >= 55.0:
            return "AT_RISK"
        else:
            return "CRITICAL"

    @classmethod
    def score_commercial(cls, pricing: Dict[str, Any], deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Scores commercial health based on gross margin %, discount depth, and revenue."""
        score = 100.0
        margin_pct = float(pricing.get("margin_percent", 20.0))
        discount_pct = float(pricing.get("discount_percent", 0.0))

        # Margin penalties
        if margin_pct < 25.0:
            if margin_pct >= 18.0:
                score -= (25.0 - margin_pct) * 2.0  # Mild penalty
            elif margin_pct >= 15.0:
                score -= 14.0 + (18.0 - margin_pct) * 4.0
            elif margin_pct >= 10.0:
                score -= 26.0 + (15.0 - margin_pct) * 6.0
            else:
                score -= 56.0 + (10.0 - margin_pct) * 4.0

        # High discount penalty
        if discount_pct > 20.0:
            score -= (discount_pct - 20.0) * 1.5

        final_score = max(5, min(100, int(score)))
        return {
            "score": final_score,
            "status": cls.get_status(final_score),
            "margin_percent": margin_pct,
            "discount_percent": discount_pct
        }

    @classmethod
    def score_fulfillment(cls, fulfillment: Dict[str, Any], deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Scores fulfillment health based on shortages, multi-warehouse split, and delivery SLA."""
        score = 100.0
        shortage = int(fulfillment.get("shortage_units", 0))
        sla_met = bool(fulfillment.get("delivery_sla_met", True))
        wh_count = int(fulfillment.get("warehouse_count", 1))
        expected_days = int(fulfillment.get("expected_delivery_days", 3))
        required_days = int(deal_data.get("required_delivery_days", 4))

        if shortage > 0:
            qty = max(1, int(deal_data.get("quantity", 1)))
            shortage_ratio = min(1.0, shortage / qty)
            score -= 40.0 + (shortage_ratio * 40.0)

        if not sla_met:
            delay = max(1, expected_days - required_days)
            score -= 25.0 + (delay * 8.0)

        if wh_count > 2:
            score -= (wh_count - 1) * 8.0
        elif wh_count == 2:
            score -= 5.0

        final_score = max(5, min(100, int(score)))
        return {
            "score": final_score,
            "status": cls.get_status(final_score),
            "shortage_units": shortage,
            "delivery_sla_met": sla_met,
            "expected_delivery_days": expected_days,
            "warehouse_count": wh_count
        }

    @classmethod
    def score_customer(cls, deal_data: Dict[str, Any], pricing: Dict[str, Any]) -> Dict[str, Any]:
        """Scores customer alignment based on historical discount norms and tier fit."""
        score = 100.0
        discount_pct = float(pricing.get("discount_percent", 0.0))
        cust_avg = float(deal_data.get("customer_avg_discount", 10.0))
        cust_max = float(deal_data.get("customer_max_discount", 15.0))
        tier = str(deal_data.get("customer_tier", "GOLD")).upper()

        if discount_pct > cust_max:
            score -= (discount_pct - cust_max) * 4.0
        elif discount_pct > cust_avg + 3.0:
            score -= (discount_pct - (cust_avg + 3.0)) * 2.0

        # Tier expectation bonus / penalty
        if tier == "PLATINUM" and discount_pct < 5.0:
            score -= 5.0  # Platinum customers may expect better pricing
        elif tier == "STANDARD" and discount_pct > 12.0:
            score -= 10.0

        final_score = max(10, min(100, int(score)))
        return {
            "score": final_score,
            "status": cls.get_status(final_score),
            "customer_tier": tier,
            "customer_avg_discount": cust_avg,
            "customer_max_discount": cust_max
        }

    @classmethod
    def score_negotiation(cls, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Scores negotiation friction based on iteration count and negotiation history."""
        score = 100.0
        prev_negs = int(deal_data.get("previous_negotiations", deal_data.get("negotiation_rounds", 0)))

        if prev_negs >= 4:
            score -= 35.0
        elif prev_negs == 3:
            score -= 22.0
        elif prev_negs == 2:
            score -= 12.0
        elif prev_negs == 1:
            score -= 5.0

        final_score = max(20, min(100, int(score)))
        return {
            "score": final_score,
            "status": cls.get_status(final_score),
            "negotiation_count": prev_negs
        }

    @classmethod
    def score_approval(cls, rules: Dict[str, Any]) -> Dict[str, Any]:
        """Scores approval friction and governance burden."""
        score = 100.0
        approval_req = bool(rules.get("approval_required", False))
        approval_level = str(rules.get("approval_level", "NONE")).upper()

        if approval_req:
            if approval_level == "EXECUTIVE":
                score -= 45.0
            elif approval_level == "VP_FINANCE":
                score -= 30.0
            elif approval_level == "SALES_MANAGER":
                score -= 15.0
            else:
                score -= 10.0

        final_score = max(20, min(100, int(score)))
        return {
            "score": final_score,
            "status": cls.get_status(final_score),
            "approval_required": approval_req,
            "approval_level": approval_level
        }

    @classmethod
    def score_lifecycle(cls, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """Scores deal velocity and staleness risk."""
        score = 100.0
        deal_age_days = int(deal_data.get("deal_age_days", 5))

        if deal_age_days > 30:
            score -= 35.0
        elif deal_age_days > 14:
            score -= 15.0

        final_score = max(30, min(100, int(score)))
        return {
            "score": final_score,
            "status": cls.get_status(final_score),
            "deal_age_days": deal_age_days
        }
