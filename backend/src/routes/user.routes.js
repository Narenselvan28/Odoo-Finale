const router = require("express").Router();
const { protect, requireAdmin } = require("../middleware/auth.middleware");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

router.use(protect);

// Read users list for team dropdowns, assignment, and reporting
router.get("/", getAllUsers);
router.get("/:id", getUserById);

// Admin only mutations
router.put("/:id", requireAdmin, updateUser);
router.delete("/:id", requireAdmin, deleteUser);

module.exports = router;
