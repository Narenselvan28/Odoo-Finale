"""
DealFlow360 - Anticipatory Deal Engine
End-to-End Automated Test Suite
"""

import sys
import json
import unittest
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent / "backend"
sys.path.append(str(BASE_DIR))

from config import Config
from database import init_db, get_db_connection
from anticipatory.core.events import BusinessEvent, BusinessEventType
from anticipatory.core.anticipatory_engine import AnticipatoryDealEngine
from anticipatory.twin.deal_digital_twin import DealDigitalTwin
from anticipatory.twin.rule_validator import RuleValidator
from anticipatory.decision.policy import InterventionPolicy
from app import create_app


class TestAnticipatoryDealEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Config.DB_PATH = BASE_DIR / "test_anticipation.db"
        if Config.DB_PATH.exists():
            Config.DB_PATH.unlink()
        init_db()
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_digital_twin_simulation(self):
        """Test Deal Digital Twin margin calculation and multi-warehouse split."""
        deal_data = {
            "unit_price": 1850.0,
            "quantity": 100,
            "discount_percent": 10.0,
            "customer_tier": "PLATINUM",
            "warehouse_stocks": {"WH-A": 40, "WH-B": 60, "WH-C": 15}
        }
        sim = DealDigitalTwin.simulate_deal_state(deal_data)

        self.assertEqual(sim["gross_value"], 185000.0)
        self.assertEqual(sim["discount_amount"], 18500.0)
        self.assertEqual(sim["net_revenue"], 166500.0)
        self.assertFalse(sim["discount_limit_exceeded"]) # Platinum limit is 20%
        self.assertFalse(sim["margin_below_floor"])

        # Check multi-warehouse allocation split
        alloc = sim["allocation_plan"]
        self.assertEqual(len(alloc), 2)
        self.assertEqual(alloc[0]["warehouse_id"], "WH-A")
        self.assertEqual(alloc[0]["allocated_units"], 40)
        self.assertEqual(alloc[1]["warehouse_id"], "WH-B")
        self.assertEqual(alloc[1]["allocated_units"], 60)
        self.assertEqual(sim["shortage_units"], 0)
        self.assertGreater(sim["transport_cost"], 0.0)
        print("\n[OK] Test 01: Deal Digital Twin simulation validated.")

    def test_02_rule_validator_veto(self):
        """Test Rule Validator enforces hard business rules."""
        # 1. Extreme discount exceeding max cap
        deal_data = {"discount_percent": 40.0, "customer_tier": "GOLD", "status": "DRAFT"}
        sim = {"gross_margin_percent": 8.0, "tier_limit": 15.0}
        compliant, violations, notes = RuleValidator.validate_action("REQUEST_APPROVAL", deal_data, sim)
        self.assertFalse(compliant)
        self.assertTrue(any("exceeds enterprise absolute maximum limit" in v for v in violations))
        print("[OK] Test 02: Rule Validator veto logic verified.")

    def test_03_anticipation_cycle_quotation_created(self):
        """Test QuotationCreated predicts and prepares RECOMMEND_DISCOUNT."""
        event = BusinessEvent(
            deal_id="DEAL-TEST-01",
            event_type=BusinessEventType.QUOTATION_CREATED.value,
            user_id="USER-TEST",
            metadata={"product_name": "ThinkPad X1 Carbon", "quantity": 10, "customer_tier": "PLATINUM"}
        )
        result = AnticipatoryDealEngine.process_event(event)

        self.assertIsNotNone(result["prediction_id"])
        self.assertEqual(result["predicted_action"], "RECOMMEND_DISCOUNT")
        self.assertGreaterEqual(result["confidence"], 0.70)
        self.assertIsNotNone(result["prepared_action"])
        self.assertIn("recommended_discount_percent", result["prepared_action"]["payload"])
        print("[OK] Test 03: QuotationCreated -> RECOMMEND_DISCOUNT anticipation cycle verified.")

    def test_04_anticipation_cycle_discount_exceeded(self):
        """Test DiscountLimitExceeded predicts and prepares REQUEST_APPROVAL."""
        event = BusinessEvent(
            deal_id="DEAL-TEST-02",
            event_type=BusinessEventType.DISCOUNT_LIMIT_EXCEEDED.value,
            user_id="USER-TEST",
            metadata={"discount_percent": 22.0, "customer_tier": "GOLD"} # Gold limit is 15%
        )
        result = AnticipatoryDealEngine.process_event(event)

        self.assertEqual(result["predicted_action"], "REQUEST_APPROVAL")
        self.assertGreaterEqual(result["probability"], 0.90)
        self.assertIn("approval_chain", result["prepared_action"]["payload"])
        print("[OK] Test 04: DiscountLimitExceeded -> REQUEST_APPROVAL anticipation cycle verified.")

    def test_05_anticipation_cycle_order_confirmed_allocation(self):
        """Test OrderConfirmed predicts and prepares ALLOCATE_WAREHOUSE."""
        event = BusinessEvent(
            deal_id="DEAL-TEST-03",
            event_type=BusinessEventType.ORDER_CONFIRMED.value,
            user_id="USER-TEST",
            metadata={"quantity": 100, "status": "CONFIRMED"}
        )
        result = AnticipatoryDealEngine.process_event(event)

        self.assertEqual(result["predicted_action"], "ALLOCATE_WAREHOUSE")
        prep = result["prepared_action"]
        self.assertIn("allocations", prep["payload"])
        self.assertGreater(len(prep["payload"]["allocations"]), 0)
        print("[OK] Test 05: OrderConfirmed -> ALLOCATE_WAREHOUSE anticipation cycle verified.")

    def test_06_anticipation_cycle_stock_shortage(self):
        """Test StockShortageDetected predicts and prepares CREATE_REPLENISHMENT."""
        event = BusinessEvent(
            deal_id="DEAL-TEST-04",
            event_type=BusinessEventType.STOCK_SHORTAGE_DETECTED.value,
            user_id="USER-TEST",
            metadata={"quantity": 200, "status": "SHORTAGE_FLAGGED"}
        )
        result = AnticipatoryDealEngine.process_event(event)

        self.assertEqual(result["predicted_action"], "CREATE_REPLENISHMENT")
        prep = result["prepared_action"]
        self.assertIn("replenish_quantity", prep["payload"])
        self.assertIn("source_location", prep["payload"])
        print("[OK] Test 06: StockShortageDetected -> CREATE_REPLENISHMENT anticipation cycle verified.")

    def test_07_user_confirmation_and_execution(self):
        """Test User Confirm & Execute applies deal changes and triggers follow-up cycle."""
        # 1. Generate a prepared action
        event = BusinessEvent(
            deal_id="DEAL-EXEC-01",
            event_type=BusinessEventType.QUOTATION_CREATED.value,
            user_id="USER-EXEC",
            metadata={"customer_tier": "PLATINUM"}
        )
        result = AnticipatoryDealEngine.process_event(event)
        prepared_id = result["prepared_action"]["prepared_id"]

        # 2. Confirm & Execute
        exec_res = AnticipatoryDealEngine.confirm_and_execute(
            prepared_id=prepared_id,
            deal_id="DEAL-EXEC-01",
            user_id="USER-EXEC"
        )

        self.assertTrue(exec_res["success"])
        self.assertEqual(exec_res["executed_action"], "RECOMMEND_DISCOUNT")
        self.assertIsNotNone(exec_res["next_anticipatory_cycle"]) # Followup cycle automatically triggered!
        print("[OK] Test 07: User Confirm -> Execute -> Follow-up Anticipation Cycle verified.")

    def test_08_rest_apis(self):
        """Test REST API endpoints."""
        # POST /api/v1/anticipation/predict
        resp = self.client.post("/api/v1/anticipation/predict", json={
            "deal_id": "DEAL-API-01",
            "event_type": "CustomerNegotiated",
            "user_id": "USER-API",
            "metadata": {"discount_percent": 16.0}
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data["success"])
        self.assertEqual(data["result"]["predicted_action"], "REVISE_QUOTATION")

        pred_id = data["result"]["prediction_id"]
        prep_id = data["result"]["prepared_action"]["prepared_id"]

        # POST /api/v1/anticipation/simulate
        sim_resp = self.client.post("/api/v1/anticipation/simulate", json={
            "deal_id": "DEAL-API-01",
            "action": "RECOMMEND_DISCOUNT",
            "params": {"discount_percent": 12.0}
        })
        self.assertEqual(sim_resp.status_code, 200)

        # GET /api/v1/anticipation/next-actions/DEAL-API-01
        actions_resp = self.client.get("/api/v1/anticipation/next-actions/DEAL-API-01")
        self.assertEqual(actions_resp.status_code, 200)
        self.assertGreater(len(actions_resp.get_json()["prepared_actions"]), 0)

        # GET /api/v1/anticipation/explanation/<prediction_id>
        expl_resp = self.client.get(f"/api/v1/anticipation/explanation/{pred_id}")
        self.assertEqual(expl_resp.status_code, 200)

        # POST /api/v1/anticipation/confirm
        conf_resp = self.client.post("/api/v1/anticipation/confirm", json={
            "prepared_id": prep_id,
            "deal_id": "DEAL-API-01",
            "user_id": "USER-API"
        })
        self.assertEqual(conf_resp.status_code, 200)
        self.assertTrue(conf_resp.get_json()["success"])

        print("[OK] Test 08: REST API endpoints (/predict, /simulate, /next-actions, /explanation, /confirm) verified.")


if __name__ == "__main__":
    unittest.main()
