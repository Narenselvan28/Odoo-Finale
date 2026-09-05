const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DiscountRule = sequelize.define("DiscountRule", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_tier_id: { type: DataTypes.INTEGER },
  category_id: { type: DataTypes.INTEGER },
  max_discount: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
  risk_level: { type: DataTypes.STRING(20) },
}, { tableName: "discount_rules", timestamps: false });

module.exports = DiscountRule;
