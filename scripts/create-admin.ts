import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const db = new PrismaClient({});

async function main() {
  const email = "admin@railops.com";
  const password = "RAILops@@22";

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
  console.log("Password: RAILops@@22");
}

main()
  .catch((error) => {
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
