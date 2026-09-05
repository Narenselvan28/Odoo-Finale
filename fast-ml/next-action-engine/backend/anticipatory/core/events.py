"""
DealFlow360 - Anticipatory Deal Engine
Domain Business Events Model
"""

import uuid
from enum import Enum
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, Any, Optional


class BusinessEventType(str, Enum):
    # Quotation & Product Lifecycle
    QUOTATION_CREATED = "QuotationCreated"
    QUOTATION_EDITED = "QuotationEdited"
    PRODUCT_ADDED = "ProductAdded"
    PRODUCT_REMOVED = "ProductRemoved"
    QUANTITY_CHANGED = "QuantityChanged"
    DISCOUNT_CHANGED = "DiscountChanged"
    DISCOUNT_LIMIT_EXCEEDED = "DiscountLimitExceeded"
    MARGIN_CHANGED = "MarginChanged"
    
    # Governance & Approval
    APPROVAL_REQUIRED = "ApprovalRequired"
    APPROVAL_APPROVED = "ApprovalApproved"
    APPROVAL_REJECTED = "ApprovalRejected"
    
    # Customer Negotiation
    CUSTOMER_NEGOTIATED = "CustomerNegotiated"
    CUSTOMER_COUNTER_OFFER_RECEIVED = "CustomerCounterOfferReceived"
    QUOTATION_ACCEPTED = "QuotationAccepted"
    
    # Order & Fulfillment
    ORDER_CONFIRMED = "OrderConfirmed"
    STOCK_SHORTAGE_DETECTED = "StockShortageDetected"
    WAREHOUSE_ALLOCATION_CHANGED = "WarehouseAllocationChanged"
    WAREHOUSE_SPLIT_DETECTED = "WarehouseSplitDetected"
    DELIVERY_RISK_DETECTED = "DeliveryRiskDetected"
    REPLENISHMENT_REQUIRED = "ReplenishmentRequired"
    
    # Billing & Financials
    SUBSCRIPTION_CREATED = "SubscriptionCreated"
    SUBSCRIPTION_CHANGED = "SubscriptionChanged"
    INVOICE_READY = "InvoiceReady"
    PAYMENT_RECEIVED = "PaymentReceived"
    DEAL_STALLED = "DealStalled"


@dataclass
class BusinessEvent:
    deal_id: str
    event_type: str
    user_id: str
    event_id: str = field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    previous_state: Optional[str] = None
    new_state: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    source: str = "deal_workspace"
    correlation_id: str = field(default_factory=lambda: f"corr_{uuid.uuid4().hex[:8]}")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
