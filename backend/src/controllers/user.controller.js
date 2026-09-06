const User = require("../models/User.model");
const Role = require("../models/Role.model");
const Customer = require("../models/Customer.model");

// GET /api/users/profile/me
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Customer, as: "Customer" },
      ],
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj = user.toJSON();
    userObj.role = user.Role?.name || user.role || "sales_rep";
    delete userObj.Role;
    res.json({ user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/profile/me
const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, password } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (password) updates.password = password; // bcrypt hashed by beforeUpdate hook

    await user.update(updates);

    const refreshed = await User.findByPk(user.id, {
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Customer, as: "Customer" },
      ],
    });

    const userObj = refreshed.toJSON();
    userObj.role = refreshed.Role?.name || refreshed.role;
    delete userObj.Role;

    res.json({ message: "Profile updated successfully", user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users  (admin/team directory)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Customer, as: "Customer", attributes: ["id", "name", "email", "industry"] },
      ],
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Customer, as: "Customer" },
      ],
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:id
const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, isActive, role } = req.body;
    await user.update({ name, email, isActive, role });
    res.json({ message: "User updated", user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.destroy();
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
