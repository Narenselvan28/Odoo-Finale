require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { testConnection } = require("./config/database");
require("./config/associations"); // register all Sequelize model associations

const authRoutes         = require("./routes/auth.routes");
const userRoutes         = require("./routes/user.routes");
const roleRoutes         = require("./routes/role.routes");
const customerTierRoutes = require("./routes/customerTier.routes");
const customerRoutes     = require("./routes/customer.routes");
const categoryRoutes     = require("./routes/category.routes");
const productRoutes      = require("./routes/product.routes");
const quotationRoutes    = require("./routes/quotation.routes");
const approvalRoutes     = require("./routes/approval.routes");
const inventoryRoutes    = require("./routes/inventory.routes");
const intelligenceRoutes = require("./routes/intelligence.routes");
const miscRoutes         = require("./routes/misc.routes");

const app = express();

// ── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === "development") app.use(morgan("dev"));

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",                   authRoutes);
app.use("/api/users",                  userRoutes);
app.use("/api/roles",                  roleRoutes);
app.use("/api/customer-tiers",         customerTierRoutes);
app.use("/api/customers",              customerRoutes);
app.use("/api/categories",             categoryRoutes);
app.use("/api/products",               productRoutes);
app.use("/api/quotations",             quotationRoutes);
app.use("/api/approvals",              approvalRoutes);
app.use("/api/inventory",              inventoryRoutes);
app.use("/api/intelligence",           intelligenceRoutes);
app.use("/api",                        miscRoutes);

// ── 404 handler ──────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// ── Global error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.statusCode || 500)
    .json({ message: err.message || "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀  Server running on http://localhost:${PORT}`);
  await testConnection();
});
