"""
DealFlow360 - Anticipatory Deal Engine
Next Action Predictor & Candidate Operation Generator
"""

import logging
from typing import Dict, Any, List
from .transition_matrix import MultiLevelTransitionMatrix

logger = logging.getLogger(__name__)


class ActionPredictor:
    """
    Generates Candidate Business Operations with probability, confidence,
    urgency, business impact, and domain explainability reasons.
    """

    ACTION_METADATA = {
        "RECOMMEND_DISCOUNT": {
            "business_impact": 0.85,
            "urgency": "HIGH",
            "confidence_base": 0.90,
            "affected_modules": ["Pricing", "Sales Strategy"],
            "requires_confirmation": True
        },
        "REQUEST_APPROVAL": {
            "business_impact": 0.95,
            "urgency": "CRITICAL",
            "confidence_base": 0.94,
            "affected_modules": ["Pricing", "Approval Governance", "Finance"],
            "requires_confirmation": True
        },
        "ALLOCATE_WAREHOUSE": {
            "business_impact": 0.88,
            "urgency": "HIGH",
            "confidence_base": 0.91,
            "affected_modules": ["Fulfillment", "Warehouse Logistics", "Inventory"],
            "requires_confirmation": True
        },
        "CREATE_REPLENISHMENT": {
            "business_impact": 0.90,
            "urgency": "CRITICAL",
            "confidence_base": 0.93,
            "affected_modules": ["Procurement", "Inter-Warehouse Transfer", "Inventory"],
            "requires_confirmation": True
        },
        "REVISE_QUOTATION": {
            "business_impact": 0.82,
            "urgency": "HIGH",
            "confidence_base": 0.88,
            "affected_modules": ["Sales", "Pricing", "Customer Portal"],
            "requires_confirmation": True
        },
        "GENERATE_INVOICE": {
            "business_impact": 0.85,
            "urgency": "MEDIUM",
            "confidence_base": 0.92,
            "affected_modules": ["Billing", "Finance", "Accounting"],
            "requires_confirmation": True
        },
        "CREATE_SUBSCRIPTION_BILLING": {
            "business_impact": 0.80,
            "urgency": "MEDIUM",
            "confidence_base": 0.89,
            "affected_modules": ["Recurring Billing", "Finance"],
            "requires_confirmation": True
        },
        "CONFIRM_ORDER": {
            "business_impact": 0.90,
            "urgency": "HIGH",
            "confidence_base": 0.87,
            "affected_modules": ["Sales Order", "Fulfillment"],
            "requires_confirmation": True
        },
        "RECALCULATE_MARGIN": {
            "business_impact": 0.60,
            "urgency": "LOW",
            "confidence_base": 0.85,
            "affected_modules": ["Financial Analytics"],
            "requires_confirmation": False
        },
        "FOLLOW_UP": {
            "business_impact": 0.50,
            "urgency": "LOW",
            "confidence_base": 0.75,
            "affected_modules": ["CRM", "Sales Activity"],
            "requires_confirmation": True
        },
        "NO_ACTION": {
            "business_impact": 0.0,
            "urgency": "NONE",
            "confidence_base": 1.0,
            "affected_modules": [],
            "requires_confirmation": False
        }
    }

    @classmethod
    def predict_next_candidates(cls, last_event: str, deal_data: Dict[str, Any], sim_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Predicts ranked candidate operations from the business event and current simulated state.
        """
        customer_tier = deal_data.get("customer_tier", "GOLD")
        product_category = deal_data.get("product_category", "laptop")
        user_role = deal_data.get("user_role", "sales_rep")

        # Get statistical transition candidates
        raw_candidates = MultiLevelTransitionMatrix.get_candidate_actions(
            last_event=last_event,
            customer_tier=customer_tier,
            product_category=product_category,
            user_role=user_role
        )

        candidates = []
        for action, prob in raw_candidates:
            if action == "NO_ACTION":
                continue

            meta = cls.ACTION_METADATA.get(action, {
                "business_impact": 0.5,
                "urgency": "MEDIUM",
                "confidence_base": 0.80,
                "affected_modules": ["Operations"],
                "requires_confirmation": True
            })

            reasons = cls._build_reasons(action, last_event, deal_data, sim_result)
            confidence = min(0.98, round(meta["confidence_base"] * (0.8 + 0.2 * prob), 2))

            candidates.append({
                "action": action,
                "probability": prob,
                "confidence": confidence,
                "urgency": meta["urgency"],
                "business_impact": meta["business_impact"],
                "reasons": reasons,
                "affected_modules": meta["affected_modules"],
                "requires_confirmation": meta["requires_confirmation"]
            })

        return candidates

    @classmethod
    def _build_reasons(cls, action: str, last_event: str, deal_data: Dict[str, Any], sim_result: Dict[str, Any]) -> List[str]:
        """Builds domain-specific, explainable reasons for why this action was anticipated."""
        reasons = []
        discount_pct = float(deal_data.get("discount_percent", 0.0))
        tier_limit = sim_result.get("tier_limit", 15.0)
        customer_tier = deal_data.get("customer_tier", "GOLD")
        margin_pct = sim_result.get("gross_margin_percent", 25.0)
        shortage = sim_result.get("shortage_units", 0)

        if action == "REQUEST_APPROVAL":
            if discount_pct > tier_limit:
                reasons.append(f"Discount ({discount_pct}%) exceeds {customer_tier} tier standard limit of {tier_limit}%.")
            if sim_result.get("margin_below_floor", False):
                reasons.append(f"Expected gross margin ({margin_pct}%) is compressed below minimum threshold.")
            if last_event in ["DiscountChanged", "DiscountLimitExceeded"]:
                reasons.append("Recent pricing modification altered governance requirements.")

        elif action == "RECOMMEND_DISCOUNT":
            reasons.append(f"Customer '{customer_tier}' tier pricing profile has optimal conversion elasticity.")
            reasons.append("Historical quote patterns indicate early discount calibration increases deal velocity.")

        elif action == "ALLOCATE_WAREHOUSE":
            reasons.append("Deal reached confirmed/approved state requiring fulfillment planning.")
            reasons.append("Multi-depot routing optimizer identifies lowest freight SLA distribution.")

        elif action == "CREATE_REPLENISHMENT":
            reasons.append(f"Fulfillment simulator detected shortage of {shortage} units in primary distribution depots.")
            reasons.append("Inter-warehouse transfer or supplier replenishment requisition required to meet SLA.")

        elif action == "REVISE_QUOTATION":
            reasons.append("Customer submitted counter-offer during negotiation phase.")
            reasons.append("Revised version with updated margin projection is required for client review.")

        elif action == "GENERATE_INVOICE":
            reasons.append("Sales order is confirmed and fulfillment milestone is locked.")
            reasons.append("Billing cycle ready for commercial invoice draft generation.")

        elif action == "CREATE_SUBSCRIPTION_BILLING":
            reasons.append("Recurring service / software license component identified in deal structure.")
            reasons.append("Automated recurring billing milestone schedule requires initialization.")

        else:
            reasons.append(f"Anticipated following business event '{last_event}'.")

        return reasons
