const CustomerTier = require("../models/CustomerTier.model");

// GET /api/customer-tiers
const getAll = async (req, res) => {
  try {
    const tiers = await CustomerTier.findAll();
    res.json(tiers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/customer-tiers/:id
const getOne = async (req, res) => {
  try {
    const tier = await CustomerTier.findByPk(req.params.id);
    if (!tier) return res.status(404).json({ message: "Tier not found" });
    res.json(tier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/customer-tiers
const create = async (req, res) => {
  try {
    const tier = await CustomerTier.create(req.body);
    res.status(201).json(tier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/customer-tiers/:id
const update = async (req, res) => {
  try {
    const tier = await CustomerTier.findByPk(req.params.id);
    if (!tier) return res.status(404).json({ message: "Tier not found" });
    await tier.update(req.body);
    res.json(tier);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/customer-tiers/:id
const remove = async (req, res) => {
  try {
    const tier = await CustomerTier.findByPk(req.params.id);
    if (!tier) return res.status(404).json({ message: "Tier not found" });
    await tier.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
