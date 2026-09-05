const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Subscription = sequelize.define("Subscription", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  plan_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  start_date: { type: DataTypes.DATEONLY, allowNull: false },
  end_date: { type: DataTypes.DATEONLY },
  status: {
    type: DataTypes.ENUM("ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"),
    defaultValue: "ACTIVE",
  },
  next_billing_date: { type: DataTypes.DATEONLY },
}, { tableName: "subscriptions", timestamps: false });

module.exports = Subscription;
