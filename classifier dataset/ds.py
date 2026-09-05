import os
import pandas as pd
import numpy as np


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = r"D:\Odoo finale\classifier dataset"

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "dealflow360_classifier_dataset.csv"
)

RANDOM_SEED = 42

np.random.seed(RANDOM_SEED)


# ============================================================
# HELPER FUNCTION
# ============================================================

def load_csv(filename):

    path = os.path.join(
        BASE_DIR,
        filename
    )

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"\nFile not found:\n{path}"
        )

    print(f"Loading: {filename}")

    return pd.read_csv(path)


# ============================================================
# LOAD ALL 9 DATASETS
# ============================================================

print("\n")
print("=" * 70)
print("LOADING OLIST DATASETS")
print("=" * 70)

customers = load_csv(
    "olist_customers_dataset.csv"
)

geolocation = load_csv(
    "olist_geolocation_dataset.csv"
)

order_items = load_csv(
    "olist_order_items_dataset.csv"
)

payments = load_csv(
    "olist_order_payments_dataset.csv"
)

reviews = load_csv(
    "olist_order_reviews_dataset.csv"
)

orders = load_csv(
    "olist_orders_dataset.csv"
)

products = load_csv(
    "olist_products_dataset.csv"
)

sellers = load_csv(
    "olist_sellers_dataset.csv"
)

categories = load_csv(
    "product_category_name_translation.csv"
)


print("\nAll datasets loaded successfully.")


# ============================================================
# SHOW ORIGINAL DATASET SIZES
# ============================================================

print("\n")
print("=" * 70)
print("ORIGINAL DATASET SIZES")
print("=" * 70)

datasets = {
    "customers": customers,
    "geolocation": geolocation,
    "order_items": order_items,
    "payments": payments,
    "reviews": reviews,
    "orders": orders,
    "products": products,
    "sellers": sellers,
    "categories": categories
}

for name, data in datasets.items():

    print(
        f"{name:<15} : "
        f"{data.shape[0]:>10,} rows | "
        f"{data.shape[1]:>3} columns"
    )


# ============================================================
# PRODUCT + CATEGORY
# ============================================================

print("\n")
print("=" * 70)
print("PROCESSING PRODUCTS")
print("=" * 70)


products = products.merge(
    categories,
    on="product_category_name",
    how="left"
)


products["category"] = (
    products[
        "product_category_name_english"
    ]
    .fillna(
        products["product_category_name"]
    )
    .fillna("unknown")
)


product_columns = [
    "product_id",
    "category",
    "product_weight_g",
    "product_length_cm",
    "product_height_cm",
    "product_width_cm"
]


products = products[
    [
        column
        for column in product_columns
        if column in products.columns
    ]
]


print(
    "Product table:",
    products.shape
)


# ============================================================
# PAYMENT AGGREGATION
# ============================================================

print("\n")
print("=" * 70)
print("PROCESSING PAYMENTS")
print("=" * 70)


payment_summary = (
    payments
    .groupby("order_id")
    .agg(
        payment_value=(
            "payment_value",
            "sum"
        ),

        payment_installments=(
            "payment_installments",
            "max"
        ),

        payment_type=(
            "payment_type",
            "first"
        )
    )
    .reset_index()
)


print(
    "Payment summary:",
    payment_summary.shape
)


# ============================================================
# REVIEW AGGREGATION
# ============================================================

print("\n")
print("=" * 70)
print("PROCESSING REVIEWS")
print("=" * 70)


review_summary = (
    reviews
    .groupby("order_id")
    .agg(
        review_score=(
            "review_score",
            "mean"
        )
    )
    .reset_index()
)


print(
    "Review summary:",
    review_summary.shape
)


# ============================================================
# GEOLOCATION AGGREGATION
# ============================================================

print("\n")
print("=" * 70)
print("PROCESSING GEOLOCATION")
print("=" * 70)


