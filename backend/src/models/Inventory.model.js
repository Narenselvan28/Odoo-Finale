const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Inventory = sequelize.define("Inventory", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  available_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
  reserved_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: "inventory",
  timestamps: true,
  createdAt: false,
  updatedAt: "updated_at",
  indexes: [{ unique: true, fields: ["warehouse_id", "product_id"] }],
});

module.exports = Inventory;
