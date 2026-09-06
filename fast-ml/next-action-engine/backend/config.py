"""
DealFlow360 - Next Action Prediction Engine
System Configuration & Smart Trigger Rules
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

class Config:
    BASE_DIR = BASE_DIR
    ROOT_DIR = ROOT_DIR
    PORT = int(os.getenv("PORT", 5001))
    HOST = os.getenv("HOST", "0.0.0.0")
    DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "yes")
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

    # Storage Paths
    DATA_DIR = ROOT_DIR / "backend" / "data"
    MODELS_DIR = ROOT_DIR / "backend" / "models"
    DB_PATH = ROOT_DIR / "backend" / "next_action_erp.db"

    DATASET_CSV = DATA_DIR / "action_sequences.csv"
    MODEL_FILE = MODELS_DIR / "next_action_model.pkl"
    LABEL_ENCODER_FILE = MODELS_DIR / "label_encoder.pkl"
    FEATURE_ENCODER_FILE = MODELS_DIR / "feature_encoder.pkl"
    EVALUATION_JSON = MODELS_DIR / "evaluation_results.json"
    MODEL_METADATA_JSON = MODELS_DIR / "model_metadata.json"

    # ML Sequence Hyperparameters
    LOOKBACK_WINDOW = 3
    PAD_TOKEN = "<START>"

    # Smart Triggering & UX Anti-Irritation Rules
    CONFIDENCE_THRESHOLD = 0.50  # Only recommend if ML probability >= 50%
    COOLDOWN_SECONDS = 20        # Minimum time between successive popups
    MAX_RECOMMENDATIONS_PER_SESSION = 5
    AUTO_DISMISS_SECONDS = 12

    # Action Priority Hierarchy
    ACTION_PRIORITY = {
        "high": [
            "purchase_laptop",
            "purchase_phone",
            "purchase_headphones",
            "purchase_mouse",
            "purchase_monitor",
            "purchase_keyboard",
            "purchase_phone_case",
            "purchase_laptop_bag",
            "purchase_warranty",
            "save_quotation",
            "send_quotation",
            "create_order",
            "generate_invoice",
            "confirm_payment",
            "create_customer"
        ],
        "medium": [
            "create_quotation",
            "add_product",
            "set_discount",
            "update_customer",
            "assign_delivery",
            "view_customer_quotations",
            "view_customer_orders"
        ],
        "low": [
            "login",
            "open_dashboard",
            "open_products",
            "open_purchases",
            "open_quotations",
            "open_customers",
            "open_orders",
            "search_product",
            "view_product",
            "view_customer",
            "view_quotation",
            "view_order"
        ]
    }

    # Helper set of all recommendation-triggering actions
    TRIGGERABLE_ACTIONS = set(ACTION_PRIORITY["high"] + ACTION_PRIORITY["medium"])
