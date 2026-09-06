import os
import numpy as np
import pandas as pd


# ============================================================
# DEALFLOW360
# REGRESSOR DATASET BUILDER
# ============================================================

print("\n")
print("=" * 75)
print("DEALFLOW360 - REGRESSOR DATASET BUILDER")
print("=" * 75)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = r"D:\Odoo finale\classifier dataset"

INPUT_FILE = os.path.join(
    BASE_DIR,
    "online_retail_II.xlsx"
)

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "dealflow360_regressor_dataset.csv"
)

RANDOM_SEED = 42

np.random.seed(RANDOM_SEED)


# ============================================================
# CHECK INPUT FILE
# ============================================================

print("\nChecking input file...")

if not os.path.exists(INPUT_FILE):

    print("\nERROR: Input file not found.")
    print("\nExpected file:")
    print(INPUT_FILE)

    print("\nFiles found in folder:")

    if os.path.exists(BASE_DIR):

        for file in os.listdir(BASE_DIR):
            print("  -", file)

    raise FileNotFoundError(
        "\n\nPlease make sure online_retail_II.xlsx exists in:\n"
        + BASE_DIR
    )


print("Input file found:")
print(INPUT_FILE)


# ============================================================
# LOAD EXCEL SHEETS
# ============================================================

print("\n")
print("=" * 75)
print("LOADING ONLINE RETAIL II")
print("=" * 75)


print("\nLoading sheet: Year 2009-2010")

df_2009 = pd.read_excel(
    INPUT_FILE,
    sheet_name="Year 2009-2010"
)

print(
    "Year 2009-2010:",
    df_2009.shape
)


print("\nLoading sheet: Year 2010-2011")

df_2010 = pd.read_excel(
    INPUT_FILE,
    sheet_name="Year 2010-2011"
)

print(
    "Year 2010-2011:",
    df_2010.shape
)


# ============================================================
# COMBINE BOTH YEARS
# ============================================================

print("\n")
print("=" * 75)
print("COMBINING BOTH YEARS")
print("=" * 75)


df = pd.concat(
    [
        df_2009,
        df_2010
    ],
    ignore_index=True
)


print(
    "\nCombined dataset:",
    df.shape
)


del df_2009
del df_2010


# ============================================================
# STANDARDIZE COLUMN NAMES
# ============================================================

print("\n")
print("=" * 75)
print("STANDARDIZING COLUMNS")
print("=" * 75)


df.columns = [

    str(column)
    .strip()
    .lower()
    .replace(" ", "_")
    .replace("-", "_")

    for column in df.columns

]


print("\nColumns detected:")

for column in df.columns:
    print("  -", column)


# ============================================================
# CHECK REQUIRED COLUMNS
# ============================================================

required_columns = [

    "invoice",
    "stockcode",
    "description",
    "quantity",
    "invoicedate",
    "price",
    "customer_id",
    "country"

]


missing_columns = [

    column

    for column in required_columns

    if column not in df.columns

]


if missing_columns:

    raise ValueError(
        "\nMissing required columns: "
        + str(missing_columns)
    )


# ============================================================
# BASIC CLEANING
# ============================================================

print("\n")
print("=" * 75)
print("CLEANING TRANSACTIONS")
print("=" * 75)


original_rows = len(df)


# Remove rows without customer
df = df[
    df["customer_id"].notna()
].copy()


# Remove rows without product
df = df[
    df["stockcode"].notna()
].copy()


# Remove rows without price
df = df[
    df["price"].notna()
].copy()


# Convert numeric columns

df["quantity"] = pd.to_numeric(
    df["quantity"],
    errors="coerce"
)


df["price"] = pd.to_numeric(
    df["price"],
    errors="coerce"
)


# Remove invalid numeric rows

df = df[
    df["quantity"].notna()
].copy()


df = df[
    df["price"].notna()
].copy()


# Remove zero / negative prices

df = df[
    df["price"] > 0
].copy()


# ============================================================
# RETURN / CANCELLATION FLAG
# ============================================================

print("\nCreating return flag...")


df["invoice"] = (
    df["invoice"]
    .astype(str)
    .str.strip()
)


df["is_return"] = (

    df["quantity"] < 0

).astype(int)


print(
    "Return transactions:",
    df["is_return"].sum()
)


# ============================================================
# KEEP SALES ONLY
# ============================================================

df = df[
    df["quantity"] > 0
].copy()


print(
    "\nRows after removing returns:",
    len(df)
)


# ============================================================
# DATE PROCESSING
# ============================================================

