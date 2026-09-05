"""
DealFlow360 - Next Action Prediction Engine
Explanation Service
Converts raw action strings and contextual metadata into friendly business copy and UI actions.
"""

EXPLANATION_TEMPLATES = {
    "purchase_headphones": {
        "title": "✦ Next Step",
        "description": "Customers who bought this laptop often add wireless headphones to their order.",
        "button_text": "Add Headphones",
        "action_type": "quick_purchase",
        "target_product_id": "HP001",
        "target_product_name": "Sony WH-1000XM5 Wireless Headphones"
    },
    "purchase_mouse": {
        "title": "✦ Recommended Accessory",
        "description": "Many customers pair their laptop with an ergonomic wireless mouse.",
        "button_text": "Add Wireless Mouse",
        "action_type": "quick_purchase",
        "target_product_id": "MS001",
        "target_product_name": "Logitech MX Master 3S Wireless Mouse"
    },
    "purchase_laptop_bag": {
        "title": "✦ Protection & Travel",
        "description": "Keep your new laptop safe on the go with an executive travel backpack.",
        "button_text": "Add Laptop Bag",
        "action_type": "quick_purchase",
        "target_product_id": "BG001",
        "target_product_name": "SwissGear Executive Laptop Backpack"
    },
    "purchase_warranty": {
        "title": "✦ Warranty Coverage",
        "description": "Protect your investment with 3-year on-site next-business-day hardware support.",
        "button_text": "Add 3-Year Warranty",
        "action_type": "quick_purchase",
        "target_product_id": "WR001",
        "target_product_name": "3-Year ProSupport Extended Warranty"
    },
    "purchase_phone_case": {
        "title": "✦ Device Protection",
        "description": "Protect your new enterprise phone with a heavy-duty armor case.",
        "button_text": "Add Phone Case",
        "action_type": "quick_purchase",
        "target_product_id": "CS001",
        "target_product_name": "Spigen Tough Armor Phone Case"
    },
    "purchase_keyboard": {
        "title": "✦ Desk Setup",
        "description": "Enhance your workstation with a wireless mechanical keyboard.",
        "button_text": "Add Wireless Keyboard",
        "action_type": "quick_purchase",
        "target_product_id": "KB001",
        "target_product_name": "Logitech MX Mechanical Keyboard"
    },
    "send_quotation": {
        "title": "✦ Next Step",
        "description": "This quotation is saved and ready to be dispatched to the customer.",
        "button_text": "Send Quotation",
        "action_type": "navigate_quotations",
        "target_url": "quotations.html"
    },
    "create_order": {
        "title": "✦ Order Conversion",
        "description": "Quotation approved. Convert this deal into a confirmed sales order?",
        "button_text": "Create Sales Order",
        "action_type": "navigate_orders",
        "target_url": "orders.html"
    },
    "generate_invoice": {
        "title": "✦ Billing Next Step",
        "description": "Sales order is active. Generate the commercial invoice now?",
        "button_text": "Generate Invoice",
        "action_type": "generate_invoice",
        "target_url": "orders.html"
    },
    "confirm_payment": {
        "title": "✦ Payment Settlement",
        "description": "Invoice generated. Record customer payment transaction.",
        "button_text": "Confirm Payment",
        "action_type": "confirm_payment",
        "target_url": "orders.html"
    },
    "view_customer_quotations": {
        "title": "✦ Account Insight",
        "description": "Review open quotations and previous discount negotiations for this customer.",
        "button_text": "View Quotations",
        "action_type": "navigate_quotations",
        "target_url": "quotations.html"
    },
    "create_quotation": {
        "title": "✦ New Deal",
        "description": "Customer record verified. Create a new quotation proposal?",
        "button_text": "Create Quotation",
        "action_type": "navigate_quotations",
        "target_url": "quotations.html"
    },
    "open_purchases": {
        "title": "✦ Cart Review",
        "description": "View your active purchases and finalize order checkout.",
        "button_text": "Review Purchases",
        "action_type": "navigate_purchases",
        "target_url": "purchases.html"
    }
}


def get_explanation_for_action(action_name, current_action=None, metadata=None):
    """
    Returns user-friendly title, message, and button text for an action.
    """
    if action_name in EXPLANATION_TEMPLATES:
        template = dict(EXPLANATION_TEMPLATES[action_name])
        return template

    # Fallback clean formatting
    human_action = action_name.replace("_", " ").title()
    return {
        "title": "✦ Recommended Next Step",
        "description": f"Based on your recent workflow, you may want to {human_action.lower()}.",
        "button_text": human_action,
        "action_type": "generic",
        "target_url": None
    }