geo = (
    geolocation
    .groupby(
        "geolocation_zip_code_prefix"
    )
    .agg(
        latitude=(
            "geolocation_lat",
            "mean"
        ),

        longitude=(
            "geolocation_lng",
            "mean"
        )
    )
    .reset_index()
)


geo = geo.rename(
    columns={
        "geolocation_zip_code_prefix":
            "zip_code_prefix"
    }
)


print(
    "Aggregated geolocation:",
    geo.shape
)


# ============================================================
# START WITH ORDER ITEMS
#
# 1 ROW = 1 PRODUCT IN 1 ORDER
# ============================================================

print("\n")
print("=" * 70)
print("BUILDING MAIN TRANSACTION TABLE")
print("=" * 70)


df = order_items.copy()


print(
    "Initial order-item rows:",
    len(df)
)


# ============================================================
# MERGE ORDERS
# ============================================================

df = df.merge(
    orders,
    on="order_id",
    how="left"
)


print(
    "After orders:",
    df.shape
)


# ============================================================
# MERGE CUSTOMERS
# ============================================================

df = df.merge(
    customers,
    on="customer_id",
    how="left"
)


print(
    "After customers:",
    df.shape
)


# ============================================================
# MERGE PRODUCTS
# ============================================================

df = df.merge(
    products,
    on="product_id",
    how="left"
)


print(
    "After products:",
    df.shape
)


# ============================================================
# MERGE SELLERS
# ============================================================

df = df.merge(
    sellers,
    on="seller_id",
    how="left"
)


print(
    "After sellers:",
    df.shape
)


# ============================================================
# MERGE PAYMENTS
# ============================================================

df = df.merge(
    payment_summary,
    on="order_id",
    how="left"
)


print(
    "After payments:",
    df.shape
)


# ============================================================
# MERGE REVIEWS
# ============================================================

df = df.merge(
    review_summary,
    on="order_id",
    how="left"
)


print(
    "After reviews:",
    df.shape
)


# ============================================================
# CUSTOMER GEOLOCATION
# ============================================================

customer_geo = geo.rename(
    columns={
        "zip_code_prefix":
            "customer_zip_code_prefix",

        "latitude":
            "customer_latitude",

        "longitude":
            "customer_longitude"
    }
)


df = df.merge(
    customer_geo,
    on="customer_zip_code_prefix",
    how="left"
)


print(
    "After customer geolocation:",
    df.shape
)


# ============================================================
# SELLER GEOLOCATION
# ============================================================

seller_geo = geo.rename(
    columns={
        "zip_code_prefix":
            "seller_zip_code_prefix",

        "latitude":
            "seller_latitude",

        "longitude":
            "seller_longitude"
    }
)


df = df.merge(
    seller_geo,
    on="seller_zip_code_prefix",
    how="left"
)


print(
    "After seller geolocation:",
    df.shape
)


# ============================================================
# HAVERSINE DISTANCE
# ============================================================

print("\n")
print("=" * 70)
print("CALCULATING TRANSPORT DISTANCE")
print("=" * 70)


def haversine(
    lat1,
    lon1,
    lat2,
    lon2
):

    earth_radius = 6371.0

    lat1 = np.radians(lat1)
    lon1 = np.radians(lon1)

    lat2 = np.radians(lat2)
    lon2 = np.radians(lon2)

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    a = (
        np.sin(delta_lat / 2) ** 2
        +
        np.cos(lat1)
        *
        np.cos(lat2)
        *
        np.sin(delta_lon / 2) ** 2
    )

    c = (
        2
        *
        np.arctan2(
            np.sqrt(a),
            np.sqrt(1 - a)
        )
    )

    return earth_radius * c


df["transport_distance_km"] = haversine(
    df["customer_latitude"],
    df["customer_longitude"],
    df["seller_latitude"],
    df["seller_longitude"]
)


df["transport_distance_km"] = (
    df["transport_distance_km"]
    .replace(
        [np.inf, -np.inf],
        np.nan
    )
    .fillna(0)
    .round(2)
)


