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

// ── Helpers ──────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const randDecimal = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randDate = (daysBack = 365) => {
  const d = new Date();
  d.setDate(d.getDate() - rand(0, daysBack));
  return d.toISOString().split("T")[0];
};
const bcrypt = require("bcryptjs");

const indianFirstNames = ["Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan","Shaurya","Atharva","Advik","Pranav","Advait","Dhruv","Kabir","Ritvik","Aaradhya","Ananya","Aadhya","Diya","Saanvi","Pihu","Priya","Riya","Rashi","Meera","Neha","Pooja"];
const indianLastNames = ["Sharma","Verma","Patel","Singh","Kumar","Gupta","Joshi","Agarwal","Mehta","Nair","Iyer","Reddy","Rao","Pillai","Bhat","Malhotra","Chopra","Kapoor","Bansal","Saxena"];
const companies = ["TechNova Solutions","Infosys Ltd","Wipro Technologies","HCL Systems","Tata Consultancy","Reliance Digital","Mahindra Tech","Birla Soft","Bajaj Finserv","HDFC Securities","Axis Tech","Kotak Systems","Sun Pharma IT","Dr Reddys Digital","Cipla Tech","Adani Systems","Vedanta IT","JSW Solutions","Zee Digital","Godrej Infotech","Muthoot Tech","Exide Digital","Dabur Systems","Marico IT","Pidilite Tech","Titan Systems","Voltas Digital","Havells Tech","Crompton IT","V-Guard Systems"];
const industries = ["Manufacturing","Retail","Healthcare","Finance","Technology","Education","Logistics","Real Estate","FMCG","Pharma","Automotive","Energy","Telecom","Media","Agriculture"];
const productNames = ["Enterprise CRM Suite","Cloud ERP Platform","AI Analytics Engine","Security Gateway Pro","Data Warehouse Solution","IoT Integration Hub","DevOps Pipeline","Mobile Backend","Payment Gateway","HR Management System","Supply Chain Module","BI Dashboard","Customer Portal","API Management","Email Marketing Suite","Video Conferencing","Document Management","E-commerce Platform","Inventory Optimizer","Risk Analytics Tool","Compliance Module","Digital Signature","Asset Tracker","Fleet Management","Field Service App","Learning Management","Recruitment Module","Payroll System","Tax Filing Solution","Audit Management"];
const skus = productNames.map((_, i) => `SKU-${String(i + 1).padStart(4, "0")}`);
const quotationStatuses = ["DRAFT","PENDING_APPROVAL","APPROVED","REJECTED","UNDER_NEGOTIATION","CONFIRMED","FULFILLMENT","COMPLETED","CANCELLED"];
const approvalStatuses = ["PENDING","APPROVED","REJECTED","RETURNED"];
const warehouseNames = ["Mumbai Central WH","Delhi North WH","Bangalore Tech Park WH","Chennai Port WH","Hyderabad Hub WH","Pune Industrial WH","Kolkata East WH","Ahmedabad WH","Surat Distribution WH","Jaipur WH"];

