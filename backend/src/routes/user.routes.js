const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require("../controllers/user.controller");

router.use(protect);

// User Profile routes (Accessible by all authenticated users)
router.get("/profile/me", getProfile);
router.put("/profile/me", updateProfile);

// Management routes
router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
