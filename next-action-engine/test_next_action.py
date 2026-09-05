"""
DealFlow360 - Next Action Prediction Engine
Comprehensive Automated Test Suite
Tests ML inference, two-stage smart triggers, cooldowns, feedback, and ERP flows.
"""

import sys
import json
from pathlib import Path

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent / "backend"
sys.path.append(str(BASE_DIR))

from app import create_app
from database import init_db


def run_tests():
    print("======================================================================")
    print("  DEALFLOW360 NEXT-ACTION PREDICTION ENGINE TEST SUITE")
    print("======================================================================\n")

    init_db()
    app = create_app()
    client = app.test_client()

    test_session_id = "test_sess_9999"
    test_user_id = "test_user_001"

    # TEST 1: Health Endpoint
    print("[TEST 1] GET /api/health")
    res = client.get("/api/health")
    print(f"Status: {res.status_code}")
    data = res.get_json()
    print(f"Response: {json.dumps(data, indent=2)}")
    assert res.status_code == 200
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    print("Result: [PASS]\n")

    # TEST 2: Model Status & Accuracy Metrics
    print("[TEST 2] GET /api/model/status")
    res = client.get("/api/model/status")
    print(f"Status: {res.status_code}")
    data = res.get_json()
    print(f"Model: {data.get('model_name')}, Top-1 Acc: {data.get('metrics', {}).get('top1_accuracy')}%")
    assert res.status_code == 200
    assert data["model_loaded"] is True
    assert data["metrics"]["top1_accuracy"] > 70.0
    print("Result: [PASS]\n")

    # TEST 3: Low-Priority Action (Smart Silence -> should_show: false)
    print("[TEST 3] POST /api/actions (Low Priority Action: 'search_laptop')")
    res = client.post("/api/actions", json={
        "session_id": test_session_id,
        "user_id": test_user_id,
        "action": "search_laptop",
        "metadata": {"query": "laptop"}
    })
    print(f"Status: {res.status_code}")
    data = res.get_json()
    rec_eval = data["recommendation_eval"]
    print(f"Should Show: {rec_eval['should_show']} (Reason: {rec_eval['decision_reason']})")
    assert res.status_code == 200
    assert rec_eval["should_show"] is False
    assert rec_eval["decision_reason"] == "action_not_eligible"
    print("Result: [PASS] (Smart Silence respected for low-intent browsing)\n")

    # Step: view laptop
    client.post("/api/actions", json={
        "session_id": test_session_id,
        "user_id": test_user_id,
        "action": "view_laptop",
        "metadata": {"product_id": "LP001"}
    })

    # TEST 4: High-Intent Action (Laptop Purchase -> triggers Headphones Recommendation)
    print("[TEST 4] POST /api/actions (High Priority Action: 'purchase_laptop')")
    res = client.post("/api/actions", json={
        "session_id": test_session_id,
        "user_id": test_user_id,
        "action": "purchase_laptop",
        "metadata": {"product_id": "LP001", "category": "laptop"}
    })
    print(f"Status: {res.status_code}")
    data = res.get_json()
    rec_eval = data["recommendation_eval"]
    print(f"Should Show: {rec_eval['should_show']}")
    print(f"Predicted Action: {rec_eval['recommendation']['action']} (Prob: {rec_eval['recommendation']['probability']})")
    print(f"Explanation: \"{rec_eval['recommendation']['explanation']['description']}\"")
    assert res.status_code == 200
    assert rec_eval["should_show"] is True
    assert rec_eval["recommendation"]["action"] in ["purchase_headphones", "purchase_mouse", "purchase_laptop_bag"]
    rec_id = rec_eval["recommendation_id"]
    assert rec_id is not None
    print("Result: [PASS]\n")

    # TEST 5: Cooldown / Anti-Spam Check (Immediate next action in same session)
    print("[TEST 5] POST /api/actions (Immediate second action -> Cooldown Active)")
    res = client.post("/api/actions", json={
        "session_id": test_session_id,
        "user_id": test_user_id,
        "action": "purchase_phone",
        "metadata": {"product_id": "PH001", "category": "phone"}
    })
    data = res.get_json()
    rec_eval = data["recommendation_eval"]
    print(f"Should Show: {rec_eval['should_show']} (Reason: {rec_eval['decision_reason']})")
    assert res.status_code == 200
    assert rec_eval["should_show"] is False
    assert rec_eval["decision_reason"] == "cooldown_active"
    print("Result: [PASS] (Anti-Spam cooldown active)\n")

    # TEST 6: User Feedback - Click Recommendation
    print(f"[TEST 6] POST /api/recommendations/{rec_id}/click")
    res = client.post(f"/api/recommendations/{rec_id}/click")
    data = res.get_json()
    print(f"Status: {res.status_code}, Response: {data}")
    assert res.status_code == 200
    assert data["status"] == "clicked"
    print("Result: [PASS]\n")

    # TEST 7: Quotation Workflow Prediction
    quote_session = "sess_quote_flow"
    print("[TEST 7] POST /api/predict-next-action (Quotation Workflow: 'save_quotation')")
    client.post("/api/actions", json={"session_id": quote_session, "user_id": test_user_id, "action": "open_quotations"})
    client.post("/api/actions", json={"session_id": quote_session, "user_id": test_user_id, "action": "create_quotation"})
    res = client.post("/api/predict-next-action", json={
        "session_id": quote_session,
        "current_action": "save_quotation",
        "metadata": {"quotation_id": "QT-999"}
    })
    data = res.get_json()
    print(f"Current: {data.get('current_action')}")
    print(f"Predicted: {data['recommendation']['action']} (Prob: {data['recommendation']['probability']})")
    assert res.status_code == 200
    assert data["recommendation"]["action"] in ["send_quotation", "create_order"]
    print("Result: [PASS]\n")

    # TEST 8: Dashboard Analytics API
    print("[TEST 8] GET /api/dashboard/stats")
    res = client.get("/api/dashboard/stats")
    data = res.get_json()
    print(f"Total Actions: {data['total_actions']}, Recommendations Shown: {data['recommendations_shown']}, CTR: {data['ctr_percent']}%")
    assert res.status_code == 200
    assert data["total_actions"] >= 3
    print("Result: [PASS]\n")

    # TEST 9: ERP Master Data API
    print("[TEST 9] GET /api/erp/data")
    res = client.get("/api/erp/data")
    data = res.get_json()
    print(f"Products: {len(data['products'])}, Customers: {len(data['customers'])}, Quotations: {len(data['quotations'])}")
    assert res.status_code == 200
    assert len(data["products"]) >= 10
    print("Result: [PASS]\n")

    print("======================================================================")
    print("  ALL 9 AUTOMATED TESTS PASSED SUCCESSFULLY! (100% SUCCESS)")
    print("======================================================================")


if __name__ == "__main__":
    run_tests()
