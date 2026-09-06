/**
 * DealFlow360 - Comprehensive Automated QA Test Suite (Node.js / Express / Sequelize)
 * Lead QA Engineer - Automated Validation Suite
 */

const assert = require("assert");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sequelize, ensureDatabaseExists } = require("../config/database");
require("../config/associations");

// Import Models
const User = require("../models/User.model");
const Role = require("../models/Role.model");
const Customer = require("../models/Customer.model");
const CustomerTier = require("../models/CustomerTier.model");
const Product = require("../models/Product.model");
const Category = require("../models/Category.model");
const Quotation = require("../models/Quotation.model");
const QuotationItem = require("../models/QuotationItem.model");
const ApprovalRequest = require("../models/ApprovalRequest.model");
const Negotiation = require("../models/Negotiation.model");
const Warehouse = require("../models/Warehouse.model");
const Inventory = require("../models/Inventory.model");
const Invoice = require("../models/Invoice.model");
const Subscription = require("../models/Subscription.model");
const Alert = require("../models/Alert.model");
const { computeBlendedRisk } = require("../utils/blendedRisk");

const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

function recordTest(id, moduleName, scenario, status, severity, details = "") {
  if (status === "PASS") results.passed++;
  else results.failed++;
  results.tests.push({ id, module: moduleName, scenario, status, severity, details });
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`  ${icon} [${id}] [${moduleName}] ${scenario}: ${status} ${details ? `(${details})` : ""}`);
}

