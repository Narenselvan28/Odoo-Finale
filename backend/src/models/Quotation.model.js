const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Quotation = sequelize.define("Quotation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  sales_rep_id: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM(
      "DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED",
      "UNDER_NEGOTIATION", "CONFIRMED", "FULFILLMENT", "COMPLETED", "CANCELLED"
    ),
    defaultValue: "DRAFT",
  },
  subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  margin_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  margin_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  risk_score: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  risk_level: { type: DataTypes.STRING(20) },
  valid_until: { type: DataTypes.DATEONLY },
}, {
  tableName: "quotations",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: "updated_at",
});

module.exports = Quotation;
