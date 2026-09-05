const Inventory = require("../models/Inventory.model");
const Warehouse = require("../models/Warehouse.model");
const Product = require("../models/Product.model");

// GET /api/inventory
const getAll = async (req, res) => {
  try {
    const inventory = await Inventory.findAll({
      include: [
        { model: Warehouse, as: "Warehouse" },
        { model: Product, as: "Product" },
      ],
    });
    res.json(inventory);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/inventory/:id
const getOne = async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id, {
      include: [{ model: Warehouse, as: "Warehouse" }, { model: Product, as: "Product" }],
    });
    if (!item) return res.status(404).json({ message: "Inventory record not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/inventory
const create = async (req, res) => {
  try {
    res.status(201).json(await Inventory.create(req.body));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/inventory/:id
const update = async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory record not found" });
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/inventory/:id
const remove = async (req, res) => {
  try {
    const item = await Inventory.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory record not found" });
    await item.destroy();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
