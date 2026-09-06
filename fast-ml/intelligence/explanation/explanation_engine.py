"""
DealFlow360 - Why / Why Not Explanation Engine
Synthesizes decision reasoning, historical customer context, economic trade-offs,
and counter-factual comparisons into transparent, enterprise-ready explanations.
"""

import logging
from typing import Dict, Any, List, Optional
from intelligence.explanation.comparison_engine import ComparisonEngine

logger = logging.getLogger(__name__)


class ExplanationEngine:
    """Generates transparent, evidence-backed Why and Why-Not explanations."""

    @classmethod
    def explain_recommendation(
        cls,
        deal_data: Dict[str, Any],
        recommendation: Dict[str, Any],
        pricing: Dict[str, Any],
        rules: Dict[str, Any],
        fulfillment: Dict[str, Any],
        health: Dict[str, Any],
        customer_memory: Optional[Dict[str, Any]] = None,
        alternative_discounts: Optional[List[float]] = None
    ) -> Dict[str, Any]:
        """
        Builds complete explanation package containing Why, Why Not, and Confidence rating.
        """
        rec_discount = float(recommendation.get("recommended_discount", pricing.get("discount_percent", 12.0)))
        margin_pct = float(pricing.get("margin_percent", 18.5))
        approval_req = bool(rules.get("approval_required", False))

        # 1. Customer history evidence
        mem = (customer_memory or {}).get("memory", {})
        min_disc = mem.get("accepted_discount_range", {}).get("min", float(deal_data.get("customer_avg_discount", 10.0)) - 1.5)
        max_disc = mem.get("accepted_discount_range", {}).get("max", float(deal_data.get("customer_max_discount", 15.0)))
        total_prev_deals = int(mem.get("previous_deals", deal_data.get("previous_deals", 5)))

        if min_disc is not None and max_disc is not None:
            range_str = f"{min_disc:.0f}–{max_disc:.0f}%" if min_disc != max_disc else f"{min_disc:.1f}%"
        else:
            range_str = "10–14%"

        # Estimate acceptance probability at recommended discount
        cust_avg = float(deal_data.get("customer_avg_discount", 10.0))
        if rec_discount >= cust_avg:
            acceptance_prob = min(0.92, 0.75 + (rec_discount - cust_avg) * 0.03)
        else:
            acceptance_prob = max(0.40, 0.75 - (cust_avg - rec_discount) * 0.05)

        acceptance_prob = round(acceptance_prob, 2)

        # 2. Synthesize WHY explanation
        summary_reasons = []
        summary_reasons.append(f"{rec_discount:.1f}% discount provides a strong balance between expected customer acceptance ({int(acceptance_prob*100)}%) and sustainable gross margin ({margin_pct:.1f}%).")
        if not approval_req:
            summary_reasons.append(f"It remains fully within standard {deal_data.get('customer_tier', 'GOLD')} tier governance limits without triggering exception workflows.")
        else:
            summary_reasons.append(f"It optimizes commercial yield while accommodating required {rules.get('approval_level', 'MANAGEMENT')} review.")

        why = {
            "customer_history": {
                "accepted_discount_range": range_str,
                "expected_acceptance_probability": acceptance_prob
            },
            "economics": {
                "expected_margin_percent": round(margin_pct, 2)
            },
            "approval": {
                "required": approval_req,
                "level": rules.get("approval_level", "NONE")
            },
            "summary": " ".join(summary_reasons)
        }

        # 3. Synthesize WHY NOT comparisons
        why_not = ComparisonEngine.generate_alternatives_list(
            deal_data=deal_data,
            base_recommendation=recommendation,
            fulfillment=fulfillment,
            rec_health=health,
            specific_alternatives=alternative_discounts
        )

        # 4. Confidence rating based on data availability
        confidence = 0.88
        limitations = []
        if total_prev_deals < 3:
            confidence -= 0.30
            limitations.append(f"Only {total_prev_deals} previous deal(s) available for customer {deal_data.get('customer_id', 'UNKNOWN')}.")
        elif total_prev_deals < 6:
            confidence -= 0.10

        if not fulfillment.get("delivery_sla_met", True):
            confidence -= 0.08
            limitations.append("Fulfillment delivery SLA is under pressure.")

        confidence = max(0.35, min(0.98, round(confidence, 2)))

        return {
            "recommendation": {
                "discount_percent": round(rec_discount, 2),
                "action": recommendation.get("action", "MAINTAIN_CONFIGURATION")
            },
            "why": why,
            "why_not": why_not,
            "confidence": confidence,
            "limitations": limitations
        }
