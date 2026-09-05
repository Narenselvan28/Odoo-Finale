require("dotenv").config();
const { sequelize } = require("./database");

// ── Import all models ────────────────────────────────────────────
const Role                  = require("../models/Role.model");
const User                  = require("../models/User.model");
const CustomerTier          = require("../models/CustomerTier.model");
const Customer              = require("../models/Customer.model");
const Category              = require("../models/Category.model");
const Product               = require("../models/Product.model");
const PriceList             = require("../models/PriceList.model");
const PriceListItem         = require("../models/PriceListItem.model");
const DiscountRule          = require("../models/DiscountRule.model");
const Quotation             = require("../models/Quotation.model");
const QuotationItem         = require("../models/QuotationItem.model");
const ApprovalRequest       = require("../models/ApprovalRequest.model");
const ApprovalAuditLog      = require("../models/ApprovalAuditLog.model");
const Warehouse             = require("../models/Warehouse.model");
const Inventory             = require("../models/Inventory.model");
const FulfillmentAllocation = require("../models/FulfillmentAllocation.model");
const ProductRecommendation = require("../models/ProductRecommendation.model");
const SubscriptionPlan      = require("../models/SubscriptionPlan.model");
const Subscription          = require("../models/Subscription.model");
const Invoice               = require("../models/Invoice.model");
const BillingSchedule       = require("../models/BillingSchedule.model");
const Negotiation           = require("../models/Negotiation.model");
const DealHealth            = require("../models/DealHealth.model");
const DealEvent             = require("../models/DealEvent.model");
const Alert                 = require("../models/Alert.model");

// ── Associations ─────────────────────────────────────────────────

// User → Role
Role.hasMany(User, { foreignKey: "role_id" });
User.belongsTo(Role, { foreignKey: "role_id" });

// Customer → CustomerTier
CustomerTier.hasMany(Customer, { foreignKey: "tier_id" });
Customer.belongsTo(CustomerTier, { foreignKey: "tier_id" });

// Product → Category
Category.hasMany(Product, { foreignKey: "category_id" });
Product.belongsTo(Category, { foreignKey: "category_id" });

// PriceList → CustomerTier
CustomerTier.hasMany(PriceList, { foreignKey: "customer_tier_id" });
PriceList.belongsTo(CustomerTier, { foreignKey: "customer_tier_id" });

// PriceListItem → PriceList & Product
PriceList.hasMany(PriceListItem, { foreignKey: "price_list_id" });
PriceListItem.belongsTo(PriceList, { foreignKey: "price_list_id" });
Product.hasMany(PriceListItem, { foreignKey: "product_id" });
PriceListItem.belongsTo(Product, { foreignKey: "product_id" });

// DiscountRule → CustomerTier & Category
CustomerTier.hasMany(DiscountRule, { foreignKey: "customer_tier_id" });
DiscountRule.belongsTo(CustomerTier, { foreignKey: "customer_tier_id" });
Category.hasMany(DiscountRule, { foreignKey: "category_id" });
DiscountRule.belongsTo(Category, { foreignKey: "category_id" });

// Quotation → Customer & User(SalesRep)
Customer.hasMany(Quotation, { foreignKey: "customer_id" });
Quotation.belongsTo(Customer, { foreignKey: "customer_id" });
User.hasMany(Quotation, { foreignKey: "sales_rep_id" });
Quotation.belongsTo(User, { as: "salesRep", foreignKey: "sales_rep_id" });

// QuotationItem → Quotation & Product
Quotation.hasMany(QuotationItem, { foreignKey: "quotation_id", onDelete: "CASCADE" });
QuotationItem.belongsTo(Quotation, { foreignKey: "quotation_id" });
Product.hasMany(QuotationItem, { foreignKey: "product_id" });
QuotationItem.belongsTo(Product, { foreignKey: "product_id" });

// ApprovalRequest → Quotation & User(ActedBy)
Quotation.hasMany(ApprovalRequest, { foreignKey: "quotation_id" });
ApprovalRequest.belongsTo(Quotation, { foreignKey: "quotation_id" });
User.hasMany(ApprovalRequest, { foreignKey: "acted_by" });
ApprovalRequest.belongsTo(User, { as: "actedByUser", foreignKey: "acted_by" });

