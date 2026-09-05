const router = require("express").Router();
const { protect, requireAdmin } = require("../middleware/auth.middleware");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

router.use(protect);
router.use(requireAdmin);

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
