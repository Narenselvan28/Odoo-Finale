"""
DealFlow360 - Next Action Prediction Engine
Synthetic Realistic ERP Action Sequence Generator
Generates realistic multi-domain user journeys with varied sequence start points.
"""

import csv
import random
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))
from config import Config

random.seed(42)

def generate_laptop_journey(session_id, user_id):
    """Simulates realistic purchase journey starting with Laptop."""
    # Varied start points (sometimes logged in, sometimes direct product page)
    if random.random() < 0.5:
        seq = ["open_products", "search_laptop", "view_laptop", "purchase_laptop"]
    elif random.random() < 0.8:
        seq = ["view_laptop", "purchase_laptop"]
    else:
        seq = ["login", "open_products", "search_laptop", "view_laptop", "purchase_laptop"]

    # Branching probability for next action after purchase_laptop
    r = random.random()
    if r < 0.64:
        seq.append("purchase_headphones")
    elif r < 0.84:
        seq.append("purchase_mouse")
    elif r < 0.95:
        seq.append("purchase_laptop_bag")
    else:
        seq.append("purchase_warranty")

    if random.random() < 0.7:
        seq.append("open_purchases")
    return seq


def generate_phone_journey(session_id, user_id):
    """Simulates realistic purchase journey starting with Phone."""
    if random.random() < 0.5:
        seq = ["open_products", "search_phone", "view_phone", "purchase_phone"]
    elif random.random() < 0.8:
        seq = ["view_phone", "purchase_phone"]
    else:
        seq = ["login", "open_products", "search_phone", "view_phone", "purchase_phone"]

    r = random.random()
    if r < 0.68:
        seq.append("purchase_phone_case")
    elif r < 0.88:
        seq.append("purchase_headphones")
    else:
        seq.append("purchase_warranty")

    if random.random() < 0.7:
        seq.append("open_purchases")
    return seq


def generate_monitor_journey(session_id, user_id):
    """Simulates purchase journey for Monitor workstation."""
    if random.random() < 0.5:
        seq = ["open_products", "search_monitor", "view_monitor", "purchase_monitor"]
    else:
        seq = ["view_monitor", "purchase_monitor"]

    r = random.random()
    if r < 0.62:
        seq.append("purchase_keyboard")
    elif r < 0.86:
        seq.append("purchase_mouse")
    else:
        seq.append("purchase_headphones")

    return seq


def generate_quotation_journey(session_id, user_id):
    """Simulates Quotation workflow."""
    if random.random() < 0.5:
        seq = ["open_quotations", "create_quotation", "add_product"]
    else:
        seq = ["create_quotation", "add_product"]

    if random.random() < 0.70:
        seq.append("set_discount")

    seq.append("save_quotation")

    r = random.random()
    if r < 0.80:
        seq.append("send_quotation")
        if random.random() < 0.70:
            seq.append("create_order")
    else:
        seq.append("open_quotations")

    return seq


def generate_customer_journey(session_id, user_id):
    """Simulates Customer relationship workflow."""
    if random.random() < 0.5:
        seq = ["open_customers", "view_customer"]
    else:
        seq = ["view_customer"]

    r = random.random()
    if r < 0.70:
        seq.append("view_customer_quotations")
        if random.random() < 0.65:
            seq.append("create_quotation")
    elif r < 0.90:
        seq.append("view_customer_orders")
    else:
        seq.append("update_customer")

    return seq


def generate_order_journey(session_id, user_id):
    """Simulates Order fulfillment workflow."""
    if random.random() < 0.5:
        seq = ["open_orders", "create_order"]
    else:
        seq = ["create_order"]

    r = random.random()
    if r < 0.78:
        seq.append("generate_invoice")
        if random.random() < 0.80:
            seq.append("confirm_payment")
    else:
        seq.append("assign_delivery")

    return seq


def generate_all_sessions(num_sessions=4000):
    journeys = [
        (generate_laptop_journey, 0.28),
        (generate_phone_journey, 0.22),
        (generate_monitor_journey, 0.12),
        (generate_quotation_journey, 0.20),
        (generate_customer_journey, 0.10),
        (generate_order_journey, 0.08)
    ]

    all_rows = []
    total_transitions = 0
    Config.DATA_DIR.mkdir(parents=True, exist_ok=True)

    for i in range(1, num_sessions + 1):
        session_id = f"sess_{i:05d}"
        user_id = f"user_{(i % 150) + 1:03d}"

        r = random.random()
        cumulative = 0.0
        chosen_gen = journeys[0][0]
        for gen_fn, weight in journeys:
            cumulative += weight
            if r <= cumulative:
                chosen_gen = gen_fn
                break

        actions = chosen_gen(session_id, user_id)
        for step_idx, action in enumerate(actions):
            all_rows.append({
                "session_id": session_id,
                "user_id": user_id,
                "step_index": step_idx,
                "action": action
            })
            total_transitions += 1

    csv_file = Config.DATASET_CSV
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["session_id", "user_id", "step_index", "action"])
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"Generated synthetic action dataset successfully!")
    print(f"File: {csv_file}")
    print(f"Total Sessions: {num_sessions}")
    print(f"Total Action Steps/Transitions: {total_transitions}")


if __name__ == "__main__":
    generate_all_sessions(4000)
