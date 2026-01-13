import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import ws from "ws";
import "dotenv/config";

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);
const db = new PrismaClient({ adapter });

async function main() {
  const email = "admin@railops.com";
  const password = "admin123"; // CHANGE THIS IN PRODUCTION!

  console.log("Creating admin user...");

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashedPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created successfully!");
  console.log("Email:", admin.email);
  console.log("Password: admin123 (CHANGE THIS!)");
}

main()
  .catch((error) => {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
