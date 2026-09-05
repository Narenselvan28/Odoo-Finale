require("dotenv").config();
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/database");

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

async function seedFromExcel() {
  const excelPath = path.resolve(__dirname, "../../DealFlow360_Seeded_Database.xlsx");
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ Excel file not found at: ${excelPath}`);
    process.exit(1);
  }

  console.log(`📊 Reading workbook from: ${excelPath}...`);
  const wb = XLSX.readFile(excelPath);

  const getSheetData = (sheetName) => {
    if (!wb.Sheets[sheetName]) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
  };

  console.log("🔄 Syncing and clearing database tables...");
  await sequelize.sync({ force: true });
  const defaultHashedPassword = await bcrypt.hash("password123", 10);

  // 1. Roles
  const rolesData = getSheetData("Roles");
  if (rolesData.length) {
    await Role.bulkCreate(rolesData);
    console.log(`  ✅ Seeded ${rolesData.length} Roles`);
  }

  // 2. Users
  const usersData = getSheetData("Users").map(u => ({
    ...u,
    password: defaultHashedPassword,
  }));
  if (usersData.length) {
    await User.bulkCreate(usersData);
    console.log(`  ✅ Seeded ${usersData.length} Users`);
  }

  // 3. Customer Tiers
  const tiersData = getSheetData("Customer Tiers");
  if (tiersData.length) {
    await CustomerTier.bulkCreate(tiersData);
    console.log(`  ✅ Seeded ${tiersData.length} Customer Tiers`);
  }

  // 4. Customers
  const customersData = getSheetData("Customers");
  if (customersData.length) {
    await Customer.bulkCreate(customersData);
    console.log(`  ✅ Seeded ${customersData.length} Customers`);
  }

  // 5. Categories
  const categoriesData = getSheetData("Categories");
  if (categoriesData.length) {
    await Category.bulkCreate(categoriesData);
    console.log(`  ✅ Seeded ${categoriesData.length} Categories`);
  }

  // 6. Products
  const productsData = getSheetData("Products");
  if (productsData.length) {
    await Product.bulkCreate(productsData);
    console.log(`  ✅ Seeded ${productsData.length} Products`);
  }

  // 7. Discount Rules
  const discountRulesData = getSheetData("Discount Rules");
  if (discountRulesData.length) {
    await DiscountRule.bulkCreate(discountRulesData);
    console.log(`  ✅ Seeded ${discountRulesData.length} Discount Rules`);
  }

  // 8. Price Lists & Items
  const priceListsData = getSheetData("Price Lists");
  if (priceListsData.length) {
    await PriceList.bulkCreate(priceListsData);
    console.log(`  ✅ Seeded ${priceListsData.length} Price Lists`);
  }

  const priceListItemsData = getSheetData("Price List Items");
  if (priceListItemsData.length) {
    await PriceListItem.bulkCreate(priceListItemsData);
    console.log(`  ✅ Seeded ${priceListItemsData.length} Price List Items`);
  }

  // 9. Warehouses & Inventory
  const warehousesData = getSheetData("Warehouses");
  if (warehousesData.length) {
    await Warehouse.bulkCreate(warehousesData);
    console.log(`  ✅ Seeded ${warehousesData.length} Warehouses`);
  }

  const inventoryData = getSheetData("Inventory Stock");
  if (inventoryData.length) {
    await Inventory.bulkCreate(inventoryData);
    console.log(`  ✅ Seeded ${inventoryData.length} Inventory Items`);
  }

  // 10. Quotations & Quotation Items
  const quotationsData = getSheetData("Quotations");
  if (quotationsData.length) {
    await Quotation.bulkCreate(quotationsData);
    console.log(`  ✅ Seeded ${quotationsData.length} Quotations`);
  }

  const quotationItemsData = getSheetData("Quotation Items");
  if (quotationItemsData.length) {
    await QuotationItem.bulkCreate(quotationItemsData);
    console.log(`  ✅ Seeded ${quotationItemsData.length} Quotation Items`);
  }

  // 11. Approvals & Audit Logs
  const approvalsData = getSheetData("Approvals");
  if (approvalsData.length) {
    await ApprovalRequest.bulkCreate(approvalsData);
    console.log(`  ✅ Seeded ${approvalsData.length} Approvals`);
  }

  const approvalAuditData = getSheetData("Approval Audit");
  if (approvalAuditData.length) {
    await ApprovalAuditLog.bulkCreate(approvalAuditData);
    console.log(`  ✅ Seeded ${approvalAuditData.length} Approval Audit Logs`);
  }

  // 12. Invoices & Billing
  const invoicesData = getSheetData("Invoices");
  if (invoicesData.length) {
    await Invoice.bulkCreate(invoicesData);
    console.log(`  ✅ Seeded ${invoicesData.length} Invoices`);
  }

  const billingData = getSheetData("Billing Schedules");
  if (billingData.length) {
    await BillingSchedule.bulkCreate(billingData);
    console.log(`  ✅ Seeded ${billingData.length} Billing Schedules`);
  }

  // 13. Subscriptions & Plans
  const plansData = getSheetData("Subscription Plans");
  if (plansData.length) {
    await SubscriptionPlan.bulkCreate(plansData);
    console.log(`  ✅ Seeded ${plansData.length} Subscription Plans`);
  }

  const subsData = getSheetData("Subscriptions");
  if (subsData.length) {
    await Subscription.bulkCreate(subsData);
    console.log(`  ✅ Seeded ${subsData.length} Subscriptions`);
  }

  // 14. Fulfillment & Logistics
  const fulfillmentData = getSheetData("Fulfillment Consignments");
  if (fulfillmentData.length) {
    await FulfillmentAllocation.bulkCreate(fulfillmentData);
    console.log(`  ✅ Seeded ${fulfillmentData.length} Fulfillment Allocations`);
  }

  // 15. Deal Health, Events, Risk Alerts & Negotiations
  const healthData = getSheetData("Deal Health");
  if (healthData.length) {
    await DealHealth.bulkCreate(healthData);
    console.log(`  ✅ Seeded ${healthData.length} Deal Health Records`);
  }

  const eventsData = getSheetData("Deal Events");
  if (eventsData.length) {
    await DealEvent.bulkCreate(eventsData);
    console.log(`  ✅ Seeded ${eventsData.length} Deal Events`);
  }

  const alertsData = getSheetData("Risk Alerts");
  if (alertsData.length) {
    await Alert.bulkCreate(alertsData);
    console.log(`  ✅ Seeded ${alertsData.length} Alerts`);
  }

  const negData = getSheetData("Negotiations");
  if (negData.length) {
    await Negotiation.bulkCreate(negData);
    console.log(`  ✅ Seeded ${negData.length} Negotiations`);
  }

  console.log("\n🎉 Complete database successfully seeded from DealFlow360_Seeded_Database.xlsx!");
}

if (require.main === module) {
  seedFromExcel().catch((err) => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  });
}

module.exports = { seedFromExcel };
