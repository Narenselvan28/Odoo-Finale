"""
DealFlow360 - Recommendation Engine
Generates actionable, explainable deal recommendations grounded in business rules,
economic margins, customer history, and ML guidance.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Proposes optimized deal actions and explains why with clear reasoning."""

    @classmethod
    def generate_recommendation(
        cls,
        simulated_deal: Dict[str, Any],
        pricing: Dict[str, Any],
        rules: Dict[str, Any],
        fulfillment: Dict[str, Any],
        ml_prediction: Dict[str, Any],
        health: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Determines the optimal business recommendation based on multi-factor analysis.
        """
        discount_pct = float(pricing.get("discount_percent", 0.0))
        margin_pct = float(pricing.get("margin_percent", 0.0))
        approval_required = bool(rules.get("approval_required", False))
        delivery_sla_met = bool(fulfillment.get("delivery_sla_met", True))
        shortage_units = int(fulfillment.get("shortage_units", 0))

        ml_rec_discount = float(ml_prediction.get("recommended_discount_percent", 12.0)) if ml_prediction.get("model_available") else None
        risk_label = str(ml_prediction.get("risk_label", "NORMAL"))

        cust_tier = str(simulated_deal.get("customer_tier", "GOLD")).upper()
        cust_avg_discount = float(simulated_deal.get("customer_avg_discount", 10.0))
        cust_max_discount = float(simulated_deal.get("customer_max_discount", 16.0))

        reasons = []
        action = "MAINTAIN_CONFIGURATION"
        recommended_discount = discount_pct

        # 1. Fulfillment shortage or SLA violation takes precedence
        if shortage_units > 0:
            action = "REALLOCATE_STOCK"
            reasons.append(f"Insufficient stock across configured warehouses ({shortage_units} unit shortage).")
            reasons.append("Reallocate stock from secondary regional hubs to fulfill customer order.")

        elif not delivery_sla_met:
            action = "EXPEDITE_SHIPPING"
            reasons.append(f"Projected delivery ({fulfillment.get('expected_delivery_days')} days) exceeds customer SLA ({fulfillment.get('required_delivery_days')} days).")
            reasons.append("Consider expedited carrier or reallocating from a closer warehouse.")

        # 2. Critical margin floor violation (< 10%)
        elif margin_pct < 10.0:
            action = "REDUCE_DISCOUNT"
            # Suggest a discount that restores margin to at least 15%
            # If gross margin = (selling - cogs - trans)/selling = 1 - (costs / selling)
            # We want selling >= costs / (1 - 0.15)
            base_p = float(pricing.get("base_price", 1000.0))
            qty = int(pricing.get("quantity", 1))
            total_costs = float(pricing.get("total_costs", 0.0))
            gross_val = float(pricing.get("gross_value", qty * base_p))

            target_selling = total_costs / 0.85
            target_disc_pct = max(0.0, min(cust_max_discount, (1.0 - (target_selling / max(1.0, gross_val))) * 100.0))
            recommended_discount = round(target_disc_pct, 1)

            reasons.append(f"{discount_pct}% discount critically reduces gross margin to {margin_pct:.1f}% (below 10.0% emergency floor).")
            reasons.append("Executive escalation would be triggered.")
            reasons.append(f"Reducing discount to {recommended_discount}% restores healthy margin while maintaining deal viability.")

        # 3. Approval triggered due to discount ceiling or standard margin floor (< 15%)
        elif approval_required:
            if discount_pct > cust_max_discount:
                action = "REDUCE_DISCOUNT"
                recommended_discount = min(cust_max_discount, ml_rec_discount if ml_rec_discount else cust_max_discount)
                reasons.append(f"{discount_pct}% discount exceeds customer maximum limit ({cust_max_discount}%).")
                reasons.append(f"Finance/Sales approval is required.")
                reasons.append(f"{recommended_discount}% provides a better margin-risk balance without requiring exception approvals.")
            else:
                action = "REQUEST_APPROVAL"
                recommended_discount = discount_pct
                reasons.append(f"Deal parameters require {rules.get('approval_level', 'MANAGEMENT')} authorization.")
                for reason in rules.get("approval_reasons", []):
                    reasons.append(reason)

        # 4. High Risk ML Prediction despite passing basic rules
        elif risk_label == "HIGH":
            action = "REVISE_DISCOUNT"
            recommended_discount = ml_rec_discount if ml_rec_discount else round((discount_pct + cust_avg_discount) / 2.0, 1)
            reasons.append(f"ML risk classifier flagged high probability of margin dilution or post-deal friction.")
            reasons.append(f"Recommended discount is {recommended_discount}% to align with historical acceptance trends.")

        # 5. Healthy deal
        else:
            action = "APPROVE_DEAL"
            recommended_discount = discount_pct
            reasons.append(f"{discount_pct}% discount provides a robust gross margin ({margin_pct:.1f}%).")
            reasons.append(f"Customer {cust_tier} tier governance rules are fully satisfied.")
            reasons.append("Fulfillment delivery SLA is fully met.")

        return {
            "action": action,
            "recommended_discount": round(recommended_discount, 2),
            "reasons": reasons
        }