# ============================================================
# BASIC TRANSACTION FEATURES
# ============================================================

print("\n")
print("=" * 70)
print("CREATING TRANSACTION FEATURES")
print("=" * 70)


# Each row represents one order item
df["quantity"] = 1


df["order_value"] = (
    df["price"]
    *
    df["quantity"]
)


df["freight_value"] = (
    df["freight_value"]
    .fillna(0)
)


df["gross_order_value"] = (
    df["order_value"]
    +
    df["freight_value"]
)


# ============================================================
# DATE PROCESSING
# ============================================================

date_columns = [

    "shipping_limit_date",

    "order_purchase_timestamp",

    "order_approved_at",

    "order_delivered_carrier_date",

    "order_delivered_customer_date",

    "order_estimated_delivery_date"

]


for column in date_columns:

    if column in df.columns:

        df[column] = pd.to_datetime(
            df[column],
            errors="coerce"
        )


# ============================================================
# DELIVERY FEATURES
# ============================================================

if (
    "order_purchase_timestamp" in df.columns
    and
    "order_delivered_customer_date" in df.columns
):

    df["actual_delivery_days"] = (

        (
            df["order_delivered_customer_date"]
            -
            df["order_purchase_timestamp"]
        )
        .dt.total_seconds()
        / 86400

    )

else:

    df["actual_delivery_days"] = 0


if (
    "order_purchase_timestamp" in df.columns
    and
    "order_estimated_delivery_date" in df.columns
):

    df["estimated_delivery_days"] = (

        (
            df["order_estimated_delivery_date"]
            -
            df["order_purchase_timestamp"]
        )
        .dt.total_seconds()
        / 86400

    )

else:

    df["estimated_delivery_days"] = 0


if (
    "order_delivered_customer_date" in df.columns
    and
    "order_estimated_delivery_date" in df.columns
):

    df["delivery_delay_days"] = (

        (
            df["order_delivered_customer_date"]
            -
            df["order_estimated_delivery_date"]
        )
        .dt.total_seconds()
        / 86400

    )

else:

    df["delivery_delay_days"] = 0


# ============================================================
# GENERATE PRODUCT COST
#
# OLIST DOES NOT CONTAIN PRODUCT COST.
#
# This is synthetic ERP enrichment.
# ============================================================

print("\n")
print("=" * 70)
print("GENERATING PRODUCT COST")
print("=" * 70)


cost_ratio = np.random.uniform(
    0.55,
    0.80,
    len(df)
)


df["product_cost"] = (
    df["price"]
    *
    cost_ratio
).round(2)


# ============================================================
# GENERATE CUSTOMER TIER
# ============================================================

print("\n")
print("Generating customer tiers...")


customer_order_counts = (
    df.groupby(
        "customer_unique_id"
    )["order_id"]
    .nunique()
)


def assign_customer_tier(count):

    if count >= 5:
        return "PLATINUM"

    elif count >= 3:
        return "GOLD"

    elif count >= 2:
        return "SILVER"

    else:
        return "STANDARD"


customer_tiers = (
    customer_order_counts
    .apply(assign_customer_tier)
    .reset_index()
)


customer_tiers.columns = [
    "customer_unique_id",
    "customer_tier"
]


df = df.merge(
    customer_tiers,
    on="customer_unique_id",
    how="left"
)


# ============================================================
# GENERATE PROPOSED DISCOUNT
# ============================================================

print("\n")
print("=" * 70)
print("GENERATING DISCOUNT")
print("=" * 70)


# Different customer tiers get slightly different
# discount ranges.

tier_base = {

    "STANDARD": 5.0,

    "SILVER": 7.0,

    "GOLD": 9.0,

    "PLATINUM": 11.0

}


df["tier_base_discount"] = (
    df["customer_tier"]
    .map(tier_base)
    .fillna(5.0)
)


# More expensive products receive slightly higher
# negotiation pressure.

price_factor = np.where(
    df["price"] > df["price"].median(),
    2.0,
    0.0
)


