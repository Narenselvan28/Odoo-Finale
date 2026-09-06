const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/quotation.controller");

// All quotation endpoints (including portal routes) require authentication
router.use(protect);
router.get("/public/:id", ctrl.getPublicQuote);
router.post("/public/:id/negotiate", ctrl.customerNegotiate);

// Internal Staff Endpoints (Protected - Enabled for all enterprise staff)
router.post("/evaluate-risk", ctrl.evaluateRisk);
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.patch("/:id/status", ctrl.updateStatus);
router.delete("/:id", ctrl.remove);

module.exports = router;