print("\nProcessing dates...")


df["invoicedate"] = pd.to_datetime(
    df["invoicedate"],
    errors="coerce"
)


df = df[
    df["invoicedate"].notna()
].copy()


# ============================================================
# TEXT CLEANING
# ============================================================

print("\nCleaning text...")


df["stockcode"] = (

    df["stockcode"]
    .astype(str)
    .str.strip()

)


df["description"] = (

    df["description"]
    .fillna("UNKNOWN PRODUCT")
    .astype(str)
    .str.strip()

)


df["country"] = (

    df["country"]
    .fillna("UNKNOWN")
    .astype(str)
    .str.strip()

)


# ============================================================
# TRANSACTION VALUE
# ============================================================

print("\nCreating transaction values...")


df["order_value"] = (

    df["quantity"]
    *
    df["price"]

).round(2)


# ============================================================
# TIME FEATURES
# ============================================================

print("\nCreating time features...")


df["year"] = (

    df["invoicedate"]
    .dt.year

)


df["month"] = (

    df["invoicedate"]
    .dt.month

)


df["day_of_week"] = (

    df["invoicedate"]
    .dt.dayofweek

)


df["hour"] = (

    df["invoicedate"]
    .dt.hour

)


df["is_weekend"] = (

    df["day_of_week"] >= 5

).astype(int)


# ============================================================
# PRODUCT CATEGORY
# ============================================================

print("\n")
print("=" * 75)
print("CREATING PRODUCT CATEGORIES")
print("=" * 75)


def create_category(description):

    text = str(description).lower()


    if any(
        word in text
        for word in [
            "christmas",
            "xmas",
            "festive"
        ]
    ):
        return "FESTIVE"


    if any(
        word in text
        for word in [
            "light",
            "lamp",
            "candle"
        ]
    ):
        return "LIGHTING"


    if any(
        word in text
        for word in [
            "bag",
            "purse",
            "wallet"
        ]
    ):
        return "BAGS"


    if any(
        word in text
        for word in [
            "mug",
            "cup",
            "plate",
            "bowl",
            "kitchen"
        ]
    ):
        return "KITCHEN"


    if any(
        word in text
        for word in [
            "toy",
            "game",
            "child",
            "kids"
        ]
    ):
        return "TOYS"


    if any(
        word in text
        for word in [
            "jewellery",
            "jewelry",
            "necklace",
            "earring",
            "bracelet"
        ]
    ):
        return "JEWELLERY"


    if any(
        word in text
        for word in [
            "garden",
            "flower",
            "plant"
        ]
    ):
        return "GARDEN"


    if any(
        word in text
        for word in [
            "box",
            "storage",
            "holder"
        ]
    ):
        return "STORAGE"


    if any(
        word in text
        for word in [
            "home",
            "house",
            "decoration",
            "decor"
        ]
    ):
        return "HOME"


    return "GENERAL"


df["category"] = (

    df["description"]
    .apply(create_category)

)


# ============================================================
# SORT BY TIME
# ============================================================

print("\nSorting transactions chronologically...")


df = df.sort_values(
    [
        "customer_id",
        "invoicedate",
        "invoice"
    ]
).reset_index(
    drop=True
)


# ============================================================
# CUSTOMER ORDER COUNT
# ============================================================

print("\n")
print("=" * 75)
print("CREATING CUSTOMER TIERS")
print("=" * 75)


customer_order_count = (

    df.groupby(
        "customer_id"
    )["invoice"]
    .nunique()

)


def assign_customer_tier(count):

    if count >= 20:

        return "PLATINUM"

    elif count >= 10:

        return "GOLD"

    elif count >= 5:

        return "SILVER"

    else:

        return "STANDARD"


customer_tiers = (

    customer_order_count
    .apply(assign_customer_tier)
    .rename("customer_tier")

)


df = df.join(
    customer_tiers,
    on="customer_id"
)


# ============================================================
# CUSTOMER HISTORY
# ============================================================

print("\n")
print("=" * 75)
print("CREATING CUSTOMER HISTORY")
print("=" * 75)


df["customer_previous_transactions"] = (

    df.groupby(
        "customer_id"
    ).cumcount()

)


df["customer_previous_quantity"] = (

    df.groupby(
        "customer_id"
    )["quantity"]
    .cumsum()
    -
    df["quantity"]

)


df["customer_previous_spend"] = (

    df.groupby(
        "customer_id"
    )["order_value"]
    .cumsum()
    -
    df["order_value"]

)


