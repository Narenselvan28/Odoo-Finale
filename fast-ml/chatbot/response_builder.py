"""
DealFlow360 - Structured Response Builder
Formats customer chatbot responses into structured JSON suitable for React UI rendering:
Supports tables, comparisons, scenario cards, quick replies, and explicit confirmation prompts.
"""

from typing import Dict, List, Optional, Any, Tuple
from chatbot.schemas import (
    StructuredResponse,
    ResponseSection,
    FeasibleScenario,
    ChatAction
)


class ResponseBuilder:
    """Builds presentation-ready structured JSON responses for the frontend."""

    @staticmethod
    def build_message(text: str, quick_actions: Optional[List[str]] = None) -> StructuredResponse:
        return StructuredResponse(
            type="MESSAGE",
            message=text
        )

    @staticmethod
    def build_quote_summary(
        deal_id: str,
        total_amount: float,
        discount_percent: float,
        quantity: int,
        delivery_days: int,
        status: str = "Active Quotation"
    ) -> StructuredResponse:
        sections = [
            ResponseSection(label="Quotation ID", value=deal_id),
            ResponseSection(label="Order Quantity", value=f"{quantity:,} units"),
            ResponseSection(label="Applied Discount", value=f"{discount_percent:.1f}%"),
            ResponseSection(label="Total Amount", value=f"${total_amount:,.2f}"),
            ResponseSection(label="Estimated Delivery", value=f"{delivery_days} business days"),
            ResponseSection(label="Quotation Status", value=status, status="normal")
        ]
        return StructuredResponse(
            type="SUMMARY_CARD",
            message=f"Here is the current summary for quotation **{deal_id}**.",
            sections=sections
        )

    @staticmethod
    def build_price_breakdown(
        subtotal: float,
        discount_amount: float,
        effective_discount_pct: float,
        transport_cost: float,
        fulfillment_cost: float,
        tax_amount: float,
        final_total: float
    ) -> StructuredResponse:
        sections = [
            ResponseSection(label="Base Subtotal", value=f"${subtotal:,.2f}"),
            ResponseSection(label=f"Discount ({effective_discount_pct:.1f}%)", value=f"-${discount_amount:,.2f}"),
            ResponseSection(label="Freight & Transport", value=f"+${transport_cost:,.2f}"),
            ResponseSection(label="Fulfillment & Handling", value=f"+${fulfillment_cost:,.2f}"),
            ResponseSection(label="Estimated Taxes", value=f"${tax_amount:,.2f}"),
            ResponseSection(label="Final Total", value=f"${final_total:,.2f}", status="normal")
        ]
        return StructuredResponse(
            type="PRICE_BREAKDOWN",
            message="Here is the detailed itemized cost breakdown of your quotation.",
            sections=sections
        )

    @staticmethod
    def build_scenario_result(
        message: str,
        sections: List[ResponseSection],
        proposal_action: Optional[ChatAction] = None,
        warnings: Optional[List[str]] = None,
        explanation: Optional[Dict[str, Any]] = None
    ) -> StructuredResponse:
        return StructuredResponse(
            type="SCENARIO_RESULT",
            message=message,
            sections=sections,
            warnings=warnings or [],
            explanation=explanation
        )

    @staticmethod
    def build_better_deal_comparison(
        message: str,
        scenarios: List[FeasibleScenario]
    ) -> StructuredResponse:
        return StructuredResponse(
            type="COMPARISON",
            message=message,
            scenarios=scenarios
        )

    @staticmethod
    def build_better_deal_options(
        message: str,
        scenarios: List[FeasibleScenario],
        explanation: Optional[Dict[str, Any]] = None
    ) -> StructuredResponse:
        return StructuredResponse(
            type="COMPARISON",
            message=message,
            scenarios=scenarios,
            explanation=explanation
        )

    @staticmethod
    def build_confirmation_prompt(
        message: str,
        sections: List[ResponseSection],
        confirm_action_id: str,
        confirm_label: str = "Submit Request",
        cancel_label: str = "Keep Current Quote"
    ) -> Tuple[StructuredResponse, List[ChatAction]]:
        """Returns structured response paired with explicit confirmation buttons."""
        response = StructuredResponse(
            type="CONFIRMATION",
            message=message,
            sections=sections
        )
        actions = [
            ChatAction(id=confirm_action_id, label=confirm_label, requires_confirmation=True),
            ChatAction(id="cancel_action", label=cancel_label, requires_confirmation=False)
        ]
        return response, actions

    @staticmethod
    def default_quick_actions() -> List[ChatAction]:
        return [
            ChatAction(id="act_summary", label="📋 Summarize Quote", type="QUICK_REPLY"),
            ChatAction(id="act_breakdown", label="🔍 Price Breakdown", type="QUICK_REPLY"),
            ChatAction(id="act_better_deal", label="💡 Find a Better Deal", type="QUICK_REPLY"),
            ChatAction(id="act_delivery", label="🚚 Check Delivery", type="QUICK_REPLY"),
            ChatAction(id="act_negotiate", label="🤝 What Can I Negotiate?", type="QUICK_REPLY")
        ]
