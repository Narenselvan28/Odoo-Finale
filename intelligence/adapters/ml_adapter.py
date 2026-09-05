"""
DealFlow360 - ML Adapter
Provides safe, advisory integration with the existing XGBoost Regressor (Discount Recommendation)
and XGBoost Classifier (Discount Risk) pipelines without overriding deterministic business rules.
"""

import logging
from typing import Dict, Any, Optional
from services.classifier_service import classifier_service
from services.regressor_service import regressor_service

logger = logging.getLogger(__name__)


class MLAdapter:
    """Adapter for interacting with ML inference services with graceful fallbacks."""

    @classmethod
    def get_discount_recommendation(cls, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Queries the Discount Recommendation Regressor.
        Returns recommendation dict or graceful fallback when unavailable.
        """
        if not regressor_service.is_loaded():
            return {
                "model_available": False,
                "model_name": "discount_recommendation_regressor",
                "reason": "Model file not loaded or unavailable."
            }

        try:
            metadata = regressor_service.get_metadata()
            sample_input = metadata.get("sample_input", {}).copy() if metadata else {}

            # Map fields from deal_data
            quantity = float(deal_data.get("quantity", 1.0))
            base_price = float(deal_data.get("base_price", deal_data.get("price", 100.0)))
            discount_pct = float(deal_data.get("discount_percent", deal_data.get("current_discount_percent", 10.0)))
            customer_tier = str(deal_data.get("customer_tier", "GOLD")).upper()

            payload = sample_input
            payload.update({
                "quantity": quantity,
                "price": base_price,
                "order_value": quantity * base_price,
                "customer_tier": customer_tier,
                "discount_percent": discount_pct,
                "discount_amount": (quantity * base_price) * (discount_pct / 100.0),
                "discounted_unit_price": base_price * (1.0 - (discount_pct / 100.0)),
                "customer_avg_previous_discount": float(deal_data.get("customer_avg_discount", 10.0)),
                "tier_discount": 10.0 if customer_tier == "GOLD" else (15.0 if customer_tier == "PLATINUM" else 5.0),
                "tier_max_discount": float(deal_data.get("customer_max_discount", 20.0))
            })

            result = regressor_service.predict_discount(payload)
            rec_discount = result.get("prediction", {}).get("recommended_discount_percent", 10.0)

            return {
                "model_available": True,
                "model_name": "discount_recommendation_regressor",
                "recommended_discount_percent": round(rec_discount, 2)
            }
        except Exception as e:
            logger.warning(f"ML Regressor prediction failed gracefully: {e}")
            return {
                "model_available": False,
                "model_name": "discount_recommendation_regressor",
                "reason": f"Prediction error: {str(e)}"
            }

    @classmethod
    def get_discount_risk(cls, deal_data: Dict[str, Any], sim_pricing: Dict[str, Any], sim_fulfillment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Queries the Discount Risk Classifier.
        Returns risk probability, risk percentage, and category ("NORMAL" / "HIGH").
        """
        if not classifier_service.is_loaded():
            return {
                "model_available": False,
                "model_name": "discount_risk_classifier",
                "reason": "Model file not loaded or unavailable."
            }

        try:
            metadata = classifier_service.get_metadata()
            sample_input = metadata.get("sample_input", {}).copy() if metadata else {}

            quantity = float(deal_data.get("quantity", 1.0))
            base_price = float(deal_data.get("base_price", deal_data.get("price", 100.0)))
            discount_pct = float(deal_data.get("discount_percent", deal_data.get("current_discount_percent", 10.0)))
            customer_tier = str(deal_data.get("customer_tier", "GOLD")).upper()

            gross_val = sim_pricing.get("gross_value", quantity * base_price)
            disc_amt = sim_pricing.get("discount_amount", gross_val * (discount_pct / 100.0))
            net_sales = sim_pricing.get("selling_value", gross_val - disc_amt)
            margin_pct = sim_pricing.get("margin_percent", 20.0)
            product_cost = float(deal_data.get("product_cost", base_price * 0.65))

            transport_cost = float(sim_fulfillment.get("transport_cost", 0.0))
            expected_delivery_days = float(sim_fulfillment.get("expected_delivery_days", 3.0))
            required_delivery_days = float(deal_data.get("required_delivery_days", 4.0))
            delivery_delay_days = max(0.0, expected_delivery_days - required_delivery_days)

            payload = sample_input
            payload.update({
                "customer_tier": customer_tier,
                "quantity": quantity,
                "price": base_price,
                "order_value": gross_val,
                "discount_percent": discount_pct,
                "discount_amount": disc_amt,
                "net_sales": net_sales,
                "product_cost": product_cost,
                "margin_percent": margin_pct,
                "margin_after_discount": sim_pricing.get("margin_amount", 0.0),
                "transport_cost": transport_cost,
                "expected_delivery_days": expected_delivery_days,
                "delivery_delay_days": delivery_delay_days,
                "customer_avg_discount": float(deal_data.get("customer_avg_discount", 10.0)),
                "warehouse_count": float(sim_fulfillment.get("warehouse_count", 1.0))
            })

            result = classifier_service.predict_risk(payload)
            pred = result.get("prediction", {})
            risk_pct = float(pred.get("risk_percentage", 0.0))
            risk_prob = round(risk_pct / 100.0, 4)
            risk_cat = pred.get("risk_category", "NORMAL")

            return {
                "model_available": True,
                "model_name": "discount_risk_classifier",
                "risk_probability": risk_prob,
                "risk_percentage": risk_pct,
                "risk_label": risk_cat
            }
        except Exception as e:
            logger.warning(f"ML Classifier prediction failed gracefully: {e}")
            return {
                "model_available": False,
                "model_name": "discount_risk_classifier",
                "reason": f"Prediction error: {str(e)}"
            }
