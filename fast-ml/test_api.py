"""
DealFlow360 - Comprehensive ML API Test Suite
Tests all endpoints: Health, Models, Classifier (Normal & High), Regressor, and Error Handling.
"""

import json
import requests
import sys
from app import create_app

def run_tests_with_client():
    """Run tests directly using Flask test_client."""
    print("=" * 70)
    print("DEALFLOW360 ML API TEST SUITE (Flask Test Client)")
    print("=" * 70)

    app = create_app()
    client = app.test_client()

    # Load sample payloads from metadata
    with open("models/classifier_features.json", "r", encoding="utf-8") as f:
        clf_meta = json.load(f)
    with open("models/regressor_features.json", "r", encoding="utf-8") as f:
        reg_meta = json.load(f)

    # 1. Health Endpoint
    print("\n[TEST 1] GET /health")
    res = client.get("/health")
    print(f"Status: {res.status_code}")
    print(f"Response:\n{json.dumps(res.get_json(), indent=2)}")
    assert res.status_code == 200
    assert res.get_json()["classifier_loaded"] is True
    assert res.get_json()["regressor_loaded"] is True

    # 2. Models Endpoint
    print("\n[TEST 2] GET /api/v1/ml/models")
    res = client.get("/api/v1/ml/models")
    print(f"Status: {res.status_code}")
    print(f"Response:\n{json.dumps(res.get_json(), indent=2)}")
    assert res.status_code == 200

    # 3. Classifier Endpoint - Normal Risk
    print("\n[TEST 3] POST /api/v1/ml/discount-risk (Normal Risk)")
    normal_payload = clf_meta["sample_input"].copy()
    # Ensure normal features (low discount, low margin pressure)
    normal_payload["discount_percent"] = 5.0
    normal_payload["discount_amount"] = 2.5
    normal_payload["margin_percent"] = 25.0
    normal_payload["delivery_delay_days"] = -5.0
    res = client.post("/api/v1/ml/discount-risk", json=normal_payload)
    print(f"Status: {res.status_code}")
    print(f"Response:\n{json.dumps(res.get_json(), indent=2)}")
    assert res.status_code == 200
    assert "prediction" in res.get_json()
    assert "risk_percentage" in res.get_json()["prediction"]

    # 4. Classifier Endpoint - High Risk
    print("\n[TEST 4] POST /api/v1/ml/discount-risk (High Risk)")
    high_payload = clf_meta["sample_input"].copy()
    # High risk signals (huge discount, huge negative margin, large delivery delay)
    high_payload["discount_percent"] = 65.0
    high_payload["discount_amount"] = 80.0
    high_payload["margin_after_discount"] = -120.0
    high_payload["margin_percent"] = -85.0
    high_payload["discount_gap_percent"] = 45.0
    high_payload["delivery_delay_days"] = 15.0
    high_payload["stock_pressure"] = 0.95
    res = client.post("/api/v1/ml/discount-risk", json=high_payload)
    print(f"Status: {res.status_code}")
    print(f"Response:\n{json.dumps(res.get_json(), indent=2)}")
    assert res.status_code == 200
    assert "prediction" in res.get_json()
    assert res.get_json()["prediction"]["risk_category"] == "HIGH"

    # 5. Regressor Endpoint - Recommended Discount
    print("\n[TEST 5] POST /api/v1/ml/recommended-discount")
    reg_payload = reg_meta["sample_input"].copy()
    res = client.post("/api/v1/ml/recommended-discount", json=reg_payload)
    print(f"Status: {res.status_code}")
    print(f"Response:\n{json.dumps(res.get_json(), indent=2)}")
    assert res.status_code == 200
    assert "recommended_discount_percent" in res.get_json()["prediction"]
    assert isinstance(res.get_json()["prediction"]["recommended_discount_percent"], float)

    # 6. Error Test - Missing Feature (400)
    print("\n[TEST 6] POST /api/v1/ml/discount-risk (Missing Feature - Expected 400)")
    bad_payload = clf_meta["sample_input"].copy()
    del bad_payload["customer_tier"]
    res = client.post("/api/v1/ml/discount-risk", json=bad_payload)
    print(f"Status: {res.status_code}")
    print(f"Response:\n{json.dumps(res.get_json(), indent=2)}")
    assert res.status_code == 400
    assert res.get_json()["error"]["code"] == "MISSING_FEATURE"

    # 7. Error Test - Invalid Feature Value / Type (422)
    print("\n[TEST 7] POST /api/v1/ml/recommended-discount (Invalid Type - Expected 422)")
    bad_type_payload = reg_meta["sample_input"].copy()
    bad_type_payload["price"] = "NOT_A_VALID_NUMBER"
    res = client.post("/api/v1/ml/recommended-discount", json=bad_type_payload)
    print(f"Status: {res.status_code}")
    print(f"Response:\n{json.dumps(res.get_json(), indent=2)}")
    assert res.status_code == 422
    assert res.get_json()["error"]["code"] == "INVALID_FEATURE_VALUE"

    print("\n" + "=" * 70)
    print("ALL 7 TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


def run_tests_with_requests(base_url="http://localhost:5000"):
    """Run tests against a live server using requests library."""
    print(f"Running live tests against {base_url}...")
    try:
        res = requests.get(f"{base_url}/health", timeout=5)
        print("Health Check Response:", res.json())
    except Exception as e:
        print(f"Could not connect to live server at {base_url}: {e}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--live":
        url = sys.argv[2] if len(sys.argv) > 2 else "http://localhost:5000"
        run_tests_with_requests(url)
    else:
        run_tests_with_client()
