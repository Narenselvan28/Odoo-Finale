const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const DealEvent = sequelize.define("DealEvent", {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER },
  event_type: { type: DataTypes.STRING(100), allowNull: false },
  event_data: { type: DataTypes.JSON },
  triggered_by: { type: DataTypes.INTEGER },
}, {
  tableName: "deal_events",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = DealEvent;