df["customer_avg_order_value"] = np.where(

    df["customer_previous_transactions"] > 0,

    (
        df["customer_previous_spend"]
        /
        df["customer_previous_transactions"]
    ),

    df["order_value"]

)


# ============================================================
# PRODUCT HISTORY
# ============================================================

print("\n")
print("=" * 75)
print("CREATING PRODUCT HISTORY")
print("=" * 75)


df["product_previous_transactions"] = (

    df.groupby(
        "stockcode"
    ).cumcount()

)


df["product_previous_quantity"] = (

    df.groupby(
        "stockcode"
    )["quantity"]
    .cumsum()
    -
    df["quantity"]

)


# ============================================================
# CUSTOMER-PRODUCT HISTORY
# ============================================================

print("\nCreating customer-product history...")


df["customer_product_previous_transactions"] = (

    df.groupby(
        [
            "customer_id",
            "stockcode"
        ]
    ).cumcount()

)


# ============================================================
# PRODUCT PRICE HISTORY
# ============================================================

print("\nCreating product price history...")


df["product_previous_price_sum"] = (

    df.groupby(
        "stockcode"
    )["price"]
    .cumsum()
    -
    df["price"]

)


df["product_previous_price_avg"] = np.where(

    df["product_previous_transactions"] > 0,

    (
        df["product_previous_price_sum"]
        /
        df["product_previous_transactions"]
    ),

    df["price"]

)


# ============================================================
# GENERATE ERP-STYLE HISTORICAL DISCOUNT
# ============================================================

print("\n")
print("=" * 75)
print("GENERATING HISTORICAL DISCOUNT")
print("=" * 75)


tier_discount = {

    "STANDARD": 3.0,

    "SILVER": 5.0,

    "GOLD": 8.0,

    "PLATINUM": 12.0

}


df["tier_discount"] = (

    df["customer_tier"]
    .map(tier_discount)
    .fillna(3.0)

)


# Quantity discount

quantity_bonus = np.where(

    df["quantity"] >= 20,

    5.0,

    np.where(

        df["quantity"] >= 10,

        3.0,

        np.where(

            df["quantity"] >= 5,

            1.5,

            0.0

        )

    )

)


# Product popularity discount

product_bonus = np.where(

    df["product_previous_transactions"] >= 100,

    2.0,

    np.where(

        df["product_previous_transactions"] >= 50,

        1.0,

        0.0

    )

)


# Customer loyalty discount

customer_bonus = np.where(

    df["customer_previous_transactions"] >= 20,

    3.0,

    np.where(

        df["customer_previous_transactions"] >= 10,

        2.0,

        np.where(

            df["customer_previous_transactions"] >= 5,

            1.0,

            0.0

        )

    )

)


# Seasonal discount

seasonal_bonus = np.where(

    df["month"].isin(
        [11, 12]
    ),

    2.0,

    0.0

)


# Random negotiation component

random_variation = np.random.normal(

    loc=0,

    scale=1.5,

    size=len(df)

)


df["discount_percent"] = (

    df["tier_discount"]

    +

    quantity_bonus

    +

    product_bonus

    +

    customer_bonus

    +

    seasonal_bonus

    +

    random_variation

)


df["discount_percent"] = (

    df["discount_percent"]
    .clip(0, 30)
    .round(2)

)


# ============================================================
# DISCOUNT AMOUNT
# ============================================================

df["discount_amount"] = (

    df["order_value"]
    *
    df["discount_percent"]
    /
    100

).round(2)


# ============================================================
# NET VALUE
# ============================================================

df["net_value"] = (

    df["order_value"]
    -
    df["discount_amount"]

).round(2)


# ============================================================
# HISTORICAL DISCOUNT FEATURES
#
# VERY IMPORTANT:
#
# shift(1) ensures that the current transaction's discount
# is NOT included in historical calculations.
#
# This prevents target leakage.
# ============================================================

print("\n")
print("=" * 75)
print("CREATING HISTORICAL DISCOUNT FEATURES")
print("=" * 75)


df["customer_avg_previous_discount"] = (

    df.groupby(
        "customer_id"
    )["discount_percent"]
    .transform(
        lambda x:
        x.shift(1)
        .expanding()
        .mean()
    )

)


df["product_avg_previous_discount"] = (

    df.groupby(
        "stockcode"
    )["discount_percent"]
    .transform(
        lambda x:
        x.shift(1)
        .expanding()
        .mean()
    )

)


