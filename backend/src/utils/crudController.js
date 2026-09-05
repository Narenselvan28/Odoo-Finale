// Generic CRUD factory for simple models
const crudController = (Model, notFoundMsg = "Record not found") => ({
  getAll: async (req, res) => {
    try { res.json(await Model.findAll()); }
    catch (err) { res.status(500).json({ message: err.message }); }
  },
  getOne: async (req, res) => {
    try {
      const item = await Model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: notFoundMsg });
      res.json(item);
    } catch (err) { res.status(500).json({ message: err.message }); }
  },
  create: async (req, res) => {
    try { res.status(201).json(await Model.create(req.body)); }
    catch (err) { res.status(500).json({ message: err.message }); }
  },
  update: async (req, res) => {
    try {
      const item = await Model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: notFoundMsg });
      await item.update(req.body);
      res.json(item);
    } catch (err) { res.status(500).json({ message: err.message }); }
  },
  remove: async (req, res) => {
    try {
      const item = await Model.findByPk(req.params.id);
      if (!item) return res.status(404).json({ message: notFoundMsg });
      await item.destroy();
      res.json({ message: "Deleted successfully" });
    } catch (err) { res.status(500).json({ message: err.message }); }
  },
});

module.exports = crudController;
