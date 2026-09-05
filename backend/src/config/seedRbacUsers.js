const { sequelize } = require("./database");
const bcrypt = require("bcryptjs");
const User = require("../models/User.model");
const Role = require("../models/Role.model");

const seedRbacUsers = async () => {
  console.log("🔄 Initializing enterprise RBAC roles & user personas...");

  // 1. Ensure Roles
  const rolesList = [
    { id: 1, name: "admin" },
    { id: 2, name: "sales_rep" },
    { id: 3, name: "sales_manager" },
    { id: 4, name: "finance_manager" },
    { id: 5, name: "warehouse_manager" },
  ];

  for (const r of rolesList) {
    const existing = await Role.findByPk(r.id);
    if (!existing) {
      await Role.create(r);
    } else if (existing.name !== r.name) {
      await existing.update({ name: r.name });
    }
  }

  // 2. Dedicated Test Personas
  const testPersonas = [
    {
      name: "System Administrator",
      email: "admin@dealflow360.com",
      password: "password123",
      role: "admin",
      role_id: 1,
    },
    {
      name: "Marcus Vance (Sales Director)",
      email: "sales.manager@dealflow360.com",
      password: "password123",
      role: "sales_manager",
      role_id: 3,
    },
    {
      name: "Sarah Lin (Account Executive)",
      email: "sales.rep@dealflow360.com",
      password: "password123",
      role: "sales_rep",
      role_id: 2,
    },
    {
      name: "David Sterling (Finance Controller)",
      email: "finance@dealflow360.com",
      password: "password123",
      role: "finance_manager",
      role_id: 4,
    },
    {
      name: "Elena Rostova (Supply Chain Lead)",
      email: "warehouse@dealflow360.com",
      password: "password123",
      role: "warehouse_manager",
      role_id: 5,
    },
    {
      name: "User One (Admin Legacy)",
      email: "user1@dealflow360.com",
      password: "password123",
      role: "admin",
      role_id: 1,
    },
  ];

  for (const persona of testPersonas) {
    let user = await User.findOne({ where: { email: persona.email } });
    if (!user) {
      await User.create(persona);
      console.log(`✅ Created test persona: ${persona.email} (${persona.role})`);
    } else {
      const hashedPassword = await bcrypt.hash(persona.password, 12);
      await user.update({
        role: persona.role,
        role_id: persona.role_id,
        name: persona.name,
        password: hashedPassword,
        isActive: true,
      });
      console.log(`🔄 Updated test persona: ${persona.email} (${persona.role})`);
    }
  }

  // 3. Update any users with null role_id
  const [updated] = await sequelize.query(`
    UPDATE users 
    SET role_id = CASE 
      WHEN role = 'admin' THEN 1 
      WHEN role = 'sales_manager' THEN 3
      WHEN role = 'finance_manager' THEN 4
      WHEN role = 'warehouse_manager' THEN 5
      ELSE 2 
    END,
    role = CASE
      WHEN role = 'admin' THEN 'admin'
      WHEN role = 'sales_manager' THEN 'sales_manager'
      WHEN role = 'finance_manager' THEN 'finance_manager'
      WHEN role = 'warehouse_manager' THEN 'warehouse_manager'
      ELSE 'sales_rep'
    END
    WHERE role_id IS NULL OR role = 'user'
  `);

  console.log(`✅ Synchronized role_id and roles for existing database users.`);
};

if (require.main === module) {
  seedRbacUsers()
    .then(() => {
      console.log("✨ RBAC initialization complete!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ RBAC seed failed:", err);
      process.exit(1);
    });
}

module.exports = seedRbacUsers;
