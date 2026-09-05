"""
DealFlow360 - Anticipatory Deal Engine
Workflow State Machine & Transition Tracker
"""

import logging
from enum import Enum
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class WorkflowState(str, Enum):
    DRAFT = "DRAFT"
    PRICING_CONFIGURED = "PRICING_CONFIGURED"
    DISCOUNT_PENDING = "DISCOUNT_PENDING"
    APPROVAL_PENDING = "APPROVAL_PENDING"
    APPROVED = "APPROVED"
    NEGOTIATION = "NEGOTIATION"
    CONFIRMED = "CONFIRMED"
    ALLOCATED = "ALLOCATED"
    SHORTAGE_FLAGGED = "SHORTAGE_FLAGGED"
    REPLENISHMENT_ORDERED = "REPLENISHMENT_ORDERED"
    INVOICED = "INVOICED"
    SUBSCRIPTION_ACTIVE = "SUBSCRIPTION_ACTIVE"
    COMPLETED = "COMPLETED"


class WorkflowStateMachine:
    """Manages deal lifecycle states, validates transitions, and maintains state graph."""

    VALID_TRANSITIONS: Dict[str, List[str]] = {
        WorkflowState.DRAFT: [
            WorkflowState.PRICING_CONFIGURED,
            WorkflowState.DISCOUNT_PENDING,
            WorkflowState.APPROVAL_PENDING,
        ],
        WorkflowState.PRICING_CONFIGURED: [
            WorkflowState.DISCOUNT_PENDING,
            WorkflowState.APPROVAL_PENDING,
            WorkflowState.CONFIRMED,
            WorkflowState.NEGOTIATION,
        ],
        WorkflowState.DISCOUNT_PENDING: [
            WorkflowState.APPROVAL_PENDING,
            WorkflowState.APPROVED,
            WorkflowState.NEGOTIATION,
            WorkflowState.CONFIRMED,
        ],
        WorkflowState.APPROVAL_PENDING: [
            WorkflowState.APPROVED,
            WorkflowState.NEGOTIATION,
            WorkflowState.DRAFT,
        ],
        WorkflowState.APPROVED: [
            WorkflowState.CONFIRMED,
            WorkflowState.NEGOTIATION,
            WorkflowState.ALLOCATED,
        ],
        WorkflowState.NEGOTIATION: [
            WorkflowState.PRICING_CONFIGURED,
            WorkflowState.APPROVAL_PENDING,
            WorkflowState.APPROVED,
            WorkflowState.CONFIRMED,
        ],
        WorkflowState.CONFIRMED: [
            WorkflowState.ALLOCATED,
            WorkflowState.SHORTAGE_FLAGGED,
            WorkflowState.INVOICED,
            WorkflowState.SUBSCRIPTION_ACTIVE,
        ],
        WorkflowState.ALLOCATED: [
            WorkflowState.SHORTAGE_FLAGGED,
            WorkflowState.INVOICED,
            WorkflowState.SUBSCRIPTION_ACTIVE,
            WorkflowState.COMPLETED,
        ],
        WorkflowState.SHORTAGE_FLAGGED: [
            WorkflowState.REPLENISHMENT_ORDERED,
            WorkflowState.ALLOCATED,
        ],
        WorkflowState.REPLENISHMENT_ORDERED: [
            WorkflowState.ALLOCATED,
            WorkflowState.INVOICED,
        ],
        WorkflowState.INVOICED: [
            WorkflowState.SUBSCRIPTION_ACTIVE,
            WorkflowState.COMPLETED,
        ],
        WorkflowState.SUBSCRIPTION_ACTIVE: [
            WorkflowState.COMPLETED,
        ],
        WorkflowState.COMPLETED: [],
    }

    @classmethod
    def is_valid_transition(cls, from_state: str, to_state: str) -> bool:
        if from_state == to_state:
            return True
        allowed = cls.VALID_TRANSITIONS.get(from_state, [])
        return to_state in allowed

    @classmethod
    def get_next_potential_states(cls, current_state: str) -> List[str]:
        return cls.VALID_TRANSITIONS.get(current_state, [])
