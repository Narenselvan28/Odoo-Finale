const router = require("express").Router();
const {
  protect,
  requireAdmin,
  requireSalesManager,
  requireSales,
  requireFinance,
  requireWarehouse,
} = require("../middleware/auth.middleware");
const crudController = require("../utils/crudController");
const Warehouse = require("../models/Warehouse.model");
const DiscountRule = require("../models/DiscountRule.model");
const PriceList = require("../models/PriceList.model");
const PriceListItem = require("../models/PriceListItem.model");
const Negotiation = require("../models/Negotiation.model");
const DealHealth = require("../models/DealHealth.model");
const DealEvent = require("../models/DealEvent.model");
const Alert = require("../models/Alert.model");
const Invoice = require("../models/Invoice.model");
const Subscription = require("../models/Subscription.model");
const SubscriptionPlan = require("../models/SubscriptionPlan.model");
const BillingSchedule = require("../models/BillingSchedule.model");
const FulfillmentAllocation = require("../models/FulfillmentAllocation.model");
const ProductRecommendation = require("../models/ProductRecommendation.model");
const ApprovalAuditLog = require("../models/ApprovalAuditLog.model");

const makeRoutes = (ctrl, guard) => {
  const r = require("express").Router();
  r.use(protect);
  if (guard) r.use(guard);
  r.get("/", ctrl.getAll);
  r.get("/:id", ctrl.getOne);
  r.post("/", ctrl.create);
  r.put("/:id", ctrl.update);
  r.delete("/:id", ctrl.remove);
  return r;
};

// Supply Chain & Facilities (Warehouse Manager / Admin)
router.use("/warehouses",              makeRoutes(crudController(Warehouse, "Warehouse not found"), requireWarehouse));
router.use("/fulfillment-allocations", makeRoutes(crudController(FulfillmentAllocation, "Allocation not found"), requireWarehouse));

// Pricing Rules & Strategies (Sales Manager / Admin)
router.use("/discount-rules",          makeRoutes(crudController(DiscountRule, "Discount rule not found"), requireSalesManager));
router.use("/price-lists",             makeRoutes(crudController(PriceList, "Price list not found"), requireSalesManager));
router.use("/price-list-items",        makeRoutes(crudController(PriceListItem, "Price list item not found"), requireSalesManager));

// Telemetry & Audits (Sales Manager / Admin)
router.use("/deal-health",             makeRoutes(crudController(DealHealth, "Deal health not found"), requireSalesManager));
router.use("/deal-events",             makeRoutes(crudController(DealEvent, "Deal event not found"), requireSalesManager));
router.use("/alerts",                  makeRoutes(crudController(Alert, "Alert not found"), requireSalesManager));
router.use("/approval-audit-logs",     makeRoutes(crudController(ApprovalAuditLog, "Audit log not found"), requireSalesManager));

// Sales Operations (Sales Rep / Sales Manager / Admin)
router.use("/negotiations",            makeRoutes(crudController(Negotiation, "Negotiation not found"), requireSales));
router.use("/product-recommendations", makeRoutes(crudController(ProductRecommendation, "Recommendation not found"), requireSales));

// Revenue & Billing Operations (Finance Manager / Admin)
router.use("/invoices",                makeRoutes(crudController(Invoice, "Invoice not found"), requireFinance));
router.use("/subscriptions",           makeRoutes(crudController(Subscription, "Subscription not found"), requireFinance));
router.use("/subscription-plans",      makeRoutes(crudController(SubscriptionPlan, "Plan not found"), requireFinance));
router.use("/billing-schedules",       makeRoutes(crudController(BillingSchedule, "Billing schedule not found"), requireFinance));

module.exports = router;
