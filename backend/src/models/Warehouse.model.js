const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Warehouse = sequelize.define("Warehouse", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  location: { type: DataTypes.STRING(200) },
  shipping_cost_weight: { type: DataTypes.DECIMAL(10, 2), defaultValue: 1 },
}, { tableName: "warehouses", timestamps: false });

module.exports = Warehouse;
