const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ApprovalAuditLog = sequelize.define("ApprovalAuditLog", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.STRING(50) },
  old_status: { type: DataTypes.STRING(50) },
  new_status: { type: DataTypes.STRING(50) },
  reason: { type: DataTypes.TEXT },
}, {
  tableName: "approval_audit_logs",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = ApprovalAuditLog;
