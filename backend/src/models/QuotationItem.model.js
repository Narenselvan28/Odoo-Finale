const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const QuotationItem = sequelize.define("QuotationItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  discount_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  line_total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  cost_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  margin_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
}, { tableName: "quotation_items", timestamps: false });

module.exports = QuotationItem;
