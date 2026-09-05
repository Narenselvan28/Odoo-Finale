"""
DealFlow360 - Next Action Prediction Engine
SQLite Database Layer & ERP Master Data Seeder
"""

import sqlite3
import json
import logging
from datetime import datetime
from config import Config

logger = logging.getLogger(__name__)


def get_db_connection():
    """Establishes SQLite connection with row factory, WAL mode, and busy timeout."""
    conn = sqlite3.connect(str(Config.DB_PATH), timeout=30.0, check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=30000;")
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes tables and seeds initial ERP master data."""
    Config.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Sessions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            start_time TEXT NOT NULL,
            last_active TEXT NOT NULL
        )
    """)

    # 2. Actions Log Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            metadata_json TEXT,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(session_id)
        )
    """)

    # 3. Recommendations Feedback Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            current_action TEXT NOT NULL,
            recommended_action TEXT NOT NULL,
            probability REAL NOT NULL,
            confidence TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'shown', -- shown, clicked, dismissed, ignored
            timestamp TEXT NOT NULL
        )
    """)

    # 4. ERP Master Tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS erp_products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL,
            description TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS erp_customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            company TEXT NOT NULL,
            email TEXT NOT NULL,
            tier TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS erp_quotations (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            product_name TEXT NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS erp_orders (
            id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            items TEXT NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    # 5. Anticipatory Deal Engine Tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS deals (
            deal_id TEXT PRIMARY KEY,
            customer_name TEXT NOT NULL,
            customer_tier TEXT NOT NULL DEFAULT 'GOLD',
            product_name TEXT NOT NULL,
            product_category TEXT NOT NULL DEFAULT 'laptop',
            unit_price REAL NOT NULL DEFAULT 1850.0,
            quantity INTEGER NOT NULL DEFAULT 10,
            discount_percent REAL NOT NULL DEFAULT 0.0,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            warehouse_stocks_json TEXT,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflow_events (
            event_id TEXT PRIMARY KEY,
            deal_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            previous_state TEXT,
            new_state TEXT,
            metadata_json TEXT,
            source TEXT NOT NULL,
            correlation_id TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS next_action_predictions (
            prediction_id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL,
            deal_id TEXT NOT NULL,
            predicted_action TEXT NOT NULL,
            probability REAL NOT NULL,
            confidence REAL NOT NULL,
            urgency TEXT NOT NULL,
            business_impact REAL NOT NULL,
            reasons_json TEXT,
            candidates_json TEXT,
            display_mode TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prepared_actions (
            prepared_id TEXT PRIMARY KEY,
            prediction_id TEXT NOT NULL,
            deal_id TEXT NOT NULL,
            action TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            consequences_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PREPARED', -- PREPARED, EXECUTED, DISMISSED
            created_at TEXT NOT NULL,
            executed_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS action_feedback (
            feedback_id TEXT PRIMARY KEY,
            prepared_id TEXT NOT NULL,
            deal_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            action TEXT NOT NULL,
            user_decision TEXT NOT NULL, -- ACCEPTED, DISMISSED, MODIFIED
            feedback_notes TEXT,
            timestamp TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS anticipation_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_id TEXT NOT NULL,
            deal_id TEXT NOT NULL,
            event_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            predicted_action TEXT NOT NULL,
            probability REAL NOT NULL,
            confidence REAL NOT NULL,
            reasons_json TEXT,
            simulation_result_json TEXT,
            user_decision TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # Seed ERP Master Data if empty
    cursor.execute("SELECT COUNT(*) FROM erp_products")
    if cursor.fetchone()[0] == 0:
        seed_erp_data(cursor)

    # Seed Initial Demo Deals
    cursor.execute("SELECT COUNT(*) FROM deals")
    if cursor.fetchone()[0] == 0:
        seed_initial_deals(cursor)

    conn.commit()
    conn.close()
    logger.info("[Database] SQLite database & Anticipatory tables initialized successfully.")


def seed_erp_data(cursor):
    """Seeds rich sample catalog for ERP demonstration."""
    products = [
        ("LP001", "ThinkPad X1 Carbon Enterprise Laptop", "laptop", 1850.00, 25, "Intel i7, 32GB RAM, 1TB SSD. Flagship enterprise workstation."),
        ("LP002", "Dell Precision 5570 Power Workstation", "laptop", 2200.00, 18, "4K OLED, Nvidia RTX GPU, high-performance compilation machine."),
        ("PH001", "Galaxy S24 Ultra Enterprise Edition", "phone", 1199.00, 40, "Titanium build, 200MP camera, built-in S-Pen productivity."),
        ("PH002", "iPhone 15 Pro Max Enterprise 512GB", "phone", 1399.00, 30, "A17 Pro chip, Action Button, enterprise MDM ready."),
        ("HP001", "Sony WH-1000XM5 Wireless Headphones", "headphones", 349.00, 50, "Industry-leading noise cancellation and crystal-clear mic."),
        ("HP002", "Bose QuietComfort 45 ANC Headphones", "headphones", 299.00, 45, "Balanced sound profile and all-day ergonomic comfort."),
        ("MS001", "Logitech MX Master 3S Wireless Mouse", "mouse", 99.00, 80, "8K DPI optical sensor, quiet clicks, and hyper-fast scroll wheel."),
        ("KB001", "Logitech MX Mechanical Wireless Keyboard", "keyboard", 149.00, 60, "Tactile quiet mechanical switches with smart illumination."),
        ("MN001", "Dell UltraSharp 32-inch 4K USB-C Monitor", "monitor", 780.00, 20, "IPS Black technology with 98% DCI-P3 color reproduction."),
        ("BG001", "SwissGear Executive Laptop Backpack", "laptop_bag", 89.00, 70, "Water-resistant ballistic nylon with padded laptop sleeve."),
        ("CS001", "Spigen Tough Armor Heavy-Duty Phone Case", "phone_case", 29.00, 120, "Air Cushion technology with built-in kickstand."),
        ("WR001", "3-Year ProSupport Extended Warranty", "warranty", 249.00, 200, "Next-business-day on-site repair and 24/7 dedicated engineering hotline.")
    ]
    cursor.executemany("INSERT INTO erp_products VALUES (?, ?, ?, ?, ?, ?)", products)

    customers = [
        ("CUST-001", "Sarah Jenkins", "Global Systems Inc", "s.jenkins@globalsystems.com", "PLATINUM"),
        ("CUST-002", "David Zhang", "Tech Solutions LLC", "david.z@techsolutions.io", "GOLD"),
        ("CUST-003", "Johnathan Miller", "Acme Technologies", "j.miller@acme.com", "PLATINUM"),
        ("CUST-004", "Elena Rostova", "Enterprise Dynamics", "elena@enterprisedynamics.com", "SILVER"),
        ("CUST-005", "Marcus Vance", "BlueWave Retail", "marcus.v@bluewave.net", "STANDARD")
    ]
    cursor.executemany("INSERT INTO erp_customers VALUES (?, ?, ?, ?, ?)", customers)

    quotations = [
        ("QT-1001", "CUST-003", "Acme Technologies", "ThinkPad X1 Carbon Enterprise Laptop (10x)", 18500.00, "Under Negotiation", "2026-09-01 10:30:00"),
        ("QT-1002", "CUST-001", "Global Systems Inc", "Dell UltraSharp 32-inch 4K Monitor (5x)", 3900.00, "Approved", "2026-09-02 14:15:00"),
        ("QT-1003", "CUST-002", "Tech Solutions LLC", "iPhone 15 Pro Max Enterprise (8x)", 11192.00, "Pending Review", "2026-09-03 09:45:00")
    ]
    cursor.executemany("INSERT INTO erp_quotations VALUES (?, ?, ?, ?, ?, ?, ?)", quotations)

    orders = [
        ("ORD-501", "Acme Technologies", "ThinkPad X1 Carbon (10x), Sony WH-1000XM5 (10x)", 21990.00, "Processing", "2026-09-04 11:00:00"),
        ("ORD-502", "Global Systems Inc", "Dell Precision 5570 (2x), MX Master 3S (2x)", 4598.00, "Delivered", "2026-09-03 16:30:00")
    ]
    cursor.executemany("INSERT INTO erp_orders VALUES (?, ?, ?, ?, ?, ?)", orders)


def seed_initial_deals(cursor):
    """Seeds initial active deals for anticipation scenarios."""
    deals = [
        (
            "DEAL-1001",
            "Acme Technologies",
            "PLATINUM",
            "ThinkPad X1 Carbon Enterprise Laptop",
            "laptop",
            1850.00,
            100, # Large enterprise order for multi-warehouse allocation split & shortage
            0.0,
            "DRAFT",
            json.dumps({"WH-A": 40, "WH-B": 50, "WH-C": 10}),
            datetime.utcnow().isoformat() + "Z"
        ),
        (
            "DEAL-1002",
            "Tech Solutions LLC",
            "GOLD",
            "Dell Precision 5570 Power Workstation",
            "laptop",
            2200.00,
            20,
            18.0, # High discount (exceeds Gold tier limit of 15%)
            "DISCOUNT_PENDING",
            json.dumps({"WH-A": 25, "WH-B": 30, "WH-C": 15}),
            datetime.utcnow().isoformat() + "Z"
        ),
        (
            "DEAL-1003",
            "Global Systems Inc",
            "PLATINUM",
            "Dell UltraSharp 32-inch 4K Monitor",
            "monitor",
            780.00,
            50,
            10.0,
            "CONFIRMED",
            json.dumps({"WH-A": 30, "WH-B": 20, "WH-C": 10}),
            datetime.utcnow().isoformat() + "Z"
        ),
        (
            "DEAL-1004",
            "Enterprise Dynamics",
            "SILVER",
            "iPhone 15 Pro Max Enterprise 512GB",
            "phone",
            1399.00,
            15,
            5.0,
            "NEGOTIATION",
            json.dumps({"WH-A": 20, "WH-B": 10, "WH-C": 5}),
            datetime.utcnow().isoformat() + "Z"
        )
    ]
    cursor.executemany("""
        INSERT INTO deals (deal_id, customer_name, customer_tier, product_name, product_category, unit_price, quantity, discount_percent, status, warehouse_stocks_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, deals)


if __name__ == "__main__":
    init_db()
    print("Database initialization complete.")