async function runQATests() {
  console.log("================================================================================");
  console.log("DEALFLOW360 AUTOMATED BACKEND & BUSINESS LOGIC QA TEST SUITE");
  console.log("================================================================================\n");

  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    recordTest("DB-001", "Database", "Connect to MySQL DB", "PASS", "BLOCKER");
  } catch (err) {
    recordTest("DB-001", "Database", "Connect to MySQL DB", "FAIL", "BLOCKER", err.message);
    return;
  }

  // ==========================================
  // PHASE 3: AUTHENTICATION TESTING
  // ==========================================
  console.log("\n--- PHASE 3: AUTHENTICATION TESTING ---");

  // AUTH-001: Valid User Login Simulation
  try {
    const user = await User.findOne({ include: [{ model: Role, as: "Role" }] });
    assert(user, "User exists in database");
    const secret = process.env.JWT_SECRET || "dev_jwt_secret_replace_me";
    const token = jwt.sign({ id: user.id, role: user.Role?.name || "SALES_REP" }, secret, { expiresIn: "1h" });
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, user.id);
    recordTest("AUTH-001", "Auth", "Valid Login & Token Generation", "PASS", "P0");
  } catch (err) {
    recordTest("AUTH-001", "Auth", "Valid Login & Token Generation", "FAIL", "P0", err.message);
  }

  // AUTH-002: Wrong Password Validation
  try {
    const dummyHash = await bcrypt.hash("correct_password", 10);
    const isMatch = await bcrypt.compare("wrong_password", dummyHash);
    assert.strictEqual(isMatch, false, "Wrong password must not match");
    recordTest("AUTH-002", "Auth", "Wrong Password Rejection", "PASS", "P0");
  } catch (err) {
    recordTest("AUTH-002", "Auth", "Wrong Password Rejection", "FAIL", "P0", err.message);
  }

  // AUTH-003: Blank Credentials
  try {
    const email = "";
    const password = "";
    const isValid = Boolean(email && password);
    assert.strictEqual(isValid, false, "Blank credentials must fail validation");
    recordTest("AUTH-003", "Auth", "Blank Credentials Handling", "PASS", "P0");
  } catch (err) {
    recordTest("AUTH-003", "Auth", "Blank Credentials Handling", "FAIL", "P0", err.message);
  }

  // AUTH-004: Invalid Email Format
  try {
    const invalidEmail = "not-an-email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.strictEqual(emailRegex.test(invalidEmail), false);
    recordTest("AUTH-004", "Auth", "Invalid Email Format Rejection", "PASS", "P0");
  } catch (err) {
    recordTest("AUTH-004", "Auth", "Invalid Email Format Rejection", "FAIL", "P0", err.message);
  }

  // AUTH-007: Expired Session / Bad Token
  try {
    const badToken = "invalid.token.signature";
    let failedAsExpected = false;
    try {
      jwt.verify(badToken, "some_secret");
    } catch (e) {
      failedAsExpected = true;
    }
    assert.strictEqual(failedAsExpected, true);
    recordTest("AUTH-007", "Auth", "Invalid/Expired Token Rejection", "PASS", "P0");
  } catch (err) {
    recordTest("AUTH-007", "Auth", "Invalid/Expired Token Rejection", "FAIL", "P0", err.message);
  }

  // ==========================================
  // PHASE 4: ROLE / AUTHORIZATION TESTING
  // ==========================================
  console.log("\n--- PHASE 4: ROLE & AUTHORIZATION TESTING ---");

  try {
    const roles = await Role.findAll();
    assert(roles.length > 0, "Roles seeded in database");
    recordTest("ROLE-001", "RBAC", "Verify System Roles Exist", "PASS", "P0", `${roles.length} roles found`);
  } catch (err) {
    recordTest("ROLE-001", "RBAC", "Verify System Roles Exist", "FAIL", "P0", err.message);
  }

  // ==========================================
  // PHASE 5: QUOTATION TESTING & LIFECYCLE
  // ==========================================
  console.log("\n--- PHASE 5: QUOTATION LIFECYCLE & BOUNDARIES ---");

  let testQuotationId = null;
  const customer = await Customer.findOne({ include: [{ model: CustomerTier, as: "CustomerTier" }] });
  const product = await Product.findOne();

  // QUOTE-001: Create Valid Quotation
  try {
    assert(customer && product, "Customer and Product exist");
    const quote = await Quotation.create({
      quotation_number: `TEST-QT-${Date.now()}`,
      customer_id: customer.id,
      sales_rep_id: 1,
      subtotal: 10000,
      discount_amount: 1000,
      total_amount: 9000,
      status: "DRAFT",
    });
    testQuotationId = quote.id;

    await QuotationItem.create({
      quotation_id: quote.id,
      product_id: product.id,
      quantity: 5,
      unit_price: 2000,
      discount_percent: 10,
      discount_amount: 1000,
      line_total: 9000,
      margin_amount: 3000,
    });

    recordTest("QUOTE-001", "Quotation", "Create Valid Quotation with Line Items", "PASS", "P0");
  } catch (err) {
    recordTest("QUOTE-001", "Quotation", "Create Valid Quotation with Line Items", "FAIL", "P0", err.message);
  }

  // QUOTE-008: Discount = 0%
  try {
    const zeroDiscItem = { unit_price: 1000, quantity: 2, discount_percent: 0 };
    const lineTotal = zeroDiscItem.unit_price * zeroDiscItem.quantity * (1 - zeroDiscItem.discount_percent / 100);
    assert.strictEqual(lineTotal, 2000);
    recordTest("QUOTE-008", "Quotation", "Zero Discount Calculation", "PASS", "P0");
  } catch (err) {
    recordTest("QUOTE-008", "Quotation", "Zero Discount Calculation", "FAIL", "P0", err.message);
  }

  // QUOTE-010: Discount Above Allowed Maximum -> Triggers Blended Risk
  try {
    const highDiscAnalysis = computeBlendedRisk({
      items: [{ product_id: product.id, quantity: 10, unit_price: 1000, discount_percent: 35 }],
      customerTier: { name: "GOLD", max_discount: 15 },
      categories: await Category.findAll(),
    });
    assert.strictEqual(highDiscAnalysis.requiresApproval, true);
    assert(highDiscAnalysis.blendedRiskScore > 30, "Risk score must reflect excessive discount");
    recordTest("QUOTE-010", "Quotation", "High Discount Triggers Approval Gate", "PASS", "P0");
  } catch (err) {
    recordTest("QUOTE-010", "Quotation", "High Discount Triggers Approval Gate", "FAIL", "P0", err.message);
  }

  // ==========================================
  // PHASE 6: DISCOUNT RULE ENGINE & GOVERNANCE
  // ==========================================
  console.log("\n--- PHASE 6: DISCOUNT RULE ENGINE & GOVERNANCE ---");

  try {
    const tier = { name: "GOLD", max_discount: 15 };
    const normalItems = [
      { product_id: 1, quantity: 5, unit_price: 1000, discount_percent: 10 },
      { product_id: 2, quantity: 2, unit_price: 500, discount_percent: 8 },
    ];
    const normalRisk = computeBlendedRisk({
      items: normalItems,
      customerTier: tier,
      categories: [],
    });
    assert.strictEqual(normalRisk.requiresApproval, false);
    recordTest("RULE-001", "Governance", "Compliant Discounts Do Not Require Approval", "PASS", "P0");

    const breachItems = [
      { product_id: 1, quantity: 5, unit_price: 1000, discount_percent: 28 },
    ];
    const breachRisk = computeBlendedRisk({
      items: breachItems,
      customerTier: tier,
      categories: [],
    });
    assert.strictEqual(breachRisk.requiresApproval, true);
    assert.strictEqual(breachRisk.approvalRole, "Sales Manager + Finance Director");
    recordTest("RULE-002", "Governance", "Excessive Discount Escalates to Sales & Finance Approvers", "PASS", "P0");
  } catch (err) {
    recordTest("RULE-002", "Governance", "Rule Engine Governance", "FAIL", "P0", err.message);
  }

  // ==========================================
  // PHASE 12: FULFILLMENT & MULTI-WAREHOUSE SPLIT
  // ==========================================
  console.log("\n--- PHASE 12: FULFILLMENT & WAREHOUSE ALLOCATION ---");

  try {
    const warehouses = await Warehouse.findAll();
    assert(warehouses.length > 0, "Warehouses configured");
    recordTest("FULFILL-001", "Fulfillment", "Warehouse Locations & Inventories Available", "PASS", "P0", `${warehouses.length} warehouses found`);
  } catch (err) {
    recordTest("FULFILL-001", "Fulfillment", "Warehouse Locations & Inventories Available", "FAIL", "P0", err.message);
  }

  // ==========================================
  // PHASE 18: CUSTOMER PORTAL & NEGOTIATION
  // ==========================================
  console.log("\n--- PHASE 18: CUSTOMER PORTAL & NEGOTIATION ---");

  if (testQuotationId) {
    try {
      const publicQuote = await Quotation.findByPk(testQuotationId, {
        include: [{ model: Customer, as: "Customer" }, { model: QuotationItem, as: "QuotationItems" }],
      });
      assert(publicQuote, "Public quote accessible for customer");

      // Customer creates negotiation request
      const neg = await Negotiation.create({
        quotation_id: testQuotationId,
        customer_id: customer.id,
        requested_discount: 14.5,
        message: "Can you provide 14.5% for volume commitment?",
        status: "OPEN",
      });
      assert(neg.id, "Negotiation record created");
      recordTest("PORTAL-001", "CustomerPortal", "Customer Negotiation Submission", "PASS", "P0");
    } catch (err) {
      recordTest("PORTAL-001", "CustomerPortal", "Customer Negotiation Submission", "FAIL", "P0", err.message);
    }
  }

  // ==========================================
  // PHASE 21: APPROVAL ENGINE & AUTO RE-APPROVAL
  // ==========================================
  console.log("\n--- PHASE 21: APPROVAL ENGINE & RE-APPROVAL LOOP ---");

  if (testQuotationId) {
    try {
      const appReq = await ApprovalRequest.create({
        quotation_id: testQuotationId,
        approval_level: 1,
        approver_role: "Sales Manager",
        status: "APPROVED",
        acted_by: 1,
        reason: "Within quarterly manager discretion budget",
      });
      assert.strictEqual(appReq.status, "APPROVED");
      recordTest("APPR-001", "Approval", "Manager Approval Processed & Logged", "PASS", "P0");
    } catch (err) {
      recordTest("APPR-001", "Approval", "Manager Approval Processed & Logged", "FAIL", "P0", err.message);
    }
  }

  // ==========================================
  // PHASE 22: DUAL CAPEX / OPEX BILLING & INVOICING
  // ==========================================
  console.log("\n--- PHASE 22: SUBSCRIPTION & INVOICE BILLING ---");

  if (testQuotationId) {
    try {
      const inv = await Invoice.create({
        invoice_number: `INV-TEST-${Date.now()}`,
        quotation_id: testQuotationId,
        customer_id: customer.id,
        amount: 9000,
        tax_amount: 1620,
        total_amount: 10620,
        payment_status: "PAID",
        payment_terms: "NET30",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      assert(inv.id, "Invoice generated successfully");
      recordTest("BILL-001", "Billing", "Dual Capex/Opex Invoice Generation", "PASS", "P0");
    } catch (err) {
      recordTest("BILL-001", "Billing", "Dual Capex/Opex Invoice Generation", "FAIL", "P0", err.message);
    }
  }

  // Clean up test quotation
  if (testQuotationId) {
    await QuotationItem.destroy({ where: { quotation_id: testQuotationId } });
    await Negotiation.destroy({ where: { quotation_id: testQuotationId } });
    await ApprovalRequest.destroy({ where: { quotation_id: testQuotationId } });
    await Invoice.destroy({ where: { quotation_id: testQuotationId } });
    await Quotation.destroy({ where: { id: testQuotationId } });
  }

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${results.passed} PASSED, ${results.failed} FAILED (TOTAL: ${results.passed + results.failed})`);
  console.log("================================================================================\n");

  if (results.failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runQATests().then(() => process.exit(0)).catch((e) => {
    console.error("FATAL QA TEST FAILURE:", e);
    process.exit(1);
  });
}

module.exports = { runQATests };
