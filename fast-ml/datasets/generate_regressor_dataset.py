"""
DealFlow360 - Regressor Dataset Builder
Generates a realistic quotation/deal dataset for discount recommendation regression modeling.
Incorporates:
- Discount: requested discount, historical customer/product discount, tier limit, and recommended discount target
- Delivery date: delivery lead time days, expedited delivery indicator
- Quantity: order volume and order value
- Optional services: add-on services, service count, service fees
- Selected products: product category, product tier, unit price, price band, selected products count
"""

import os
import numpy as np
import pandas as pd
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def generate_regressor_dataset(
    output_path="datasets/dealflow360_regressor_dataset.csv",
    num_samples=100000,
    random_seed=42
):
    np.random.seed(random_seed)
    logger.info(f"Generating {num_samples} records for DealFlow360 Regressor Dataset...")

    categories = [
        "ELECTRONICS", "SOFTWARE", "HARDWARE", "FURNITURE",
        "OFFICE_SUPPLIES", "SERVICES", "INDUSTRIAL"
    ]
    customer_tiers = ["STANDARD", "SILVER", "GOLD", "PLATINUM"]
    market_regions = ["DOMESTIC", "EUROPE", "INTERNATIONAL"]
    opt_services = [
        "NONE", "EXTENDED_WARRANTY", "INSTALLATION",
        "PREMIUM_SLA", "WHITE_GLOVE", "TRAINING_AND_SUPPORT"
    ]
    product_tiers = ["STANDARD", "PREMIUM", "ENTERPRISE", "ECONOMY"]

    cat = np.random.choice(categories, num_samples)
    tier = np.random.choice(customer_tiers, num_samples, p=[0.4, 0.3, 0.2, 0.1])
    region = np.random.choice(market_regions, num_samples, p=[0.6, 0.25, 0.15])
    opt_srv = np.random.choice(opt_services, num_samples, p=[0.38, 0.22, 0.15, 0.10, 0.08, 0.07])
    prod_tier = np.random.choice(product_tiers, num_samples, p=[0.45, 0.25, 0.15, 0.15])

    # Quantity distribution (1 to 1000 units)
    qty = np.random.choice(
        [1, 2, 5, 10, 20, 50, 100, 250, 500, 1000],
        num_samples,
        p=[0.20, 0.15, 0.15, 0.15, 0.12, 0.08, 0.06, 0.04, 0.03, 0.02]
    )
    price = np.round(np.random.uniform(5.0, 500.0, num_samples), 2)
    order_val = np.round(qty * price, 2)

    # Delivery date / Lead time (1 to 30 days)
    lead_time = np.random.randint(1, 31, num_samples)
    is_expedited = (lead_time <= 3).astype(int)

    # Optional services metrics
    opt_counts = {
        "NONE": 0,
        "EXTENDED_WARRANTY": 1,
        "INSTALLATION": 1,
        "PREMIUM_SLA": 2,
        "WHITE_GLOVE": 2,
        "TRAINING_AND_SUPPORT": 1
    }
    opt_count = np.array([opt_counts[s] for s in opt_srv])
    opt_fee = np.round(opt_count * np.random.uniform(50.0, 250.0, num_samples), 2)
    sel_prod_count = np.random.choice([1, 2, 3, 4, 5], num_samples, p=[0.4, 0.3, 0.15, 0.1, 0.05])

    # Customer tier limits and base discounts
    tier_base = {"STANDARD": 5.0, "SILVER": 8.0, "GOLD": 12.0, "PLATINUM": 16.0}
    tier_max = {"STANDARD": 12.0, "SILVER": 18.0, "GOLD": 24.0, "PLATINUM": 30.0}
    base_disc = np.array([tier_base[t] for t in tier])
    max_disc = np.array([tier_max[t] for t in tier])

    req_disc = np.clip(base_disc + np.random.normal(0, 3, num_samples), 0, max_disc).round(2)
    cust_avg_disc = np.clip(base_disc + np.random.normal(0, 2, num_samples), 2, max_disc - 2).round(2)
    prod_avg_disc = np.clip(8.0 + np.random.normal(0, 2, num_samples), 2, 20).round(2)
    prev_tx = np.random.poisson(8, num_samples)

    # Business formula for recommended discount
    # 1. Volume incentive (up to +6%)
    vol_bonus = np.clip(np.log1p(qty) * 0.9, 0, 6.0)

    # 2. Delivery Date adjustment (rush penalty vs flexible bonus)
    delivery_adj = np.where(
        lead_time <= 3, -3.0,
        np.where(lead_time <= 7, -1.0, np.where(lead_time <= 14, 0.5, 1.8))
    )

    # 3. Optional Services headroom bonus (+1.4% per service)
    opt_bonus = opt_count * 1.4

    # 4. Product category margin sensitivity
    cat_margin_map = {
        "SOFTWARE": 2.5,
        "SERVICES": 1.5,
        "OFFICE_SUPPLIES": 0.0,
        "GENERAL": 0.0,
        "FURNITURE": -1.2,
        "HARDWARE": -2.2,
        "ELECTRONICS": -2.5
    }
    cat_margin = pd.Series(cat).map(cat_margin_map).fillna(0).values

    # Price bands
    price_band = pd.cut(
        price,
        bins=[-np.inf, 15, 50, 150, np.inf],
        labels=["LOW", "MEDIUM", "HIGH", "PREMIUM"]
    )

    # Core target calculation
    target_deterministic = (
        0.35 * base_disc +
        0.25 * cust_avg_disc +
        vol_bonus +
        delivery_adj +
        opt_bonus +
        cat_margin
    )

    # Calibrated noise for target R2 score between 70% and 79% (std = 2.1)
    noise = np.random.normal(0, 2.1, num_samples)
    recommended_discount = np.clip(target_deterministic + noise, 1.0, max_disc).round(2)

    df = pd.DataFrame({
        "category": cat,
        "product_tier": prod_tier,
        "price_band": price_band.astype(str),
        "customer_tier": tier,
        "market_region": region,
        "optional_services": opt_srv,
        "quantity": qty,
        "price": price,
        "order_value": order_val,
        "selected_products_count": sel_prod_count,
        "delivery_lead_time_days": lead_time,
        "is_expedited_delivery": is_expedited,
        "optional_services_count": opt_count,
        "optional_services_fee": opt_fee,
        "requested_discount_percent": req_disc,
        "customer_avg_previous_discount": cust_avg_disc,
        "product_avg_previous_discount": prod_avg_disc,
        "customer_previous_transactions": prev_tx,
        "tier_discount": base_disc,
        "tier_max_discount": max_disc,
        "recommended_discount_percent": recommended_discount
    })

    # Output directory relative to fast-ml
    script_dir = os.path.dirname(os.path.abspath(__file__))
    fast_ml_dir = os.path.dirname(script_dir)
    full_output_path = os.path.join(fast_ml_dir, output_path)
    os.makedirs(os.path.dirname(full_output_path), exist_ok=True)

    df.to_csv(full_output_path, index=False)
    logger.info(f"Saved dataset to {full_output_path} ({len(df):,} rows, {len(df.columns)} columns)")

    # Also sync to 'classifier dataset/' if directory exists
    workspace_dir = os.path.dirname(fast_ml_dir)
    alt_output = os.path.join(workspace_dir, "classifier dataset", "dealflow360_regressor_dataset.csv")
    if os.path.exists(os.path.dirname(alt_output)):
        df.to_csv(alt_output, index=False)
        logger.info(f"Synced dataset to {alt_output}")

    return full_output_path


if __name__ == "__main__":
    generate_regressor_dataset()