# Higher freight can reduce discount availability.

freight_factor = np.where(
    df["freight_value"]
    >
    df["freight_value"].median(),

    -1.5,

    0.0
)


random_factor = np.random.normal(
    0,
    2,
    len(df)
)


df["discount_percent"] = (
    df["tier_base_discount"]
    +
    price_factor
    +
    freight_factor
    +
    random_factor
)


df["discount_percent"] = (
    df["discount_percent"]
    .clip(0, 30)
    .round(2)
)


df["discount_amount"] = (
    df["price"]
    *
    df["discount_percent"]
    /
    100
).round(2)


df["net_sales"] = (
    df["order_value"]
    -
    df["discount_amount"]
).round(2)


# ============================================================
# HISTORICAL CUSTOMER DISCOUNT
#
# IMPORTANT:
# Exclude the current transaction from the
# historical average to reduce data leakage.
# ============================================================

print("\n")
print("Creating historical customer features...")


customer_sum = (
    df.groupby(
        "customer_unique_id"
    )["discount_percent"]
    .transform("sum")
)


customer_count = (
    df.groupby(
        "customer_unique_id"
    )["discount_percent"]
    .transform("count")
)


df["customer_avg_discount"] = np.where(

    customer_count > 1,

    (
        customer_sum
        -
        df["discount_percent"]
    )
    /
    (
        customer_count - 1
    ),

    df["discount_percent"]

)


df["customer_avg_discount"] = (
    df["customer_avg_discount"]
    .round(2)
)


# ============================================================
# PRODUCT HISTORICAL DISCOUNT
# ============================================================

print("Creating historical product features...")


product_sum = (
    df.groupby(
        "product_id"
    )["discount_percent"]
    .transform("sum")
)


product_count = (
    df.groupby(
        "product_id"
    )["discount_percent"]
    .transform("count")
)


df["product_avg_discount"] = np.where(

    product_count > 1,

    (
        product_sum
        -
        df["discount_percent"]
    )
    /
    (
        product_count - 1
    ),

    df["discount_percent"]

)


df["product_avg_discount"] = (
    df["product_avg_discount"]
    .round(2)
)


# ============================================================
# CUSTOMER + PRODUCT HISTORICAL DISCOUNT
# ============================================================

print(
    "Creating customer-product history..."
)


customer_product_sum = (
    df.groupby(
        [
            "customer_unique_id",
            "product_id"
        ]
    )["discount_percent"]
    .transform("sum")
)


customer_product_count = (
    df.groupby(
        [
            "customer_unique_id",
            "product_id"
        ]
    )["discount_percent"]
    .transform("count")
)


df["customer_product_avg_discount"] = np.where(

    customer_product_count > 1,

    (
        customer_product_sum
        -
        df["discount_percent"]
    )
    /
    (
        customer_product_count - 1
    ),

    (
        df["customer_avg_discount"]
        +
        df["product_avg_discount"]
    )
    /
    2

)


df["customer_product_avg_discount"] = (
    df["customer_product_avg_discount"]
    .round(2)
)


# ============================================================
# RECOMMENDED DISCOUNT
# ============================================================

print("\n")
print("=" * 70)
print("GENERATING RECOMMENDED DISCOUNT")
print("=" * 70)


df["recommended_discount_percent"] = (

    df["customer_avg_discount"] * 0.40

    +

    df["product_avg_discount"] * 0.30

    +

    df["customer_product_avg_discount"] * 0.30

)


# Protect margin

df["recommended_discount_percent"] = np.where(

    df["price"] <= df["product_cost"] * 1.15,

    df["recommended_discount_percent"] - 3,

    df["recommended_discount_percent"]

)


# Customer tier adjustment

df["recommended_discount_percent"] += (

    df["customer_tier"]
    .map({

        "STANDARD": 0,

        "SILVER": 1,

        "GOLD": 2,

        "PLATINUM": 3

    })
    .fillna(0)

)