// ApprovalAuditLog → Quotation & User
Quotation.hasMany(ApprovalAuditLog, { foreignKey: "quotation_id" });
ApprovalAuditLog.belongsTo(Quotation, { foreignKey: "quotation_id" });
User.hasMany(ApprovalAuditLog, { foreignKey: "user_id" });
ApprovalAuditLog.belongsTo(User, { foreignKey: "user_id" });

// Inventory → Warehouse & Product
Warehouse.hasMany(Inventory, { foreignKey: "warehouse_id" });
Inventory.belongsTo(Warehouse, { foreignKey: "warehouse_id" });
Product.hasMany(Inventory, { foreignKey: "product_id" });
Inventory.belongsTo(Product, { foreignKey: "product_id" });

// FulfillmentAllocation → QuotationItem & Warehouse
QuotationItem.hasMany(FulfillmentAllocation, { foreignKey: "quotation_item_id" });
FulfillmentAllocation.belongsTo(QuotationItem, { foreignKey: "quotation_item_id" });
Warehouse.hasMany(FulfillmentAllocation, { foreignKey: "warehouse_id" });
FulfillmentAllocation.belongsTo(Warehouse, { foreignKey: "warehouse_id" });

// ProductRecommendation → Product (self-referential)
Product.hasMany(ProductRecommendation, { foreignKey: "product_id" });
ProductRecommendation.belongsTo(Product, { as: "product", foreignKey: "product_id" });
Product.hasMany(ProductRecommendation, { foreignKey: "recommended_product_id" });
ProductRecommendation.belongsTo(Product, { as: "recommendedProduct", foreignKey: "recommended_product_id" });

// Subscription → Quotation, Customer, Product, SubscriptionPlan
Quotation.hasMany(Subscription, { foreignKey: "quotation_id" });
Subscription.belongsTo(Quotation, { foreignKey: "quotation_id" });
Customer.hasMany(Subscription, { foreignKey: "customer_id" });
Subscription.belongsTo(Customer, { foreignKey: "customer_id" });
Product.hasMany(Subscription, { foreignKey: "product_id" });
Subscription.belongsTo(Product, { foreignKey: "product_id" });
SubscriptionPlan.hasMany(Subscription, { foreignKey: "plan_id" });
Subscription.belongsTo(SubscriptionPlan, { foreignKey: "plan_id" });

// Invoice → Quotation
Quotation.hasMany(Invoice, { foreignKey: "quotation_id" });
Invoice.belongsTo(Quotation, { foreignKey: "quotation_id" });

// BillingSchedule → Subscription
Subscription.hasMany(BillingSchedule, { foreignKey: "subscription_id" });
BillingSchedule.belongsTo(Subscription, { foreignKey: "subscription_id" });

// Negotiation → Quotation & Customer
Quotation.hasMany(Negotiation, { foreignKey: "quotation_id" });
Negotiation.belongsTo(Quotation, { foreignKey: "quotation_id" });
Customer.hasMany(Negotiation, { foreignKey: "customer_id" });
Negotiation.belongsTo(Customer, { foreignKey: "customer_id" });

// DealHealth → Quotation
Quotation.hasOne(DealHealth, { foreignKey: "quotation_id" });
DealHealth.belongsTo(Quotation, { foreignKey: "quotation_id" });

// DealEvent → Quotation & User
Quotation.hasMany(DealEvent, { foreignKey: "quotation_id" });
DealEvent.belongsTo(Quotation, { foreignKey: "quotation_id" });
User.hasMany(DealEvent, { foreignKey: "triggered_by" });
DealEvent.belongsTo(User, { as: "triggeredByUser", foreignKey: "triggered_by" });

// Alert → Quotation
Quotation.hasMany(Alert, { foreignKey: "quotation_id" });
Alert.belongsTo(Quotation, { foreignKey: "quotation_id" });

// ── Sync ─────────────────────────────────────────────────────────
(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅  All tables synced successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌  Sync failed:", err);
    process.exit(1);
  }
})();
