require("dotenv").config();
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const provisionCustomerUsers = async () => {
  try {
    console.log("🔄 Starting Customer User Provisioning...");

    // 1. Ensure customer_id column exists on users table
    const [cols] = await sequelize.query("SHOW COLUMNS FROM users LIKE 'customer_id'");
    if (cols.length === 0) {
      console.log("Adding customer_id column to users table...");
      await sequelize.query("ALTER TABLE users ADD COLUMN customer_id INT NULL AFTER role_id");
      console.log("✅ Added customer_id column.");
    } else {
      console.log("✓ customer_id column already exists.");
    }

    // 2. Ensure customer role exists in roles table
    const [existingRoles] = await sequelize.query("SELECT * FROM roles WHERE name = 'customer'");
    let customerRoleId;
    if (existingRoles.length === 0) {
      console.log("Creating 'customer' role in roles table...");
      const [res] = await sequelize.query(
        "INSERT INTO roles (name) VALUES ('customer')"
      );
      customerRoleId = res;
      console.log(`✅ Created 'customer' role with ID: ${customerRoleId}`);
    } else {
      customerRoleId = existingRoles[0].id;
      console.log(`✓ 'customer' role exists with ID: ${customerRoleId}`);
    }

    // 3. Fetch all customers
    const [customers] = await sequelize.query("SELECT id, name, email, phone, industry FROM customers");
    console.log(`Found ${customers.length} existing customers to verify.`);

    // 4. Provision user accounts for each customer
    const defaultHashedPassword = await bcrypt.hash("password123", 12);
    let createdCount = 0;
    let existingCount = 0;

    for (const cust of customers) {
      const emailToUse = cust.email && cust.email.trim()
        ? cust.email.trim().toLowerCase()
        : `customer${cust.id}@dealflow360.com`;

      const [foundUser] = await sequelize.query(
        "SELECT id, email, role, customer_id FROM users WHERE email = :email OR customer_id = :customerId",
        { replacements: { email: emailToUse, customerId: cust.id } }
      );

      if (foundUser.length > 0) {
        // Already exists, ensure customer_id and role are set
        if (!foundUser[0].customer_id) {
          await sequelize.query(
            "UPDATE users SET customer_id = :customerId, role = 'customer', role_id = :roleId WHERE id = :id",
            { replacements: { customerId: cust.id, roleId: customerRoleId, id: foundUser[0].id } }
          );
        }
        existingCount++;
      } else {
        // Create user for this customer
        const userName = `${cust.name} (Client)`;
        await sequelize.query(
          `INSERT INTO users (name, email, password, role, role_id, customer_id, isActive, createdAt, updatedAt)
           VALUES (:name, :email, :password, 'customer', :roleId, :customerId, 1, NOW(), NOW())`,
          {
            replacements: {
              name: userName,
              email: emailToUse,
              password: defaultHashedPassword,
              roleId: customerRoleId,
              customerId: cust.id,
            },
          }
        );
        createdCount++;
      }
    }

    console.log(`🎉 Finished provisioning!`);
    console.log(`   - New customer user accounts created: ${createdCount}`);
    console.log(`   - Already existing customer user accounts: ${existingCount}`);
    console.log(`   - Total customer logins active: ${createdCount + existingCount}`);
    return { createdCount, existingCount };
  } catch (err) {
    console.error("❌ Error provisioning customer users:", err);
    throw err;
  }
};

if (require.main === module) {
  provisionCustomerUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { provisionCustomerUsers };