// ── Main Seeder ──────────────────────────────────────────────────
(async () => {
  try {
    console.log("🌱 Starting seeder...\n");

    // 1. Roles
    console.log("Seeding roles...");
    const roles = await Role.bulkCreate([
      { name: "admin" },
      { name: "sales_rep" },
      { name: "sales_manager" },
      { name: "finance_manager" },
      { name: "warehouse_manager" },
    ], { ignoreDuplicates: true });
    const roleIds = (await Role.findAll()).map(r => r.id);
    console.log(`  ✅ ${roles.length} roles`);

    // 2. Users (50)
    console.log("Seeding users...");
    const hashedPw = await bcrypt.hash("password123", 12);
    const usersData = Array.from({ length: 50 }, (_, i) => ({
      name: `${pick(indianFirstNames)} ${pick(indianLastNames)}`,
      email: `user${i + 1}@dealflow360.com`,
      password: hashedPw,
      role: pick(["user", "admin"]),
      isActive: true,
    }));
    await User.bulkCreate(usersData, { ignoreDuplicates: true });
    const users = await User.findAll();
    console.log(`  ✅ ${users.length} users`);

    // 3. Customer Tiers
    console.log("Seeding customer tiers...");
    await CustomerTier.bulkCreate([
      { name: "Bronze", max_discount: 5 },
      { name: "Silver", max_discount: 10 },
      { name: "Gold", max_discount: 15 },
      { name: "Platinum", max_discount: 25 },
      { name: "Diamond", max_discount: 35 },
    ], { ignoreDuplicates: true });
    const tiers = await CustomerTier.findAll();
    console.log(`  ✅ ${tiers.length} tiers`);

    // 4. Customers (100)
    console.log("Seeding customers...");
    const customersData = Array.from({ length: 100 }, (_, i) => ({
      name: companies[i % companies.length] + (i >= companies.length ? ` ${Math.ceil(i / companies.length)}` : ""),
      email: `contact${i + 1}@${companies[i % companies.length].toLowerCase().replace(/\s+/g, "")}.com`,
      phone: `+91 ${rand(70000, 99999)} ${rand(10000, 99999)}`,
      tier_id: pick(tiers).id,
      industry: pick(industries),
    }));
    await Customer.bulkCreate(customersData);
    const customers = await Customer.findAll();
    console.log(`  ✅ ${customers.length} customers`);

    // 5. Categories
    console.log("Seeding categories...");
    await Category.bulkCreate([
      { name: "ERP & CRM", max_discount: 20 },
      { name: "Cloud Infrastructure", max_discount: 15 },
      { name: "Cybersecurity", max_discount: 10 },
      { name: "Analytics & BI", max_discount: 18 },
      { name: "HR & Payroll", max_discount: 12 },
      { name: "Supply Chain", max_discount: 15 },
      { name: "Digital Marketing", max_discount: 25 },
      { name: "DevOps & CI/CD", max_discount: 20 },
    ], { ignoreDuplicates: true });
    const categories = await Category.findAll();
    console.log(`  ✅ ${categories.length} categories`);

    // 6. Products (30)
    console.log("Seeding products...");
    const productsData = productNames.map((name, i) => ({
      name,
      category_id: pick(categories).id,
      sku: skus[i],
      description: `Enterprise-grade ${name} designed for scalability and performance.`,
      unit: pick(["License", "User/Month", "Instance", "GB", "API Calls"]),
      base_price: randDecimal(2500, 42000),
      cost_price: randDecimal(1200, 22000),
      tax_percent: pick([0, 5, 12, 18]),
      product_type: pick(["ONE_TIME", "SUBSCRIPTION"]),
      is_active: true,
    }));
    await Product.bulkCreate(productsData, { ignoreDuplicates: true });
    const products = await Product.findAll();
    console.log(`  ✅ ${products.length} products`);

    // 7. Price Lists (10)
    console.log("Seeding price lists...");
    const priceListsData = tiers.map(tier => ({
      name: `${tier.name} Price List`,
      customer_tier_id: tier.id,
      currency: "INR",
      is_active: true,
    }));
    await PriceList.bulkCreate(priceListsData);
    const priceLists = await PriceList.findAll();

    // 8. Price List Items (150)
    console.log("Seeding price list items...");
    const priceListItemsData = [];
    for (const pl of priceLists) {
      for (const product of products) {
        priceListItemsData.push({
          price_list_id: pl.id,
          product_id: product.id,
          price: randDecimal(product.base_price * 0.9, product.base_price * 1.1),
        });
      }
    }
    await PriceListItem.bulkCreate(priceListItemsData);
    console.log(`  ✅ ${priceListItemsData.length} price list items`);

    // 9. Discount Rules (40)
    console.log("Seeding discount rules...");
    const discountRulesData = [];
    for (const tier of tiers) {
      for (const cat of categories) {
        discountRulesData.push({
          customer_tier_id: tier.id,
          category_id: cat.id,
          max_discount: randDecimal(5, 30),
          risk_level: pick(["LOW", "MEDIUM", "HIGH"]),
        });
      }
    }
    await DiscountRule.bulkCreate(discountRulesData);
    console.log(`  ✅ ${discountRulesData.length} discount rules`);

    // 10. Warehouses (10)
    console.log("Seeding warehouses...");
    const warehousesData = warehouseNames.map((name, i) => ({
      name,
      location: `${name.replace(" WH", "")}, India`,
      shipping_cost_weight: randDecimal(10, 100),
    }));
    await Warehouse.bulkCreate(warehousesData);
    const warehouses = await Warehouse.findAll();
    console.log(`  ✅ ${warehouses.length} warehouses`);

    // 11. Subscription Plans (5)
    console.log("Seeding subscription plans...");
    await SubscriptionPlan.bulkCreate([
      { name: "Starter", billing_cycle: "MONTHLY", price: 1499, proration_enabled: true, cancellation_refund_enabled: true },
      { name: "Growth", billing_cycle: "MONTHLY", price: 4999, proration_enabled: true, cancellation_refund_enabled: true },
      { name: "Professional", billing_cycle: "QUARTERLY", price: 12999, proration_enabled: true, cancellation_refund_enabled: true },
      { name: "Enterprise", billing_cycle: "YEARLY", price: 49999, proration_enabled: true, cancellation_refund_enabled: false },
      { name: "Ultimate", billing_cycle: "YEARLY", price: 99999, proration_enabled: false, cancellation_refund_enabled: false },
    ], { ignoreDuplicates: true });
    const subPlans = await SubscriptionPlan.findAll();
    console.log(`  ✅ ${subPlans.length} subscription plans`);

    // 12. Quotations (200) + Items (600+)
    console.log("Seeding quotations & items...");
    const quotationsData = Array.from({ length: 200 }, (_, i) => {
      const status = pick(quotationStatuses);
      return {
        quotation_number: `QT-2026-${String(i + 1).padStart(3, "0")}`,
        customer_id: pick(customers).id,
        sales_rep_id: pick(users).id,
        status,
        subtotal: 0,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        margin_amount: 0,
        margin_percent: 0,
        risk_score: randDecimal(0, 100),
        risk_level: pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
        valid_until: randDate(180),
      };
    });
    await Quotation.bulkCreate(quotationsData, { ignoreDuplicates: true });
    const quotations = await Quotation.findAll();

    // Quotation Items (2-4 per quotation = ~500-800 items)
    const qItemsData = [];
    for (const q of quotations) {
      const itemCount = rand(2, 4);
      let subtotal = 0, discountAmt = 0, taxAmt = 0, marginAmt = 0;
      for (let i = 0; i < itemCount; i++) {
        const product = pick(products);
        const qty = rand(1, 6);
        const unitPrice = randDecimal(product.base_price * 0.85, product.base_price);
        const discPct = randDecimal(0, 20);
        const discAmt = parseFloat(((unitPrice * qty * discPct) / 100).toFixed(2));
        const lineTotal = parseFloat((unitPrice * qty - discAmt).toFixed(2));
        const costPrice = parseFloat(product.cost_price);
        const margin = parseFloat(((unitPrice - costPrice) * qty).toFixed(2));
        subtotal += unitPrice * qty;
        discountAmt += discAmt;
        taxAmt += parseFloat(((lineTotal * product.tax_percent) / 100).toFixed(2));
        marginAmt += margin;
        qItemsData.push({
          quotation_id: q.id,
          product_id: product.id,
          quantity: qty,
          unit_price: unitPrice,
          discount_percent: discPct,
          discount_amount: discAmt,
          line_total: lineTotal,
          cost_price: costPrice,
          margin_amount: margin,
        });
      }
      await q.update({
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount_amount: parseFloat(discountAmt.toFixed(2)),
        tax_amount: parseFloat(taxAmt.toFixed(2)),
        total_amount: parseFloat((subtotal - discountAmt + taxAmt).toFixed(2)),
        margin_amount: parseFloat(marginAmt.toFixed(2)),
        margin_percent: subtotal > 0 ? parseFloat(((marginAmt / subtotal) * 100).toFixed(2)) : 0,
      });
    }
    await QuotationItem.bulkCreate(qItemsData);
    const quotationItems = await QuotationItem.findAll();
    console.log(`  ✅ ${quotations.length} quotations, ${quotationItems.length} items`);

    // 13. Approval Requests (150)
    console.log("Seeding approvals...");
    const approvalRoles = ["sales_manager", "finance_manager", "ceo"];
    const approvableQuotations = quotations.filter(q =>
      ["PENDING_APPROVAL", "APPROVED", "REJECTED", "UNDER_NEGOTIATION"].includes(q.status)
    );
    const approvalsData = approvableQuotations.slice(0, 150).map(q => ({
      quotation_id: q.id,
      approval_level: rand(1, 3),
      approver_role: pick(approvalRoles),
      status: pick(approvalStatuses),
      reason: pick(["Discount too high", "Margin acceptable", "Needs revision", "Approved by manager", null]),
      acted_by: pick(users).id,
      acted_at: new Date(),
    }));
    await ApprovalRequest.bulkCreate(approvalsData);
    const approvals = await ApprovalRequest.findAll();
    console.log(`  ✅ ${approvals.length} approval requests`);

    // 14. Approval Audit Logs (200)
    console.log("Seeding audit logs...");
    const auditLogsData = Array.from({ length: 200 }, () => ({
      quotation_id: pick(quotations).id,
      user_id: pick(users).id,
      action: pick(["APPROVED", "REJECTED", "RETURNED", "SUBMITTED", "REVISED"]),
      old_status: pick(quotationStatuses),
      new_status: pick(quotationStatuses),
      reason: pick(["Auto-approved", "Manual review", "Policy violation", "Customer request", null]),
    }));
    await ApprovalAuditLog.bulkCreate(auditLogsData);
    console.log(`  ✅ 200 audit logs`);

    // 15. Inventory (products × warehouses = 300)
    console.log("Seeding inventory...");
    const inventoryData = [];
    const usedPairs = new Set();
    for (const warehouse of warehouses) {
      for (const product of products) {
        const key = `${warehouse.id}-${product.id}`;
        if (!usedPairs.has(key)) {
          usedPairs.add(key);
          inventoryData.push({
            warehouse_id: warehouse.id,
            product_id: product.id,
            available_quantity: rand(0, 5000),
            reserved_quantity: rand(0, 500),
          });
        }
      }
    }
    await Inventory.bulkCreate(inventoryData, { ignoreDuplicates: true });
    console.log(`  ✅ ${inventoryData.length} inventory records`);

    // 16. Fulfillment Allocations (200)
    console.log("Seeding fulfillment allocations...");
    const confirmedItems = quotationItems.slice(0, 200);
    const allocationsData = confirmedItems.map(item => ({
      quotation_item_id: item.id,
      warehouse_id: pick(warehouses).id,
      allocated_quantity: rand(1, item.quantity),
      shipping_cost: randDecimal(100, 5000),
      status: pick(["ALLOCATED", "SHIPPED", "DELIVERED", "BACKORDER"]),
    }));
    await FulfillmentAllocation.bulkCreate(allocationsData);
    console.log(`  ✅ ${allocationsData.length} fulfillment allocations`);

    // 17. Product Recommendations (50)
    console.log("Seeding product recommendations...");
    const recsData = [];
    const recPairs = new Set();
    for (let i = 0; i < 50; i++) {
      const p1 = pick(products);
      const p2 = pick(products);
      const key = `${p1.id}-${p2.id}`;
      if (p1.id !== p2.id && !recPairs.has(key)) {
        recPairs.add(key);
        recsData.push({
          product_id: p1.id,
          recommended_product_id: p2.id,
          recommendation_type: pick(["UPSELL", "CROSS_SELL"]),
          score: randDecimal(1, 10),
          min_margin_percent: randDecimal(5, 30),
          is_promoted: Math.random() > 0.7,
        });
      }
    }
    await ProductRecommendation.bulkCreate(recsData, { ignoreDuplicates: true });
    console.log(`  ✅ ${recsData.length} recommendations`);

    // 18. Subscriptions (80)
    console.log("Seeding subscriptions...");
    const subsData = quotations.slice(0, 80).map(q => {
      const start = randDate(365);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      return {
        quotation_id: q.id,
        customer_id: q.customer_id,
        product_id: pick(products.filter(p => p.product_type === "SUBSCRIPTION") || products).id,
        plan_id: pick(subPlans).id,
        quantity: rand(1, 20),
        start_date: start,
        end_date: end.toISOString().split("T")[0],
        status: pick(["ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"]),
        next_billing_date: randDate(30),
      };
    });
    await Subscription.bulkCreate(subsData);
    const subscriptions = await Subscription.findAll();
    console.log(`  ✅ ${subscriptions.length} subscriptions`);

    // 19. Invoices (150)
    console.log("Seeding invoices...");
    const invoicesData = quotations.slice(0, 150).map((q, i) => ({
      quotation_id: q.id,
      invoice_number: `INV-2024-${String(i + 1).padStart(5, "0")}`,
      invoice_type: pick(["ONE_TIME", "RECURRING"]),
      amount: q.total_amount || randDecimal(25000, 150000),
      status: pick(["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"]),
      due_date: randDate(90),
    }));
    await Invoice.bulkCreate(invoicesData, { ignoreDuplicates: true });
    console.log(`  ✅ ${invoicesData.length} invoices`);

    // 20. Billing Schedules (160)
    console.log("Seeding billing schedules...");
    const billingData = [];
    for (const sub of subscriptions.slice(0, 80)) {
      billingData.push({
        subscription_id: sub.id,
        billing_date: randDate(365),
        amount: randDecimal(2500, 24000),
        status: pick(["PENDING", "INVOICED", "PAID", "CANCELLED"]),
      });
      billingData.push({
        subscription_id: sub.id,
        billing_date: randDate(30),
        amount: randDecimal(2500, 24000),
        status: pick(["PENDING", "INVOICED", "PAID", "CANCELLED"]),
      });
    }
    await BillingSchedule.bulkCreate(billingData);
    console.log(`  ✅ ${billingData.length} billing schedules`);

    // 21. Negotiations (100)
    console.log("Seeding negotiations...");
    const negsData = quotations.slice(0, 100).map(q => ({
      quotation_id: q.id,
      customer_id: q.customer_id,
      requested_discount: randDecimal(5, 40),
      message: pick([
        "Requesting additional discount for bulk order",
        "Can you match competitor pricing?",
        "Budget constraints, need 20% off",
        "Long-term partnership discount expected",
        "Please revise the pricing for annual contract",
      ]),
      status: pick(["OPEN", "APPROVED", "REJECTED", "COUNTERED", "CLOSED"]),
    }));
    await Negotiation.bulkCreate(negsData);
    console.log(`  ✅ ${negsData.length} negotiations`);

    // 22. Deal Health (150)
    console.log("Seeding deal health...");
    const usedQuotationIds = new Set();
    const dealHealthData = [];
    for (const q of quotations.slice(0, 150)) {
      if (!usedQuotationIds.has(q.id)) {
        usedQuotationIds.add(q.id);
        const hs = randDecimal(10, 100);
        dealHealthData.push({
          quotation_id: q.id,
          health_score: hs,
          discount_risk: randDecimal(0, 100),
          margin_risk: randDecimal(0, 100),
          fulfillment_risk: randDecimal(0, 100),
          negotiation_risk: randDecimal(0, 100),
          status: hs > 70 ? "HEALTHY" : hs > 40 ? "AT_RISK" : "CRITICAL",
          last_activity_at: new Date(),
        });
      }
    }
    await DealHealth.bulkCreate(dealHealthData, { ignoreDuplicates: true });
    console.log(`  ✅ ${dealHealthData.length} deal health records`);

    // 23. Deal Events (300)
    console.log("Seeding deal events...");
    const eventTypes = ["QUOTATION_CREATED","STATUS_CHANGED","APPROVAL_REQUESTED","APPROVAL_GRANTED","NEGOTIATION_STARTED","INVOICE_ISSUED","PAYMENT_RECEIVED","ITEM_ADDED","DISCOUNT_APPLIED","FULFILLMENT_STARTED"];
    const dealEventsData = Array.from({ length: 300 }, () => ({
      quotation_id: pick(quotations).id,
      event_type: pick(eventTypes),
      event_data: JSON.stringify({ timestamp: new Date().toISOString(), source: "system" }),
      triggered_by: pick(users).id,
    }));
    await DealEvent.bulkCreate(dealEventsData);
    console.log(`  ✅ ${dealEventsData.length} deal events`);

    // 24. Alerts (200)
    console.log("Seeding alerts...");
    const alertTypes = ["HIGH_DISCOUNT","LOW_MARGIN","APPROVAL_OVERDUE","PAYMENT_OVERDUE","INVENTORY_LOW","NEGOTIATION_STALLED","CONTRACT_EXPIRING","FULFILLMENT_DELAYED"];
    const alertsData = Array.from({ length: 200 }, () => ({
      quotation_id: Math.random() > 0.2 ? pick(quotations).id : null,
      alert_type: pick(alertTypes),
      severity: pick(["INFO", "WARNING", "CRITICAL"]),
      message: pick([
        "Discount exceeds allowed threshold",
        "Margin below minimum 15%",
        "Approval pending for 3 days",
        "Payment overdue by 15 days",
        "Inventory critically low for product",
        "Negotiation has no response for 7 days",
        "Contract expires in 30 days",
        "Fulfillment delayed by warehouse",
      ]),
      is_read: Math.random() > 0.5,
    }));
    await Alert.bulkCreate(alertsData);
    console.log(`  ✅ ${alertsData.length} alerts`);

    // ── Summary ──────────────────────────────────────────────────
    console.log("\n🎉 Seeding complete! Summary:");
    console.log(`   Roles:                  5`);
    console.log(`   Users:                  ${users.length}`);
    console.log(`   Customer Tiers:         ${tiers.length}`);
    console.log(`   Customers:              ${customers.length}`);
    console.log(`   Categories:             ${categories.length}`);
    console.log(`   Products:               ${products.length}`);
    console.log(`   Price Lists:            ${priceLists.length}`);
    console.log(`   Price List Items:       ${priceListItemsData.length}`);
    console.log(`   Discount Rules:         ${discountRulesData.length}`);
    console.log(`   Warehouses:             ${warehouses.length}`);
    console.log(`   Subscription Plans:     ${subPlans.length}`);
    console.log(`   Quotations:             ${quotations.length}`);
    console.log(`   Quotation Items:        ${quotationItems.length}`);
    console.log(`   Approval Requests:      ${approvals.length}`);
    console.log(`   Audit Logs:             200`);
    console.log(`   Inventory:              ${inventoryData.length}`);
    console.log(`   Fulfillment Allocs:     ${allocationsData.length}`);
    console.log(`   Product Recs:           ${recsData.length}`);
    console.log(`   Subscriptions:          ${subscriptions.length}`);
    console.log(`   Invoices:               ${invoicesData.length}`);
    console.log(`   Billing Schedules:      ${billingData.length}`);
    console.log(`   Negotiations:           ${negsData.length}`);
    console.log(`   Deal Health:            ${dealHealthData.length}`);
    console.log(`   Deal Events:            ${dealEventsData.length}`);
    console.log(`   Alerts:                 ${alertsData.length}`);

    const total = 5 + users.length + tiers.length + customers.length + categories.length +
      products.length + priceLists.length + priceListItemsData.length + discountRulesData.length +
      warehouses.length + subPlans.length + quotations.length + quotationItems.length +
      approvals.length + 200 + inventoryData.length + allocationsData.length +
      recsData.length + subscriptions.length + invoicesData.length + billingData.length +
      negsData.length + dealHealthData.length + dealEventsData.length + alertsData.length;

    console.log(`\n   📊 TOTAL RECORDS: ${total.toLocaleString()}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder failed:", err.message);
    console.error(err);
    process.exit(1);
  }
})();
