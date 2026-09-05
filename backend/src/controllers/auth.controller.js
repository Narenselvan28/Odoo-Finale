const User = require("../models/User.model");
const Role = require("../models/Role.model");
const { generateToken } = require("../utils/jwt.utils");

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({ name, email, password, role: "sales_rep", role_id: 2 });
    const token = generateToken({ id: user.id, role: "sales_rep" });

    const userObj = user.toJSON();
    delete userObj.Role;

    res.status(201).json({ message: "Registered successfully", token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, attributes: ["id", "name"] }],
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    const resolvedRole = user.Role?.name || user.role || "sales_rep";
    const token = generateToken({ id: user.id, role: resolvedRole });

    const userObj = user.toJSON();
    userObj.role = resolvedRole;
    delete userObj.Role; // Eliminate duplicate case collision

    res.json({ message: "Login successful", token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const userObj = req.user.toJSON ? req.user.toJSON() : { ...req.user };
  userObj.role = req.user.Role?.name || req.user.role || "sales_rep";
  delete userObj.Role;
  res.json({ user: userObj });
};

module.exports = { register, login, getMe };
