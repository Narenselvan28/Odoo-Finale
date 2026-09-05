"""
DealFlow360 - Comprehensive Chatbot Test Suite Runner
Runs all unit and integration tests across intents, entities, conversation states,
multi-intent planning, security, actions, and fallbacks.
"""

import sys
import traceback
from app import create_app
from chatbot.intent_detector import intent_detector
from chatbot.entity_extractor import EntityExtractor
from chatbot.action_planner import ActionPlanner
from chatbot.conversation_manager import conversation_manager
from chatbot.schemas import ConversationState

passed_count = 0
failed_count = 0


def run_test(name, fn):
    global passed_count, failed_count
    try:
        fn()
        print(f"  [PASS] {name}")
        passed_count += 1
    except Exception as e:
        print(f"  [FAIL] {name}: {str(e)}")
        traceback.print_exc()
        failed_count += 1


def main():
    global passed_count, failed_count
    print("=" * 65)
    print("RUNNING DEALFLOW360 CUSTOMER CHATBOT TEST SUITE")
    print("=" * 65)

    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    # 1. INTENT TESTS
    print("\n1. Testing Intent Classification...")

    def test_discount_intents():
        for q in ["Can I get 15% off?", "Can you lower the price?", "Is there any discount available?"]:
            intents, primary = intent_detector.detect_intents(q)
            assert primary in ("DISCOUNT_REQUEST", "DISCOUNT_IMPACT", "BETTER_DEAL"), f"Failed for {q} -> got {primary}"

    def test_delivery_intents():
        for q in ["Can you deliver this by Friday?", "I need this next week."]:
            intents, primary = intent_detector.detect_intents(q)
            assert primary in ("DELIVERY_REQUEST", "DELIVERY_STATUS"), f"Failed for {q} -> got {primary}"

    def test_what_if_intents():
        intents, primary = intent_detector.detect_intents("What if I buy 20 units?")
        assert primary in ("WHAT_IF_SCENARIO", "DISCOUNT_IMPACT")

    def test_confirm_intents():
        intents, primary = intent_detector.detect_intents("Yes, submit it.")
        assert primary == "CONFIRM_QUOTATION"

    run_test("Discount Intents", test_discount_intents)
    run_test("Delivery Intents", test_delivery_intents)
    run_test("What-If Simulation Intents", test_what_if_intents)
    run_test("Confirmation Intents", test_confirm_intents)

    # 2. ENTITY TESTS
    print("\n2. Testing Entity Extraction...")

    def test_discount_extraction():
        res = EntityExtractor.extract_all("Can I get 18% off?")
        assert "discount_percent" in res and res["discount_percent"].value == 18.0

    def test_quantity_extraction():
        res = EntityExtractor.extract_all("I need 50 laptops.")
        assert "quantity" in res and res["quantity"].value == 50

    def test_money_extraction():
        res = EntityExtractor.extract_all("Can you reduce the quote by $500?")
        assert "money_amount" in res and res["money_amount"].value == 500.0
        assert "currency" in res and res["currency"].value == "USD"

    def test_delivery_date_extraction():
        res = EntityExtractor.extract_all("Deliver it by Friday please.")
        assert "delivery_date" in res

    def test_fuzzy_product_extraction():
        res = EntityExtractor.extract_all("Tell me about the ThinkPad laptop.")
        assert "product_name" in res and "ThinkPad" in res["product_name"].value

    def test_confirmation_extraction():
        res = EntityExtractor.extract_all("Yes, go ahead and submit.")
        assert "confirmation" in res and res["confirmation"].value is True

    run_test("Discount % Extraction", test_discount_extraction)
    run_test("Quantity Extraction", test_quantity_extraction)
    run_test("Money & Currency Extraction", test_money_extraction)
    run_test("Delivery Date Extraction", test_delivery_date_extraction)
    run_test("Fuzzy Product Extraction", test_fuzzy_product_extraction)
    run_test("Confirmation Extraction", test_confirmation_extraction)

    # 3. CONVERSATION STATE MACHINE TESTS
    print("\n3. Testing Conversation State Machine...")

    def test_state_lifecycle():
        conversation_manager.clear_all()
        session = conversation_manager.get_or_create_session("conv_run_1", "DEAL-1001")
        assert session.state == ConversationState.IDLE
        session.transition_to(ConversationState.UNDERSTANDING)
        assert session.state == ConversationState.UNDERSTANDING
        session.set_pending_proposal({"id": "p1", "title": "15% off", "discount_percent": 15.0})
        assert session.state == ConversationState.WAITING_FOR_CONFIRMATION
        session.clear_pending_proposal()
        assert session.state == ConversationState.IDLE

    run_test("Session Lifecycle & Transitions", test_state_lifecycle)

    # 4. MULTI-INTENT PLANNING TESTS
    print("\n4. Testing Multi-Intent Planning...")

    def test_multi_intent_discount_delivery():
        msg = "Can I get 18% discount and still get it by Friday?"
        intents, primary = intent_detector.detect_intents(msg)
        entities = EntityExtractor.extract_all(msg)
        plan = ActionPlanner.plan(intents, entities)
        assert plan.primary_intent == "BETTER_DEAL"
        assert "simulate_discount_scenarios" in plan.steps
        assert "evaluate_delivery_feasibility" in plan.steps

    run_test("Discount + Delivery Compound Request Plan", test_multi_intent_discount_delivery)

    # 5. REST API & SECURITY TESTS
    print("\n5. Testing REST API & Security Boundary...")

    def test_chat_endpoint_summary():
        res = client.post("/api/v1/intelligence/customer-chat", json={
            "conversation_id": "test_conv_summary",
            "deal_id": "DEAL-1001",
            "message": "Summarize my quote."
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data["primary_intent"] == "QUOTE_SUMMARY"
        assert data["response"]["type"] == "SUMMARY_CARD"

    def test_chat_endpoint_discount_proposal():
        res = client.post("/api/v1/intelligence/customer-chat", json={
            "conversation_id": "test_conv_disc",
            "deal_id": "DEAL-1001",
            "message": "Can I get 15% discount?"
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data["pending_proposal"] is not None
        assert data["pending_proposal"]["discount_percent"] == 15.0

    def test_confirm_endpoint():
        res = client.post("/api/v1/intelligence/customer-chat/confirm", json={
            "conversation_id": "test_conv_disc"
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data["success"] is True
        assert data["status"] == "MUTATION_DISPATCHED"

    def test_better_deal_feature():
        res = client.post("/api/v1/intelligence/customer-chat", json={
            "conversation_id": "test_conv_better",
            "deal_id": "DEAL-1001",
            "message": "This is expensive. Can you make it cheaper, but I still need it by Friday?"
        })
        assert res.status_code == 200
        data = res.get_json()
        assert data["primary_intent"] in ("BETTER_DEAL", "DISCOUNT_REQUEST", "DELIVERY_REQUEST")
        assert data["response"]["type"] == "COMPARISON"
        assert len(data["response"]["scenarios"]) >= 3

    def test_health_endpoint():
        res = client.get("/api/v1/intelligence/customer-chat/health")
        assert res.status_code == 200
        data = res.get_json()
        assert data["status"] == "HEALTHY"
        assert data["classes_count"] == 16

    run_test("API /customer-chat (Quote Summary)", test_chat_endpoint_summary)
    run_test("API /customer-chat (Discount Staging)", test_chat_endpoint_discount_proposal)
    run_test("API /customer-chat/confirm (Mutation Dispatch)", test_confirm_endpoint)
    run_test("API /customer-chat (Find a Better Deal Multi-Scenario)", test_better_deal_feature)
    run_test("API /customer-chat/health", test_health_endpoint)

    print("\n" + "=" * 65)
    print(f"TEST RESULTS: {passed_count} PASSED, {failed_count} FAILED")
    print("=" * 65)

    if failed_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
