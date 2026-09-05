const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Alert = sequelize.define("Alert", {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER },
  alert_type: { type: DataTypes.STRING(100) },
  severity: { type: DataTypes.ENUM("INFO", "WARNING", "CRITICAL") },
  message: { type: DataTypes.TEXT },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: "alerts",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Alert;
