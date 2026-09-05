const router = require("express").Router();
const { protect, restrictTo } = require("../middleware/auth.middleware");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

router.use(protect);

router.get("/", restrictTo("admin"), getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", restrictTo("admin"), deleteUser);

module.exports = router;
