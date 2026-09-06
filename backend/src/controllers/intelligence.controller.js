const Quotation = require("../models/Quotation.model");
const QuotationItem = require("../models/QuotationItem.model");
const Customer = require("../models/Customer.model");
const CustomerTier = require("../models/CustomerTier.model");
const Product = require("../models/Product.model");
const Category = require("../models/Category.model");
const Negotiation = require("../models/Negotiation.model");
const DealEvent = require("../models/DealEvent.model");
const Alert = require("../models/Alert.model");
const ApprovalRequest = require("../models/ApprovalRequest.model");
const Warehouse = require("../models/Warehouse.model");
const Inventory = require("../models/Inventory.model");

const FLASK_BASE_URL = process.env.INTELLIGENCE_SERVICE_URL || "http://localhost:4000";

// Helper to call Python Flask Intelligence Service
const callFlask = async (endpoint, options = {}) => {
  const url = `${FLASK_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `Flask error (${res.status})`);
    }
    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("Intelligence service request timed out.");
    }
    throw err;
  }
};

// Helper to transform Sequelize Quote into DealFlow360 canonical deal dictionary
const buildDealContext = async (quoteId) => {
  if (!quoteId) return null;

  const quotation = await Quotation.findByPk(quoteId, {
    include: [
      {
        model: Customer,
        as: "Customer",
        include: [{ model: CustomerTier, as: "CustomerTier" }],
      },
      {
        model: QuotationItem,
        as: "QuotationItems",
        include: [
          {
            model: Product,
            as: "Product",
            include: [{ model: Category, as: "Category" }],
          },
        ],
      },
    ],
  });

  if (!quotation) return null;

  const items = quotation.QuotationItems || [];
  const primaryItem = items[0] || {};
  const primaryProduct = primaryItem.Product || {};
  const customer = quotation.Customer || {};
  const tier = customer.CustomerTier?.name || "STANDARD";

  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1;
  const avgUnitPrice = items.length > 0 
    ? items.reduce((sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0) / totalQuantity 
    : 1000;
  const avgCostPrice = items.length > 0 
    ? items.reduce((sum, item) => sum + (parseFloat(item.cost_price || 0) * item.quantity), 0) / totalQuantity 
    : 650;
  const currentDiscount = items.length > 0 
    ? items.reduce((sum, item) => sum + parseFloat(item.discount_percent || 0), 0) / items.length 
    : 0;

  // Retrieve available warehouses
  const dbWarehouses = await Warehouse.findAll().catch(() => []);
  const warehousesList = dbWarehouses.map((wh) => ({
    warehouse_id: `WH-${wh.id || wh.name}`,
    name: wh.name,
    available_stock: wh.capacity ? Math.floor(wh.capacity * 0.7) : 500,
    reserved_stock: 50,
    capacity: wh.capacity || 1000,
    current_load: wh.current_load || 400,
    distance_km: 120,
    transport_rate_per_km: 10,
    processing_days: 1,
  }));

  return {
    deal_id: String(quotation.quotation_number || `QT-${quotation.id}`),
    quote_id: quotation.id,
    customer_id: String(customer.id || "CUST-101"),
    customer_name: customer.company_name || customer.name || "Enterprise Customer",
    customer_tier: tier.toUpperCase(),
    category: (primaryProduct.Category?.name || "ELECTRONICS").toUpperCase(),
    product_name: primaryProduct.name || "Industrial Hardware Unit",
    quantity: totalQuantity,
    base_price: avgUnitPrice,
    product_cost: avgCostPrice,
    discount_percent: currentDiscount,
    current_discount_percent: currentDiscount,
    required_delivery_days: 4,
    margin_percent: parseFloat(quotation.margin_percent || 19.2),
    customer_avg_discount: parseFloat(customer.CustomerTier?.max_discount_percent ? customer.CustomerTier.max_discount_percent / 2 : 10.0),
    customer_max_discount: parseFloat(customer.CustomerTier?.max_discount_percent || 20.0),
    warehouses: warehousesList.length > 0 ? warehousesList : undefined,
  };
};

/**
 * POST /api/intelligence/analyze-quote
 * Complete deal analysis: ML Predictions, Rule Engine, What-If, Memory, Deal Health, Why/Why-Not.
 */
const analyzeQuote = async (req, res) => {
  try {
    const { quote_id, deal, context } = req.body;

    let dealData = deal;
    if (!dealData && quote_id) {
      dealData = await buildDealContext(quote_id);
    }
    if (!dealData) {
      dealData = {
        deal_id: "DEAL-SAMPLE",
        customer_id: "CUST-101",
        customer_tier: "GOLD",
        category: "ELECTRONICS",
        quantity: 500,
        base_price: 1000.0,
        product_cost: 650.0,
        discount_percent: 12.0,
        required_delivery_days: 4,
        ...(context || {}),
      };
    }

    const flaskRes = await callFlask("/api/v1/intelligence/deal/insights", {
      method: "POST",
      body: { deal: dealData },
    });

    res.json({
      success: true,
      deal: dealData,
      ...flaskRes,
    });
  } catch (err) {
    console.error("[IntelligenceController] analyzeQuote error:", err.message);
    res.status(500).json({
      success: false,
      message: "Intelligence service temporarily unavailable: " + err.message,
    });
  }
};

/**
 * POST /api/intelligence/what-if
 * Real-time What-If deal simulation without mutating reality.
 */
const simulateWhatIf = async (req, res) => {
  try {
    const { quote_id, deal, changes } = req.body;

    let dealData = deal;
    if (!dealData && quote_id) {
      dealData = await buildDealContext(quote_id);
    }
    if (!dealData) {
      return res.status(400).json({ message: "Either quote_id or deal data must be provided." });
    }

    const flaskRes = await callFlask("/api/v1/intelligence/what-if", {
      method: "POST",
      body: { deal: dealData, changes: changes || {} },
    });

    res.json(flaskRes);
  } catch (err) {
    console.error("[IntelligenceController] simulateWhatIf error:", err.message);
    res.status(500).json({
      success: false,
      message: "Simulation engine temporarily unavailable: " + err.message,
    });
  }
};

/**
 * POST /api/intelligence/scenarios
 * Multi-scenario comparison & ranking.
 */
const simulateScenarios = async (req, res) => {
  try {
    const { quote_id, deal, scenarios } = req.body;

    let dealData = deal;
    if (!dealData && quote_id) {
      dealData = await buildDealContext(quote_id);
    }
    if (!dealData) {
      return res.status(400).json({ message: "Either quote_id or deal data must be provided." });
    }

    const flaskRes = await callFlask("/api/v1/intelligence/what-if/batch", {
      method: "POST",
      body: { deal: dealData, scenarios: scenarios || [] },
    });

    res.json(flaskRes);
  } catch (err) {
    console.error("[IntelligenceController] simulateScenarios error:", err.message);
    res.status(500).json({
      success: false,
      message: "Scenario simulation error: " + err.message,
    });
  }
};

/**
 * POST /api/intelligence/recommend-discount
 * Calls trained ML XGBoost Regressor model.
 */
const recommendDiscount = async (req, res) => {
  try {
    const flaskRes = await callFlask("/api/v1/predict/discount-recommendation", {
      method: "POST",
      body: req.body,
    });
    res.json(flaskRes);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Discount recommendation model error: " + err.message,
    });
  }
};

/**
 * POST /api/intelligence/discount-risk
 * Calls trained ML XGBoost Classifier model.
 */
const predictDiscountRisk = async (req, res) => {
  try {
    const flaskRes = await callFlask("/api/v1/predict/discount-risk", {
      method: "POST",
      body: req.body,
    });
    res.json(flaskRes);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Discount risk classification error: " + err.message,
    });
  }
};

/**
 * POST /api/intelligence/customer-chat
 * Natural Language Conversational Assistant.
 */
const customerChat = async (req, res) => {
  try {
    const { message, conversation_id, quote_id, deal_id, customer_id, context_override } = req.body;

    let dealContext = context_override || {};
    if (quote_id) {
      const dbDeal = await buildDealContext(quote_id);
      if (dbDeal) {
        dealContext = { ...dbDeal, ...dealContext };
      }
    }

    const flaskPayload = {
      message,
      conversation_id: conversation_id || `conv_${Date.now()}`,
      deal_id: deal_id || dealContext.deal_id || "DEAL-1001",
      customer_id: customer_id || dealContext.customer_id || "CUST-101",
      context_override: dealContext,
    };

    const flaskRes = await callFlask("/api/v1/intelligence/customer-chat", {
      method: "POST",
      body: flaskPayload,
    });

    // Normalize response fields for seamless UI consumption
    const replyText =
      flaskRes?.response?.message ||
      flaskRes?.reply_text ||
      flaskRes?.message ||
      "I processed your request.";

    const cards = flaskRes?.response?.scenarios || flaskRes?.cards || [];
    const sections = flaskRes?.response?.sections || [];
    const quickReplies =
      flaskRes?.actions?.map((a) => a.label) ||
      flaskRes?.quick_replies ||
      [];
    const requiresConfirmation = Boolean(
      flaskRes?.pending_proposal || flaskRes?.response?.type === "CONFIRMATION"
    );

    res.json({
      ...flaskRes,
      reply_text: replyText,
      message: replyText,
      cards,
      sections,
      quick_replies: quickReplies.length > 0 ? quickReplies : undefined,
      requires_confirmation: requiresConfirmation,
      pending_action: flaskRes?.pending_proposal,
    });
  } catch (err) {
    console.error("[IntelligenceController] customerChat error:", err.message);
    res.status(500).json({
      reply_text: "DealFlow Assistant is temporarily unable to connect to the intelligence server. Please try again shortly.",
      intent: "ERROR",
      confidence: 0,
      requires_confirmation: false,
      quick_replies: ["Try again", "Quote status", "Discount help"],
    });
  }
};

/**
 * POST /api/intelligence/customer-chat/confirm
 * Customer confirmed an action proposal -> Node.js executes reality mutation into database!
 */
const confirmChatAction = async (req, res) => {
  try {
    const { conversation_id, deal_id, quote_id, action_payload } = req.body;

    // 1. Notify Flask conversation manager to transition state to COMPLETED
    const flaskConfirm = await callFlask("/api/v1/intelligence/customer-chat/confirm", {
      method: "POST",
      body: { conversation_id },
    }).catch(() => ({ success: true, message: "Confirmed in conversation" }));

    // 2. Locate quotation in database
    let quotation = null;
    if (quote_id) {
      quotation = await Quotation.findByPk(quote_id, {
        include: [{ model: QuotationItem, as: "QuotationItems" }],
      });
    } else if (deal_id) {
      quotation = await Quotation.findOne({
        where: { quotation_number: deal_id },
        include: [{ model: QuotationItem, as: "QuotationItems" }],
      });
    }

    let mutationResult = { executed: false, note: "No direct quote mutation needed." };

    if (quotation && action_payload) {
      const proposedDiscount = action_payload.discount_percent ?? action_payload.proposed_discount;
      const proposedQuantity = action_payload.quantity;

      if (proposedDiscount !== undefined) {
        // Update line items
        if (quotation.QuotationItems && quotation.QuotationItems.length > 0) {
          for (const item of quotation.QuotationItems) {
            const qty = proposedQuantity || item.quantity;
            const disc = parseFloat(proposedDiscount);
            const discAmt = ((parseFloat(item.unit_price) * qty) * disc) / 100;
            const lineTot = (parseFloat(item.unit_price) * qty) - discAmt;
            const marginAmt = (parseFloat(item.unit_price) - parseFloat(item.cost_price || 0)) * qty - discAmt;
            await item.update({
              quantity: qty,
              discount_percent: disc,
              discount_amount: discAmt,
              line_total: lineTot,
              margin_amount: marginAmt,
            });
          }

          // Recalculate quotation totals
          const items = await QuotationItem.findAll({ where: { quotation_id: quotation.id } });
          const subtotal = items.reduce((s, i) => s + parseFloat(i.unit_price) * i.quantity, 0);
          const totalDiscount = items.reduce((s, i) => s + parseFloat(i.discount_amount || 0), 0);
          const totalAmount = subtotal - totalDiscount;
          const totalMargin = items.reduce((s, i) => s + parseFloat(i.margin_amount || 0), 0);
          const marginPercent = totalAmount > 0 ? (totalMargin / totalAmount) * 100 : 0;

          // Check if governance approval is needed (>15% or margin < 15%)
          const needsApproval = proposedDiscount > 15 || marginPercent < 15;
          const newStatus = needsApproval ? "PENDING_APPROVAL" : "UNDER_NEGOTIATION";

          await quotation.update({
            subtotal,
            discount_amount: totalDiscount,
            total_amount: totalAmount,
            margin_amount: totalMargin,
            margin_percent: marginPercent,
            status: newStatus,
          });

          // Log Negotiation record
          await Negotiation.create({
            quotation_id: quotation.id,
            counter_offer_amount: totalAmount,
            customer_notes: `Negotiated via DealFlow Assistant: ${proposedDiscount}% discount.`,
            status: needsApproval ? "PENDING" : "ACCEPTED",
          }).catch(() => {});

          // Log Deal Event
          await DealEvent.create({
            quotation_id: quotation.id,
            event_type: "CUSTOMER_NEGOTIATION_CONFIRMED",
            description: `Customer confirmed conversational agreement: ${proposedDiscount}% discount requested. Status: ${newStatus}`,
          }).catch(() => {});

          if (needsApproval) {
            await ApprovalRequest.create({
              quotation_id: quotation.id,
              approval_level: proposedDiscount > 20 ? 2 : 1,
              approver_role: proposedDiscount > 20 ? "VP of Sales / Finance" : "Sales Director",
              status: "PENDING",
              reason: `Conversational negotiation triggered threshold rule (${proposedDiscount}% discount).`,
            }).catch(() => {});

            await Alert.create({
              quotation_id: quotation.id,
              alert_type: "APPROVAL_REQUIRED",
              severity: "MEDIUM",
              message: `Quotation #${quotation.quotation_number} submitted with ${proposedDiscount}% discount requires approval.`,
            }).catch(() => {});
          }

          mutationResult = {
            executed: true,
            quotation_id: quotation.id,
            quotation_number: quotation.quotation_number,
            new_status: newStatus,
            total_amount: totalAmount,
            discount_percent: proposedDiscount,
            approval_required: needsApproval,
          };
        }
      }
    }

    res.json({
      success: true,
      message: "Deal modification executed successfully into reality database.",
      flask: flaskConfirm,
      mutation: mutationResult,
    });
  } catch (err) {
    console.error("[IntelligenceController] confirmChatAction error:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to execute confirmed deal action: " + err.message,
    });
  }
};

/**
 * POST /api/intelligence/customer-chat/cancel
 */
const cancelChatAction = async (req, res) => {
  try {
    const { conversation_id } = req.body;
    const flaskRes = await callFlask("/api/v1/intelligence/customer-chat/cancel", {
      method: "POST",
      body: { conversation_id },
    }).catch(() => ({ success: true, message: "Cancelled in conversation" }));

    res.json(flaskRes);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/intelligence/health
 */
const checkHealth = async (req, res) => {
  try {
    const flaskRes = await callFlask("/api/v1/health", { timeout: 3000 });
    res.json({
      node_status: "online",
      flask_service: flaskRes,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      node_status: "online",
      flask_service: { status: "offline", error: err.message },
      timestamp: new Date().toISOString(),
    });
  }
};

module.exports = {
  analyzeQuote,
  simulateWhatIf,
  simulateScenarios,
  recommendDiscount,
  predictDiscountRisk,
  customerChat,
  confirmChatAction,
  cancelChatAction,
  checkHealth,
};