df["customer_product_avg_previous_discount"] = (

    df.groupby(
        [
            "customer_id",
            "stockcode"
        ]
    )["discount_percent"]
    .transform(
        lambda x:
        x.shift(1)
        .expanding()
        .mean()
    )

)


# ============================================================
# FILL HISTORY FOR FIRST TRANSACTIONS
# ============================================================

global_discount = (

    df["discount_percent"]
    .mean()

)


df["customer_avg_previous_discount"] = (

    df["customer_avg_previous_discount"]
    .fillna(
        global_discount
    )

)


df["product_avg_previous_discount"] = (

    df["product_avg_previous_discount"]
    .fillna(
        global_discount
    )

)


df["customer_product_avg_previous_discount"] = (

    df[
        "customer_product_avg_previous_discount"
    ]
    .fillna(

        (
            df[
                "customer_avg_previous_discount"
            ]

            +

            df[
                "product_avg_previous_discount"
            ]
        )

        /

        2

    )

)


# ============================================================
# RECOMMENDED DISCOUNT
#
# THIS IS THE TARGET FOR THE REGRESSOR.
# ============================================================

print("\n")
print("=" * 75)
print("GENERATING RECOMMENDED DISCOUNT")
print("=" * 75)


df["recommended_discount_percent"] = (

    df[
        "customer_avg_previous_discount"
    ] * 0.35

    +

    df[
        "product_avg_previous_discount"
    ] * 0.30

    +

    df[
        "customer_product_avg_previous_discount"
    ] * 0.20

    +

    df[
        "tier_discount"
    ] * 0.10

    +

    np.minimum(
        df["quantity"] / 20,
        1
    ) * 5 * 0.05

)


# ============================================================
# BUSINESS LIMITS
# ============================================================

tier_max_discount = {

    "STANDARD": 10.0,

    "SILVER": 15.0,

    "GOLD": 20.0,

    "PLATINUM": 25.0

}


df["tier_max_discount"] = (

    df["customer_tier"]
    .map(
        tier_max_discount
    )
    .fillna(10.0)

)


df["recommended_discount_percent"] = (

    np.minimum(

        df[
            "recommended_discount_percent"
        ],

        df[
            "tier_max_discount"
        ]

    )

)


