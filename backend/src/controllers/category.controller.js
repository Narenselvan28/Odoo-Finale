const Category = require("../models/Category.model");

const getAll = async (req, res) => {
  try {
    res.json(await Category.findAll());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOne = async (req, res) => {
  try {
    const item = await Category.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Category not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const create = async (req, res) => {
  try {
    res.status(201).json(await Category.create(req.body));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const item = await Category.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Category not found" });
    await item.update(req.body);
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const item = await Category.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "Category not found" });
    await item.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
