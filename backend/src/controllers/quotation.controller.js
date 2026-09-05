const Quotation = require("../models/Quotation.model");
const QuotationItem = require("../models/QuotationItem.model");
const Customer = require("../models/Customer.model");
const Product = require("../models/Product.model");
const User = require("../models/User.model");

// GET /api/quotations
const getAll = async (req, res) => {
  try {
    const quotations = await Quotation.findAll({
      include: [
        { model: Customer, as: "Customer" },
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
        { model: Customer, as: "Customer" },
        { model: User, as: "salesRep", attributes: ["id", "name", "email"] },
        { model: QuotationItem, as: "QuotationItems", include: [{ model: Product, as: "Product" }] },
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

    // Auto-generate quotation number
    const count = await Quotation.count();
    quotationData.quotation_number =
      quotationData.quotation_number || `QUO-${Date.now()}-${count + 1}`;
    quotationData.sales_rep_id = quotationData.sales_rep_id || req.user.id;

    const quotation = await Quotation.create(quotationData);

    // Create items if provided
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

    res.status(201).json(await Quotation.findByPk(quotation.id, {
      include: [{ model: QuotationItem, as: "QuotationItems" }],
    }));
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

module.exports = { getAll, getOne, create, update, updateStatus, remove };
