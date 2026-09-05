const router = require("express").Router();
const { protect, requireSales, requireSalesManager } = require("../middleware/auth.middleware");
const ctrl = require("../controllers/quotation.controller");

// Customer-Facing Negotiation Portal Endpoints (No staff token required)
router.get("/public/:id", ctrl.getPublicQuote);
router.post("/public/:id/negotiate", ctrl.customerNegotiate);

// Internal Staff Endpoints (Protected)
router.use(protect);
router.post("/evaluate-risk", ctrl.evaluateRisk);
router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getOne);
router.post("/", requireSales, ctrl.create);
router.put("/:id", requireSales, ctrl.update);
router.patch("/:id/status", requireSales, ctrl.updateStatus);
router.delete("/:id", requireSalesManager, ctrl.remove);

module.exports = router;
