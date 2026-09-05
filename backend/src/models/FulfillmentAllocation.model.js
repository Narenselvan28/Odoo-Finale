const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const FulfillmentAllocation = sequelize.define("FulfillmentAllocation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_item_id: { type: DataTypes.INTEGER, allowNull: false },
  warehouse_id: { type: DataTypes.INTEGER, allowNull: false },
  allocated_quantity: { type: DataTypes.INTEGER, allowNull: false },
  shipping_cost: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  status: {
    type: DataTypes.ENUM("ALLOCATED", "SHIPPED", "DELIVERED", "BACKORDER"),
    defaultValue: "ALLOCATED",
  },
}, { tableName: "fulfillment_allocations", timestamps: false });

module.exports = FulfillmentAllocation;
