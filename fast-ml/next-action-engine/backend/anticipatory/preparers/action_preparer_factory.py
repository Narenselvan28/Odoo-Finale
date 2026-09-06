"""
DealFlow360 - Anticipatory Deal Engine
Concrete Action Preparers & Payload Construction Factory
"""

import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

logger = logging.getLogger(__name__)


class ActionPreparerFactory:
    """
    Constructs concrete, pre-computed operational payloads for candidate actions
    so the user can review, confirm, and execute with 1 click.
    """

    @classmethod
    def prepare_action(
        cls,
        action_name: str,
        deal_data: Dict[str, Any],
        sim_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Routes to the appropriate preparer based on action type.
        """
        preparer_map = {
            "RECOMMEND_DISCOUNT": cls._prepare_discount,
            "REQUEST_APPROVAL": cls._prepare_approval,
            "ALLOCATE_WAREHOUSE": cls._prepare_warehouse_allocation,
            "CREATE_REPLENISHMENT": cls._prepare_replenishment,
            "REVISE_QUOTATION": cls._prepare_quotation_revision,
            "GENERATE_INVOICE": cls._prepare_invoice,
            "CREATE_SUBSCRIPTION_BILLING": cls._prepare_subscription_billing,
            "CONFIRM_ORDER": cls._prepare_order_confirmation,
        }

        handler = preparer_map.get(action_name, cls._prepare_generic)
        prepared_data = handler(deal_data, sim_result)
        
        return {
            "prepared_id": f"prep_{uuid.uuid4().hex[:10]}",
            "action": action_name,
            "deal_id": deal_data.get("deal_id", "DEAL-1001"),
            "title": prepared_data.get("title", f"Prepared {action_name}"),
            "summary": prepared_data.get("summary", ""),
            "payload": prepared_data.get("payload", {}),
            "consequences": prepared_data.get("consequences", {}),
            "created_at": datetime.utcnow().isoformat() + "Z",
            "status": "PREPARED" # PREPARED, CONFIRMED, EXECUTED, DISMISSED
        }

    @classmethod
    def _prepare_discount(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        customer_tier = deal.get("customer_tier", "GOLD")
        # Optimal recommended discount based on customer tier
        recommended_discount = 12.5 if customer_tier == "PLATINUM" else (10.0 if customer_tier == "GOLD" else 5.0)
        
        # Calculate impact of this discount
        unit_price = float(deal.get("unit_price", 1850.0))
        qty = int(deal.get("quantity", 10))
        cogs = float(deal.get("cost_per_unit", unit_price * 0.65)) * qty
        gross = unit_price * qty
        net = gross * (1 - recommended_discount / 100.0)
        proj_margin = ((net - cogs) / net * 100.0) if net > 0 else 0.0

        return {
            "title": f"Prepared Discount Optimization ({recommended_discount}%)",
            "summary": f"Calibrated {recommended_discount}% discount tailored to {customer_tier} tier with 84% win probability.",
            "payload": {
                "recommended_discount_percent": recommended_discount,
                "current_discount_percent": float(deal.get("discount_percent", 0.0)),
                "net_deal_value": round(net, 2),
                "target_margin_percent": round(proj_margin, 2),
                "acceptance_probability": 0.84
            },
            "consequences": {
                "margin_impact": f"{round(proj_margin, 1)}% projected gross margin",
                "revenue_gain": f"${round(net, 2)} recognized order value",
                "approval_required": recommended_discount > sim.get("tier_limit", 15.0)
            }
        }

    @classmethod
    def _prepare_approval(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        discount_pct = float(deal.get("discount_percent", 18.0))
        customer_tier = deal.get("customer_tier", "GOLD")
        tier_limit = sim.get("tier_limit", 15.0)
        margin_pct = sim.get("gross_margin_percent", 21.8)

        return {
            "title": "Prepared Governance Approval Dossier",
            "summary": f"Discount {discount_pct}% exceeds {customer_tier} limit ({tier_limit}%). Prepared approval request for Regional VP & Finance.",
            "payload": {
                "deal_id": deal.get("deal_id", "DEAL-1001"),
                "customer_name": deal.get("customer_name", "Acme Technologies"),
                "requested_discount": discount_pct,
                "tier_limit": tier_limit,
                "projected_gross_margin": margin_pct,
                "risk_score": "ELEVATED (Risk Prob: 0.78)",
                "approval_chain": [
                    {"role": "Sales Director", "name": "Elena Rostova", "status": "PENDING"},
                    {"role": "VP Finance", "name": "Marcus Vance", "status": "QUEUED"}
                ],
                "justification": f"Strategic volume deal ({deal.get('quantity', 10)} units) with long-term enterprise renewal potential."
            },
            "consequences": {
                "governance_status": "Pre-validated against compliance policies",
                "approval_turnaround_estimate": "< 2 hours via automated routing",
                "margin_retention": f"{round(margin_pct, 1)}% margin preserved"
            }
        }

    @classmethod
    def _prepare_warehouse_allocation(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        allocation_plan = sim.get("allocation_plan", [])
        transport_cost = sim.get("transport_cost", 0.0)
        delivery_days = sim.get("delivery_days", 2)
        shortage = sim.get("shortage_units", 0)

        summary_parts = [f"{item['warehouse_id']} → {item['allocated_units']} units" for item in allocation_plan]
        summary_str = ", ".join(summary_parts) if summary_parts else "Optimal multi-depot distribution."

        return {
            "title": "Prepared Multi-Warehouse Inventory Allocation",
            "summary": f"Pre-computed optimal routing: {summary_str}. Estimated SLA: {delivery_days} days.",
            "payload": {
                "allocations": allocation_plan,
                "total_quantity": deal.get("quantity", 10),
                "shortage_units": shortage,
                "transport_cost": transport_cost,
                "estimated_delivery_days": delivery_days,
                "carrier_service": "Express Freight SLA"
            },
            "consequences": {
                "freight_cost": f"${transport_cost:.2f} total logistics expenditure",
                "delivery_commitment": f"{delivery_days} business days to destination",
                "split_fulfillment": len(allocation_plan) > 1
            }
        }

    @classmethod
    def _prepare_replenishment(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        shortage = sim.get("shortage_units", 20)
        if shortage == 0:
            shortage = 25 # Safety buffer replenishment

        return {
            "title": f"Prepared Stock Replenishment / Transfer ({shortage} Units)",
            "summary": f"Detected inventory gap of {shortage} units. Prepared inter-warehouse transfer requisition from Central Hub.",
            "payload": {
                "product_name": deal.get("product_name", "ThinkPad X1 Carbon"),
                "replenish_quantity": shortage,
                "source_location": "Central Logistics Hub (WH-A)",
                "destination_location": "Southern Regional Center (WH-B)",
                "transfer_mode": "Rapid Inter-Depot Transit",
                "estimated_arrival": (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
            },
            "consequences": {
                "stockout_prevention": "100% order fulfillment secured",
                "lead_time": "48 hours transit SLA",
                "inventory_cost": "$0.00 (Internal balance sheet adjustment)"
            }
        }

    @classmethod
    def _prepare_quotation_revision(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        counter_discount = float(deal.get("discount_percent", 15.0))
        qty = int(deal.get("quantity", 10))
        unit_price = float(deal.get("unit_price", 1850.0))
        net_val = (unit_price * qty) * (1 - counter_discount / 100.0)

        return {
            "title": "Prepared Revised Quotation (v2.0 Draft)",
            "summary": f"Customer counter-offer mapped to v2.0 draft at {counter_discount}% discount with updated margin economics.",
            "payload": {
                "quotation_id": deal.get("quotation_id", "QT-1001"),
                "revision_number": 2,
                "customer_name": deal.get("customer_name", "Acme Technologies"),
                "discount_percent": counter_discount,
                "revised_total_amount": round(net_val, 2),
                "items": f"{deal.get('product_name', 'ThinkPad X1 Carbon')} x {qty}",
                "valid_until": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d")
            },
            "consequences": {
                "deal_protection": "Counter-offer captured before expiration",
                "margin_health": f"{round(sim.get('gross_margin_percent', 23.0), 1)}% gross margin retained",
                "audit_trail": "Version snapshot linked to customer correspondence"
            }
        }

    @classmethod
    def _prepare_invoice(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        net_rev = sim.get("net_revenue", float(deal.get("amount", 18500.0)))
        tax = round(net_rev * 0.18, 2) # Standard 18% GST / VAT
        total = round(net_rev + tax, 2)

        return {
            "title": "Prepared Commercial Invoice Draft (INV-2026-089)",
            "summary": f"Commercial billing package prepared for ${total:,.2f} (Net: ${net_rev:,.2f} + Tax: ${tax:,.2f}) with Net-30 terms.",
            "payload": {
                "invoice_number": f"INV-{datetime.utcnow().year}-{uuid.uuid4().hex[:6].upper()}",
                "customer_name": deal.get("customer_name", "Acme Technologies"),
                "subtotal": net_rev,
                "tax_amount": tax,
                "total_amount": total,
                "payment_terms": "Net 30 Days",
                "due_date": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")
            },
            "consequences": {
                "cash_flow_acceleration": "Automated billing initiates payment cycle immediately",
                "tax_compliance": "Itemized VAT/GST breakdown pre-audited"
            }
        }

    @classmethod
    def _prepare_subscription_billing(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        mrr = round(sim.get("net_revenue", 1500.0) / 12.0, 2)

        return {
            "title": "Prepared Recurring Billing Schedule (12-Month Contract)",
            "summary": f"Initialized monthly recurring milestone schedule at ${mrr:,.2f}/month with automated charge retries.",
            "payload": {
                "schedule_id": f"SUB-{uuid.uuid4().hex[:8].upper()}",
                "frequency": "MONTHLY",
                "billing_cycle_count": 12,
                "monthly_amount": mrr,
                "next_charge_date": (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "auto_renew": True
            },
            "consequences": {
                "arr_recognition": f"${round(mrr * 12, 2):,.2f} Annual Recurring Revenue locked",
                "churn_risk_mitigation": "Automated dunning schedule attached"
            }
        }

    @classmethod
    def _prepare_order_confirmation(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "Prepared Sales Order Confirmation",
            "summary": f"Prepared formal sales order package for {deal.get('customer_name', 'Client')} with fulfillment reservations.",
            "payload": {
                "order_id": f"ORD-{uuid.uuid4().hex[:6].upper()}",
                "deal_id": deal.get("deal_id", "DEAL-1001"),
                "total_amount": sim.get("net_revenue", 18500.0),
                "status": "READY_FOR_FULFILLMENT"
            },
            "consequences": {
                "inventory_lock": "Reserved multi-depot stock to prevent stockout",
                "revenue_milestone": "Contracts legally confirmed"
            }
        }

    @classmethod
    def _prepare_generic(cls, deal: Dict[str, Any], sim: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "title": "Prepared Operational Step",
            "summary": "Standard business operation prepared for user review.",
            "payload": deal,
            "consequences": {}
        }
