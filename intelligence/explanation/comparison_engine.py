"""
DealFlow360 - Why Not Alternative Comparison Engine
Evaluates counter-factual options against the recommended proposal,
calculating trade-offs across acceptance probability, gross margin, deal health, and governance.
"""

import logging
from typing import Dict, Any, List
from intelligence.what_if.pricing_simulator import PricingSimulator
from intelligence.adapters.rule_engine_adapter import RuleEngineAdapter
from intelligence.health.deal_health_engine import DealHealthEngine

logger = logging.getLogger(__name__)


class ComparisonEngine:
    """Compares alternative decisions against the recommended option."""

    @classmethod
    def compare_alternative_discount(
        cls,
        deal_data: Dict[str, Any],
        base_recommendation: Dict[str, Any],
        alternative_discount: float,
        fulfillment: Dict[str, Any],
        rec_health: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculates trade-offs for a specific alternative discount level.
        """
        rec_discount = float(base_recommendation.get("recommended_discount", 12.0))
        cust_avg = float(deal_data.get("customer_avg_discount", 10.0))
        cust_max = float(deal_data.get("customer_max_discount", 15.0))

        # 1. Base / Recommended scenario metrics
        rec_deal = dict(deal_data)
        rec_deal["discount_percent"] = rec_discount
        rec_pricing = PricingSimulator.calculate_pricing(
            rec_deal,
            transport_cost=fulfillment.get("transport_cost", 0.0),
            fulfillment_cost=fulfillment.get("fulfillment_cost", 0.0)
        )
        rec_rules = RuleEngineAdapter.evaluate_deal_rules(rec_deal, rec_pricing, fulfillment)
        rec_margin = float(rec_pricing.get("margin_percent", 20.0))
        rec_health_score = int(rec_health.get("score", 80))

        # Base acceptance probability estimation from historical range
        # Higher discount -> higher acceptance probability up to a plateau
        def estimate_acceptance(d_pct):
            if d_pct < cust_avg - 4.0:
                return 0.35
            elif d_pct < cust_avg:
                return 0.65
            elif d_pct <= cust_max:
                return 0.85 + min(0.10, (d_pct - cust_avg) * 0.02)
            else:
                return 0.95

        rec_acceptance = estimate_acceptance(rec_discount)

        # 2. Alternative scenario metrics
        alt_deal = dict(deal_data)
        alt_deal["discount_percent"] = alternative_discount
        alt_pricing = PricingSimulator.calculate_pricing(
            alt_deal,
            transport_cost=fulfillment.get("transport_cost", 0.0),
            fulfillment_cost=fulfillment.get("fulfillment_cost", 0.0)
        )
        alt_rules = RuleEngineAdapter.evaluate_deal_rules(alt_deal, alt_pricing, fulfillment)
        alt_health = DealHealthEngine.calculate_health(alt_deal, alt_pricing, fulfillment, alt_rules)

        alt_margin = float(alt_pricing.get("margin_percent", 0.0))
        alt_health_score = int(alt_health.get("score", 70))
        alt_acceptance = estimate_acceptance(alternative_discount)

        # 3. Compute Deltas
        acceptance_delta = round(alt_acceptance - rec_acceptance, 2)
        margin_delta = round(alt_margin - rec_margin, 2)
        health_delta = alt_health_score - rec_health_score
        approval_changed = (alt_rules.get("approval_required") != rec_rules.get("approval_required"))

        # 4. Generate Explainable Reasoning
        reasons = []
        if alternative_discount > rec_discount:
            if approval_changed and alt_rules.get("approval_required"):
                reasons.append(f"{alternative_discount}% may slightly increase customer acceptance (+{int(acceptance_delta*100)}%), but reduces margin by {abs(margin_delta):.1f}% and triggers {alt_rules.get('approval_level', 'Finance')} approval.")
            else:
                reasons.append(f"{alternative_discount}% offers higher customer concession (+{int(acceptance_delta*100)}% acceptance) but unnecessarily dilutes gross margin by {abs(margin_delta):.1f}%.")
        else:
            reasons.append(f"{alternative_discount}% yields higher gross margin (+{margin_delta:.1f}%) but risks deal friction or rejection due to lower historical acceptance probability ({int(alt_acceptance*100)}%).")

        return {
            "alternative_discount": round(alternative_discount, 2),
            "comparison": {
                "acceptance_probability_delta": acceptance_delta,
                "margin_delta": margin_delta,
                "health_delta": health_delta,
                "approval_changed": approval_changed,
                "alternative_margin_percent": alt_margin,
                "alternative_health_score": alt_health_score,
                "alternative_approval_required": alt_rules.get("approval_required", False)
            },
            "reason": " ".join(reasons)
        }

    @classmethod
    def generate_alternatives_list(
        cls,
        deal_data: Dict[str, Any],
        base_recommendation: Dict[str, Any],
        fulfillment: Dict[str, Any],
        rec_health: Dict[str, Any],
        specific_alternatives: List[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates a suite of smart alternative discount levels.
        """
        rec_discount = float(base_recommendation.get("recommended_discount", 12.0))
        proposed_discount = float(deal_data.get("discount_percent", deal_data.get("current_discount_percent", rec_discount)))

        alt_candidates = []
        if specific_alternatives:
            alt_candidates = [float(a) for a in specific_alternatives if abs(float(a) - rec_discount) > 0.2]
        else:
            # Generate 2-3 standard contrast points
            candidates = set()
            if abs(proposed_discount - rec_discount) > 0.5:
                candidates.add(round(proposed_discount, 1))

            higher_alt = round(rec_discount + 3.0, 1)
            lower_alt = max(0.0, round(rec_discount - 3.0, 1))
            tier_cap = float(deal_data.get("customer_max_discount", 15.0))

            candidates.add(higher_alt)
            if lower_alt > 0:
                candidates.add(lower_alt)
            if tier_cap != rec_discount and tier_cap > 0:
                candidates.add(tier_cap)

            candidates.discard(round(rec_discount, 1))
            alt_candidates = sorted(list(candidates))[:3]

        why_not_results = []
        for alt_d in alt_candidates:
            why_not_results.append(
                cls.compare_alternative_discount(
                    deal_data=deal_data,
                    base_recommendation=base_recommendation,
                    alternative_discount=alt_d,
                    fulfillment=fulfillment,
                    rec_health=rec_health
                )
            )

        return why_not_results
