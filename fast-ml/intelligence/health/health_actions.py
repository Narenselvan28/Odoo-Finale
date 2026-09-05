"""
DealFlow360 - Health Action Generator
Identifies primary deal threats, quantifies business impact, and produces
actionable recommendations with executable simulation payloads.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class HealthActionGenerator:
    """Detects primary deal threats and converts them into actionable what-if simulations."""

    @classmethod
    def analyze_threats_and_actions(
        cls,
        dimensions: Dict[str, Any],
        deal_data: Dict[str, Any],
        pricing: Dict[str, Any],
        fulfillment: Dict[str, Any],
        rules: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extracts main threat, predicted impact, and actionable recommendation.
        """
        comm_score = dimensions["commercial"]["score"]
        fulf_score = dimensions["fulfillment"]["score"]
        cust_score = dimensions["customer"]["score"]
        neg_score = dimensions["negotiation"]["score"]
        appr_score = dimensions["approval"]["score"]

        # Find dimension with the lowest health score
        dimension_scores = [
            ("FULFILLMENT", fulf_score, dimensions["fulfillment"]),
            ("COMMERCIAL", comm_score, dimensions["commercial"]),
            ("APPROVAL", appr_score, dimensions["approval"]),
            ("CUSTOMER", cust_score, dimensions["customer"]),
            ("NEGOTIATION", neg_score, dimensions["negotiation"])
        ]
        sorted_dims = sorted(dimension_scores, key=lambda x: x[1])
        worst_dim_type, worst_score, worst_data = sorted_dims[0]

        main_threat = {}
        predicted_impact = {}
        recommended_action = {}

        # 1. Fulfillment Threat
        if worst_dim_type == "FULFILLMENT" and worst_score < 80:
            shortage = worst_data.get("shortage_units", 0)
            sla_met = worst_data.get("delivery_sla_met", True)
            expected_days = worst_data.get("expected_delivery_days", 3)
            required_days = int(deal_data.get("required_delivery_days", 4))

            if shortage > 0:
                main_threat = {
                    "type": "FULFILLMENT_SHORTAGE",
                    "dimension": "fulfillment",
                    "message": f"Inventory shortage of {shortage} units detected across assigned warehouses."
                }
                predicted_impact = {
                    "unfulfilled_units": shortage,
                    "order_fulfillment_rate": round((1.0 - shortage / max(1, int(deal_data.get('quantity', 1)))) * 100, 1)
                }
                recommended_action = {
                    "action": "REALLOCATE_STOCK",
                    "description": f"Reallocate {shortage} units from regional distribution hub to eliminate stockout.",
                    "simulation_payload": {
                        "changes": {
                            "quantity": int(deal_data.get("quantity", 1)) - shortage
                        }
                    }
                }
            elif not sla_met:
                delay = expected_days - required_days
                main_threat = {
                    "type": "FULFILLMENT_DELAY",
                    "dimension": "fulfillment",
                    "message": f"Expected delivery ({expected_days} days) exceeds customer SLA ({required_days} days)."
                }
                predicted_impact = {
                    "delivery_delay_days": delay,
                    "sla_breach_risk": "HIGH"
                }
                recommended_action = {
                    "action": "EXPEDITE_DELIVERY",
                    "description": f"Adjust delivery promise to {expected_days} days or re-route allocation to single primary depot.",
                    "simulation_payload": {
                        "changes": {
                            "required_delivery_days": expected_days
                        }
                    }
                }
            else:
                main_threat = {
                    "type": "FULFILLMENT_SPLIT",
                    "dimension": "fulfillment",
                    "message": "Fulfillment requires multi-warehouse split, increasing transport costs."
                }
                predicted_impact = {
                    "split_shipment_penalty": fulfillment.get("split_shipment_penalty", 0.0)
                }
                recommended_action = {
                    "action": "OPTIMIZE_WAREHOUSES",
                    "description": "Consolidate shipment from primary hub to minimize freight surcharges.",
                    "simulation_payload": {
                        "changes": {}
                    }
                }

        # 2. Commercial Threat
        elif worst_dim_type == "COMMERCIAL" and worst_score < 80:
            margin_pct = worst_data.get("margin_percent", 0.0)
            disc_pct = worst_data.get("discount_percent", 0.0)
            cust_max = float(deal_data.get("customer_max_discount", 15.0))
            cust_avg = float(deal_data.get("customer_avg_discount", 10.0))

            target_disc = min(cust_max, max(0.0, cust_avg))

            main_threat = {
                "type": "COMMERCIAL_MARGIN_DILUTION",
                "dimension": "commercial",
                "message": f"Proposed {disc_pct}% discount compresses gross margin to {margin_pct:.1f}%."
            }
            predicted_impact = {
                "margin_deficit_percent": round(max(0.0, 18.0 - margin_pct), 2),
                "profit_erosion": round(pricing.get("gross_value", 0.0) * (disc_pct / 100.0), 2)
            }
            recommended_action = {
                "action": "REDUCE_DISCOUNT",
                "description": f"Reduce discount from {disc_pct}% to {target_disc}% to restore gross margin to healthy target.",
                "simulation_payload": {
                    "changes": {
                        "discount_percent": target_disc
                    }
                }
            }

        # 3. Approval Threat
        elif worst_dim_type == "APPROVAL" and worst_score < 80:
            appr_level = str(rules.get("approval_level", "MANAGEMENT"))
            main_threat = {
                "type": "GOVERNANCE_GATEWAY",
                "dimension": "approval",
                "message": f"Deal triggers mandatory {appr_level} review due to policy threshold exceptions."
            }
            predicted_impact = {
                "approval_delay_hours": 24,
                "approval_level_required": appr_level
            }
            tier_limit = float(deal_data.get("customer_max_discount", 15.0))
            recommended_action = {
                "action": "ALIGN_WITH_POLICY",
                "description": f"Set discount to {tier_limit}% to allow instant zero-friction auto-approval.",
                "simulation_payload": {
                    "changes": {
                        "discount_percent": tier_limit
                    }
                }
            }

        # 4. Negotiation Threat
        elif worst_dim_type == "NEGOTIATION" and worst_score < 80:
            negs = worst_data.get("negotiation_count", 2)
            main_threat = {
                "type": "NEGOTIATION_FATIGUE",
                "dimension": "negotiation",
                "message": f"High number of negotiation rounds ({negs}) indicates deal stall risk."
            }
            predicted_impact = {
                "close_probability_loss": 0.15,
                "deal_cycle_delay_days": 6
            }
            recommended_action = {
                "action": "EXPEDITE_CLOSE",
                "description": "Offer fixed final counter-proposal to accelerate deal closing.",
                "simulation_payload": {
                    "changes": {
                        "discount_percent": float(deal_data.get("customer_avg_discount", 12.0))
                    }
                }
            }

        # 5. Healthy Deal / Default
        else:
            main_threat = {
                "type": "NONE",
                "dimension": "none",
                "message": "All deal dimensions are performing within healthy operating boundaries."
            }
            predicted_impact = {
                "risk_level": "LOW",
                "deal_velocity": "OPTIMAL"
            }
            recommended_action = {
                "action": "PROCEED_TO_CONFIRMATION",
                "description": "Quotation is economically optimized and governance compliant. Proceed to customer signature.",
                "simulation_payload": {
                    "changes": {}
                }
            }

        return {
            "main_threat": main_threat,
            "predicted_impact": predicted_impact,
            "recommended_action": recommended_action
        }
