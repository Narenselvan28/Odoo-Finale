const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ApprovalRequest = sequelize.define("ApprovalRequest", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false },
  approval_level: { type: DataTypes.INTEGER, allowNull: false },
  approver_role: { type: DataTypes.STRING(50), allowNull: false },
  status: {
    type: DataTypes.ENUM("PENDING", "APPROVED", "REJECTED", "RETURNED"),
    defaultValue: "PENDING",
  },
  reason: { type: DataTypes.TEXT },
  acted_by: { type: DataTypes.INTEGER },
  acted_at: { type: DataTypes.DATE },
}, {
  tableName: "approval_requests",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = ApprovalRequest;
