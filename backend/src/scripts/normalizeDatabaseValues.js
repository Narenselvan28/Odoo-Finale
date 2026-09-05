/**
 * normalizeDatabaseValues.js
 * Normalizes inflated quotation amounts, product prices, and line items
 * to realistic, professional enterprise B2B figures (INR ₹).
 */

const { sequelize } = require("../config/database");
const Product = require("../models/Product.model");
const PriceListItem = require("../models/PriceListItem.model");
const Quotation = require("../models/Quotation.model");
const QuotationItem = require("../models/QuotationItem.model");
const Invoice = require("../models/Invoice.model");
const BillingSchedule = require("../models/BillingSchedule.model");
const SubscriptionPlan = require("../models/SubscriptionPlan.model");

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDecimal = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));

async function normalizeDatabase() {
  console.log("🚀 Starting database value normalization to realistic B2B figures...");

  // 1. Normalize Subscription Plans
  console.log("Updating Subscription Plans...");
  const planUpdates = [
    { name: "Starter", price: 1499 },
    { name: "Growth", price: 4999 },
    { name: "Professional", price: 12999 },
    { name: "Enterprise", price: 49999 },
    { name: "Ultimate", price: 99999 },
  ];
  for (const p of planUpdates) {
    await SubscriptionPlan.update({ price: p.price }, { where: { name: p.name } });
  }

  // 2. Normalize Products (base prices ~ ₹2,500 to ₹42,000, realistic costs)
  console.log("Normalizing Product catalog pricing...");
  const products = await Product.findAll();
  const productPriceMap = new Map();

  for (const prod of products) {
    // Generate a clean, realistic enterprise price
    let basePrice;
    if (prod.base_price > 100000) {
      basePrice = randDecimal(4500, 42000);
    } else if (prod.base_price > 50000) {
      basePrice = randDecimal(3500, 28000);
    } else {
      basePrice = randDecimal(2200, 18500);
    }
    const costRatio = randDecimal(0.45, 0.65);
    const costPrice = parseFloat((basePrice * costRatio).toFixed(2));

    await prod.update({
      base_price: basePrice,
      cost_price: costPrice,
    });
    productPriceMap.set(prod.id, {
      base_price: basePrice,
      cost_price: costPrice,
      tax_percent: prod.tax_percent || 18,
    });
  }
  console.log(`✅ Normalized ${products.length} products.`);

  // 3. Normalize Price List Items
  console.log("Normalizing Price List Items...");
  const priceListItems = await PriceListItem.findAll();
  for (const pli of priceListItems) {
    const pInfo = productPriceMap.get(pli.product_id);
    if (pInfo) {
      const adjustedPrice = randDecimal(pInfo.base_price * 0.9, pInfo.base_price * 1.05);
      await pli.update({ price: adjustedPrice });
    }
  }
  console.log(`✅ Normalized ${priceListItems.length} price list items.`);

  // 4. Normalize Quotation Items
  console.log("Normalizing Quotation Items...");
  const quotationItems = await QuotationItem.findAll();
  for (const item of quotationItems) {
    const pInfo = productPriceMap.get(item.product_id) || {
      base_price: 12000,
      cost_price: 6000,
      tax_percent: 18,
    };

    // Realistic enterprise deal quantity: 1 to 6 units
    const quantity = item.quantity > 8 ? rand(1, 6) : Math.max(1, item.quantity);
    const unitPrice = randDecimal(pInfo.base_price * 0.85, pInfo.base_price);
    const discountPercent = Math.min(25, parseFloat(item.discount_percent || 5));
    const discountAmount = parseFloat(((unitPrice * quantity * discountPercent) / 100).toFixed(2));
    const lineTotal = parseFloat((unitPrice * quantity - discountAmount).toFixed(2));
    const costPrice = parseFloat(pInfo.cost_price);
    const marginAmount = parseFloat(((unitPrice - costPrice) * quantity).toFixed(2));

    await item.update({
      quantity,
      unit_price: unitPrice,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      line_total: lineTotal,
      cost_price: costPrice,
      margin_amount: marginAmount,
    });
  }
  console.log(`✅ Normalized ${quotationItems.length} quotation items.`);

  // 5. Recompute Quotations Totals
  console.log("Recomputing Quotation totals...");
  const quotations = await Quotation.findAll();
  let totalPipelineSum = 0;

  for (const q of quotations) {
    const items = await QuotationItem.findAll({ where: { quotation_id: q.id } });
    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;
    let marginAmount = 0;

    for (const it of items) {
      const pInfo = productPriceMap.get(it.product_id) || { tax_percent: 18 };
      subtotal += parseFloat(it.unit_price) * parseInt(it.quantity, 10);
      discountAmount += parseFloat(it.discount_amount);
      const itemLineTotal = parseFloat(it.line_total);
      taxAmount += (itemLineTotal * (pInfo.tax_percent || 18)) / 100;
      marginAmount += parseFloat(it.margin_amount);
    }

    subtotal = parseFloat(subtotal.toFixed(2));
    discountAmount = parseFloat(discountAmount.toFixed(2));
    taxAmount = parseFloat(taxAmount.toFixed(2));
    const totalAmount = parseFloat((subtotal - discountAmount + taxAmount).toFixed(2));
    marginAmount = parseFloat(marginAmount.toFixed(2));
    const marginPercent = subtotal > 0 ? parseFloat(((marginAmount / subtotal) * 100).toFixed(2)) : 0;

    await q.update({
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      margin_amount: marginAmount,
      margin_percent: marginPercent,
    });

    totalPipelineSum += totalAmount;
  }
  console.log(`✅ Recomputed ${quotations.length} quotations. New sum across ALL quotes: ₹${totalPipelineSum.toLocaleString("en-IN")}`);

  // 6. Normalize Invoices
  console.log("Normalizing Invoices...");
  const invoices = await Invoice.findAll();
  for (const inv of invoices) {
    const q = await Quotation.findByPk(inv.quotation_id);
    if (q) {
      await inv.update({ amount: q.total_amount });
    } else {
      await inv.update({ amount: randDecimal(25000, 150000) });
    }
  }
  console.log(`✅ Normalized ${invoices.length} invoices.`);

  // 7. Normalize Billing Schedules
  console.log("Normalizing Billing Schedules...");
  const billingSchedules = await BillingSchedule.findAll();
  for (const bs of billingSchedules) {
    await bs.update({ amount: randDecimal(2500, 24000) });
  }
  console.log(`✅ Normalized ${billingSchedules.length} billing schedules.`);

  console.log("🎉 Database values successfully normalized to realistic Indian enterprise figures!");
  process.exit(0);
}

normalizeDatabase().catch((err) => {
  console.error("Error normalizing database:", err);
  process.exit(1);
});