df["recommended_discount_percent"] = (

    df[
        "recommended_discount_percent"
    ]
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
# CUSTOMER PURCHASE FREQUENCY
# ============================================================

print("\nCreating customer purchase frequency...")


customer_first_date = (

    df.groupby(
        "customer_id"
    )["invoicedate"]
    .transform("min")

)


days_since_first_purchase = (

    df["invoicedate"]
    -
    customer_first_date

).dt.days


days_since_first_purchase = (

    days_since_first_purchase
    .clip(lower=1)

)


df["customer_purchase_frequency"] = (

    df[
        "customer_previous_transactions"
    ]

    /

    (
        days_since_first_purchase
        /
        30
    )

)


df["customer_purchase_frequency"] = (

    df[
        "customer_purchase_frequency"
    ]
    .replace(
        [np.inf, -np.inf],
        np.nan
    )
    .fillna(0)
    .round(4)

)


# ============================================================
# CUSTOMER TOTAL PREVIOUS SPEND
# ============================================================

df["customer_total_previous_spend"] = (

    df[
        "customer_previous_spend"
    ]
    .round(2)

)


# ============================================================
# PRODUCT POPULARITY
# ============================================================

df["product_popularity"] = (

    df[
        "product_previous_transactions"
    ]

)


# ============================================================
# DISCOUNTED UNIT PRICE
# ============================================================

df["discounted_unit_price"] = (

    df["price"]

    *

    (
        1

        -

        df["discount_percent"]
        /
        100
    )

).round(2)


# ============================================================
# PRICE BAND
# ============================================================

print("\nCreating price bands...")


df["price_band"] = pd.cut(

    df["price"],

    bins=[
        -np.inf,
        5,
        20,
        50,
        100,
        500,
        np.inf
    ],

    labels=[
        "VERY_LOW",
        "LOW",
        "MEDIUM",
        "HIGH",
        "PREMIUM",
        "LUXURY"
    ]

)


# ============================================================
# MARKET REGION
# ============================================================

print("\nCreating market regions...")


def create_market_region(country):

    country = str(country)


    if country == "United Kingdom":

        return "DOMESTIC"


    if country in [

        "France",
        "Germany",
        "Spain",
        "Portugal",
        "Belgium",
        "Netherlands",
        "Italy",
        "Switzerland"

    ]:

        return "EUROPE"


    return "INTERNATIONAL"


df["market_region"] = (

    df["country"]
    .apply(create_market_region)

)


# ============================================================
# NUMERIC CLEANING
# ============================================================

print("\n")
print("=" * 75)
print("FINAL CLEANING")
print("=" * 75)


numeric_columns = [

    "quantity",

    "price",

    "order_value",

    "discount_percent",

    "discount_amount",

    "net_value",

    "customer_previous_transactions",

    "customer_previous_quantity",

    "customer_previous_spend",

    "customer_avg_order_value",

    "product_previous_transactions",

    "product_previous_quantity",

    "customer_product_previous_transactions",

    "product_previous_price_avg",

    "customer_avg_previous_discount",

    "product_avg_previous_discount",

    "customer_product_avg_previous_discount",

    "recommended_discount_percent",

    "discount_gap_percent",

    "customer_purchase_frequency",

    "customer_total_previous_spend",

    "product_popularity",

    "discounted_unit_price",

    "tier_discount",

    "tier_max_discount"

]


for column in numeric_columns:

    if column in df.columns:

        df[column] = pd.to_numeric(

            df[column],

            errors="coerce"

        )


# Infinity → NaN

df = df.replace(

    [np.inf, -np.inf],

    np.nan

)


# Fill missing numeric values

for column in numeric_columns:

    if column in df.columns:

        df[column] = (

            df[column]
            .fillna(0)

        )


# ============================================================
# REMOVE EXTREME VALUES
# ============================================================

print("\nRemoving extreme values...")


df = df[
    df["quantity"] <= 1000
].copy()


df = df[
    df["price"] <= 10000
].copy()


# ============================================================
# FINAL FEATURE LIST
# ============================================================

print("\n")
print("=" * 75)
print("CREATING FINAL DATASET")
print("=" * 75)


final_columns = [

    # --------------------------------------------------------
    # IDENTIFICATION
    # --------------------------------------------------------

    "invoice",

    "stockcode",

    "customer_id",

    "country",


    # --------------------------------------------------------
    # PRODUCT
    # --------------------------------------------------------

    "description",

    "category",


    # --------------------------------------------------------
    # CUSTOMER
    # --------------------------------------------------------

    "customer_tier",

    "market_region",


    # --------------------------------------------------------
    # TRANSACTION
    # --------------------------------------------------------

    "quantity",

    "price",

    "order_value",


    # --------------------------------------------------------
    # TIME
    # --------------------------------------------------------

    "year",

    "month",

    "day_of_week",

    "hour",

    "is_weekend",


    # --------------------------------------------------------
    # CUSTOMER HISTORY
    # --------------------------------------------------------

    "customer_previous_transactions",

    "customer_previous_quantity",

    "customer_previous_spend",

    "customer_avg_order_value",

    "customer_purchase_frequency",

    "customer_total_previous_spend",


    # --------------------------------------------------------
    # PRODUCT HISTORY
    # --------------------------------------------------------

    "product_previous_transactions",

    "product_previous_quantity",

    "product_previous_price_avg",

    "product_popularity",


    # --------------------------------------------------------
    # CUSTOMER + PRODUCT
    # --------------------------------------------------------

    "customer_product_previous_transactions",


    # --------------------------------------------------------
    # HISTORICAL DISCOUNT
    # --------------------------------------------------------

    "customer_avg_previous_discount",

    "product_avg_previous_discount",

    "customer_product_avg_previous_discount",


    # --------------------------------------------------------
    # CURRENT TRANSACTION
    # --------------------------------------------------------

    "discount_percent",

    "discount_amount",

    "discounted_unit_price",

    "discount_gap_percent",


    # --------------------------------------------------------
    # BUSINESS
    # --------------------------------------------------------

    "tier_discount",

    "tier_max_discount",

    "price_band",


    # --------------------------------------------------------
    # TARGET
    # --------------------------------------------------------

    "recommended_discount_percent"

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
# REMOVE DUPLICATES
# ============================================================

before_duplicates = len(final_df)


final_df = final_df.drop_duplicates()


after_duplicates = len(final_df)


print(
    "\nDuplicates removed:",
    before_duplicates - after_duplicates
)


# ============================================================
# ROUND IMPORTANT VALUES
# ============================================================

for column in [

    "price",

    "order_value",

    "discount_percent",

    "discount_amount",

    "discounted_unit_price",

    "recommended_discount_percent",

    "discount_gap_percent",

    "customer_avg_previous_discount",

    "product_avg_previous_discount",

    "customer_product_avg_previous_discount",

    "customer_avg_order_value",

    "customer_previous_spend",

    "customer_total_previous_spend",

    "product_previous_price_avg"

]:

    if column in final_df.columns:

        final_df[column] = (

            pd.to_numeric(
                final_df[column],
                errors="coerce"
            )
            .round(2)

        )


# ============================================================
# SAVE DATASET
# ============================================================

print("\n")
print("=" * 75)
print("SAVING FINAL DATASET")
print("=" * 75)


final_df.to_csv(

    OUTPUT_FILE,

    index=False

)


print(
    "\nDataset saved successfully."
)


print(
    "\nOutput:"
)


print(
    OUTPUT_FILE
)


# ============================================================
# DATASET SUMMARY
# ============================================================

print("\n")
print("=" * 75)
print("DATASET SUMMARY")
print("=" * 75)


print(
    "\nRows:",
    f"{len(final_df):,}"
)


print(
    "Columns:",
    len(final_df.columns)
)


# ============================================================
# TARGET STATISTICS
# ============================================================

print("\n")
print("=" * 75)
print("RECOMMENDED DISCOUNT STATISTICS")
print("=" * 75)


print(

    final_df[
        "recommended_discount_percent"
    ].describe()

)


# ============================================================
# HISTORICAL DISCOUNT STATISTICS
# ============================================================

print("\n")
print("=" * 75)
print("HISTORICAL DISCOUNT STATISTICS")
print("=" * 75)


print(

    final_df[
        "discount_percent"
    ].describe()

)


# ============================================================
# CUSTOMER TIER DISTRIBUTION
# ============================================================

print("\n")
print("=" * 75)
print("CUSTOMER TIER DISTRIBUTION")
print("=" * 75)


print(

    final_df[
        "customer_tier"
    ].value_counts()

)


# ============================================================
# CATEGORY DISTRIBUTION
# ============================================================

print("\n")
print("=" * 75)
print("CATEGORY DISTRIBUTION")
print("=" * 75)


print(

    final_df[
        "category"
    ].value_counts()

)


# ============================================================
# SAMPLE DATA
# ============================================================

print("\n")
print("=" * 75)
print("SAMPLE DATA")
print("=" * 75)


sample_columns = [

    "customer_id",

    "stockcode",

    "category",

    "customer_tier",

    "quantity",

    "price",

    "customer_previous_transactions",

    "customer_previous_spend",

    "customer_avg_previous_discount",

    "product_avg_previous_discount",

    "customer_product_avg_previous_discount",

    "discount_percent",

    "recommended_discount_percent"

]


print(

    final_df[
        sample_columns
    ]
    .head(10)
    .to_string(
        index=False
    )

)


# ============================================================
# FEATURE INFORMATION
# ============================================================

print("\n")
print("=" * 75)
print("REGRESSION FEATURES")
print("=" * 75)


regression_features = [

    "quantity",

    "price",

    "customer_tier",

    "customer_previous_transactions",

    "customer_previous_quantity",

    "customer_previous_spend",

    "customer_avg_order_value",

    "customer_purchase_frequency",

    "customer_total_previous_spend",

    "product_previous_transactions",

    "product_previous_quantity",

    "product_previous_price_avg",

    "product_popularity",

    "customer_product_previous_transactions",

    "customer_avg_previous_discount",

    "product_avg_previous_discount",

    "customer_product_avg_previous_discount",

    "discount_percent",

    "discount_amount",

    "discounted_unit_price",

    "discount_gap_percent",

    "tier_discount",

    "tier_max_discount"

]


for i, feature in enumerate(

    regression_features,

    start=1

):

    if feature in final_df.columns:

        print(
            f"{i:02d}. {feature}"
        )


# ============================================================
# TARGET
# ============================================================

print("\n")
print("=" * 75)
print("REGRESSION TARGET")
print("=" * 75)


print(

    "recommended_discount_percent"

)


# ============================================================
# FINAL MESSAGE
# ============================================================

print("\n")
print("=" * 75)
print("DEALFLOW360 REGRESSOR DATASET CREATED")
print("=" * 75)


print(

    f"""
    
File:
{OUTPUT_FILE}

Rows:
{len(final_df):,}

Columns:
{len(final_df.columns)}

Target:
recommended_discount_percent

Purpose:
Predict the recommended discount percentage
for a customer-product combination.

Example prediction:
Recommended discount = 8.73%

Ready for:
XGBoost Regressor

"""
)


print("=" * 75)
print("DONE")
print("=" * 75)