"""
DealFlow360 - Customer Intent Router & Intelligence Orchestrator
Routes detected customer intents to existing DealFlow360 ML models, Rule Engine,
What-If Simulator, Fulfillment Engine, Business Memory, and Explainability.
"""

import copy
import logging
from typing import Dict, Any, List, Optional, Tuple
from chatbot.schemas import (
    CustomerChatRequest,
    CustomerChatResponse,
    ConversationState,
    StructuredResponse,
    ResponseSection,
    FeasibleScenario,
    ChatAction,
    ExtractedEntity,
    IntentConfidence
)
from chatbot.confidence import ConfidencePolicy, ConfidenceManager
from chatbot.conversation_manager import conversation_manager, ConversationSession
from chatbot.action_planner import ActionPlanner, ActionPlan
from chatbot.response_builder import ResponseBuilder

# Import existing intelligence components
from intelligence.what_if.simulator import WhatIfSimulator
from intelligence.what_if.pricing_simulator import PricingSimulator
from intelligence.what_if.fulfillment_simulator import FulfillmentSimulator
from intelligence.adapters.rule_engine_adapter import RuleEngineAdapter
from intelligence.adapters.ml_adapter import MLAdapter
from intelligence.memory.business_memory import business_memory_service
from intelligence.health.deal_health_engine import DealHealthEngine
from intelligence.explanation.explanation_engine import ExplanationEngine

logger = logging.getLogger(__name__)


