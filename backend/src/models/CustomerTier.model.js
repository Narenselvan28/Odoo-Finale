const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CustomerTier = sequelize.define("CustomerTier", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false },
  max_discount: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
}, { tableName: "customer_tiers", timestamps: false });

module.exports = CustomerTier;
