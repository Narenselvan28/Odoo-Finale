const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Category = sequelize.define("Category", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  max_discount: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
}, { tableName: "categories", timestamps: false });

module.exports = Category;
