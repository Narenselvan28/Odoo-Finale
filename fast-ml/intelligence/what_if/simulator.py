"""
DealFlow360 - What-If Deal Simulator
Implements the 15-step in-memory simulation pipeline for exploratory deal analytics.
Guarantees 100% read-only isolation with zero state mutations to production databases.
"""

import copy
import logging
from typing import Dict, Any, List
from utils.error_handlers import APIException

from intelligence.adapters.digital_twin_adapter import DigitalTwinAdapter
from intelligence.adapters.rule_engine_adapter import RuleEngineAdapter
from intelligence.adapters.ml_adapter import MLAdapter
from intelligence.what_if.pricing_simulator import PricingSimulator
from intelligence.what_if.fulfillment_simulator import FulfillmentSimulator
from intelligence.what_if.impact_analyzer import ImpactAnalyzer
from intelligence.what_if.recommendation_engine import RecommendationEngine
from intelligence.health.deal_health_engine import DealHealthEngine

logger = logging.getLogger(__name__)


class WhatIfSimulator:
    """Orchestrates the 15-step Deal What-If simulation pipeline."""

    @classmethod
    def validate_request(cls, payload: Dict[str, Any]) -> None:
        """Step 1: Validates incoming request structure."""
        if not isinstance(payload, dict):
            raise APIException("Request payload must be a JSON object.", status_code=400, error_code="INVALID_JSON")

        if "deal" not in payload or not isinstance(payload["deal"], dict):
            raise APIException("Missing required object: 'deal'.", status_code=400, error_code="MISSING_DEAL_PAYLOAD")

        if "changes" not in payload or not isinstance(payload["changes"], dict):
            raise APIException("Missing required object: 'changes'.", status_code=400, error_code="MISSING_CHANGES_PAYLOAD")

        deal = payload["deal"]
        # Quantity validation
        if "quantity" in deal:
            try:
                qty = int(deal["quantity"])
                if qty <= 0:
                    raise APIException("Deal quantity must be a positive integer.", status_code=422, error_code="INVALID_QUANTITY")
            except (ValueError, TypeError):
                raise APIException("Deal quantity must be an integer.", status_code=422, error_code="INVALID_QUANTITY")

        # Base price validation
        if "base_price" in deal or "price" in deal:
            p = deal.get("base_price", deal.get("price"))
            try:
                price_val = float(p)
                if price_val < 0:
                    raise APIException("Base price cannot be negative.", status_code=422, error_code="INVALID_PRICE")
            except (ValueError, TypeError):
                raise APIException("Base price must be a numeric value.", status_code=422, error_code="INVALID_PRICE")

        # Validate changes
        changes = payload["changes"]
        if "discount_percent" in changes:
            try:
                disc = float(changes["discount_percent"])
                if disc < 0 or disc > 100:
                    raise APIException("Proposed discount_percent must be between 0.0 and 100.0.", status_code=422, error_code="INVALID_DISCOUNT")
            except (ValueError, TypeError):
                raise APIException("Proposed discount_percent must be a numeric value.", status_code=422, error_code="INVALID_DISCOUNT")

        if "quantity" in changes:
            try:
                q = int(changes["quantity"])
                if q <= 0:
                    raise APIException("Proposed quantity must be a positive integer.", status_code=422, error_code="INVALID_QUANTITY")
            except (ValueError, TypeError):
                raise APIException("Proposed quantity must be an integer.", status_code=422, error_code="INVALID_QUANTITY")

    @classmethod
    def simulate(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the 15-step simulation pipeline.
        Returns clean, read-only simulation results.
        """
        # Step 1: Validate request
        cls.validate_request(payload)

        raw_deal = payload["deal"]
        changes = payload["changes"]

        # Step 2: Create simulation snapshot (in-memory copy)
        # Deep copy ensures real deal is immutable
        current_deal = copy.deepcopy(raw_deal)

        # Baseline Current State Evaluation
        curr_fulfillment = FulfillmentSimulator.simulate(current_deal)
        curr_pricing = PricingSimulator.calculate_pricing(
            current_deal,
            transport_cost=curr_fulfillment["transport_cost"],
            fulfillment_cost=curr_fulfillment["fulfillment_cost"]
        )
        curr_rules = RuleEngineAdapter.evaluate_deal_rules(current_deal, curr_pricing, curr_fulfillment)
        curr_health = DealHealthEngine.calculate_health(
            current_deal,
            pricing=curr_pricing,
            fulfillment=curr_fulfillment,
            rules=curr_rules
        )

        # Step 3: Apply proposed changes on simulation branch
        simulated_deal = DigitalTwinAdapter.create_simulation_branch(current_deal, changes)

        # Step 7 & 8: Run warehouse fulfillment simulation & calculate transport/handling costs
        sim_fulfillment = FulfillmentSimulator.simulate(simulated_deal)

        # Step 4 & 5: Recalculate pricing & gross margin
        sim_pricing = PricingSimulator.calculate_pricing(
            simulated_deal,
            transport_cost=sim_fulfillment["transport_cost"],
            fulfillment_cost=sim_fulfillment["fulfillment_cost"]
        )

        # Step 6 & 10: Run business rules & calculate approval requirement
        sim_rules = RuleEngineAdapter.evaluate_deal_rules(simulated_deal, sim_pricing, sim_fulfillment)

        # Step 11: Calculate deal health with delta
        sim_health = DealHealthEngine.calculate_health(
            simulated_deal,
            pricing=sim_pricing,
            fulfillment=sim_fulfillment,
            rules=sim_rules,
            previous_health=curr_health
        )

        # Step 12: Run ML predictions where available (advisory)
        ml_rec = MLAdapter.get_discount_recommendation(simulated_deal)
        ml_risk = MLAdapter.get_discount_risk(simulated_deal, sim_pricing, sim_fulfillment)

        ml_combined = {
            "model_available": ml_rec.get("model_available", False) or ml_risk.get("model_available", False),
            "recommended_discount_percent": ml_rec.get("recommended_discount_percent"),
            "risk_probability": ml_risk.get("risk_probability"),
            "risk_percentage": ml_risk.get("risk_percentage"),
            "risk_label": ml_risk.get("risk_label", "NORMAL")
        }

        # Step 13: Generate impact analysis (Deltas)
        impact = ImpactAnalyzer.analyze_impact(
            current_state=curr_pricing,
            simulated_state=sim_pricing,
            current_rules=curr_rules,
            simulated_rules=sim_rules,
            current_fulfillment=curr_fulfillment,
            simulated_fulfillment=sim_fulfillment,
            current_health=curr_health,
            simulated_health=sim_health
        )

        # Step 14: Generate explainable recommendation
        recommendation = RecommendationEngine.generate_recommendation(
            simulated_deal=simulated_deal,
            pricing=sim_pricing,
            rules=sim_rules,
            fulfillment=sim_fulfillment,
            ml_prediction=ml_combined,
            health=sim_health
        )

        # Step 15: Return simulation result
        deal_id = str(current_deal.get("deal_id", current_deal.get("id", "DEAL-SIMULATED")))

        return {
            "success": True,
            "simulation": {
                "deal_id": deal_id,
                "is_simulation": True,
                "current": {
                    "discount_percent": curr_pricing["discount_percent"],
                    "margin_percent": curr_pricing["margin_percent"],
                    "selling_value": curr_pricing["selling_value"],
                    "transport_cost": curr_fulfillment["transport_cost"],
                    "fulfillment_cost": curr_fulfillment["fulfillment_cost"],
                    "health_score": curr_health["score"],
                    "health_status": curr_health["status"],
                    "approval_required": curr_rules["approval_required"],
                    "delivery_sla_met": curr_fulfillment["delivery_sla_met"]
                },
                "simulated": {
                    "discount_percent": sim_pricing["discount_percent"],
                    "margin_percent": sim_pricing["margin_percent"],
                    "selling_value": sim_pricing["selling_value"],
                    "transport_cost": sim_fulfillment["transport_cost"],
                    "fulfillment_cost": sim_fulfillment["fulfillment_cost"],
                    "health_score": sim_health["score"],
                    "health_status": sim_health["status"],
                    "approval_required": sim_rules["approval_required"],
                    "delivery_sla_met": sim_fulfillment["delivery_sla_met"]
                },
                "impact": impact,
                "rules": {
                    "approval_required": sim_rules["approval_required"],
                    "approval_level": sim_rules["approval_level"],
                    "approval_reasons": sim_rules["approval_reasons"],
                    "rule_results": sim_rules["rule_results"]
                },
                "fulfillment": sim_fulfillment,
                "deal_health": sim_health,
                "ml": ml_combined,
                "recommendation": recommendation
            }
        }

    @classmethod
    def simulate_batch(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulates multiple what-if scenarios against a base deal in batch mode.
        """
        if "deal" not in payload or "scenarios" not in payload or not isinstance(payload["scenarios"], list):
            raise APIException("Batch request requires 'deal' object and 'scenarios' list.", status_code=400, error_code="INVALID_BATCH_PAYLOAD")

        deal = payload["deal"]
        scenarios = payload["scenarios"]

        results = []
        for i, scenario_changes in enumerate(scenarios):
            sim_req = {
                "deal": deal,
                "changes": scenario_changes
            }
            res = cls.simulate(sim_req)
            sim_data = res["simulation"]
            sim_data["scenario_index"] = i
            results.append(sim_data)

        return {
            "success": True,
            "deal_id": deal.get("deal_id", "DEAL-BATCH"),
            "scenario_count": len(results),
            "simulations": results
        }
