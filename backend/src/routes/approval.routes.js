const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/approval.controller");

router.use(protect);
router.get("/", ctrl.getAll);
router.get("/quotation/:quotationId", ctrl.getByQuotation);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.patch("/:id/action", ctrl.action);

module.exports = router;
