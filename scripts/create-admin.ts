import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const db = new PrismaClient({});

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@railops.com";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error("Set ADMIN_PASSWORD environment variable before running this script.");
    console.error("Example: ADMIN_PASSWORD=YourPass123 npx tsx scripts/create-admin.ts");
    process.exit(1);
  }

  console.log(`Creating admin user (${email})...`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await db.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: new Date(),
    },
    create: {
      email,
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  console.log("Admin user ready:");
  console.log(`  Email: ${admin.email}`);
  console.log("  Role: ADMIN");
  console.log("  Email verified: yes");
}

main()
  .catch((error) => {
    console.error("Error creating admin user:", error);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
