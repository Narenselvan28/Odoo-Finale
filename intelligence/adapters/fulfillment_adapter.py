"""
DealFlow360 - Fulfillment Adapter & Warehouse Simulator
Simulates multi-warehouse inventory allocation, transport costs, fulfillment costs,
transit times, and SLA feasibility in-memory without modifying real warehouse stock.
"""

import math
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class FulfillmentAdapter:
    """In-memory multi-warehouse fulfillment simulation adapter."""

    # Default warehouse network if none supplied in deal payload
    DEFAULT_WAREHOUSES = [
        {
            "warehouse_id": "WH-A",
            "warehouse_name": "Central Logistics Hub (Warehouse A)",
            "available_stock": 500,
            "reserved_stock": 50,
            "capacity": 1000,
            "current_load": 650,
            "distance_km": 120,
            "transport_rate_per_km": 10.0,
            "processing_days": 1,
            "base_handling_cost_per_unit": 4.0
        },
        {
            "warehouse_id": "WH-B",
            "warehouse_name": "Southern Regional Center (Warehouse B)",
            "available_stock": 350,
            "reserved_stock": 20,
            "capacity": 800,
            "current_load": 400,
            "distance_km": 180,
            "transport_rate_per_km": 9.0,
            "processing_days": 2,
            "base_handling_cost_per_unit": 5.5
        },
        {
            "warehouse_id": "WH-C",
            "warehouse_name": "Western Coastal Depot (Warehouse C)",
            "available_stock": 150,
            "reserved_stock": 10,
            "capacity": 500,
            "current_load": 300,
            "distance_km": 320,
            "transport_rate_per_km": 12.0,
            "processing_days": 2,
            "base_handling_cost_per_unit": 6.0
        }
    ]

    # Fixed split shipment administrative handling penalty
    SPLIT_SHIPMENT_PENALTY_PER_EXTRA_WH = 350.0

    @classmethod
    def simulate_fulfillment(cls, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulates optimal warehouse allocation, shipping costs, and delivery SLA.
        Read-only, purely deterministic and mathematical.
        """
        quantity = int(deal_data.get("quantity", 1))
        required_delivery_days = int(deal_data.get("required_delivery_days", 4))

        warehouses_input = deal_data.get("warehouses")
        if warehouses_input and isinstance(warehouses_input, list) and len(warehouses_input) > 0:
            warehouses = [dict(w) for w in warehouses_input]
        else:
            # Fallback to stock map or default network
            wh_stocks = deal_data.get("warehouse_stocks", {})
            warehouses = []
            for default_wh in cls.DEFAULT_WAREHOUSES:
                wh_copy = dict(default_wh)
                wh_id = wh_copy["warehouse_id"]
                if wh_id in wh_stocks:
                    wh_copy["available_stock"] = wh_stocks[wh_id]
                    wh_copy["reserved_stock"] = 0
                warehouses.append(wh_copy)

        # Sort warehouses by effective shipping speed and cost (distance_km * rate)
        def warehouse_priority(w):
            dist = float(w.get("distance_km", 150))
            rate = float(w.get("transport_rate_per_km", 10.0))
            proc = float(w.get("processing_days", 1))
            return (proc * 100) + (dist * rate)

        sorted_warehouses = sorted(warehouses, key=warehouse_priority)

        remaining_qty = quantity
        allocation = []
        total_transport_cost = 0.0
        total_fulfillment_cost = 0.0
        max_delivery_days = 0

        for wh in sorted_warehouses:
            wh_id = str(wh.get("warehouse_id", "WH-UNKNOWN"))
            avail = int(wh.get("available_stock", 0))
            res = int(wh.get("reserved_stock", 0))
            net_available = max(0, avail - res)

            if net_available > 0 and remaining_qty > 0:
                allocated_qty = min(net_available, remaining_qty)

                distance = float(wh.get("distance_km", 100))
                rate = float(wh.get("transport_rate_per_km", 10.0))
                proc_days = int(wh.get("processing_days", 1))
                handling_rate = float(wh.get("base_handling_cost_per_unit", 4.5))

                # Transit days estimate: 1 day per 250km + processing days
                transit_days = math.ceil(distance / 250.0)
                wh_delivery_days = proc_days + transit_days
                max_delivery_days = max(max_delivery_days, wh_delivery_days)

                # Transport cost: base trip cost + weight/unit factor
                wh_transport_cost = (distance * rate) + (allocated_qty * (rate * 0.5))
                wh_fulfillment_cost = allocated_qty * handling_rate

                total_transport_cost += wh_transport_cost
                total_fulfillment_cost += wh_fulfillment_cost

                allocation.append({
                    "warehouse_id": wh_id,
                    "quantity": allocated_qty,
                    "available_stock": avail,
                    "reserved_stock": res,
                    "distance_km": distance,
                    "processing_days": proc_days,
                    "delivery_days": wh_delivery_days,
                    "transport_cost": round(wh_transport_cost, 2),
                    "fulfillment_cost": round(wh_fulfillment_cost, 2)
                })

                remaining_qty -= allocated_qty

        shortage_units = max(0, remaining_qty)
        warehouse_count = len(allocation)

        # Apply split shipment penalty if fulfilled across multiple warehouses
        split_penalty = 0.0
        if warehouse_count > 1:
            split_penalty = (warehouse_count - 1) * cls.SPLIT_SHIPMENT_PENALTY_PER_EXTRA_WH
            total_fulfillment_cost += split_penalty

        expected_delivery_days = max_delivery_days if max_delivery_days > 0 else 3
        delivery_sla_met = (shortage_units == 0) and (expected_delivery_days <= required_delivery_days)
        feasible = (shortage_units == 0)

        return {
            "feasible": feasible,
            "shortage_units": shortage_units,
            "warehouse_count": warehouse_count,
            "allocation": allocation,
            "transport_cost": round(total_transport_cost, 2),
            "fulfillment_cost": round(total_fulfillment_cost, 2),
            "split_shipment_penalty": round(split_penalty, 2),
            "expected_delivery_days": expected_delivery_days,
            "required_delivery_days": required_delivery_days,
            "delivery_sla_met": delivery_sla_met
        }
