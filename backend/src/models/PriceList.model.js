const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PriceList = sequelize.define("PriceList", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  customer_tier_id: { type: DataTypes.INTEGER },
  currency: { type: DataTypes.STRING(10), defaultValue: "INR" },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "price_lists", timestamps: false });

module.exports = PriceList;
