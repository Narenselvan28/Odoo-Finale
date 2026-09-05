const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SubscriptionPlan = sequelize.define("SubscriptionPlan", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  billing_cycle: { type: DataTypes.ENUM("MONTHLY", "QUARTERLY", "YEARLY") },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  proration_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  cancellation_refund_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "subscription_plans", timestamps: false });

module.exports = SubscriptionPlan;
