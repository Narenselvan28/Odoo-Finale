const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Product = sequelize.define("Product", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
  sku: { type: DataTypes.STRING(100), unique: true },
  description: { type: DataTypes.TEXT },
  unit: { type: DataTypes.STRING(30) },
  base_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  cost_price: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  tax_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  product_type: {
    type: DataTypes.ENUM("ONE_TIME", "SUBSCRIPTION"),
    defaultValue: "ONE_TIME",
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: "products", timestamps: false });

const Category = require("./Category.model");

Product.belongsTo(Category, { foreignKey: "category_id", as: "Category" });

module.exports = Product;
