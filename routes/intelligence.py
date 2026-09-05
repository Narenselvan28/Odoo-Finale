"""
DealFlow360 - Intelligence API Routes
Exposes endpoints for What-If Deal Simulation, Business Memory,
Actionable Deal Health, Why / Why Not Explanation, and Unified Deal Insights.
"""

import logging
from flask import Blueprint, request, jsonify

from utils.error_handlers import APIException
from intelligence.what_if.simulator import WhatIfSimulator
from intelligence.memory.business_memory import business_memory_service
from intelligence.health.deal_health_engine import DealHealthEngine
from intelligence.explanation.explanation_engine import ExplanationEngine
from intelligence.what_if.pricing_simulator import PricingSimulator
from intelligence.what_if.fulfillment_simulator import FulfillmentSimulator
from intelligence.adapters.rule_engine_adapter import RuleEngineAdapter
from intelligence.adapters.ml_adapter import MLAdapter
from intelligence.what_if.recommendation_engine import RecommendationEngine

logger = logging.getLogger(__name__)

intelligence_bp = Blueprint("intelligence", __name__, url_prefix="/api/v1/intelligence")


# ── 1. WHAT-IF SIMULATOR ────────────────────────────────────────────────────────

@intelligence_bp.route("/what-if", methods=["POST"])
def simulate_what_if():
    """
    POST /api/v1/intelligence/what-if
    Executes in-memory what-if deal simulation with zero database mutations.
    """
    data = request.get_json(silent=True)
    if data is None:
        raise APIException("Request body must be a valid JSON object.", status_code=400, error_code="INVALID_JSON")

    result = WhatIfSimulator.simulate(data)
    return jsonify(result), 200


@intelligence_bp.route("/what-if/batch", methods=["POST"])
def simulate_what_if_batch():
    """
    POST /api/v1/intelligence/what-if/batch
    Executes multiple what-if scenario simulations in batch against a deal baseline.
    """
    data = request.get_json(silent=True)
    if data is None:
        raise APIException("Request body must be a valid JSON object.", status_code=400, error_code="INVALID_JSON")

    result = WhatIfSimulator.simulate_batch(data)
    return jsonify(result), 200


# ── 2. BUSINESS MEMORY ──────────────────────────────────────────────────────────

@intelligence_bp.route("/memory/customer/<customer_id>", methods=["GET"])
def get_customer_memory(customer_id):
    """
    GET /api/v1/intelligence/memory/customer/<customer_id>
    Retrieves behavioral transaction memory and evidence-based insights for a customer.
    """
    result = business_memory_service.get_customer_memory(customer_id)
    return jsonify(result), 200


@intelligence_bp.route("/memory/customer/<customer_id>/product/<product_id>", methods=["GET"])
def get_customer_product_memory(customer_id, product_id):
    """
    GET /api/v1/intelligence/memory/customer/<customer_id>/product/<product_id>
    Retrieves relationship memory between a specific customer and product.
    """
    result = business_memory_service.get_customer_product_memory(customer_id, product_id)
    return jsonify(result), 200


# ── 3. ACTIONABLE DEAL HEALTH ───────────────────────────────────────────────────

@intelligence_bp.route("/deal/<deal_id>/health", methods=["GET", "POST"])
def get_deal_health(deal_id):
    """
    GET or POST /api/v1/intelligence/deal/<deal_id>/health
    Calculates multi-dimensional health score (0-100), detects main threat, and provides actionable recommendation.
    """
    deal_data = {}
    if request.method == "POST":
        payload = request.get_json(silent=True) or {}
        deal_data = payload.get("deal", payload)
    
    # Default minimum fields if none passed
    if not deal_data:
        deal_data = {
            "deal_id": deal_id,
            "quantity": 10,
            "base_price": 1000.0,
            "discount_percent": 12.0,
            "customer_tier": "GOLD",
            "required_delivery_days": 4
        }
    else:
        deal_data["deal_id"] = deal_id

    fulfillment = FulfillmentSimulator.simulate(deal_data)
    pricing = PricingSimulator.calculate_pricing(
        deal_data,
        transport_cost=fulfillment["transport_cost"],
        fulfillment_cost=fulfillment["fulfillment_cost"]
    )
    rules = RuleEngineAdapter.evaluate_deal_rules(deal_data, pricing, fulfillment)
    health = DealHealthEngine.calculate_health(deal_data, pricing, fulfillment, rules)

    return jsonify({
        "success": True,
        "deal_id": deal_id,
        "deal_health": health
    }), 200


# ── 4. WHY / WHY NOT EXPLANATIONS ───────────────────────────────────────────────

