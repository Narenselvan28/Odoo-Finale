const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PriceListItem = sequelize.define("PriceListItem", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  price_list_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
}, { tableName: "price_list_items", timestamps: false });

module.exports = PriceListItem;
