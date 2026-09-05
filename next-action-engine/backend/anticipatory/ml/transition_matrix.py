"""
DealFlow360 - Anticipatory Deal Engine
Multi-Level Workflow Transition Matrix (Global, Customer, Product, Role)
"""

import logging
from collections import defaultdict
from typing import Dict, List, Any, Tuple

logger = logging.getLogger(__name__)


class MultiLevelTransitionMatrix:
    """
    Learned and statistical transition matrices tracking workflow sequence probabilities
    across Global, Customer Tier / ID, and Product Category levels.
    """

    # Global Baseline Transition Frequencies based on enterprise sales workflows
    GLOBAL_TRANSITIONS = {
        "QuotationCreated": [
            ("RECOMMEND_DISCOUNT", 0.42),
            ("RECALCULATE_MARGIN", 0.30),
            ("REQUEST_APPROVAL", 0.18),
            ("ALLOCATE_WAREHOUSE", 0.10)
        ],
        "ProductAdded": [
            ("RECOMMEND_DISCOUNT", 0.48),
            ("RECALCULATE_MARGIN", 0.35),
            ("ALLOCATE_WAREHOUSE", 0.17)
        ],
        "DiscountChanged": [
            ("REQUEST_APPROVAL", 0.55),
            ("RECALCULATE_MARGIN", 0.30),
            ("REVISE_QUOTATION", 0.15)
        ],
        "DiscountLimitExceeded": [
            ("REQUEST_APPROVAL", 0.92),
            ("REQUEST_FINANCE_REVIEW", 0.08)
        ],
        "ApprovalApproved": [
            ("ALLOCATE_WAREHOUSE", 0.65),
            ("CONFIRM_ORDER", 0.25),
            ("RECALCULATE_DELIVERY_PROMISE", 0.10)
        ],
        "OrderConfirmed": [
            ("ALLOCATE_WAREHOUSE", 0.58),
            ("GENERATE_INVOICE", 0.27),
            ("CREATE_SUBSCRIPTION_BILLING", 0.15)
        ],
        "StockShortageDetected": [
            ("CREATE_REPLENISHMENT", 0.88),
            ("SPLIT_FULFILLMENT", 0.12)
        ],
        "WarehouseAllocationChanged": [
            ("GENERATE_INVOICE", 0.65),
            ("CREATE_SUBSCRIPTION_BILLING", 0.25),
            ("FOLLOW_UP", 0.10)
        ],
        "ReplenishmentRequired": [
            ("ALLOCATE_WAREHOUSE", 0.70),
            ("RECALCULATE_DELIVERY_PROMISE", 0.30)
        ],
        "CustomerNegotiated": [
            ("REVISE_QUOTATION", 0.72),
            ("REQUEST_APPROVAL", 0.18),
            ("PREPARE_NEGOTIATION", 0.10)
        ],
        "CustomerCounterOfferReceived": [
            ("REVISE_QUOTATION", 0.80),
            ("REQUEST_APPROVAL", 0.20)
        ],
        "QuotationAccepted": [
            ("CONFIRM_ORDER", 0.70),
            ("ALLOCATE_WAREHOUSE", 0.20),
            ("GENERATE_INVOICE", 0.10)
        ],
        "SubscriptionCreated": [
            ("CREATE_SUBSCRIPTION_BILLING", 0.90),
            ("GENERATE_INVOICE", 0.10)
        ],
        "InvoiceReady": [
            ("RECORD_PAYMENT", 0.60),
            ("FOLLOW_UP", 0.40)
        ],
        "DealStalled": [
            ("FOLLOW_UP", 0.85),
            ("REVISE_QUOTATION", 0.15)
        ]
    }

    # Customer-specific modifier priors (e.g. Platinum customers negotiate heavily and need swift discount revisions)
    CUSTOMER_TIER_MODIFIERS = {
        "PLATINUM": {
            "CustomerNegotiated": {"REVISE_QUOTATION": 1.25, "RECOMMEND_DISCOUNT": 1.20},
            "DiscountChanged": {"REQUEST_APPROVAL": 0.85}, # higher leeway
        },
        "STANDARD": {
            "DiscountChanged": {"REQUEST_APPROVAL": 1.35},
        }
    }

    # Product category modifiers (e.g., Laptops frequently require accessory fulfillment & warranty)
    PRODUCT_CATEGORY_MODIFIERS = {
        "laptop": {
            "OrderConfirmed": {"ALLOCATE_WAREHOUSE": 1.15, "CREATE_REPLENISHMENT": 1.10}
        },
        "subscription": {
            "OrderConfirmed": {"CREATE_SUBSCRIPTION_BILLING": 1.80}
        }
    }

    @classmethod
    def get_candidate_actions(
        cls,
        last_event: str,
        customer_tier: str = "GOLD",
        product_category: str = "laptop",
        user_role: str = "sales_rep"
    ) -> List[Tuple[str, float]]:
        """
        Calculates normalized next-action candidates by combining Global,
        Customer Tier, and Product Category transitions.
        """
        transitions = cls.GLOBAL_TRANSITIONS.get(last_event, [("NO_ACTION", 1.0)])
        
        scores: Dict[str, float] = {}
        for action, base_prob in transitions:
            score = base_prob
            
            # Apply Customer Tier Modifier
            tier_mods = cls.CUSTOMER_TIER_MODIFIERS.get(customer_tier, {}).get(last_event, {})
            if action in tier_mods:
                score *= tier_mods[action]
                
            # Apply Product Category Modifier
            cat_mods = cls.PRODUCT_CATEGORY_MODIFIERS.get(product_category, {}).get(last_event, {})
            if action in cat_mods:
                score *= cat_mods[action]

            scores[action] = score

        # Normalize probabilities so sum is 1.0
        total = sum(scores.values())
        if total > 0:
            candidates = [(act, round(s / total, 3)) for act, s in scores.items()]
        else:
            candidates = [("NO_ACTION", 1.0)]

        # Sort descending by probability
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates
