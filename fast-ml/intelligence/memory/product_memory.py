"""
DealFlow360 - Product Memory & Customer-Product Relationship Memory
Aggregates product demand velocity and customer-product interaction history.
"""

import statistics
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class ProductMemoryEngine:
    """Computes behavioral metrics for products and customer-product combinations."""

    @classmethod
    def build_product_memory(cls, product_id: str, product_deals: List[Dict[str, Any]], product_meta: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Calculates aggregate demand metrics and pricing history for a specific product.
        """
        if not product_deals:
            return {
                "product_id": product_id,
                "data_available": False,
                "memory": {
                    "purchase_frequency": 0,
                    "average_quantity": 0,
                    "average_discount": None,
                    "repeat_purchase_rate": 0.0,
                    "customer_count": 0,
                    "product_demand_pattern": "NEW_PRODUCT"
                }
            }

        total_txns = len(product_deals)
        quantities = [int(d.get("quantity", 1)) for d in product_deals]
        discounts = [float(d.get("discount_percent", 0.0)) for d in product_deals]
        customers = set(d.get("customer_id", d.get("customer_name")) for d in product_deals if d.get("customer_id") or d.get("customer_name"))

        avg_qty = round(statistics.mean(quantities), 1) if quantities else 1
        avg_disc = round(statistics.mean(discounts), 2) if discounts else 5.0
        repeat_rate = round(1.0 - (len(customers) / max(1, total_txns)), 2)

        demand_pattern = "HIGH_VELOCITY" if total_txns >= 10 else ("MODERATE_DEMAND" if total_txns >= 3 else "LOW_VOLUME")

        return {
            "product_id": product_id,
            "product_name": product_meta.get("name") if product_meta else product_deals[0].get("product_name", product_id),
            "category": product_meta.get("category") if product_meta else product_deals[0].get("product_category", "Hardware"),
            "data_available": True,
            "memory": {
                "purchase_frequency": total_txns,
                "average_quantity": avg_qty,
                "average_discount": avg_disc,
                "repeat_purchase_rate": max(0.0, repeat_rate),
                "customer_count": len(customers),
                "product_demand_pattern": demand_pattern
            }
        }

    @classmethod
    def build_customer_product_memory(cls, customer_id: str, product_id: str, relationship_deals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculates relationship-level memory between a specific customer and product.
        """
        if not relationship_deals:
            return {
                "customer_id": customer_id,
                "product_id": product_id,
                "relationship_exists": False,
                "message": "No historical transactions between this customer and product.",
                "memory": {
                    "previous_purchase_quantity": 0,
                    "previous_discount": None,
                    "number_of_purchases": 0,
                    "acceptance_history": "FIRST_TIME_PURCHASE",
                    "negotiation_history": "NO_PREVIOUS_NEGOTIATION",
                    "average_order_value": None
                }
            }

        num_purchases = len(relationship_deals)
        quantities = [int(d.get("quantity", 1)) for d in relationship_deals]
        discounts = [float(d.get("discount_percent", 0.0)) for d in relationship_deals]
        amounts = [float(d.get("amount", d.get("total_amount", 0.0))) for d in relationship_deals]

        avg_qty = round(statistics.mean(quantities), 1) if quantities else 0
        avg_disc = round(statistics.mean(discounts), 2) if discounts else 0.0
        avg_val = round(statistics.mean(amounts), 2) if amounts else 0.0

        return {
            "customer_id": customer_id,
            "product_id": product_id,
            "relationship_exists": True,
            "memory": {
                "previous_purchase_quantity": avg_qty,
                "previous_discount": avg_disc,
                "number_of_purchases": num_purchases,
                "acceptance_history": "ESTABLISHED_REPEAT_BUYER" if num_purchases > 2 else "OCCASIONAL_BUYER",
                "negotiation_history": "FREQUENT_NEGOTIATOR" if any(d.get("negotiations_count", 0) > 0 for d in relationship_deals) else "STANDARD_PRICING",
                "average_order_value": avg_val
            }
        }