df["recommended_discount_percent"] = (

    df["recommended_discount_percent"]
    .clip(0, 25)
    .round(2)

)


# ============================================================
# DISCOUNT GAP
# ============================================================

df["discount_gap_percent"] = (

    df["discount_percent"]
    -
    df["recommended_discount_percent"]

).round(2)


# ============================================================
# WAREHOUSE DIGITAL-TWIN FEATURES
#
# These are synthetic fields because Olist doesn't
# provide warehouse inventory.
# ============================================================

print("\n")
print("=" * 70)
print("GENERATING WAREHOUSE FEATURES")
print("=" * 70)


df["warehouse_count"] = np.random.choice(

    [1, 2, 3],

    size=len(df),

    p=[
        0.65,
        0.25,
        0.10
    ]

)


df["available_stock"] = np.random.randint(

    20,
    1000,
    len(df)

)


df["reserved_stock"] = np.random.randint(

    0,
    300,
    len(df)

)


df["warehouse_capacity"] = np.random.randint(

    500,
    5000,
    len(df)

)


# ============================================================
# STOCK PRESSURE
# ============================================================

df["stock_pressure"] = (

    df["reserved_stock"]

    /

    df["available_stock"]
    .replace(0, 1)

).round(4)


# ============================================================
# WAREHOUSE UTILIZATION
# ============================================================

df["warehouse_utilization"] = (

    df["reserved_stock"]

    /

    df["warehouse_capacity"]
    .replace(0, 1)

).round(4)


# ============================================================
# TRANSPORT COST
# ============================================================

print("Generating transport cost...")


# Cost per kilometer varies slightly.

cost_per_km = np.random.uniform(

    0.05,
    0.20,
    len(df)

)


df["transport_cost"] = (

    df["transport_distance_km"]

    *

    cost_per_km

).round(2)


# ============================================================
# EXPECTED DELIVERY TIME
# ============================================================

df["expected_delivery_days"] = (

    2

    +

    (
        df["warehouse_count"] - 1
    )
    *
    2

    +

    (
        df["transport_distance_km"]
        /
        500
    )

).round(1)


# ============================================================
# MARGIN CALCULATION
# ============================================================

print("\n")
print("=" * 70)
print("CALCULATING MARGIN")
print("=" * 70)


df["margin_before_discount"] = (

    df["price"]

    -

    df["product_cost"]

    -

    df["freight_value"]

    -

    df["transport_cost"]

).round(2)


df["margin_after_discount"] = (

    df["net_sales"]

    -

    df["product_cost"]

    -

    df["freight_value"]

    -

    df["transport_cost"]

).round(2)


df["margin_percent"] = (

    df["margin_after_discount"]

    /

    df["net_sales"]
    .replace(0, 1)

    *

    100

).round(2)


# ============================================================
# CUSTOMER HISTORY
# ============================================================

df["customer_transaction_count"] = (

    df.groupby(
        "customer_unique_id"
    )["order_id"]
    .transform("nunique")

)


df["customer_previous_orders"] = (

    df["customer_transaction_count"]
    -
    1

).clip(lower=0)


# ============================================================
# PRODUCT HISTORY
# ============================================================

df["product_transaction_count"] = (

    df.groupby(
        "product_id"
    )["order_id"]
    .transform("nunique")

)


df["product_previous_orders"] = (

    df["product_transaction_count"]
    -
    1

).clip(lower=0)


# ============================================================
# RISK SCORE
#
# This is a BOOTSTRAP BUSINESS LABEL.
#
# Later replace this with actual historical business
# outcomes when your application generates real deals.
# ============================================================

print("\n")
print("=" * 70)
print("GENERATING DISCOUNT RISK")
print("=" * 70)


risk_score = np.zeros(
    len(df),
    dtype=float
)


# ------------------------------------------------------------
# HIGH DISCOUNT
# ------------------------------------------------------------

