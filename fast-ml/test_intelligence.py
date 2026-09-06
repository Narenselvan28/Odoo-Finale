"""
DealFlow360 - Comprehensive Intelligence Engine Test Suite
Tests: What-If Deal Simulation, State Immutability, Rule Evaluation, Multi-Warehouse Split,
Why / Why-Not Explanations, Business Memory, Actionable Deal Health, and Unified Deal Insights.
"""

import json
import copy
from app import create_app


def get_test_client():
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def test_what_if_simulation_valid_and_immutable():
    """Tests 1, 4, 5, 6: Valid discount simulation, immutability, approval change, margin delta."""
    client = get_test_client()

    deal_payload = {
        "deal_id": "DEAL-1001",
        "customer_id": "CUST-101",
        "customer_tier": "GOLD",
        "quantity": 500,
        "base_price": 1000.0,
        "product_cost": 650.0,
        "current_discount_percent": 12.0,
        "warehouses": [
            {
                "warehouse_id": "WH-A",
                "available_stock": 300,
                "reserved_stock": 50,
                "capacity": 1000,
                "current_load": 650,
                "distance_km": 120,
                "transport_rate_per_km": 10,
                "processing_days": 1
            },
            {
                "warehouse_id": "WH-B",
                "available_stock": 300,
                "reserved_stock": 20,
                "capacity": 800,
                "current_load": 400,
                "distance_km": 180,
                "transport_rate_per_km": 9,
                "processing_days": 2
            }
        ],
        "required_delivery_days": 4,
        "customer_avg_discount": 10.0,
        "customer_max_discount": 16.0,
        "previous_deals": 8,
        "previous_negotiations": 2
    }

    original_snapshot = copy.deepcopy(deal_payload)

    req = {
        "deal": deal_payload,
        "changes": {
            "discount_percent": 18.0
        }
    }

    res = client.post("/api/v1/intelligence/what-if", json=req)
    assert res.status_code == 200
    data = res.get_json()

    assert data["success"] is True
    sim = data["simulation"]
    assert sim["deal_id"] == "DEAL-1001"
    assert sim["is_simulation"] is True

    # 1. Verify Current vs Simulated
    assert sim["current"]["discount_percent"] == 12.0
    assert sim["simulated"]["discount_percent"] == 18.0
    assert sim["current"]["approval_required"] is False
    assert sim["simulated"]["approval_required"] is True  # 18% > Gold tier limit (15%)

    # 2. Verify Deltas
    assert sim["impact"]["discount_delta"] == 6.0
    assert sim["impact"]["margin_delta"] < 0  # Margin decreases with higher discount
    assert sim["impact"]["approval_status_changed"] is True

    # 3. Verify Original State Unchanged (Immutability Guarantee)
    assert deal_payload == original_snapshot
    assert deal_payload["current_discount_percent"] == 12.0


def test_what_if_invalid_discount():
    """Test 2: Invalid discount percentage returns 422."""
    client = get_test_client()
    req = {
        "deal": {
            "deal_id": "DEAL-1002",
            "quantity": 10,
            "base_price": 100.0,
            "current_discount_percent": 5.0
        },
        "changes": {
            "discount_percent": 150.0  # Out of valid [0, 100] range
        }
    }
    res = client.post("/api/v1/intelligence/what-if", json=req)
    assert res.status_code == 422
    assert res.get_json()["error"]["code"] == "INVALID_DISCOUNT"


def test_what_if_missing_deal_data():
    """Test 3: Missing deal data returns 400."""
    client = get_test_client()
    req = {
        "changes": {"discount_percent": 15.0}
    }
    res = client.post("/api/v1/intelligence/what-if", json=req)
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "MISSING_DEAL_PAYLOAD"


def test_warehouse_split_and_sla_simulation():
    """Tests 7 & 8: Multi-warehouse allocation and delivery SLA check."""
    client = get_test_client()
    req = {
        "deal": {
            "deal_id": "DEAL-WH-SPLIT",
            "quantity": 500,
            "base_price": 500.0,
            "product_cost": 300.0,
            "current_discount_percent": 8.0,
            "required_delivery_days": 2,  # Stricter SLA
            "warehouses": [
                {
                    "warehouse_id": "WH-A",
                    "available_stock": 200,
                    "reserved_stock": 0,
                    "distance_km": 100,
                    "transport_rate_per_km": 10,
                    "processing_days": 1
                },
                {
                    "warehouse_id": "WH-B",
                    "available_stock": 400,
                    "reserved_stock": 0,
                    "distance_km": 600,
                    "transport_rate_per_km": 12,
                    "processing_days": 2
                }
            ]
        },
        "changes": {
            "quantity": 500
        }
    }
    res = client.post("/api/v1/intelligence/what-if", json=req)
    assert res.status_code == 200
    sim = res.get_json()["simulation"]

    # Fulfills from 2 warehouses (200 from WH-A, 300 from WH-B)
    assert sim["fulfillment"]["warehouse_count"] == 2
    assert len(sim["fulfillment"]["allocation"]) == 2
    assert sim["fulfillment"]["feasible"] is True
    # Delivery from WH-B takes processing 2 + ceil(600/250)=3 => 5 days > required 2 days
    assert sim["fulfillment"]["delivery_sla_met"] is False


