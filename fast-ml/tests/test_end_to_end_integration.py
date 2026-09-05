"""
DealFlow360 - End-to-End System Integration Tests
Verifies the complete integration pipeline:
1. ML Discount Recommendation Model (XGBoost Regressor)
2. ML Discount Risk Classifier Model (XGBoost Classifier)
3. Real-Time What-If Simulation Engine
4. Multi-Scenario Feasibility Comparison (Option A / B / C)
5. Business Memory & Relationship Telemetry
6. Actionable Deal Health & Threat Generator
7. Why / Why-Not Explanation Engine
8. Conversational Deal Intelligence Assistant (Compound Queries & Confirmation)
"""

import unittest
import json
import time
from app import create_app
from chatbot.conversation_manager import conversation_manager
from intelligence.what_if.simulator import WhatIfSimulator
from intelligence.health.deal_health_engine import DealHealthEngine
from intelligence.adapters.ml_adapter import MLAdapter
from intelligence.memory.business_memory import business_memory_service


class TestDealFlow360EndToEndIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

        cls.sample_deal = {
            "deal_id": "DEAL-E2E-101",
            "customer_id": "CUST-101",
            "customer_tier": "GOLD",
            "category": "ELECTRONICS",
            "product_name": "Enterprise AI Server",
            "quantity": 500,
            "base_price": 1000.0,
            "product_cost": 650.0,
            "discount_percent": 12.0,
            "current_discount_percent": 12.0,
            "required_delivery_days": 4,
            "margin_percent": 19.2,
            "customer_avg_discount": 10.0,
            "customer_max_discount": 20.0,
        }

    # 1. Test ML Discount Recommendation (XGBoost Regressor)
    def test_01_discount_recommendation_model(self):
        res = self.client.post(
            "/api/v1/predict/discount-recommendation",
            json={
                "customer_tier": "GOLD",
                "category": "ELECTRONICS",
                "quantity": 500,
                "base_price": 1000.0,
                "product_cost": 650.0,
                "current_discount_percent": 10.0,
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("recommended_discount_percent", data)
        self.assertGreater(data["recommended_discount_percent"], 0)

    # 2. Test ML Discount Risk Classifier (XGBoost Classifier)
    def test_02_discount_risk_classifier_model(self):
        res = self.client.post(
            "/api/v1/predict/discount-risk",
            json={
                "discount_percent": 25.0,
                "customer_tier": "STANDARD",
                "category": "ELECTRONICS",
                "quantity": 100,
                "margin_percent": 10.0,
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("prediction", data)
        self.assertIn("risk_label", data["prediction"])
        self.assertIn("risk_percentage", data["prediction"])

    # 3. Test Real-time What-If Simulation
    def test_03_what_if_simulation(self):
        res = self.client.post(
            "/api/v1/intelligence/what-if",
            json={
                "deal": self.sample_deal,
                "changes": {"discount_percent": 18.0}
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        sim = data["simulation"]
        self.assertEqual(sim["simulated"]["discount_percent"], 18.0)
        self.assertIn("margin_percent", sim["simulated"])
        self.assertIn("rules", sim)

    # 4. Test Multi-Scenario Comparison
    def test_04_multi_scenario_comparison(self):
        res = self.client.post(
            "/api/v1/intelligence/what-if/batch",
            json={
                "deal": self.sample_deal,
                "scenarios": [
                    {"discount_percent": 12.0},
                    {"discount_percent": 15.0},
                    {"discount_percent": 18.0},
                ]
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(len(data.get("simulations", [])), 3)

    # 5. Test Unified Deal Insights & Explanations
    def test_05_unified_deal_insights(self):
        res = self.client.post(
            "/api/v1/intelligence/deal/insights",
            json={"deal": self.sample_deal}
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("deal_health", data)
        self.assertIn("business_memory", data)
        self.assertIn("why", data)
        self.assertIn("why_not", data)

    # 6. Test Killer Scenario: "Can I get 18% off and still receive it by Friday?"
    def test_06_compound_conversational_deal_assistant(self):
        res = self.client.post(
            "/api/v1/intelligence/customer-chat",
            json={
                "conversation_id": "test_e2e_compound",
                "deal_id": "DEAL-E2E-101",
                "message": "Can I get 18% off and still receive it by Friday?",
                "context_override": self.sample_deal
            }
        )
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("response", data)
        self.assertIn("intents", data)
        self.assertIn("actions", data)
        self.assertIn(data["state"], ["WAITING_FOR_CONFIRMATION", "COMPLETED"])

    # 7. Test Confirmation Workflow
    def test_07_confirmation_workflow(self):
        # Stage a discount proposal
        res1 = self.client.post(
            "/api/v1/intelligence/customer-chat",
            json={
                "conversation_id": "test_e2e_confirm_session",
                "deal_id": "DEAL-E2E-101",
                "message": "Can you give me 18% discount on this deal?",
                "context_override": self.sample_deal
            }
        )
        self.assertEqual(res1.status_code, 200)

        # Confirm mutation
        res2 = self.client.post(
            "/api/v1/intelligence/customer-chat/confirm",
            json={"conversation_id": "test_e2e_confirm_session"}
        )
        self.assertEqual(res2.status_code, 200)
        data2 = res2.get_json()
        self.assertTrue(data2.get("success"))
        self.assertEqual(data2.get("status"), "MUTATION_DISPATCHED")


if __name__ == "__main__":
    unittest.main()
