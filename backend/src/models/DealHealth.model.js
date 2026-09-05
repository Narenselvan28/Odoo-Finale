const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DealHealth = sequelize.define("DealHealth", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  health_score: { type: DataTypes.DECIMAL(5, 2) },
  discount_risk: { type: DataTypes.DECIMAL(5, 2) },
  margin_risk: { type: DataTypes.DECIMAL(5, 2) },
  fulfillment_risk: { type: DataTypes.DECIMAL(5, 2) },
  negotiation_risk: { type: DataTypes.DECIMAL(5, 2) },
  status: { type: DataTypes.ENUM("HEALTHY", "AT_RISK", "CRITICAL") },
  last_activity_at: { type: DataTypes.DATE },
}, {
  tableName: "deal_health",
  timestamps: true,
  createdAt: false,
  updatedAt: "updated_at",
});

module.exports = DealHealth;
