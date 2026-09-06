"""
DealFlow360 - Anticipatory Deal Engine
Deterministic Rule Validation Engine
"""

import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger(__name__)


class RuleValidator:
    """
    Deterministic rule engine that validates actions and governs suggestions.
    Rules ALWAYS have veto authority over ML predictions.
    """

    MAX_DISCOUNT_CAP = 35.0
    MIN_GROSS_MARGIN_FLOOR = 10.0 # Absolute floor, below which deal cannot be auto-executed or approved directly

    @classmethod
    def validate_action(cls, action_type: str, deal_data: Dict[str, Any], sim_result: Dict[str, Any]) -> Tuple[bool, List[str], List[str]]:
        """
        Validates if an action satisfies hard business rules.
        Returns: (is_compliant, violations, notes)
        """
        violations = []
        notes = []

        discount_pct = float(deal_data.get("discount_percent", 0.0))
        customer_tier = str(deal_data.get("customer_tier", "GOLD")).upper()
        gross_margin_pct = sim_result.get("gross_margin_percent", 25.0)
        tier_limit = sim_result.get("tier_limit", 15.0)

        # Rule 1: Max Absolute Discount Cap
        if discount_pct > cls.MAX_DISCOUNT_CAP:
            violations.append(f"Discount {discount_pct}% exceeds enterprise absolute maximum limit ({cls.MAX_DISCOUNT_CAP}%).")

        # Rule 2: Absolute Margin Floor
        if gross_margin_pct < cls.MIN_GROSS_MARGIN_FLOOR:
            violations.append(f"Projected gross margin {gross_margin_pct}% is below enterprise floor ({cls.MIN_GROSS_MARGIN_FLOOR}%).")

        # Rule 3: Action specific governance
        if action_type == "ALLOCATE_WAREHOUSE":
            shortage = sim_result.get("shortage_units", 0)
            if shortage > 0:
                notes.append(f"Inventory shortage of {shortage} units detected. Transfer/replenishment will be required.")

        elif action_type == "GENERATE_INVOICE":
            status = deal_data.get("status", "DRAFT")
            if status not in ["CONFIRMED", "APPROVED", "DELIVERED"]:
                violations.append(f"Cannot invoice deal in '{status}' status. Order must be confirmed or approved.")

        elif action_type == "REQUEST_APPROVAL":
            if discount_pct > tier_limit:
                notes.append(f"Discount ({discount_pct}%) exceeds customer {customer_tier} tier standard limit ({tier_limit}%).")
            if sim_result.get("margin_below_floor", False):
                notes.append("Gross margin is below normal threshold requiring VP Finance authorization.")

        is_compliant = len(violations) == 0
        return is_compliant, violations, notes
