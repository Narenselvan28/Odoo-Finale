const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Import models
const User = require("../models/User.model");
const Role = require("../models/Role.model");
const Customer = require("../models/Customer.model");
const CustomerTier = require("../models/CustomerTier.model");
const Category = require("../models/Category.model");
const Product = require("../models/Product.model");
const DiscountRule = require("../models/DiscountRule.model");
const PriceList = require("../models/PriceList.model");
const PriceListItem = require("../models/PriceListItem.model");
const Warehouse = require("../models/Warehouse.model");
const Inventory = require("../models/Inventory.model");
const Quotation = require("../models/Quotation.model");
const QuotationItem = require("../models/QuotationItem.model");
const ApprovalRequest = require("../models/ApprovalRequest.model");
const ApprovalAuditLog = require("../models/ApprovalAuditLog.model");
const Invoice = require("../models/Invoice.model");
const BillingSchedule = require("../models/BillingSchedule.model");
const SubscriptionPlan = require("../models/SubscriptionPlan.model");
const Subscription = require("../models/Subscription.model");
const FulfillmentAllocation = require("../models/FulfillmentAllocation.model");
const DealHealth = require("../models/DealHealth.model");
const DealEvent = require("../models/DealEvent.model");
const Alert = require("../models/Alert.model");
const Negotiation = require("../models/Negotiation.model");

async function exportAll() {
  console.log("Fetching seeded data from MySQL database...");

  const [
    users,
    roles,
    customerTiers,
    customers,
    categories,
    products,
    discountRules,
    priceLists,
    priceListItems,
    warehouses,
    inventory,
    quotations,
    quotationItems,
    approvals,
    approvalAuditLogs,
    invoices,
    billingSchedules,
    subscriptionPlans,
    subscriptions,
    fulfillmentAllocations,
    dealHealth,
    dealEvents,
    alerts,
    negotiations,
  ] = await Promise.all([
    User.findAll({ raw: true, attributes: { exclude: ["password"] } }),
    Role.findAll({ raw: true }),
    CustomerTier.findAll({ raw: true }),
    Customer.findAll({ raw: true }),
    Category.findAll({ raw: true }),
    Product.findAll({ raw: true }),
    DiscountRule.findAll({ raw: true }),
    PriceList.findAll({ raw: true }),
    PriceListItem.findAll({ raw: true }),
    Warehouse.findAll({ raw: true }),
    Inventory.findAll({ raw: true }),
    Quotation.findAll({ raw: true }),
    QuotationItem.findAll({ raw: true }),
    ApprovalRequest.findAll({ raw: true }),
    ApprovalAuditLog.findAll({ raw: true }),
    Invoice.findAll({ raw: true }),
    BillingSchedule.findAll({ raw: true }),
    SubscriptionPlan.findAll({ raw: true }),
    Subscription.findAll({ raw: true }),
    FulfillmentAllocation.findAll({ raw: true }),
    DealHealth.findAll({ raw: true }),
    DealEvent.findAll({ raw: true }),
    Alert.findAll({ raw: true }),
    Negotiation.findAll({ raw: true }),
  ]);

  console.log("Data fetched. Constructing Excel workbook...");

  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = [
    { Entity: "System Platform", Count: "DealFlow 360 · Enterprise CPQ & Sales Operations" },
    { Entity: "Export Timestamp", Count: new Date().toISOString() },
    { Entity: "Currency Standard", Count: "INR (₹)" },
    { Entity: "Quotation Format", Count: "QT-YYYY-XXX (e.g. QT-2026-001)" },
    { Entity: "-------------------", Count: "-------------------" },
    { Entity: "Users & Personas", Count: users.length },
    { Entity: "RBAC Roles", Count: roles.length },
    { Entity: "Customer Tiers", Count: customerTiers.length },
    { Entity: "Enterprise Customers", Count: customers.length },
    { Entity: "Product Categories", Count: categories.length },
    { Entity: "Catalog Products / SKUs", Count: products.length },
    { Entity: "Discount Governance Rules", Count: discountRules.length },
    { Entity: "Commercial Price Lists", Count: priceLists.length },
    { Entity: "Price List Item Overrides", Count: priceListItems.length },
    { Entity: "Depot Warehouses", Count: warehouses.length },
    { Entity: "Inventory Ledger Records", Count: inventory.length },
    { Entity: "Quotations & Contracts", Count: quotations.length },
    { Entity: "Quotation Line Items", Count: quotationItems.length },
    { Entity: "Governance Approval Requests", Count: approvals.length },
    { Entity: "Approval Audit Logs", Count: approvalAuditLogs.length },
    { Entity: "Commercial Invoices", Count: invoices.length },
    { Entity: "Automated Billing Schedules", Count: billingSchedules.length },
    { Entity: "Subscription Plans", Count: subscriptionPlans.length },
    { Entity: "Customer Subscriptions", Count: subscriptions.length },
    { Entity: "Warehouse Consignments", Count: fulfillmentAllocations.length },
    { Entity: "Deal Health Telemetry", Count: dealHealth.length },
    { Entity: "Audit Event Stream", Count: dealEvents.length },
    { Entity: "Margin & Risk Alerts", Count: alerts.length },
    { Entity: "Counter-Proposal Negotiations", Count: negotiations.length },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "System Summary");

  // Helper to add sheet if data exists
  const addSheet = (data, sheetName) => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  addSheet(users, "Users");
  addSheet(roles, "Roles");
  addSheet(customerTiers, "Customer Tiers");
  addSheet(customers, "Customers");
  addSheet(categories, "Categories");
  addSheet(products, "Products");
  addSheet(discountRules, "Discount Rules");
  addSheet(priceLists, "Price Lists");
  addSheet(priceListItems, "Price List Items");
  addSheet(warehouses, "Warehouses");
  addSheet(inventory, "Inventory Stock");
  addSheet(quotations, "Quotations");
  addSheet(quotationItems, "Quotation Items");
  addSheet(approvals, "Approvals");
  addSheet(approvalAuditLogs, "Approval Audit");
  addSheet(invoices, "Invoices");
  addSheet(billingSchedules, "Billing Schedules");
  addSheet(subscriptionPlans, "Subscription Plans");
  addSheet(subscriptions, "Subscriptions");
  addSheet(fulfillmentAllocations, "Fulfillment Consignments");
  addSheet(dealHealth, "Deal Health");
  addSheet(dealEvents, "Deal Events");
  addSheet(alerts, "Risk Alerts");
  addSheet(negotiations, "Negotiations");

  // Save paths
  const rootPath = path.resolve(__dirname, "../../../DealFlow360_Seeded_Database.xlsx");
  const publicDir = path.resolve(__dirname, "../../../frontend/public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicPath = path.resolve(publicDir, "DealFlow360_Seeded_Database.xlsx");

  XLSX.writeFile(wb, rootPath);
  XLSX.writeFile(wb, publicPath);

  console.log(`✅ Excel file generated successfully!`);
  console.log(`Root file: ${rootPath}`);
  console.log(`Public download file: ${publicPath}`);
}

exportAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Export failed:", err);
    process.exit(1);
  });
