const Customer = require("../models/Customer.model");
const CustomerTier = require("../models/CustomerTier.model");

// GET /api/customers
const getAll = async (req, res) => {
  try {
    const customers = await Customer.findAll({ include: [{ model: CustomerTier, as: "CustomerTier" }] });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/customers/:id
const getOne = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id, {
      include: [{ model: CustomerTier, as: "CustomerTier" }],
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/customers
const create = async (req, res) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/customers/:id
const update = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    await customer.update(req.body);
    res.json(customer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/customers/:id
const remove = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    await customer.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
