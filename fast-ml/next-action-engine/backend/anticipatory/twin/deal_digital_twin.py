"""
DealFlow360 - Anticipatory Deal Engine
Deal Digital Twin & Operational Simulator
"""

import math
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class DealDigitalTwin:
    """
    Digital Twin for simulating deal economics, multi-warehouse fulfillment split,
    transport costs, delivery SLA, margin implications, and approval triggers.
    """

    # Warehouse network configuration
    WAREHOUSES = [
        {"id": "WH-A", "name": "Central Logistics Hub (Warehouse A)", "capacity": 500, "lat": 28.6139, "lon": 77.2090, "base_cost_per_unit": 12.50, "sla_days": 2},
        {"id": "WH-B", "name": "Southern Regional Center (Warehouse B)", "capacity": 300, "lat": 12.9716, "lon": 77.5946, "base_cost_per_unit": 18.00, "sla_days": 3},
        {"id": "WH-C", "name": "Western Coastal Depot (Warehouse C)", "capacity": 150, "lat": 19.0760, "lon": 72.8777, "base_cost_per_unit": 22.00, "sla_days": 4},
    ]

    # Customer tier maximum non-approval discount limits
    TIER_DISCOUNT_LIMITS = {
        "PLATINUM": 20.0,
        "GOLD": 15.0,
        "SILVER": 10.0,
        "STANDARD": 5.0,
    }

    # Minimum acceptable gross margin floor %
    MIN_MARGIN_FLOOR = 15.0

    @classmethod
    def simulate_deal_state(cls, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulates current comprehensive economics, fulfillment feasibility,
        and governance status for a deal state.
        """
        unit_price = float(deal_data.get("unit_price", 1850.0))
        quantity = int(deal_data.get("quantity", 10))
        discount_pct = float(deal_data.get("discount_percent", 0.0))
        cost_per_unit = float(deal_data.get("cost_per_unit", unit_price * 0.65)) # Base standard COGS ~65%
        customer_tier = deal_data.get("customer_tier", "GOLD").upper()

        gross_value = unit_price * quantity
        discount_amount = gross_value * (discount_pct / 100.0)
        net_revenue = gross_value - discount_amount
        total_cogs = cost_per_unit * quantity

        gross_margin_value = net_revenue - total_cogs
        gross_margin_pct = (gross_margin_value / net_revenue * 100.0) if net_revenue > 0 else 0.0

        # Fulfillment Simulation
        wh_stocks = deal_data.get("warehouse_stocks", {"WH-A": 40, "WH-B": 60, "WH-C": 15})
        allocation_plan, shortage_units, transport_cost, delivery_days = cls.simulate_fulfillment_split(
            quantity=quantity, warehouse_stocks=wh_stocks
        )

        # Rule & Governance evaluation
        tier_limit = cls.TIER_DISCOUNT_LIMITS.get(customer_tier, 10.0)
        discount_limit_exceeded = discount_pct > tier_limit
        margin_below_floor = gross_margin_pct < cls.MIN_MARGIN_FLOOR
        approval_required = discount_limit_exceeded or margin_below_floor

        # Health score calculation (0 to 100)
        health_score = cls.calculate_deal_health(
            gross_margin_pct=gross_margin_pct,
            discount_pct=discount_pct,
            tier_limit=tier_limit,
            shortage_units=shortage_units,
            quantity=quantity
        )

        return {
            "gross_value": round(gross_value, 2),
            "discount_percent": round(discount_pct, 2),
            "discount_amount": round(discount_amount, 2),
            "net_revenue": round(net_revenue, 2),
            "total_cogs": round(total_cogs, 2),
            "gross_margin_value": round(gross_margin_value, 2),
            "gross_margin_percent": round(gross_margin_pct, 2),
            "tier_limit": tier_limit,
            "discount_limit_exceeded": discount_limit_exceeded,
            "margin_below_floor": margin_below_floor,
            "approval_required": approval_required,
            "allocation_plan": allocation_plan,
            "shortage_units": shortage_units,
            "transport_cost": round(transport_cost, 2),
            "delivery_days": delivery_days,
            "deal_health_score": health_score,
            "is_feasible": shortage_units == 0 and gross_margin_pct > 5.0,
        }

    @classmethod
    def simulate_fulfillment_split(cls, quantity: int, warehouse_stocks: Dict[str, int]) -> tuple:
        """
        Calculates optimal multi-warehouse inventory allocation split,
        detects shortages, estimates transport cost and delivery SLA.
        """
        remaining = quantity
        allocation = []
        total_transport = 0.0
        max_sla = 0

        # Priority order: WH-A (cheapest/fastest) -> WH-B -> WH-C
        for wh in cls.WAREHOUSES:
            wh_id = wh["id"]
            available = warehouse_stocks.get(wh_id, 0)
            if available > 0 and remaining > 0:
                allocated = min(available, remaining)
                cost = allocated * wh["base_cost_per_unit"]
                allocation.append({
                    "warehouse_id": wh_id,
                    "warehouse_name": wh["name"],
                    "allocated_units": allocated,
                    "available_units": available,
                    "transport_cost": round(cost, 2),
                    "delivery_days": wh["sla_days"]
                })
                total_transport += cost
                max_sla = max(max_sla, wh["sla_days"])
                remaining -= allocated

        shortage = max(0, remaining)
        return allocation, shortage, total_transport, (max_sla if max_sla > 0 else 3)

    @classmethod
    def calculate_deal_health(cls, gross_margin_pct: float, discount_pct: float, tier_limit: float, shortage_units: int, quantity: int) -> int:
        """Computes comprehensive Deal Health Score (0-100)."""
        score = 100.0

        # Margin penalty
        if gross_margin_pct < 20.0:
            score -= (20.0 - gross_margin_pct) * 2.5
        
        # Discount tier violation penalty
        if discount_pct > tier_limit:
            score -= (discount_pct - tier_limit) * 3.0

        # Shortage penalty
        if shortage_units > 0:
            shortage_ratio = min(1.0, shortage_units / max(1, quantity))
            score -= shortage_ratio * 30.0

        return max(5, min(100, int(score)))

    @classmethod
    def simulate_candidate_action(cls, current_deal: Dict[str, Any], candidate_action: str, candidate_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulates a hypothetical what-if candidate operation applied to current deal state.
        Returns consequence analysis (projected margin, feasibility, cost changes).
        """
        simulated_state = dict(current_deal)
        
        if candidate_action in ["RECOMMEND_DISCOUNT", "REVISE_QUOTATION"]:
            new_discount = float(candidate_params.get("discount_percent", simulated_state.get("discount_percent", 0.0)))
            simulated_state["discount_percent"] = new_discount

        elif candidate_action == "ALLOCATE_WAREHOUSE":
            if "warehouse_stocks" in candidate_params:
                simulated_state["warehouse_stocks"] = candidate_params["warehouse_stocks"]

        result = cls.simulate_deal_state(simulated_state)
        
        # Calculate delta against current state
        current_sim = cls.simulate_deal_state(current_deal)
        margin_delta = result["gross_margin_percent"] - current_sim["gross_margin_percent"]
        revenue_delta = result["net_revenue"] - current_sim["net_revenue"]

        return {
            "candidate_action": candidate_action,
            "projected_state": result,
            "margin_delta_percent": round(margin_delta, 2),
            "revenue_delta": round(revenue_delta, 2),
            "approval_triggered": result["approval_required"] and not current_sim["approval_required"],
            "feasibility": 1.0 if result["is_feasible"] else 0.4
        }
