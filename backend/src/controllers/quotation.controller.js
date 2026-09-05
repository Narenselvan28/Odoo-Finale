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
      ],
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

    const count = await Quotation.count();
    quotationData.quotation_number =
      quotationData.quotation_number || `QUO-${Date.now()}-${count + 1}`;
    quotationData.sales_rep_id = quotationData.sales_rep_id || req.user?.id || 1;

    // Fetch customer with tier for risk scoring
    const customer = await Customer.findByPk(quotationData.customer_id, {
      include: [{ model: CustomerTier, as: "CustomerTier" }],
    });
    const categories = await Category.findAll();

    // Compute Blended Risk
    const riskAnalysis = computeBlendedRisk({
      items: items || [],
      customerTier: customer?.CustomerTier,
      categories,
    });

    // Auto-escalation: If risk analysis requires approval, auto-set to PENDING_APPROVAL
    if (riskAnalysis.requiresApproval && quotationData.status !== "DRAFT") {
      quotationData.status = "PENDING_APPROVAL";
    }

    const quotation = await Quotation.create(quotationData);

    // Create Line Items if provided
    if (items && items.length > 0) {
      const lineItems = items.map((item) => ({
        ...item,
        quotation_id: quotation.id,
        discount_amount: ((item.unit_price * item.quantity) * (item.discount_percent || 0)) / 100,
        line_total:
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
    const quotation = await Quotation.findByPk(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });
    await quotation.update(req.body);
    res.json(quotation);
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

// GET /api/quotations/public/:id (Customer Facing Portal View)
const getPublicQuote = async (req, res) => {
  try {
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "Customer", include: [{ model: CustomerTier, as: "CustomerTier" }] },
        { model: QuotationItem, as: "QuotationItems", include: [{ model: Product, as: "Product" }] },
      ],
    });
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
    const quotation = await Quotation.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "Customer", include: [{ model: CustomerTier, as: "CustomerTier" }] },
        { model: QuotationItem, as: "QuotationItems", include: [{ model: Product, as: "Product" }] },
      ],
    });
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

      // Check if the requested discount triggers the automated re-approval loop!
      const categories = await Category.findAll();
      const hypotheticalItems = quotation.QuotationItems.map((item) => ({
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

      if (risk.requiresApproval) {
        // Automatically re-enters approval flow B4!
        await quotation.update({ status: "PENDING_APPROVAL" });
        await ApprovalRequest.create({
          quotation_id: quotation.id,
          approval_level: risk.requiredLevel,
          approver_role: risk.approvalRole,
          status: "PENDING",
          reason: `Customer counter-offer (${counter_discount}%) triggered automatic re-approval loop: ${risk.explanation}`,
        });

        return res.json({
          message: "Counter-offer submitted. Because terms exceed standard limits, the quote has automatically re-entered the Director Approval workflow.",
          status: "PENDING_APPROVAL",
          reApprovalTriggered: true,
        });
      } else {
        await quotation.update({ status: "UNDER_NEGOTIATION" });
        return res.json({
          message: "Counter-proposal received and logged. Sales representative notified.",
          status: "UNDER_NEGOTIATION",
          reApprovalTriggered: false,
        });
      }
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
