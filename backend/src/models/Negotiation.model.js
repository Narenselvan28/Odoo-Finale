const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Negotiation = sequelize.define("Negotiation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quotation_id: { type: DataTypes.INTEGER, allowNull: false },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  requested_discount: { type: DataTypes.DECIMAL(5, 2) },
  message: { type: DataTypes.TEXT },
  status: {
    type: DataTypes.ENUM("OPEN", "APPROVED", "REJECTED", "COUNTERED", "CLOSED"),
    defaultValue: "OPEN",
  },
}, {
  tableName: "negotiations",
  timestamps: true,
  createdAt: "created_at",
  updatedAt: false,
});

module.exports = Negotiation;
