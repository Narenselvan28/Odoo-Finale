const { verifyToken } = require("../utils/jwt.utils");
const User = require("../models/User.model");
const Role = require("../models/Role.model");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, attributes: ["id", "name"] }],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    // Normalize role string (prefer Role association or fallback to column)
    if (user.Role && user.Role.name) {
      user.role = user.Role.name;
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalid or expired" });
  }
};

// Enterprise roles that can execute working functionalities
const enterpriseRoles = ["admin", "sales_manager", "sales_rep", "finance_manager", "warehouse_manager"];

const restrictTo = (...roles) => (req, res, next) => {
  const currentRole = req.user?.role || req.user?.Role?.name;
  if (!currentRole) {
    return res.status(401).json({ message: "User role not identified" });
  }

  // Allow all enterprise users so working functionalities are enabled for all users
  if (enterpriseRoles.includes(currentRole)) {
    return next();
  }

  if (roles.length > 0 && !roles.includes(currentRole)) {
    return res.status(403).json({
      message: `Access denied. Requires one of [${roles.join(", ")}]. Current role: '${currentRole}'`,
    });
  }
  next();
};

const requireAdmin = restrictTo("admin");
const requireSalesManager = restrictTo("admin", "sales_manager");
const requireSales = restrictTo("admin", "sales_manager", "sales_rep");
const requireFinance = restrictTo("admin", "finance_manager");
const requireWarehouse = restrictTo("admin", "warehouse_manager");

module.exports = {
  protect,
  restrictTo,
  requireAdmin,
  requireSalesManager,
  requireSales,
  requireFinance,
  requireWarehouse,
};
