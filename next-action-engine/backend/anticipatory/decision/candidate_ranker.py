"""
DealFlow360 - Anticipatory Deal Engine
Candidate Operation Ranking Engine
"""

import logging
from typing import Dict, Any, List, Optional
from ..twin.rule_validator import RuleValidator

logger = logging.getLogger(__name__)


class CandidateRanker:
    """
    Ranks candidate actions using:
    Score = probability * business_impact * urgency_weight * feasibility * confidence
    Rejects actions that violate hard business rules.
    """

    URGENCY_WEIGHTS = {
        "CRITICAL": 1.25,
        "HIGH": 1.10,
        "MEDIUM": 1.00,
        "LOW": 0.80,
        "NONE": 0.00
    }

    @classmethod
    def rank_candidates(
        cls,
        candidates: List[Dict[str, Any]],
        deal_data: Dict[str, Any],
        sim_result: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Ranks candidate operations and eliminates rule-violating actions.
        """
        ranked_list = []

        for cand in candidates:
            action = cand["action"]
            prob = cand["probability"]
            impact = cand["business_impact"]
            urgency_str = cand["urgency"]
            confidence = cand["confidence"]

            # 1. Rule Engine Validation
            is_compliant, violations, notes = RuleValidator.validate_action(
                action_type=action,
                deal_data=deal_data,
                sim_result=sim_result
            )

            if not is_compliant:
                logger.info(f"[CandidateRanker] Action '{action}' rejected by RuleValidator: {violations}")
                continue

            # 2. Feasibility from Simulation
            feasibility = 1.0
            if action == "ALLOCATE_WAREHOUSE" and sim_result.get("shortage_units", 0) > 0:
                feasibility = 0.75 # Still valid to allocate what's available

            urgency_weight = cls.URGENCY_WEIGHTS.get(urgency_str, 1.0)

            # 3. Final Multi-Factor Score Calculation
            final_score = prob * impact * urgency_weight * feasibility * confidence

            cand_copy = dict(cand)
            cand_copy["feasibility"] = feasibility
            cand_copy["final_score"] = round(final_score, 4)
            cand_copy["governance_notes"] = notes
            ranked_list.append(cand_copy)

        # Sort descending by final score
        ranked_list.sort(key=lambda x: x["final_score"], reverse=True)
        return ranked_list
