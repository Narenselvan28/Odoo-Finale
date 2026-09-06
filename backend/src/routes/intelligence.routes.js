const router = require("express").Router();
const ctrl = require("../controllers/intelligence.controller");
const { protect } = require("../middleware/auth.middleware");

// Public endpoints (Customer Portal Assistant & Public What-If analysis)
router.get("/health", ctrl.checkHealth);
router.post("/customer-chat", ctrl.customerChat);
router.post("/customer-chat/confirm", ctrl.confirmChatAction);
router.post("/customer-chat/cancel", ctrl.cancelChatAction);

// Deal analysis & What-If simulation (Supports public customer portal with quote context)
router.post("/analyze-quote", ctrl.analyzeQuote);
router.post("/what-if", ctrl.simulateWhatIf);
router.post("/scenarios", ctrl.simulateScenarios);

// ML direct inference endpoints
router.post("/recommend-discount", ctrl.recommendDiscount);
router.post("/discount-risk", ctrl.predictDiscountRisk);

module.exports = router;
