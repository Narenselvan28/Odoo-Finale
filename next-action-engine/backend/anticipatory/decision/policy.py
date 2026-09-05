"""
DealFlow360 - Anticipatory Deal Engine
Anti-Irritation Intervention Policy & Smart Silence Engine
"""

import time
import logging
from typing import Dict, Any, Tuple

logger = logging.getLogger(__name__)


class InterventionPolicy:
    """
    Governs when and how the system is allowed to proactively suggest or prepare operations.
    Ensures 'Quiet Intelligence' - zero nagging, zero spam on trivial clicks.
    """

    # High-value business events that warrant anticipatory intervention
    HIGH_VALUE_EVENTS = {
        "QuotationCreated",
        "ProductAdded",
        "DiscountChanged",
        "DiscountLimitExceeded",
        "ApprovalApproved",
        "ApprovalRejected",
        "CustomerNegotiated",
        "CustomerCounterOfferReceived",
        "QuotationAccepted",
        "OrderConfirmed",
        "StockShortageDetected",
        "ReplenishmentRequired",
        "SubscriptionCreated",
        "InvoiceReady",
        "DealStalled"
    }

    # Minimum thresholds
    MIN_CONFIDENCE_PROACTIVE = 0.70 # Minimum confidence to show proactive prepared action
    MIN_CONFIDENCE_SILENT = 0.40    # Minimum confidence to list in Next Best Action panel
    COOLDOWN_SECONDS = 15          # Cooldown per deal between popup suggestions

    # In-memory tracking of recent suggestions: deal_id -> timestamp
    _last_suggestion_time: Dict[str, float] = {}
    _dismissal_counts: Dict[str, int] = {} # "deal_id:action" -> count

    @classmethod
    def evaluate_intervention(cls, deal_id: str, event_type: str, top_action: Dict[str, Any]) -> Tuple[bool, str, str]:
        """
        Evaluates whether top action should be shown PROACTIVELY, SILENTLY, or SUPPRESSED.
        Returns: (should_show, display_mode, reason)
        where display_mode in ['PROACTIVE_BANNER', 'SILENT_PANEL', 'SUPPRESSED']
        """
        if event_type not in cls.HIGH_VALUE_EVENTS:
            return False, "SUPPRESSED", f"Event '{event_type}' is low-intent/minor UI."

        action_name = top_action.get("action", "")
        confidence = float(top_action.get("confidence", 0.0))
        final_score = float(top_action.get("final_score", 0.0))

        # Check dismissal penalty
        key = f"{deal_id}:{action_name}"
        dismissals = cls._dismissal_counts.get(key, 0)
        if dismissals >= 3:
            return True, "SILENT_PANEL", f"Action '{action_name}' was dismissed {dismissals} times; demoted to silent panel."

        # Check cooldown for proactive popups
        now = time.time()
        last_time = cls._last_suggestion_time.get(deal_id, 0.0)
        in_cooldown = (now - last_time) < cls.COOLDOWN_SECONDS

        if confidence >= cls.MIN_CONFIDENCE_PROACTIVE and not in_cooldown:
            cls._last_suggestion_time[deal_id] = now
            return True, "PROACTIVE_BANNER", "High confidence and impactful business event."

        elif confidence >= cls.MIN_CONFIDENCE_SILENT:
            return True, "SILENT_PANEL", "Medium confidence; placed quietly in Next Best Action cockpit."

        return False, "SUPPRESSED", "Confidence below threshold."

    @classmethod
    def record_dismissal(cls, deal_id: str, action_name: str):
        key = f"{deal_id}:{action_name}"
        cls._dismissal_counts[key] = cls._dismissal_counts.get(key, 0) + 1
        logger.info(f"[InterventionPolicy] Dismissal recorded for {key}. Count: {cls._dismissal_counts[key]}")

    @classmethod
    def reset_cooldown(cls, deal_id: str):
        cls._last_suggestion_time.pop(deal_id, None)
