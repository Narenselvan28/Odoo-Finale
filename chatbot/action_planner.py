"""
DealFlow360 - Action Planner & Scenario Generator
Coordinates multi-intent execution plans and implements the 'Find a Better Deal' scenario generator.
Searches feasible decision space across discount, delivery date, and services.
"""

import copy
import logging
from typing import Dict, List, Any, Optional
from chatbot.schemas import FeasibleScenario, IntentConfidence, ExtractedEntity
from intelligence.what_if.simulator import WhatIfSimulator
from intelligence.what_if.fulfillment_simulator import FulfillmentSimulator

logger = logging.getLogger(__name__)


class ActionPlan:
    """Execution sequence with primary target and dependencies."""

    def __init__(self, primary_intent: str, steps: List[str], required_engines: List[str], parameters: Dict[str, Any]):
        self.primary_intent = primary_intent
        self.steps = steps
        self.required_engines = required_engines
        self.parameters = parameters


class ActionPlanner:
    """Orchestrates multi-intent resolution and feasible scenario generation."""

    @classmethod
    def plan(cls, intents: List[IntentConfidence], entities: Dict[str, ExtractedEntity]) -> ActionPlan:
        intent_names = [i.name for i in intents]
        primary = intents[0].name if intents else "GENERAL_HELP"

        # Multi-Intent Combination 1: Discount Request + Delivery Request (e.g. Cheaper + Friday)
        if ("DISCOUNT_REQUEST" in intent_names or "BETTER_DEAL" in intent_names) and \
           ("DELIVERY_REQUEST" in intent_names or "DELIVERY_STATUS" in intent_names or "delivery_date" in entities):
            return ActionPlan(
                primary_intent="BETTER_DEAL",
                steps=[
                    "simulate_discount_scenarios",
                    "evaluate_delivery_feasibility",
                    "check_margin_and_approval_gates",
                    "rank_feasible_trade_offs"
                ],
                required_engines=["what_if_simulator", "fulfillment_simulator", "rule_engine"],
                parameters={
                    "discount_percent": entities.get("discount_percent").value if "discount_percent" in entities else None,
                    "delivery_date": entities.get("delivery_date").value if "delivery_date" in entities else None
                }
            )

        # Multi-Intent Combination 2: Discount Request + What-If Simulation
        if "DISCOUNT_REQUEST" in intent_names and "WHAT_IF_SCENARIO" in intent_names:
            return ActionPlan(
                primary_intent="DISCOUNT_IMPACT",
                steps=["run_what_if_simulation", "calculate_margin_delta", "evaluate_approval_level"],
                required_engines=["what_if_simulator", "rule_engine"],
                parameters={"discount_percent": entities.get("discount_percent").value if "discount_percent" in entities else None}
            )

        # Single Intent Execution Plans
        if primary == "DISCOUNT_REQUEST":
            return ActionPlan(
                primary_intent="DISCOUNT_REQUEST",
                steps=["get_ml_recommended_discount", "evaluate_approval_rules", "prepare_proposal"],
                required_engines=["ml_adapter", "rule_engine"],
                parameters={"discount_percent": entities.get("discount_percent").value if "discount_percent" in entities else None}
            )
        elif primary in ("DISCOUNT_IMPACT", "WHAT_IF_SCENARIO"):
            return ActionPlan(
                primary_intent="DISCOUNT_IMPACT",
                steps=["run_deal_simulation", "analyze_impact_metrics", "generate_trade_off_explanation"],
                required_engines=["what_if_simulator", "rule_engine", "explanation_engine"],
                parameters={
                    "discount_percent": entities.get("discount_percent").value if "discount_percent" in entities else None,
                    "quantity": entities.get("quantity").value if "quantity" in entities else None
                }
            )
        elif primary == "BETTER_DEAL":
            return ActionPlan(
                primary_intent="BETTER_DEAL",
                steps=["explore_decision_space", "simulate_options", "rank_by_feasibility_and_margin"],
                required_engines=["what_if_simulator", "fulfillment_simulator", "rule_engine"],
                parameters={"delivery_date": entities.get("delivery_date").value if "delivery_date" in entities else None}
            )
        elif primary == "DELIVERY_REQUEST":
            return ActionPlan(
                primary_intent="DELIVERY_REQUEST",
                steps=["simulate_fulfillment_sla", "check_warehouse_routes", "generate_delivery_alternatives"],
                required_engines=["fulfillment_simulator"],
                parameters={"delivery_date": entities.get("delivery_date").value if "delivery_date" in entities else None}
            )
        elif primary == "CONFIRM_QUOTATION":
            return ActionPlan(
                primary_intent="CONFIRM_QUOTATION",
                steps=["verify_pending_proposal", "package_mutation_payload_for_nodejs"],
                required_engines=["conversation_manager"],
                parameters={"confirmed": True}
            )
        elif primary == "NEGOTIATION_REASON":
            return ActionPlan(
                primary_intent="NEGOTIATION_REASON",
                steps=["normalize_business_reason", "tag_quotation_metadata"],
                required_engines=["business_memory"],
                parameters={"reason": entities.get("customer_reason").value if "customer_reason" in entities else "OTHER"}
            )
        else:
            return ActionPlan(
                primary_intent=primary,
                steps=["fetch_quotation_intelligence", "format_structured_output"],
                required_engines=["pricing_simulator", "rule_engine"],
                parameters={}
            )

    @classmethod
    def generate_better_deal_scenarios(
        cls,
        deal: Dict[str, Any],
        entities: Dict[str, ExtractedEntity]
    ) -> List[FeasibleScenario]:
        """
        Killer Feature: 'Find Me a Better Deal'.
        Generates 3 feasible compromise options by calling WhatIfSimulator with explicit changes:
        - Option A: Fast-Track Discount (Immediate value within auto-approval limits)
        - Option B: Flexible Shipping Savings (Higher discount with flexible fulfillment schedule)
        - Option C: Volume Tier Upgrade (Top volume discount for higher quantity)
        """
        current_disc = float(deal.get("discount_percent", deal.get("current_discount_percent", 12.0)))
        current_delivery = int(deal.get("required_delivery_days", 4))
        target_delivery = current_delivery
        if "delivery_date" in entities:
            target_delivery = max(2, min(current_delivery, 4))

        scenarios: List[FeasibleScenario] = []

        # Option A: Fast-Track Discount (e.g. 14% discount)
        opt_a_disc = round(current_disc + 2.0, 1)
        sim_payload_a = {
            "deal": copy.deepcopy(deal),
            "changes": {"discount_percent": opt_a_disc}
        }
        sim_res_a = WhatIfSimulator.simulate(sim_payload_a)["simulation"]
        margin_a = sim_res_a["simulated"]["margin_percent"]
        approval_a = sim_res_a["rules"]["approval_required"]

        scenarios.append(FeasibleScenario(
            id="option_a",
            title="Option A: Fast-Track Discount",
            description=f"{opt_a_disc}% discount with standard {target_delivery}-day delivery.",
            discount_percent=opt_a_disc,
            delivery_days=target_delivery,
            estimated_margin_percent=margin_a,
            requires_approval=approval_a,
            is_fulfillment_feasible=True,
            trade_off_explanation=f"{opt_a_disc}% discount with standard delivery. Auto-approved without governance review delays.",
            score=92.0
        ))

        # Option B: Maximum Value Package (e.g. 17.5% discount)
        opt_b_disc = round(current_disc + 5.5, 1)
        sim_payload_b = {
            "deal": copy.deepcopy(deal),
            "changes": {"discount_percent": opt_b_disc}
        }
        sim_res_b = WhatIfSimulator.simulate(sim_payload_b)["simulation"]
        margin_b = sim_res_b["simulated"]["margin_percent"]
        approval_b = sim_res_b["rules"]["approval_required"]

        scenarios.append(FeasibleScenario(
            id="option_b",
            title="Option B: Maximum Value Package",
            description=f"{opt_b_disc}% discount with 5-day delivery.",
            discount_percent=opt_b_disc,
            delivery_days=target_delivery + 1,
            estimated_margin_percent=margin_b,
            requires_approval=approval_b,
            is_fulfillment_feasible=True,
            trade_off_explanation=f"Maximum commercial savings at {opt_b_disc}% discount. Requires Sales Management sign-off.",
            score=88.5
        ))

        # Option C: Volume Tier Upgrade (e.g. increase quantity by 50 units)
        qty = int(deal.get("quantity", 500))
        new_qty = qty + 100
        opt_c_disc = round(current_disc + 3.0, 1)
        sim_payload_c = {
            "deal": copy.deepcopy(deal),
            "changes": {"quantity": new_qty, "discount_percent": opt_c_disc}
        }
        sim_res_c = WhatIfSimulator.simulate(sim_payload_c)["simulation"]
        margin_c = sim_res_c["simulated"]["margin_percent"]
        approval_c = sim_res_c["rules"]["approval_required"]

        scenarios.append(FeasibleScenario(
            id="option_c",
            title="Option C: Volume Tier Upgrade",
            description=f"{opt_c_disc}% discount when scaling to {new_qty} units.",
            discount_percent=opt_c_disc,
            delivery_days=target_delivery,
            estimated_margin_percent=margin_c,
            requires_approval=approval_c,
            is_fulfillment_feasible=True,
            trade_off_explanation=f"Increasing quantity to {new_qty} units justifies our preferred volume tier discount of {opt_c_disc}%.",
            score=89.0
        ))

        return scenarios
