"""
DealFlow360 - Actionable Deal Health Engine
Calculates comprehensive, multi-dimensional deal health scores, identifies primary threats,
quantifies business impact, and produces actionable simulation-ready recommendations.
"""

import logging
from typing import Dict, Any, Optional
from intelligence.health.health_dimensions import HealthDimensionsScorer
from intelligence.health.health_actions import HealthActionGenerator

logger = logging.getLogger(__name__)


class DealHealthEngine:
    """Orchestrates comprehensive deal health scoring and actionable intelligence."""

    @classmethod
    def calculate_health(
        cls,
        deal_data: Dict[str, Any],
        pricing: Dict[str, Any],
        fulfillment: Dict[str, Any],
        rules: Dict[str, Any],
        previous_health: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Computes overall health score, dimension details, main threats, and actionable steps.
        """
        # 1. Compute dimension sub-scores
        comm = HealthDimensionsScorer.score_commercial(pricing, deal_data)
        fulf = HealthDimensionsScorer.score_fulfillment(fulfillment, deal_data)
        cust = HealthDimensionsScorer.score_customer(deal_data, pricing)
        neg = HealthDimensionsScorer.score_negotiation(deal_data)
        appr = HealthDimensionsScorer.score_approval(rules)
        life = HealthDimensionsScorer.score_lifecycle(deal_data)

        dimensions = {
            "commercial": comm,
            "fulfillment": fulf,
            "customer": cust,
            "negotiation": neg,
            "approval": appr,
            "lifecycle": life
        }

        # 2. Weighted overall score
        weights = HealthDimensionsScorer.DEFAULT_WEIGHTS
        weighted_score = (
            comm["score"] * weights["commercial"] +
            fulf["score"] * weights["fulfillment"] +
            cust["score"] * weights["customer"] +
            neg["score"] * weights["negotiation"] +
            appr["score"] * weights["approval"] +
            life["score"] * weights["lifecycle"]
        )
        total_score = max(5, min(100, int(round(weighted_score))))
        status = HealthDimensionsScorer.get_status(total_score)

        # 3. Action & Threat Analysis
        action_analysis = HealthActionGenerator.analyze_threats_and_actions(
            dimensions=dimensions,
            deal_data=deal_data,
            pricing=pricing,
            fulfillment=fulfillment,
            rules=rules
        )

        result = {
            "score": total_score,
            "status": status,
            "dimensions": dimensions,
            "main_threat": action_analysis["main_threat"],
            "predicted_impact": action_analysis["predicted_impact"],
            "recommended_action": action_analysis["recommended_action"]
        }

        # 4. Compute Delta if previous score provided
        if previous_health and "score" in previous_health:
            prev_score = int(previous_health["score"])
            result["previous_score"] = prev_score
            result["delta"] = total_score - prev_score

        return result
