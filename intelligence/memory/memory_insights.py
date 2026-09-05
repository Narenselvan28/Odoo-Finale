"""
DealFlow360 - Memory Insights Generator
Derives explainable, evidence-backed behavioral observations from customer memory.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class MemoryInsightsGenerator:
    """Generates structured behavioral insights from historical memory."""

    @classmethod
    def generate_customer_insights(cls, customer_memory: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Synthesizes human-readable, evidence-based behavioral insights.
        """
        insights = []
        mem = customer_memory.get("memory", {})

        if not customer_memory.get("data_available", False):
            insights.append({
                "type": "NEW_RELATIONSHIP",
                "message": "Customer has limited or no prior transaction history in the platform."
            })
            return insights

        # 1. Discount behavior insight
        disc_range = mem.get("accepted_discount_range", {})
        min_d = disc_range.get("min")
        max_d = disc_range.get("max")
        avg_d = mem.get("average_accepted_discount")

        if min_d is not None and max_d is not None:
            if min_d == max_d:
                insights.append({
                    "type": "DISCOUNT",
                    "message": f"Customer historically transacts at a fixed {min_d}% discount."
                })
            else:
                insights.append({
                    "type": "DISCOUNT",
                    "message": f"Customer usually accepts discounts between {min_d}% and {max_d}% (average: {avg_d}%)."
                })

        # 2. Negotiation behavior insight
        neg_freq = mem.get("negotiation_frequency", 0.0)
        prev_deals = mem.get("previous_deals", 0)

        if neg_freq >= 0.5:
            insights.append({
                "type": "NEGOTIATION",
                "message": f"Customer frequently negotiates pricing ({int(neg_freq * 100)}% of past {prev_deals} deals)."
            })
        elif neg_freq > 0.0:
            insights.append({
                "type": "NEGOTIATION",
                "message": f"Customer occasionally negotiates pricing ({int(neg_freq * 100)}% of past deals)."
            })
        else:
            insights.append({
                "type": "NEGOTIATION",
                "message": "Customer historically accepts initial quotation proposals without counter-negotiation."
            })

        # 3. Delivery behavior insight
        delivery = mem.get("delivery_behavior", {})
        if delivery.get("available", False):
            avg_days = delivery.get("average_delivery_days")
            tolerance = delivery.get("late_delivery_tolerance", "MEDIUM")
            if tolerance == "LOW":
                insights.append({
                    "type": "DELIVERY",
                    "message": f"Customer historically values faster delivery turnaround (average: {avg_days} days, sensitivity: HIGH)."
                })
            else:
                insights.append({
                    "type": "DELIVERY",
                    "message": f"Customer delivery turnaround averages {avg_days} days with standard tolerance."
                })

        # 4. Logistics / Warehouse preference insight
        pref_wh = mem.get("preferred_warehouse")
        if pref_wh:
            insights.append({
                "type": "LOGISTICS",
                "message": f"Customer orders are predominantly fulfilled from {pref_wh} for optimal transit speed."
            })

        # 5. Product preference insight
        pref_prods = mem.get("preferred_products", [])
        if pref_prods and len(pref_prods) > 1:
            prods_str = " + ".join(pref_prods[:2])
            insights.append({
                "type": "PRODUCT_AFFINITY",
                "message": f"Customer has high repeat purchase affinity for {prods_str}."
            })

        return insights
