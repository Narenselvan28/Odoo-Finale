const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BillingSchedule = sequelize.define("BillingSchedule", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  subscription_id: { type: DataTypes.INTEGER, allowNull: false },
  billing_date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  status: {
    type: DataTypes.ENUM("PENDING", "INVOICED", "PAID", "CANCELLED"),
    defaultValue: "PENDING",
  },
}, { tableName: "billing_schedules", timestamps: false });

module.exports = BillingSchedule;
