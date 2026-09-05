const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/inventory.controller");

router.use(protect);
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
