const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ProductRecommendation = sequelize.define("ProductRecommendation", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  recommended_product_id: { type: DataTypes.INTEGER, allowNull: false },
  recommendation_type: { type: DataTypes.ENUM("UPSELL", "CROSS_SELL") },
  score: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  min_margin_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  is_promoted: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: "product_recommendations", timestamps: false });

module.exports = ProductRecommendation;