class IntentRouter:
    """Orchestrates customer chat requests through DealFlow360 intelligence engines."""

    @classmethod
    def route_and_execute(
        cls,
        deal: Dict[str, Any],
        intents: List[IntentConfidence],
        entities: Dict[str, ExtractedEntity],
        session: ConversationSession
    ) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        """
        Executes business reasoning and returns:
        (StructuredResponse, actions_list, new_state, pending_proposal)
        """
        primary_intent = intents[0].name if intents else "GENERAL_HELP"
        intent_names = [i.name for i in intents]

        # 1. Confirmation flow
        if "CONFIRM_QUOTATION" in intent_names or ("confirmation" in entities and session.pending_proposal):
            return cls._handle_confirmation(deal, session)

        # 2. Cancellation
        if "negation" in entities and session.pending_proposal:
            session.clear_pending_proposal()
            resp = ResponseBuilder.build_message("Understood. I have cancelled the pending request. Your quotation remains unchanged.")
            return resp, ResponseBuilder.default_quick_actions(), ConversationState.COMPLETED, None

        # 3. Better Deal (Killer Feature)
        if "BETTER_DEAL" in intent_names:
            return cls._handle_find_better_deal(deal, entities, session)

        # 4. Discount Request / Impact
        if "DISCOUNT_REQUEST" in intent_names:
            return cls._handle_discount_request(deal, entities, session)
        if "DISCOUNT_IMPACT" in intent_names:
            return cls._handle_discount_impact(deal, entities, session)

        # 5. Delivery Request / Status
        if "DELIVERY_REQUEST" in intent_names:
            return cls._handle_delivery_request(deal, entities, session)
        if "DELIVERY_STATUS" in intent_names:
            return cls._handle_delivery_status(deal)

        # 6. What-If Scenario
        if "WHAT_IF_SCENARIO" in intent_names:
            return cls._handle_what_if_scenario(deal, entities, session)

        # 7. Quote Price Breakdown
        if "QUOTE_PRICE_BREAKDOWN" in intent_names:
            return cls._handle_price_breakdown(deal)

        # 8. Product Information / Alternatives
        if "PRODUCT_INFORMATION" in intent_names:
            return cls._handle_product_info(deal, entities)
        if "PRODUCT_ALTERNATIVE" in intent_names:
            return cls._handle_product_alternatives(deal)

        # 9. Governance & Metadata
        if "APPROVAL_STATUS" in intent_names:
            return cls._handle_approval_status(deal)
        if "NEGOTIATION_STATUS" in intent_names:
            return cls._handle_negotiation_status(deal)
        if "NEGOTIATION_REASON" in intent_names:
            return cls._handle_negotiation_reason(deal, entities)
        if "WHAT_CAN_I_CHANGE" in intent_names:
            return cls._handle_what_can_i_change(deal)
        if "QUOTE_SUMMARY" in intent_names:
            return cls._handle_quote_summary(deal)

        # Default Help
        return cls._handle_general_help()

    @classmethod
    def process_turn(
        cls,
        session: ConversationSession,
        message: str,
        intents: List[IntentConfidence],
        primary_intent: str,
        entities: Dict[str, ExtractedEntity],
        context_override: Optional[Dict[str, Any]] = None
    ) -> CustomerChatResponse:
        deal_context = cls._build_deal_context(session.deal_id, session.customer_id, context_override)
        resp, actions, new_state, pending_proposal = cls.route_and_execute(deal_context, intents, entities, session)
        session.set_state(new_state)

        session.record_turn(
            user_message=message,
            response_payload=resp.model_dump() if hasattr(resp, "model_dump") else resp,
            intent=primary_intent,
            entities={k: (v.model_dump() if hasattr(v, "model_dump") else v) for k, v in entities.items()}
        )
        return CustomerChatResponse(
            conversation_id=session.conversation_id,
            deal_id=session.deal_id,
            state=session.state,
            intents=intents,
            primary_intent=primary_intent,
            entities=entities,
            response=resp,
            actions=actions,
            pending_proposal=pending_proposal or session.pending_proposal
        )

    # ─────────────────────────────────────────────────────────────────────────────
    # FEATURE HANDLERS
    # ─────────────────────────────────────────────────────────────────────────────

    @classmethod
    def _handle_quote_summary(cls, deal: Dict[str, Any]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        fulfillment = FulfillmentSimulator.simulate(deal)
        pricing = PricingSimulator.calculate_pricing(
            deal,
            transport_cost=fulfillment.get("transport_cost", 0.0),
            fulfillment_cost=fulfillment.get("fulfillment_cost", 0.0)
        )
        resp = ResponseBuilder.build_quote_summary(
            deal_id=str(deal.get("deal_id", "DEAL-1001")),
            total_amount=pricing.get("selling_value", 0.0),
            discount_percent=pricing.get("discount_percent", 0.0),
            quantity=int(deal.get("quantity", 500)),
            delivery_days=fulfillment.get("estimated_delivery_days", 4),
            status="Active Quotation"
        )
        actions = [
            ChatAction(id="act_breakdown", label="🔍 Itemized Breakdown", type="QUICK_REPLY"),
            ChatAction(id="act_better_deal", label="💡 Find Better Deal", type="QUICK_REPLY"),
            ChatAction(id="act_req_discount", label="💰 Request Discount", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_price_breakdown(cls, deal: Dict[str, Any]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        fulfillment = FulfillmentSimulator.simulate(deal)
        pricing = PricingSimulator.calculate_pricing(
            deal,
            transport_cost=fulfillment.get("transport_cost", 0.0),
            fulfillment_cost=fulfillment.get("fulfillment_cost", 0.0)
        )
        resp = ResponseBuilder.build_price_breakdown(
            subtotal=pricing.get("gross_value", 0.0),
            discount_amount=pricing.get("discount_amount", 0.0),
            effective_discount_pct=pricing.get("discount_percent", 0.0),
            transport_cost=pricing.get("transport_cost", 0.0),
            fulfillment_cost=pricing.get("fulfillment_cost", 0.0),
            tax_amount=0.0,
            final_total=pricing.get("selling_value", 0.0)
        )
        actions = [
            ChatAction(id="act_better_deal", label="💡 Can we make this cheaper?", type="QUICK_REPLY"),
            ChatAction(id="act_change_qty", label="📦 What if I change quantity?", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_product_info(cls, deal: Dict[str, Any], entities: Dict[str, ExtractedEntity]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        prod_name = entities.get("product_name").value if "product_name" in entities else "Enterprise ThinkPad Laptop"
        sections = [
            ResponseSection(label="Product", value=prod_name),
            ResponseSection(label="Tier", value="Enterprise Standard"),
            ResponseSection(label="Support Included", value="24/7 Next-Business-Day Onsite"),
            ResponseSection(label="Warranty Period", value="36 Months Premier Manufacturer Warranty"),
            ResponseSection(label="Availability", value="In Stock (Regional Logistics Center)")
        ]
        resp = StructuredResponse(
            type="PRODUCT_CARD",
            message=f"Here is the product specification and terms for **{prod_name}**.",
            sections=sections
        )
        actions = [
            ChatAction(id="act_alt_product", label="🔄 Show Cheaper Alternatives", type="QUICK_REPLY"),
            ChatAction(id="act_quote_summary", label="📋 Back to Quote Summary", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_delivery_status(cls, deal: Dict[str, Any]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        fulfillment = FulfillmentSimulator.simulate(deal)
        sections = [
            ResponseSection(label="Estimated Delivery Time", value=f"{fulfillment.get('estimated_delivery_days', 4)} business days"),
            ResponseSection(label="Target Delivery SLA", value=f"{deal.get('required_delivery_days', 4)} days"),
            ResponseSection(label="SLA Feasibility", value="On Track" if fulfillment.get("delivery_sla_met") else "Potential Delay", status="normal" if fulfillment.get("delivery_sla_met") else "warning"),
            ResponseSection(label="Assigned Warehouse", value=fulfillment.get("primary_warehouse", "WH-A"))
        ]
        resp = StructuredResponse(
            type="DELIVERY_STATUS",
            message=f"Current fulfillment estimate is **{fulfillment.get('estimated_delivery_days', 4)} business days**.",
            sections=sections
        )
        actions = [
            ChatAction(id="act_expedite", label="⚡ Request Rush Delivery", type="QUICK_REPLY"),
            ChatAction(id="act_find_deal", label="💡 Optimize Deal & Timing", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_delivery_request(cls, deal: Dict[str, Any], entities: Dict[str, ExtractedEntity], session: ConversationSession) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        requested_date = entities.get("delivery_date").value if "delivery_date" in entities else "Friday"
        fulfillment = FulfillmentSimulator.simulate(deal)

        sim_deal = copy.deepcopy(deal)
        sim_deal["required_delivery_days"] = 3
        sim_fulfillment = FulfillmentSimulator.simulate(sim_deal)

        is_feasible = sim_fulfillment.get("delivery_sla_met", True)
        if is_feasible:
            msg = f"Delivery by **{requested_date}** is feasible via our regional warehouse network."
            sections = [
                ResponseSection(label="Requested Deadline", value=str(requested_date)),
                ResponseSection(label="Estimated Delivery Days", value=f"{sim_fulfillment.get('estimated_delivery_days', 3)} days"),
                ResponseSection(label="Feasibility", value="FEASIBLE", status="normal"),
                ResponseSection(label="Expedited Freight Cost", value=f"+${sim_fulfillment.get('transport_cost', 0.0):,.2f}")
            ]
            proposal = {
                "id": "prop_delivery_change",
                "title": f"Expedite Delivery to {requested_date}",
                "type": "DELIVERY_UPDATE",
                "delivery_date": str(requested_date),
                "approval_level": "Automated Logistics Approval"
            }
            session.set_pending_proposal(proposal)
            actions = [
                ChatAction(id="confirm_delivery", label=f"Confirm Delivery for {requested_date}", requires_confirmation=True),
                ChatAction(id="cancel_delivery", label="Keep Current Schedule")
            ]
            state = ConversationState.WAITING_FOR_CONFIRMATION
        else:
            msg = f"Delivery by **{requested_date}** cannot be guaranteed due to carrier transit times. Earliest reliable delivery is **Monday** (4 business days)."
            sections = [
                ResponseSection(label="Requested Date", value=str(requested_date)),
                ResponseSection(label="Earliest Feasible Date", value="Monday (4 days)"),
                ResponseSection(label="Feasibility", value="SLA NOT MET", status="warning")
            ]
            proposal = None
            actions = [
                ChatAction(id="accept_monday", label="Accept Monday Delivery", type="QUICK_REPLY"),
                ChatAction(id="act_better_deal", label="Find Better Deal Options", type="QUICK_REPLY")
            ]
            state = ConversationState.COMPLETED

        resp = StructuredResponse(type="DELIVERY_EVALUATION", message=msg, sections=sections)
        return resp, actions, state, proposal

    @classmethod
    def _handle_discount_request(cls, deal: Dict[str, Any], entities: Dict[str, ExtractedEntity], session: ConversationSession) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        current_disc = float(deal.get("discount_percent", deal.get("current_discount_percent", 12.0)))
        requested_disc = entities.get("discount_percent").value if "discount_percent" in entities else (current_disc + 3.0)
        requested_disc = float(requested_disc)

        sim_payload = {
            "deal": copy.deepcopy(deal),
            "changes": {"discount_percent": requested_disc}
        }
        sim_data = WhatIfSimulator.simulate(sim_payload)["simulation"]
        baseline = sim_data["current"]
        simulated = sim_data["simulated"]
        rules = sim_data["rules"]

        requires_appr = rules.get("approval_required", False)
        appr_level = rules.get("approval_level", "Sales Director")

        msg = f"At **{requested_disc:.1f}% discount**, the quotation total becomes **${simulated['selling_value']:,.2f}** (estimated margin: **{simulated['margin_percent']:.1f}%**)."
        if requires_appr:
            msg += f" This change requires **{appr_level} Approval**."

        sections = [
            ResponseSection(label="Discount", current=f"{current_disc:.1f}%", proposed=f"{requested_disc:.1f}%"),
            ResponseSection(label="Quotation Total", current=f"${baseline['selling_value']:,.2f}", proposed=f"${simulated['selling_value']:,.2f}"),
            ResponseSection(label="Estimated Margin", current=f"{baseline['margin_percent']:.1f}%", proposed=f"{simulated['margin_percent']:.1f}%"),
            ResponseSection(
                label="Governance & Approval",
                value=f"{appr_level} Required" if requires_appr else "Auto-Approved",
                status="warning" if requires_appr else "normal"
            )
        ]

        proposal = {
            "id": f"prop_discount_{int(requested_disc)}",
            "title": f"Apply {requested_disc:.1f}% Discount Request",
            "type": "DISCOUNT_MUTATION",
            "discount_percent": requested_disc,
            "approval_level": appr_level if requires_appr else "None"
        }
        session.set_pending_proposal(proposal)

        actions = [
            ChatAction(id="confirm_discount", label=f"Submit {requested_disc:.1f}% Request", requires_confirmation=True),
            ChatAction(id="cancel_discount", label=f"Keep {current_disc:.1f}%")
        ]

        resp = StructuredResponse(
            type="CONFIRMATION",
            message=msg,
            sections=sections,
            warnings=["Submission will trigger governance approval workflow."] if requires_appr else []
        )
        return resp, actions, ConversationState.WAITING_FOR_CONFIRMATION, proposal

    @classmethod
    def _handle_discount_impact(cls, deal: Dict[str, Any], entities: Dict[str, ExtractedEntity], session: ConversationSession) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        current_disc = float(deal.get("discount_percent", deal.get("current_discount_percent", 12.0)))
        target_disc = entities.get("discount_percent").value if "discount_percent" in entities else 18.0
        target_disc = float(target_disc)

        sim_payload = {
            "deal": copy.deepcopy(deal),
            "changes": {"discount_percent": target_disc}
        }
        sim_data = WhatIfSimulator.simulate(sim_payload)["simulation"]
        baseline = sim_data["current"]
        simulated = sim_data["simulated"]
        rules = sim_data["rules"]

        sections = [
            ResponseSection(label="Discount", current=f"{current_disc:.1f}%", proposed=f"{target_disc:.1f}%"),
            ResponseSection(label="Estimated Margin", current=f"{baseline['margin_percent']:.1f}%", proposed=f"{simulated['margin_percent']:.1f}%"),
            ResponseSection(
                label="Governance & Approval",
                value=f"{rules.get('approval_level', 'Sales Manager')} Required" if rules.get("approval_required") else "Auto-Approved",
                status="warning" if rules.get("approval_required") else "normal"
            ),
            ResponseSection(label="Delivery Lead Time", value="4 business days")
        ]

        resp = ResponseBuilder.build_scenario_result(
            message=f"Simulation results for requesting **{target_disc:.1f}% discount** on your deal:",
            sections=sections,
            warnings=[]
        )

        actions = [
            ChatAction(id="submit_disc_req", label=f"Proceed with {target_disc:.1f}% Request", type="QUICK_REPLY"),
            ChatAction(id="act_better_deal", label="💡 Explore Other Better Deals", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_what_if_scenario(cls, deal: Dict[str, Any], entities: Dict[str, ExtractedEntity], session: ConversationSession) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        changes = {}
        if "quantity" in entities:
            changes["quantity"] = int(entities["quantity"].value)
        if "discount_percent" in entities:
            changes["discount_percent"] = float(entities["discount_percent"].value)

        if not changes:
            changes = {"discount_percent": float(deal.get("discount_percent", 12.0)) + 3.0}

        sim_payload = {
            "deal": copy.deepcopy(deal),
            "changes": changes
        }
        sim_data = WhatIfSimulator.simulate(sim_payload)["simulation"]
        baseline = sim_data["current"]
        simulated = sim_data["simulated"]

        sections = [
            ResponseSection(label="Quantity", current=f"{deal.get('quantity', 500)} units", proposed=f"{changes.get('quantity', deal.get('quantity', 500))} units"),
            ResponseSection(label="Discount", current=f"{baseline['discount_percent']:.1f}%", proposed=f"{simulated['discount_percent']:.1f}%"),
            ResponseSection(label="Total Amount", current=f"${baseline['selling_value']:,.2f}", proposed=f"${simulated['selling_value']:,.2f}"),
            ResponseSection(label="Estimated Margin", current=f"{baseline['margin_percent']:.1f}%", proposed=f"{simulated['margin_percent']:.1f}%"),
            ResponseSection(label="Delivery Days", value="4 business days")
        ]

        resp = StructuredResponse(
            type="SCENARIO_RESULT",
            message="Here is the simulated outcome based on your requested parameters:",
            sections=sections
        )
        actions = [
            ChatAction(id="apply_scenario", label="Apply Simulated Scenario", type="QUICK_REPLY"),
            ChatAction(id="reset_quote", label="Reset to Baseline", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_find_better_deal(cls, deal: Dict[str, Any], entities: Dict[str, ExtractedEntity], session: ConversationSession) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        delivery_req = entities.get("delivery_date").value if "delivery_date" in entities else None
        scenarios = ActionPlanner.generate_better_deal_scenarios(deal, entities)

        msg = "We analyzed your quotation and found **3 feasible deal options** that balance price, delivery, and approval:"
        if delivery_req:
            msg = f"Based on your timeline ({delivery_req}), here are **3 feasible alternatives** ranked by value:"

        resp = ResponseBuilder.build_better_deal_options(message=msg, scenarios=scenarios)
        actions = [
            ChatAction(id="choose_opt_a", label="Select Option A (Fast-Track)", requires_confirmation=True),
            ChatAction(id="choose_opt_b", label="Select Option B (Max Value)", requires_confirmation=True),
            ChatAction(id="choose_opt_c", label="Select Option C (Volume Tier)", requires_confirmation=True)
        ]
        return resp, actions, ConversationState.SIMULATION, None

    @classmethod
    def _handle_product_alternatives(cls, deal: Dict[str, Any]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        sections = [
            ResponseSection(label="Alternative 1", value="ThinkPad Essential L-Series (-18% lower cost, identical warranty)"),
            ResponseSection(label="Alternative 2", value="Standard Enterprise Desktop (-25% lower cost, 4-day delivery)"),
            ResponseSection(label="Alternative 3", value="Cloud Hosted Virtual Workstation (-30% initial CapEx)")
        ]
        resp = StructuredResponse(
            type="PRODUCT_ALTERNATIVES",
            message="Here are lower-cost product configurations compatible with your quotation requirements:",
            sections=sections
        )
        actions = [
            ChatAction(id="act_swap_alt1", label="Simulate with Essential Series", type="QUICK_REPLY"),
            ChatAction(id="act_keep_current", label="Keep Current Hardware", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_approval_status(cls, deal: Dict[str, Any]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        rules = RuleEngineAdapter.evaluate_deal_rules(deal, {"margin_percent": 18.0}, {"delivery_sla_met": True})
        sections = [
            ResponseSection(label="Review Stage", value="Commercial Governance Review"),
            ResponseSection(label="Current Status", value="Pending Management Sign-Off" if rules.get("approval_required") else "Approved / Ready for Order"),
            ResponseSection(label="Estimated Turnaround", value="2 - 4 Business Hours"),
            ResponseSection(label="Review Level", value=rules.get("approval_level", "Sales Manager"))
        ]
        resp = StructuredResponse(
            type="APPROVAL_STATUS",
            message="Here is the current review and approval progress for your quotation.",
            sections=sections
        )
        actions = [
            ChatAction(id="act_summary", label="📋 View Full Summary", type="QUICK_REPLY"),
            ChatAction(id="act_help", label="❓ Need Help?", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_negotiation_status(cls, deal: Dict[str, Any]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        sections = [
            ResponseSection(label="Negotiation Round", value="Round 1 (Initial Proposal)"),
            ResponseSection(label="Original Discount", value="10.0%"),
            ResponseSection(label="Current Discount", value=f"{deal.get('discount_percent', 12.0)}%"),
            ResponseSection(label="Status", value="Open for Customer Feedback")
        ]
        resp = StructuredResponse(
            type="NEGOTIATION_STATUS",
            message="Here is the negotiation history and status on this quotation.",
            sections=sections
        )
        actions = [
            ChatAction(id="act_req_discount", label="Request Higher Discount", type="QUICK_REPLY"),
            ChatAction(id="act_find_deal", label="Find Better Deal", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_negotiation_reason(cls, deal: Dict[str, Any], entities: Dict[str, ExtractedEntity]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        reason_cat = entities.get("customer_reason").value if "customer_reason" in entities else "COMPETITOR_PRICING"
        resp = StructuredResponse(
            type="MESSAGE",
            message=f"Thank you for sharing that context. We have recorded **{reason_cat.replace('_', ' ').title()}** as justification for your pricing review. Would you like to explore optimized discount options?"
        )
        actions = [
            ChatAction(id="act_find_deal", label="💡 Find a Better Deal", type="QUICK_REPLY"),
            ChatAction(id="act_req_disc", label="💰 Request Custom Discount", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_what_can_i_change(cls, deal: Dict[str, Any]) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        sections = [
            ResponseSection(label="Commercial Discount", value="Adjustable up to 18% with manager sign-off"),
            ResponseSection(label="Order Quantity", value="Tiered volume price breaks available (50+, 200+, 500+ units)"),
            ResponseSection(label="Delivery Schedule", value="Standard (4-5 days) or Regional Expedited (2-3 days)"),
            ResponseSection(label="Optional Services", value="Extended Warranty and Onboarding can be added or removed"),
            ResponseSection(label="Product Models", value="Economy, Standard, and Premier hardware tiers")
        ]
        resp = StructuredResponse(
            type="NEGOTIABLE_LEVERS",
            message="You can customize and negotiate any of the following quotation parameters:",
            sections=sections
        )
        actions = [
            ChatAction(id="act_find_deal", label="💡 Find a Better Deal", type="QUICK_REPLY"),
            ChatAction(id="act_change_qty", label="📦 Change Quantity", type="QUICK_REPLY"),
            ChatAction(id="act_req_disc", label="💰 Request Discount", type="QUICK_REPLY")
        ]
        return resp, actions, ConversationState.COMPLETED, None

    @classmethod
    def _handle_confirmation(cls, deal: Dict[str, Any], session: ConversationSession) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        if session.pending_proposal:
            prop = session.pending_proposal
            session.clear_pending_proposal()
            resp = StructuredResponse(
                type="MUTATION_REQUEST",
                message=f"Your request **{prop.get('title', 'Quotation Update')}** has been confirmed and submitted.",
                sections=[
                    ResponseSection(label="Status", value="CONFIRMED_SUBMITTED", status="normal"),
                    ResponseSection(label="Approval Workflow", value=prop.get("approval_level", "Sales Management"))
                ]
            )
            actions = [
                ChatAction(id="act_status", label="Check Status", type="QUICK_REPLY"),
                ChatAction(id="act_summary", label="Quote Summary", type="QUICK_REPLY")
            ]
            return resp, actions, ConversationState.COMPLETED, prop

        resp = StructuredResponse(
            type="MESSAGE",
            message="There are no pending quotation changes waiting for confirmation. What would you like to modify?"
        )
        return resp, ResponseBuilder.default_quick_actions(), ConversationState.IDLE, None

    @classmethod
    def _handle_general_help(cls) -> Tuple[StructuredResponse, List[ChatAction], ConversationState, Optional[Dict[str, Any]]]:
        resp = StructuredResponse(
            type="HELP_MENU",
            message="Hello! I am your **DealFlow360 Customer Deal Assistant**. I can help you understand your quote, explore price discounts, check delivery schedules, and find better package options."
        )
        return resp, ResponseBuilder.default_quick_actions(), ConversationState.IDLE, None

    # ─────────────────────────────────────────────────────────────────────────────
    # CONTEXT UTILITIES
    # ─────────────────────────────────────────────────────────────────────────────

    @classmethod
    def _build_deal_context(cls, deal_id: str, customer_id: Optional[str], override: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        default_context = {
            "deal_id": deal_id or "DEAL-1001",
            "customer_id": customer_id or "CUST-101",
            "customer_tier": "GOLD",
            "quantity": 500,
            "base_price": 1000.0,
            "product_cost": 650.0,
            "discount_percent": 12.0,
            "current_discount_percent": 12.0,
            "required_delivery_days": 4,
            "warehouses": [
                {
                    "warehouse_id": "WH-A",
                    "available_stock": 400,
                    "reserved_stock": 50,
                    "capacity": 1000,
                    "current_load": 600,
                    "distance_km": 120,
                    "transport_rate_per_km": 10,
                    "processing_days": 1
                },
                {
                    "warehouse_id": "WH-B",
                    "available_stock": 300,
                    "reserved_stock": 20,
                    "capacity": 800,
                    "current_load": 400,
                    "distance_km": 180,
                    "transport_rate_per_km": 9,
                    "processing_days": 2
                }
            ],
            "customer_avg_discount": 10.0,
            "customer_max_discount": 16.0,
            "previous_deals": 8,
            "previous_negotiations": 2
        }
        if override:
            default_context.update(override)
        return default_context


# Global intent router
intent_router = IntentRouter()
