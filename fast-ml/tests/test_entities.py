"""
Tests for Hybrid Entity and Slot Extraction Engine
Verifies deterministic extraction of percentage, quantity, money, date, product, reason, and confirmation.
"""

from chatbot.entity_extractor import entity_extractor


def test_discount_percent_extraction():
    res = entity_extractor.extract_all("Can I get 18% discount?")
    assert "discount_percent" in res
    assert res["discount_percent"].value == 18.0
    assert res["discount_percent"].confidence >= 0.95


def test_quantity_extraction():
    res = entity_extractor.extract_all("Can you give me 20 laptops?")
    assert "quantity" in res
    assert res["quantity"].value == 20
    assert res["product_name"].value == "ThinkPad T14 Laptop"


def test_money_and_currency_extraction():
    res = entity_extractor.extract_all("Can you reduce it by $500?")
    assert "money_amount" in res
    assert res["money_amount"].value == 500.0
    assert res["currency"].value == "USD"


def test_delivery_date_relative_extraction():
    res = entity_extractor.extract_all("I need it by Friday.")
    assert "delivery_date" in res
    assert res["delivery_date"].value is not None


def test_product_fuzzy_matching():
    res = entity_extractor.extract_all("Remove the warranty please.")
    assert "product_name" in res
    assert "Warranty" in res["product_name"].value
    assert res["change_type"].value == "REMOVE_PRODUCT"


def test_negotiation_reason_extraction():
    res = entity_extractor.extract_all("I need 15% because another supplier offered me a lower price.")
    assert res["discount_percent"].value == 15.0
    assert res["customer_reason"].value == "COMPETITOR_PRICING"


def test_confirmation_and_option_reference():
    res = entity_extractor.extract_all("Yes, submit option 2.")
    assert res["confirmation"].value is True
    assert res["option_reference"].value == "2"


def test_negation_extraction():
    res = entity_extractor.extract_all("No, cancel and keep current quote.")
    assert res["negation"].value is True