risk_score += np.where(

    df["discount_percent"] >= 20,

    30,

    np.where(

        df["discount_percent"] >= 15,

        20,

        np.where(

            df["discount_percent"] >= 10,

            10,

            0

        )

    )

)


# ------------------------------------------------------------
# DISCOUNT ABOVE RECOMMENDATION
# ------------------------------------------------------------

risk_score += np.where(

    df["discount_gap_percent"] >= 10,

    20,

    np.where(

        df["discount_gap_percent"] >= 5,

        10,

        0

    )

)


# ------------------------------------------------------------
# LOW MARGIN
# ------------------------------------------------------------

risk_score += np.where(

    df["margin_percent"] < 5,

    30,

    np.where(

        df["margin_percent"] < 10,

        20,

        np.where(

            df["margin_percent"] < 15,

            10,

            0

        )

    )

)


# ------------------------------------------------------------
# MULTI-WAREHOUSE
# ------------------------------------------------------------

risk_score += np.where(

    df["warehouse_count"] >= 3,

    15,

    np.where(

        df["warehouse_count"] == 2,

        7,

        0

    )

)


# ------------------------------------------------------------
# HIGH TRANSPORT COST
# ------------------------------------------------------------

transport_threshold = (

    df["transport_cost"]
    .quantile(0.75)

)


risk_score += np.where(

    df["transport_cost"]
    >=
    transport_threshold,

    10,

    0

)


# ------------------------------------------------------------
# LONG DELIVERY
# ------------------------------------------------------------

risk_score += np.where(

    df["expected_delivery_days"] >= 8,

    15,

    np.where(

        df["expected_delivery_days"] >= 6,

        7,

        0

    )

)


# ------------------------------------------------------------
# HIGH STOCK PRESSURE
# ------------------------------------------------------------

risk_score += np.where(

    df["stock_pressure"] >= 0.70,

    15,

    np.where(

        df["stock_pressure"] >= 0.40,

        7,

        0

    )

)


df["risk_score"] = (

    risk_score
    .clip(0, 100)
    .round(2)

)


# ============================================================
# RISK LABEL
# ============================================================

df["risk_label"] = np.where(

    df["risk_score"] >= 40,

    1,

    0

)


df["risk_category"] = np.where(

    df["risk_label"] == 1,

    "HIGH",

    "NORMAL"

)


# ============================================================
# CLEAN NUMERIC DATA
# ============================================================

print("\n")
print("=" * 70)
print("CLEANING DATA")
print("=" * 70)


numeric_columns = (
    df.select_dtypes(
        include=["number"]
    )
    .columns
)


df[numeric_columns] = (

    df[numeric_columns]

    .replace(
        [np.inf, -np.inf],
        np.nan
    )

    .fillna(0)

)


# ============================================================
# CLEAN STRING DATA
# ============================================================

string_columns = (

    df.select_dtypes(
        include=["object"]
    )
    .columns

)


for column in string_columns:

    df[column] = (

        df[column]

        .fillna("unknown")

        .astype(str)

        .str.strip()

    )


# ============================================================
# REMOVE DUPLICATES
# ============================================================

before = len(df)


df = df.drop_duplicates(

    subset=[
        "order_id",
        "order_item_id"
    ]

)


after = len(df)


print(
    f"Removed duplicates: {before - after:,}"
)


# ============================================================
# SELECT FINAL CLASSIFIER DATASET
# ============================================================

