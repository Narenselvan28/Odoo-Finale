const router = require("express").Router();
const { protect, requireAdmin } = require("../middleware/auth.middleware");
const { getAllRoles, createRole, deleteRole } = require("../controllers/role.controller");

router.use(protect);
router.use(requireAdmin);

router.get("/", getAllRoles);
router.post("/", createRole);
router.delete("/:id", deleteRole);

module.exports = router;
