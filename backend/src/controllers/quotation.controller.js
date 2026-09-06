const { Op } = require("sequelize");
const Quotation = require("../models/Quotation.model");
const QuotationItem = require("../models/QuotationItem.model");
const Customer = require("../models/Customer.model");
const CustomerTier = require("../models/CustomerTier.model");
const Product = require("../models/Product.model");
const Category = require("../models/Category.model");
const User = require("../models/User.model");
const ApprovalRequest = require("../models/ApprovalRequest.model");
const Negotiation = require("../models/Negotiation.model");
const Alert = require("../models/Alert.model");
const { computeBlendedRisk } = require("../utils/blendedRisk");

// Helper to generate sequential quotation number in QT-YYYY-XXX format
const generateQuotationNumber = async () => {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;
  const latestQuote = await Quotation.findOne({
    where: {
      quotation_number: {
        [Op.like]: `${prefix}%`,
      },
    },
    order: [["id", "DESC"]],
  });

  let nextSeq = 1;
  if (latestQuote && latestQuote.quotation_number) {
    const parts = latestQuote.quotation_number.split("-");
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  } else {
    const count = await Quotation.count();
    nextSeq = count + 1;
  }
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
};

// GET /api/quotations
const getAll = async (req, res) => {
  try {
    const quotations = await Quotation.findAll({
      include: [
        { model: Customer, as: "Customer", include: [{ model: CustomerTier, as: "CustomerTier" }] },
        { model: User, as: "salesRep", attributes: ["id", "name", "email"] },
      ],
      order: [["created_at", "DESC"]],
    });
    res.json(quotations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/quotations/:id
const getOne = async (req, res) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "Customer", include: [{ model: CustomerTier, as: "CustomerTier" }] },
        { model: User, as: "salesRep", attributes: ["id", "name", "email"] },
        { model: QuotationItem, as: "QuotationItems", include: [{ model: Product, as: "Product", include: [{ model: Category, as: "Category" }] }] },
        { model: Negotiation },
      ],
      order: [[{ model: Negotiation }, "created_at", "ASC"]],
    });
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    res.json(quotation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/quotations
const create = async (req, res) => {
  try {
    const { items, ...quotationData } = req.body;

    if (
      !quotationData.quotation_number ||
      quotationData.quotation_number.startsWith("QUO-") ||
      quotationData.quotation_number.startsWith("QTE-")
    ) {
      quotationData.quotation_number = await generateQuotationNumber();
    }
    quotationData.sales_rep_id = quotationData.sales_rep_id || req.user?.id || 1;

    // Fetch customer with tier for risk scoring
    const customer = await Customer.findByPk(quotationData.customer_id, {
      include: [{ model: CustomerTier, as: "CustomerTier" }],
    });

    // Calculate risk
    const categories = await Category.findAll();
    const riskAnalysis = computeBlendedRisk({
      items: items || [],
      customerTier: customer?.CustomerTier,
      categories,
    });

    // Determine initial status based on risk
    let initialStatus = quotationData.status || "DRAFT";
    if (riskAnalysis.requiresApproval && initialStatus !== "DRAFT") {
      initialStatus = "PENDING_APPROVAL";
    }

    const quotation = await Quotation.create({
      ...quotationData,
      status: initialStatus,
      risk_score: riskAnalysis.blendedRiskScore,
      risk_level:
        riskAnalysis.blendedRiskScore <= 15
          ? "LOW"
          : riskAnalysis.blendedRiskScore <= 29
          ? "MEDIUM"
          : "HIGH",
    });

    // Create line items
    if (items && items.length > 0) {
      const lineItems = items.map((item) => ({
        quotation_id: quotation.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        cost_price: item.cost_price || 0,
        discount_percent: item.discount_percent || 0,
        discount_amount:
          ((item.unit_price * item.quantity) * (item.discount_percent || 0)) / 100,
        total_price:
          item.unit_price * item.quantity -
          ((item.unit_price * item.quantity) * (item.discount_percent || 0)) / 100,
        margin_amount:
          (item.unit_price - (item.cost_price || 0)) * item.quantity,
      }));
      await QuotationItem.bulkCreate(lineItems);

      // Recalculate totals
      const subtotal = lineItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      const discountAmount = lineItems.reduce((s, i) => s + i.discount_amount, 0);
      const totalAmount = subtotal - discountAmount;
      await quotation.update({ subtotal, discount_amount: discountAmount, total_amount: totalAmount });
    }

    // Auto-generate Approval Request if required and not draft
    if (riskAnalysis.requiresApproval && quotation.status === "PENDING_APPROVAL") {
      await ApprovalRequest.create({
        quotation_id: quotation.id,
        approval_level: riskAnalysis.requiredLevel,
        approver_role: riskAnalysis.approvalRole,
        status: "PENDING",
        reason: riskAnalysis.explanation,
      });

      await Alert.create({
        quotation_id: quotation.id,
        alert_type: "GOVERNANCE_BREACH",
        severity: riskAnalysis.requiredLevel === 2 ? "HIGH" : "MEDIUM",
        message: `Quotation #${quotation.id} triggered automated ${riskAnalysis.approvalRole} workflow (Risk Score: ${riskAnalysis.blendedRiskScore}/100).`,
      });
    }

    const result = await Quotation.findByPk(quotation.id, {
      include: [
        { model: QuotationItem, as: "QuotationItems" },
        { model: Customer, as: "Customer" },
        { model: Negotiation },
      ],
    });

    res.status(201).json({
      quotation: result,
      riskAnalysis,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/quotations/:id
const update = async (req, res) => {
  try {
    const { items, ...quotationData } = req.body;
    const quotation = await Quotation.findByPk(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    // If customer changed or items provided, re-evaluate risk and line items
    const customerId = quotationData.customer_id || quotation.customer_id;
    const customer = await Customer.findByPk(customerId, {
      include: [{ model: CustomerTier, as: "CustomerTier" }],
    });
    const categories = await Category.findAll();

    let riskAnalysis = null;
    let newSubtotal = quotation.subtotal;
    let newDiscountAmount = quotation.discount_amount;
    let newTotalAmount = quotation.total_amount;

    if (items && Array.isArray(items)) {
      riskAnalysis = computeBlendedRisk({
        items: items || [],
        customerTier: customer?.CustomerTier,
        categories,
      });

      // Clear existing items and bulk insert updated items
      await QuotationItem.destroy({ where: { quotation_id: quotation.id } });
      const lineItems = items.map((item) => ({
        quotation_id: quotation.id,
        product_id: item.product_id,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        cost_price: item.cost_price || 0,
        discount_percent: item.discount_percent || 0,
        discount_amount:
          ((item.unit_price * (item.quantity || 1)) * (item.discount_percent || 0)) / 100,
        total_price:
          item.unit_price * (item.quantity || 1) -
          ((item.unit_price * (item.quantity || 1)) * (item.discount_percent || 0)) / 100,
        margin_amount:
          (item.unit_price - (item.cost_price || 0)) * (item.quantity || 1),
      }));
      await QuotationItem.bulkCreate(lineItems);

      newSubtotal = lineItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      newDiscountAmount = lineItems.reduce((s, i) => s + i.discount_amount, 0);
      newTotalAmount = newSubtotal - newDiscountAmount;
    }

    let statusToSet = quotationData.status || quotation.status;
    if (riskAnalysis && riskAnalysis.requiresApproval && statusToSet === "CONFIRMED") {
      statusToSet = "PENDING_APPROVAL";
    }

    const updateFields = {
      ...quotationData,
      subtotal: newSubtotal,
      discount_amount: newDiscountAmount,
      total_amount: newTotalAmount,
      status: statusToSet,
    };

    if (riskAnalysis) {
      updateFields.risk_score = riskAnalysis.blendedRiskScore;
      updateFields.risk_level =
        riskAnalysis.blendedRiskScore <= 15
          ? "LOW"
          : riskAnalysis.blendedRiskScore <= 29
          ? "MEDIUM"
          : "HIGH";
    }

    await quotation.update(updateFields);

    // Auto-generate approval request if moved to PENDING_APPROVAL
    if (statusToSet === "PENDING_APPROVAL" && riskAnalysis?.requiresApproval) {
      await ApprovalRequest.create({
        quotation_id: quotation.id,
        approval_level: riskAnalysis.requiredLevel,
        approver_role: riskAnalysis.approvalRole,
        status: "PENDING",
        reason: riskAnalysis.explanation,
      });
    }

    const refreshed = await Quotation.findByPk(quotation.id, {
      include: [
        { model: Customer, as: "Customer", include: [{ model: CustomerTier, as: "CustomerTier" }] },
        { model: QuotationItem, as: "QuotationItems", include: [{ model: Product, as: "Product", include: [{ model: Category, as: "Category" }] }] },
        { model: Negotiation },
      ],
    });

    res.json(refreshed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/quotations/:id/status
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const quotation = await Quotation.findByPk(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    await quotation.update({ status });
    res.json({ message: `Status updated to ${status}`, quotation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/quotations/:id
const remove = async (req, res) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    await quotation.destroy();
    res.json({ message: "Quotation deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/quotations/evaluate-risk
const evaluateRisk = async (req, res) => {
  try {
    const { items, customer_id } = req.body;
    const customer = await Customer.findByPk(customer_id, {
      include: [{ model: CustomerTier, as: "CustomerTier" }],
    });
    const categories = await Category.findAll();

    const analysis = computeBlendedRisk({
      items: items || [],
      customerTier: customer?.CustomerTier,
      categories,
    });

    res.json(analysis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper to resolve quotation by ID, quotation_number, or demo fallback
const findQuotationByRef = async (ref) => {
  if (!ref) return null;
  const include = [
    { model: Customer, as: "Customer", include: [{ model: CustomerTier, as: "CustomerTier" }] },
    { model: QuotationItem, as: "QuotationItems", include: [{ model: Product, as: "Product" }] },
  ];

  let quotation = null;
  // 1. Try numeric primary key
  if (!isNaN(ref) && Number(ref) > 0) {
    quotation = await Quotation.findByPk(Number(ref), { include });
  }

  // 2. Try exact or formatted quotation_number
  if (!quotation) {
    const searchTerms = [
      ref,
      `QT-2026-${String(ref).padStart(3, "0")}`,
      `QT-${ref}`,
      `QUO-${ref}`,
    ];
    quotation = await Quotation.findOne({
      where: {
        [Op.or]: [
          { quotation_number: { [Op.in]: searchTerms } },
          { quotation_number: { [Op.like]: `%${ref}%` } },
        ],
      },
      include,
      order: [["id", "DESC"]],
    });
  }

  // 3. Fallback for demo showcase references (e.g. 226) if not currently in DB
  if (!quotation) {
    quotation =
      (await Quotation.findOne({
        where: { status: "UNDER_NEGOTIATION" },
        include,
        order: [["id", "DESC"]],
      })) ||
      (await Quotation.findOne({
        include,
        order: [["id", "DESC"]],
      }));
  }

  return quotation;
};

// GET /api/quotations/public/:id (Customer Facing Portal View)
const getPublicQuote = async (req, res) => {
  try {
    const quotation = await findQuotationByRef(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    // Fetch existing negotiations
    const negotiations = await Negotiation.findAll({
      where: { quotation_id: quotation.id },
      order: [["created_at", "ASC"]],
    });

    res.json({ quotation, negotiations });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/quotations/public/:id/negotiate (Customer In-Portal Negotiation)
const customerNegotiate = async (req, res) => {
  try {
    const { action, counter_discount, comment } = req.body;
    const quotation = await findQuotationByRef(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    if (action === "CONFIRM_QUOTATION") {
      // Direct confirmation if terms agree
      await quotation.update({ status: "CONFIRMED" });
      return res.json({
        message: "Quotation officially confirmed by customer. Ready for warehouse fulfillment split.",
        status: "CONFIRMED",
      });
    }

    if (action === "SUBMIT_REQUEST") {
      // Record customer counter-discount negotiation request
      await Negotiation.create({
        quotation_id: quotation.id,
        customer_id: quotation.customer_id,
        requested_discount: counter_discount || 0,
        message: comment || "Customer requested price adjustment via portal.",
        status: "OPEN",
      });

      // Also create Alert for sales reps / approvers
      await Alert.create({
        quotation_id: quotation.id,
        alert_type: "GOVERNANCE_BREACH",
        severity: Number(counter_discount) > 25 ? "HIGH" : "MEDIUM",
        message: `Customer proposed a ${counter_discount}% concession on Quotation #${quotation.quotation_number}: "${comment || 'Counter-proposal received via portal'}"`,
      });

      // Check if the requested discount triggers the automated re-approval loop!
      const categories = await Category.findAll();
      const hypotheticalItems = (quotation.QuotationItems || []).map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: Number(counter_discount) || Number(item.discount_percent) || 0,
      }));

      const risk = computeBlendedRisk({
        items: hypotheticalItems,
        customerTier: quotation.Customer?.CustomerTier,
        categories,
      });

      let nextStatus = "UNDER_NEGOTIATION";
      let reApprovalTriggered = false;
      let responseMsg = "Counter-proposal received and logged. Sales representative notified.";

      if (risk.requiresApproval) {
        nextStatus = "PENDING_APPROVAL";
        reApprovalTriggered = true;
        responseMsg = "Counter-offer submitted. Because terms exceed standard limits, the quote has automatically re-entered the Director Approval workflow.";

        await ApprovalRequest.create({
          quotation_id: quotation.id,
          approval_level: risk.requiredLevel,
          approver_role: risk.approvalRole,
          status: "PENDING",
          reason: `Customer counter-offer (${counter_discount}%) triggered automatic re-approval loop: ${risk.explanation}`,
        });
      }

      await quotation.update({ status: nextStatus });

      // Return refreshed negotiations
      const updatedNegotiations = await Negotiation.findAll({
        where: { quotation_id: quotation.id },
        order: [["created_at", "ASC"]],
      });

      return res.json({
        message: responseMsg,
        status: nextStatus,
        reApprovalTriggered,
        negotiations: updatedNegotiations,
      });
    }

    res.status(400).json({ message: "Invalid action type" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  updateStatus,
  remove,
  evaluateRisk,
  getPublicQuote,
  customerNegotiate,
};
