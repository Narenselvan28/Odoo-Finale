const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Invoice = sequelize.define("Invoice", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false },
  invoice_number: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  invoice_type: { type: DataTypes.ENUM("ONE_TIME", "RECURRING") },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM("DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"),
    defaultValue: "DRAFT",
  },
  due_date: { type: DataTypes.DATEONLY },
}, {
  tableName: "invoices",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Invoice;
