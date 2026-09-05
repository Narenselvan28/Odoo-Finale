require("dotenv").config();
const { sequelize } = require("./database");

// Import all models so Sequelize registers them
require("../models/User.model");

(async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log("✅  All tables synced successfully.");
    process.exit(0);
  } catch (err) {
    console.error("❌  Sync failed:", err);
    process.exit(1);
  }
})();
