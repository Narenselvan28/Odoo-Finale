const router = require("express").Router();
const { protect, requireWarehouse } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/inventory.controller");

router.use(protect);
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.post("/", requireWarehouse, ctrl.create);
router.put("/:id", requireWarehouse, ctrl.update);
router.delete("/:id", requireWarehouse, ctrl.remove);

module.exports = router;
