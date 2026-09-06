const User = require("../models/User.model");
const Role = require("../models/Role.model");
const Customer = require("../models/Customer.model");
const { generateToken } = require("../utils/jwt.utils");

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, account_type, company_name, phone, industry } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const isCustomer = account_type === "customer" || Boolean(company_name);

    if (isCustomer) {
      // Find or create customer entity
      let customer = await Customer.findOne({ where: { email } });
      if (!customer) {
        customer = await Customer.create({
          name: company_name || `${name} Organization`,
          email,
          phone: phone || null,
          industry: industry || "Enterprise",
          tier_id: 2,
        });
      }

      let customerRole = await Role.findOne({ where: { name: "customer" } });
      const roleId = customerRole ? customerRole.id : 6;

      const user = await User.create({
        name,
        email,
        password,
        role: "customer",
        role_id: roleId,
        customer_id: customer.id,
      });

      const token = generateToken({ id: user.id, role: "customer" });
      const userObj = user.toJSON();
      userObj.Customer = customer;
      delete userObj.Role;

      return res.status(201).json({
        message: "Customer account registered successfully",
        token,
        user: userObj,
      });
    }

    // Default operator account
    const user = await User.create({ name, email, password, role: "sales_rep", role_id: 2 });
    const token = generateToken({ id: user.id, role: "sales_rep" });

    const userObj = user.toJSON();
    delete userObj.Role;

    res.status(201).json({ message: "Operator registered successfully", token, user: userObj });
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
      include: [
        { model: Role, attributes: ["id", "name"] },
        { model: Customer, as: "Customer" },
      ],
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
    delete userObj.Role; // Eliminate duplicate collision

    res.json({ message: "Login successful", token, user: userObj });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
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

module.exports = { register, login, getMe };
