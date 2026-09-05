const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Customer = sequelize.define("Customer", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  email: { type: DataTypes.STRING(150) },
  phone: { type: DataTypes.STRING(30) },
  tier_id: { type: DataTypes.INTEGER },
  industry: { type: DataTypes.STRING(100) },
}, { tableName: "customers", timestamps: true, createdAt: "created_at", updatedAt: false });

module.exports = Customer;
