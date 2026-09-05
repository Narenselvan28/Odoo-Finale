"""
DealFlow360 - Rule Engine Adapter
Deterministic governance engine for evaluating business rules, discount ceilings,
margin floors, blended risk, and approval requirements.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class RuleEngineAdapter:
    """
    Deterministic rule engine that validates actions and governs suggestions.
    Rules ALWAYS have veto authority over ML predictions.
    """

    # Customer tier maximum non-approval discount limits (%)
    TIER_DISCOUNT_LIMITS = {
        "PLATINUM": 20.0,
        "GOLD": 15.0,
        "SILVER": 10.0,
        "STANDARD": 5.0,
    }

    # Enterprise absolute maximum discount cap (%)
    MAX_DISCOUNT_CAP = 35.0

    # Enterprise margin floors (%)
    PREFERRED_MARGIN_FLOOR = 18.0
    MIN_MARGIN_FLOOR = 15.0
    ABSOLUTE_MARGIN_FLOOR = 10.0

    @classmethod
    def evaluate_deal_rules(cls, deal_data: Dict[str, Any], pricing: Dict[str, Any], fulfillment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluates deterministic business rules against the deal state.
        Returns:
            {
                "approval_required": bool,
                "approval_level": str ("NONE" | "SALES_MANAGER" | "VP_FINANCE" | "EXECUTIVE"),
                "approval_reasons": List[str],
                "rule_results": List[Dict[str, Any]]
            }
        """
        customer_tier = str(deal_data.get("customer_tier", "GOLD")).upper()
        discount_pct = float(deal_data.get("discount_percent", 0.0))
        margin_pct = float(pricing.get("margin_percent", 0.0))
        cust_avg_discount = float(deal_data.get("customer_avg_discount", 10.0))
        cust_max_discount = float(deal_data.get("customer_max_discount", cls.TIER_DISCOUNT_LIMITS.get(customer_tier, 15.0)))

        tier_limit = cls.TIER_DISCOUNT_LIMITS.get(customer_tier, 10.0)

        rule_results = []
        approval_reasons = []
        approval_required = False
        approval_level = "NONE"

        # Rule 1: Customer Tier Discount Ceiling
        passed_tier = discount_pct <= tier_limit
        rule_results.append({
            "rule": "customer_tier_discount_ceiling",
            "passed": passed_tier,
            "threshold": tier_limit,
            "actual_value": discount_pct,
            "message": "Discount is within customer tier limit." if passed_tier else f"Discount ({discount_pct}%) exceeds {customer_tier} tier ceiling ({tier_limit}%)."
        })
        if not passed_tier:
            approval_required = True
            approval_reasons.append(f"Discount exceeds {customer_tier} tier standard limit ({tier_limit}%)")
            approval_level = "SALES_MANAGER"

        # Rule 2: Customer Historical Max Discount Ceiling
        passed_cust_max = discount_pct <= cust_max_discount
        rule_results.append({
            "rule": "customer_discount_ceiling",
            "passed": passed_cust_max,
            "threshold": cust_max_discount,
            "actual_value": discount_pct,
            "message": "Discount is within customer historical ceiling." if passed_cust_max else f"Discount ({discount_pct}%) exceeds customer historical max limit ({cust_max_discount}%)."
        })
        if not passed_cust_max and not approval_required:
            approval_required = True
            approval_reasons.append(f"Discount exceeds customer historical maximum ({cust_max_discount}%)")
            if approval_level == "NONE":
                approval_level = "SALES_MANAGER"

        # Rule 3: Absolute Enterprise Discount Cap (Hard limit)
        passed_abs_cap = discount_pct <= cls.MAX_DISCOUNT_CAP
        rule_results.append({
            "rule": "enterprise_discount_cap",
            "passed": passed_abs_cap,
            "threshold": cls.MAX_DISCOUNT_CAP,
            "actual_value": discount_pct,
            "message": "Discount is within absolute enterprise cap." if passed_abs_cap else f"Discount ({discount_pct}%) exceeds absolute enterprise cap ({cls.MAX_DISCOUNT_CAP}%)."
        })
        if not passed_abs_cap:
            approval_required = True
            approval_reasons.append(f"Discount exceeds enterprise absolute cap ({cls.MAX_DISCOUNT_CAP}%)")
            approval_level = "VP_FINANCE"

        # Rule 4: Minimum Gross Margin Floor
        passed_min_margin = margin_pct >= cls.MIN_MARGIN_FLOOR
        rule_results.append({
            "rule": "minimum_margin_floor",
            "passed": passed_min_margin,
            "threshold": cls.MIN_MARGIN_FLOOR,
            "actual_value": margin_pct,
            "message": "Margin meets minimum requirement." if passed_min_margin else f"Margin ({margin_pct:.1f}%) is below minimum standard floor ({cls.MIN_MARGIN_FLOOR}%)."
        })
        if not passed_min_margin:
            approval_required = True
            approval_reasons.append(f"Margin ({margin_pct:.1f}%) is below standard floor ({cls.MIN_MARGIN_FLOOR}%)")
            approval_level = "VP_FINANCE"

        # Rule 5: Absolute Margin Floor (Critical)
        passed_abs_margin = margin_pct >= cls.ABSOLUTE_MARGIN_FLOOR
        rule_results.append({
            "rule": "absolute_margin_floor",
            "passed": passed_abs_margin,
            "threshold": cls.ABSOLUTE_MARGIN_FLOOR,
            "actual_value": margin_pct,
            "message": "Margin is above absolute emergency floor." if passed_abs_margin else f"Critical: Margin ({margin_pct:.1f}%) is below absolute hard floor ({cls.ABSOLUTE_MARGIN_FLOOR}%)."
        })
        if not passed_abs_margin:
            approval_required = True
            approval_reasons.append(f"Critical: Margin below absolute hard floor ({cls.ABSOLUTE_MARGIN_FLOOR}%)")
            approval_level = "EXECUTIVE"

        # Rule 6: Blended Discount Risk
        # Flag if proposed discount exceeds customer's historical average by more than 5 percentage points
        discount_gap = discount_pct - cust_avg_discount
        passed_blended_risk = discount_gap <= 5.0
        rule_results.append({
            "rule": "blended_discount_risk",
            "passed": passed_blended_risk,
            "threshold": 5.0,
            "actual_value": round(discount_gap, 2),
            "message": "Discount gap is within acceptable historical variance." if passed_blended_risk else f"Discount gap (+{discount_gap:.1f}%) significantly exceeds customer historical average ({cust_avg_discount}%)."
        })

        # Rule 7: Fulfillment Delivery SLA Feasibility
        delivery_sla_met = fulfillment.get("delivery_sla_met", True)
        rule_results.append({
            "rule": "delivery_sla_feasibility",
            "passed": delivery_sla_met,
            "threshold": deal_data.get("required_delivery_days", 4),
            "actual_value": fulfillment.get("expected_delivery_days", 3),
            "message": "Fulfillment delivery SLA is achievable." if delivery_sla_met else "Fulfillment delivery SLA is at risk."
        })

        return {
            "approval_required": approval_required,
            "approval_level": approval_level,
            "approval_reasons": approval_reasons,
            "rule_results": rule_results,
            "all_rules_passed": all(r["passed"] for r in rule_results)
        }