@intelligence_bp.route("/explain", methods=["POST"])
def explain_decision():
    """
    POST /api/v1/intelligence/explain
    Produces transparent Why / Why Not explanation comparing proposal against alternatives.
    """
    data = request.get_json(silent=True)
    if data is None:
        raise APIException("Request body must be a valid JSON object.", status_code=400, error_code="INVALID_JSON")

    deal_data = data.get("deal", data)
    alternatives = data.get("alternatives", data.get("alternative_discounts"))

    fulfillment = FulfillmentSimulator.simulate(deal_data)
    pricing = PricingSimulator.calculate_pricing(
        deal_data,
        transport_cost=fulfillment["transport_cost"],
        fulfillment_cost=fulfillment["fulfillment_cost"]
    )
    rules = RuleEngineAdapter.evaluate_deal_rules(deal_data, pricing, fulfillment)
    health = DealHealthEngine.calculate_health(deal_data, pricing, fulfillment, rules)

    ml_rec = MLAdapter.get_discount_recommendation(deal_data)
    ml_risk = MLAdapter.get_discount_risk(deal_data, pricing, fulfillment)
    ml_combined = {
        "model_available": ml_rec.get("model_available", False) or ml_risk.get("model_available", False),
        "recommended_discount_percent": ml_rec.get("recommended_discount_percent"),
        "risk_probability": ml_risk.get("risk_probability"),
        "risk_percentage": ml_risk.get("risk_percentage"),
        "risk_label": ml_risk.get("risk_label", "NORMAL")
    }

    recommendation = RecommendationEngine.generate_recommendation(
        simulated_deal=deal_data,
        pricing=pricing,
        rules=rules,
        fulfillment=fulfillment,
        ml_prediction=ml_combined,
        health=health
    )

    cust_id = str(deal_data.get("customer_id", "CUST-DEFAULT"))
    cust_mem = business_memory_service.get_customer_memory(cust_id, deal_context=deal_data)

    explanation = ExplanationEngine.explain_recommendation(
        deal_data=deal_data,
        recommendation=recommendation,
        pricing=pricing,
        rules=rules,
        fulfillment=fulfillment,
        health=health,
        customer_memory=cust_mem,
        alternative_discounts=alternatives
    )

    return jsonify({
        "success": True,
        "deal_id": deal_data.get("deal_id", "DEAL-EXPLAIN"),
        **explanation
    }), 200


# ── 5. UNIFIED DEAL INTELLIGENCE INSIGHTS ──────────────────────────────────────

@intelligence_bp.route("/deal/<deal_id>/insights", methods=["GET", "POST"])
@intelligence_bp.route("/deal/insights", methods=["POST"])
def get_deal_insights(deal_id=None):
    """
    GET or POST /api/v1/intelligence/deal/<deal_id>/insights
    Unified endpoint delivering complete deal health, memory, recommendation,
    Why, Why Not, and next actions for the deal intelligence dashboard.
    """
    data = {}
    if request.method == "POST":
        data = request.get_json(silent=True) or {}

    deal_data = data.get("deal", data)
    if not deal_data:
        deal_data = {
            "deal_id": deal_id or "DEAL-1001",
            "customer_id": "CUST-101",
            "customer_tier": "GOLD",
            "quantity": 500,
            "base_price": 1000.0,
            "product_cost": 650.0,
            "discount_percent": 12.0,
            "current_discount_percent": 12.0,
            "required_delivery_days": 4,
            "customer_avg_discount": 10.0,
            "customer_max_discount": 16.0,
            "previous_deals": 8,
            "previous_negotiations": 2
        }
    else:
        if deal_id and "deal_id" not in deal_data:
            deal_data["deal_id"] = deal_id

    final_deal_id = str(deal_data.get("deal_id", deal_id or "DEAL-1001"))
    cust_id = str(deal_data.get("customer_id", "CUST-101"))

    # 1. Fulfillment, Pricing & Rules
    fulfillment = FulfillmentSimulator.simulate(deal_data)
    pricing = PricingSimulator.calculate_pricing(
        deal_data,
        transport_cost=fulfillment["transport_cost"],
        fulfillment_cost=fulfillment["fulfillment_cost"]
    )
    rules = RuleEngineAdapter.evaluate_deal_rules(deal_data, pricing, fulfillment)

    # 2. Deal Health
    health = DealHealthEngine.calculate_health(deal_data, pricing, fulfillment, rules)

    # 3. Business Memory
    memory_result = business_memory_service.get_customer_memory(cust_id, deal_context=deal_data)

    # 4. ML Predictions
    ml_rec = MLAdapter.get_discount_recommendation(deal_data)
    ml_risk = MLAdapter.get_discount_risk(deal_data, pricing, fulfillment)
    ml_combined = {
        "model_available": ml_rec.get("model_available", False) or ml_risk.get("model_available", False),
        "recommended_discount_percent": ml_rec.get("recommended_discount_percent"),
        "risk_probability": ml_risk.get("risk_probability"),
        "risk_percentage": ml_risk.get("risk_percentage"),
        "risk_label": ml_risk.get("risk_label", "NORMAL")
    }

    # 5. Recommendation
    recommendation = RecommendationEngine.generate_recommendation(
        simulated_deal=deal_data,
        pricing=pricing,
        rules=rules,
        fulfillment=fulfillment,
        ml_prediction=ml_combined,
        health=health
    )

    # 6. Why / Why Not Explanation
    explanation = ExplanationEngine.explain_recommendation(
        deal_data=deal_data,
        recommendation=recommendation,
        pricing=pricing,
        rules=rules,
        fulfillment=fulfillment,
        health=health,
        customer_memory=memory_result
    )

    # 7. Next Actions
    next_actions = [
        {
            "action": recommendation["action"],
            "title": f"Execute: {recommendation['action'].replace('_', ' ').title()}",
            "summary": recommendation["reasons"][0] if recommendation["reasons"] else "Optimize deal configuration.",
            "requires_confirmation": True
        }
    ]
    if rules.get("approval_required"):
        next_actions.append({
            "action": "REQUEST_APPROVAL",
            "title": f"Request {rules.get('approval_level', 'Management')} Approval",
            "summary": "Submit deal exception justification for rapid approval.",
            "requires_confirmation": True
        })
    if not fulfillment.get("delivery_sla_met"):
        next_actions.append({
            "action": "EXPEDITE_DELIVERY",
            "title": "Expedite Regional Logistics",
            "summary": "Allocate closest regional depot or upgrade carrier speed.",
            "requires_confirmation": True
        })

    return jsonify({
        "success": True,
        "deal_id": final_deal_id,
        "deal_health": health,
        "business_memory": memory_result,
        "recommendation": recommendation,
        "why": explanation["why"],
        "why_not": explanation["why_not"],
        "confidence": explanation["confidence"],
        "limitations": explanation.get("limitations", []),
        "next_actions": next_actions
    }), 200