final_columns = [

    # --------------------------------------------------------
    # IDENTIFICATION
    # --------------------------------------------------------

    "order_id",

    "order_item_id",

    "customer_id",

    "customer_unique_id",

    "product_id",

    "seller_id",


    # --------------------------------------------------------
    # CUSTOMER / PRODUCT
    # --------------------------------------------------------

    "customer_tier",

    "category",

    "customer_state",

    "seller_state",


    # --------------------------------------------------------
    # TRANSACTION
    # --------------------------------------------------------

    "quantity",

    "price",

    "order_value",

    "freight_value",

    "gross_order_value",


    # --------------------------------------------------------
    # DISCOUNT
    # --------------------------------------------------------

    "discount_percent",

    "discount_amount",

    "net_sales",


    # --------------------------------------------------------
    # HISTORICAL DISCOUNT
    # --------------------------------------------------------

    "customer_avg_discount",

    "product_avg_discount",

    "customer_product_avg_discount",


    # --------------------------------------------------------
    # RECOMMENDATION
    # --------------------------------------------------------

    "recommended_discount_percent",

    "discount_gap_percent",


    # --------------------------------------------------------
    # WAREHOUSE
    # --------------------------------------------------------

    "warehouse_count",

    "available_stock",

    "reserved_stock",

    "warehouse_capacity",

    "stock_pressure",

    "warehouse_utilization",


    # --------------------------------------------------------
    # TRANSPORT
    # --------------------------------------------------------

    "transport_distance_km",

    "transport_cost",

    "expected_delivery_days",


    # --------------------------------------------------------
    # PROFITABILITY
    # --------------------------------------------------------

    "product_cost",

    "margin_before_discount",

    "margin_after_discount",

    "margin_percent",


    # --------------------------------------------------------
    # CUSTOMER / PRODUCT HISTORY
    # --------------------------------------------------------

    "customer_transaction_count",

    "customer_previous_orders",

    "product_transaction_count",

    "product_previous_orders",


    # --------------------------------------------------------
    # DELIVERY
    # --------------------------------------------------------

    "actual_delivery_days",

    "estimated_delivery_days",

    "delivery_delay_days",


    # --------------------------------------------------------
    # PAYMENT / REVIEW
    # --------------------------------------------------------

    "payment_value",

    "payment_installments",

    "payment_type",

    "review_score",


    # --------------------------------------------------------
    # RISK TARGET
    # --------------------------------------------------------

    "risk_score",

    "risk_label",

    "risk_category"

]


final_columns = [

    column

    for column in final_columns

    if column in df.columns

]


final_df = df[
    final_columns
].copy()


# ============================================================
# FINAL CLEANUP
# ============================================================

final_df = final_df.replace(

    [np.inf, -np.inf],

    np.nan

)


numeric_columns = (

    final_df.select_dtypes(
        include=["number"]
    )
    .columns

)


final_df[numeric_columns] = (

    final_df[numeric_columns]
    .fillna(0)

)


string_columns = (

    final_df.select_dtypes(
        include=["object"]
    )
    .columns

)


for column in string_columns:

    final_df[column] = (

        final_df[column]
        .fillna("unknown")

    )


# ============================================================
# SAVE
# ============================================================

print("\n")
print("=" * 70)
print("SAVING FINAL DATASET")
print("=" * 70)


final_df.to_csv(

    OUTPUT_FILE,

    index=False

)


# ============================================================
# FINAL REPORT
# ============================================================

print("\n")
print("=" * 70)
print("DEALFLOW360 CLASSIFIER DATASET CREATED")
print("=" * 70)


print(
    f"\nOutput file:\n{OUTPUT_FILE}"
)


print(
    f"\nRows: {len(final_df):,}"
)


print(
    f"Columns: {len(final_df.columns)}"
)


print("\nRisk distribution:")


print(
    final_df["risk_category"]
    .value_counts()
)


print("\nRisk percentage:")


print(

    final_df["risk_category"]
    .value_counts(
        normalize=True
    )
    .mul(100)
    .round(2)

)


print("\nImportant ML columns:")


important_columns = [

    "discount_percent",

    "recommended_discount_percent",

    "discount_gap_percent",

    "warehouse_count",

    "available_stock",

    "reserved_stock",

    "transport_distance_km",

    "transport_cost",

    "expected_delivery_days",

    "margin_percent",

    "risk_score",

    "risk_label",

    "risk_category"

]


print(
    final_df[
        important_columns
    ].head(10)
)


print("\n")
print("=" * 70)
print("DONE")
print("=" * 70)