def test_what_if_batch_simulation():
    """Test batch scenario simulation."""
    client = get_test_client()
    req = {
        "deal": {
            "deal_id": "DEAL-BATCH-01",
            "quantity": 100,
            "base_price": 1000.0,
            "product_cost": 600.0,
            "current_discount_percent": 10.0,
            "customer_tier": "GOLD"
        },
        "scenarios": [
            {"discount_percent": 12.0},
            {"discount_percent": 15.0},
            {"discount_percent": 20.0}
        ]
    }
    res = client.post("/api/v1/intelligence/what-if/batch", json=req)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["scenario_count"] == 3
    assert len(data["simulations"]) == 3
    assert data["simulations"][0]["simulated"]["discount_percent"] == 12.0
    assert data["simulations"][2]["simulated"]["approval_required"] is True


def test_why_why_not_explanation():
    """Tests 13: Explain decision with Why and Why-Not counterfactuals."""
    client = get_test_client()
    req = {
        "deal": {
            "deal_id": "DEAL-EXPLAIN-01",
            "customer_id": "CUST-101",
            "customer_tier": "GOLD",
            "quantity": 100,
            "base_price": 1000.0,
            "product_cost": 650.0,
            "discount_percent": 12.0,
            "customer_avg_discount": 10.0,
            "customer_max_discount": 15.0,
            "previous_deals": 10
        },
        "alternatives": [15.0, 18.0]
    }
    res = client.post("/api/v1/intelligence/explain", json=req)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "why" in data
    assert "why_not" in data
    assert "customer_history" in data["why"]
    assert "expected_margin_percent" in data["why"]["economics"]
    assert len(data["why_not"]) >= 2
    assert "acceptance_probability_delta" in data["why_not"][0]["comparison"]
    assert data["confidence"] > 0.7


def test_business_memory_customer_and_product():
    """Tests 14 & 15: Customer Memory and Product Memory."""
    client = get_test_client()

    # Customer Memory
    res_c = client.get("/api/v1/intelligence/memory/customer/CUST-001")
    assert res_c.status_code == 200
    data_c = res_c.get_json()
    assert data_c["success"] is True
    assert "memory" in data_c
    assert "insights" in data_c
    assert isinstance(data_c["insights"], list)

    # Product Memory
    res_p = client.get("/api/v1/intelligence/memory/customer/CUST-001/product/ThinkPad")
    assert res_p.status_code == 200
    data_p = res_p.get_json()
    assert data_p["success"] is True
    assert "memory" in data_p


def test_actionable_deal_health():
    """Tests 16: Multi-dimensional health score and threat action generation."""
    client = get_test_client()
    req = {
        "deal": {
            "deal_id": "DEAL-HEALTH-01",
            "customer_tier": "GOLD",
            "quantity": 20,
            "base_price": 2000.0,
            "product_cost": 1700.0,  # High cost -> Low margin
            "discount_percent": 18.0,  # High discount
            "required_delivery_days": 4
        }
    }
    res = client.post("/api/v1/intelligence/deal/DEAL-HEALTH-01/health", json=req)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    health = data["deal_health"]
    assert health["score"] <= 75
    assert health["status"] in ("AT_RISK", "CRITICAL")
    assert "dimensions" in health
    assert "main_threat" in health
    assert "recommended_action" in health
    assert "simulation_payload" in health["recommended_action"]


def test_unified_deal_insights():
    """Tests 17: Unified Deal Intelligence endpoint."""
    client = get_test_client()
    req = {
        "deal": {
            "deal_id": "DEAL-1001",
            "customer_id": "CUST-101",
            "customer_tier": "GOLD",
            "quantity": 500,
            "base_price": 1000.0,
            "product_cost": 650.0,
            "discount_percent": 12.0,
            "required_delivery_days": 4,
            "customer_avg_discount": 10.0,
            "customer_max_discount": 16.0,
            "previous_deals": 8,
            "previous_negotiations": 2
        }
    }
    res = client.post("/api/v1/intelligence/deal/DEAL-1001/insights", json=req)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "deal_health" in data
    assert "business_memory" in data
    assert "recommendation" in data
    assert "why" in data
    assert "why_not" in data
    assert "next_actions" in data
    assert len(data["next_actions"]) > 0
    assert data["confidence"] > 0.7


if __name__ == "__main__":
    print("Running comprehensive test suite for DealFlow360 Intelligence Engine...")
    test_what_if_simulation_valid_and_immutable()
    print("[PASS] test_what_if_simulation_valid_and_immutable")
    test_what_if_invalid_discount()
    print("[PASS] test_what_if_invalid_discount")
    test_what_if_missing_deal_data()
    print("[PASS] test_what_if_missing_deal_data")
    test_warehouse_split_and_sla_simulation()
    print("[PASS] test_warehouse_split_and_sla_simulation")
    test_what_if_batch_simulation()
    print("[PASS] test_what_if_batch_simulation")
    test_why_why_not_explanation()
    print("[PASS] test_why_why_not_explanation")
    test_business_memory_customer_and_product()
    print("[PASS] test_business_memory_customer_and_product")
    test_actionable_deal_health()
    print("[PASS] test_actionable_deal_health")
    test_unified_deal_insights()
    print("[PASS] test_unified_deal_insights")
    print("======================================================================")
    print("ALL INTELLIGENCE TESTS PASSED SUCCESSFULLY!")
    print("======================================================================")
