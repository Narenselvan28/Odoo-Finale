"""
DealFlow360 - Pricing Simulator
Pure mathematical evaluation of deal pricing, revenue, cost breakdown, and gross margin.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class PricingSimulator:
    """Calculates comprehensive pricing, discounts, cost of goods, and margins."""

    @classmethod
    def calculate_pricing(cls, deal_data: Dict[str, Any], transport_cost: float = 0.0, fulfillment_cost: float = 0.0) -> Dict[str, Any]:
        """
        Calculates deal pricing and margin economics.
        Handles zero-division safely.
        """
        quantity = max(1, int(deal_data.get("quantity", 1)))
        base_price = max(0.0, float(deal_data.get("base_price", deal_data.get("price", 1000.0))))
        discount_percent = max(0.0, min(100.0, float(deal_data.get("discount_percent", deal_data.get("current_discount_percent", 0.0)))))
        product_cost = max(0.0, float(deal_data.get("product_cost", base_price * 0.65)))

        gross_value = quantity * base_price
        discount_amount = gross_value * (discount_percent / 100.0)
        selling_value = gross_value - discount_amount
        product_cost_total = quantity * product_cost

        # Margin calculation: Selling Value minus Total COGS and logistical fulfillment
        total_costs = product_cost_total + transport_cost + fulfillment_cost
        margin_amount = selling_value - total_costs

        # Safe division for margin percentage
        margin_percent = (margin_amount / selling_value * 100.0) if selling_value > 0.0 else 0.0

        discounted_unit_price = (selling_value / quantity) if quantity > 0 else base_price

        return {
            "quantity": quantity,
            "base_price": round(base_price, 2),
            "product_cost": round(product_cost, 2),
            "gross_value": round(gross_value, 2),
            "discount_percent": round(discount_percent, 2),
            "discount_amount": round(discount_amount, 2),
            "selling_value": round(selling_value, 2),
            "discounted_unit_price": round(discounted_unit_price, 2),
            "product_cost_total": round(product_cost_total, 2),
            "transport_cost": round(transport_cost, 2),
            "fulfillment_cost": round(fulfillment_cost, 2),
            "total_costs": round(total_costs, 2),
            "margin_amount": round(margin_amount, 2),
            "margin_percent": round(margin_percent, 2)
        }
