"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Plan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

// Authorization helper
async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

// Get all users with stats
export async function getAllUsers() {
  await requireAdmin();

  const users = await db.user.findMany({
    include: {
      _count: {
        select: {
          layouts: true,
          locations: true,
          freightCars: true,
          locomotives: true,
          trains: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

// Get user by ID with detailed stats
export async function getUserDetails(userId: string) {
  await requireAdmin();

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      layouts: {
        include: {
          _count: {
            select: {
              locations: true,
              freightCars: true,
              locomotives: true,
              trains: true,
            },
          },
        },
      },
      _count: {
        select: {
          layouts: true,
          locations: true,
          freightCars: true,
          locomotives: true,
          trains: true,
          waybills: true,
          sessions: true,
        },
      },
    },
  });

  return user;
}

// Create new user (admin only)
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2).optional(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export async function createUser(values: z.infer<typeof createUserSchema>) {
  await requireAdmin();

  const validatedFields = createUserSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  const { email, password, name, role } = validatedFields.data;

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { error: "Email already in use" };
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role,
      emailVerified: new Date(), // Admin-created users are pre-verified
    },
  });

  await logAudit({
    action: "user.create",
    adminId: (await auth())!.user.id,
    adminEmail: (await auth())!.user.email!,
    entityType: "User",
    entityId: user.id,
    metadata: { email, role },
  });

  revalidatePath("/admin/users");
  return { success: true, user };
}

// Update user
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export async function updateUser(
  userId: string,
  values: z.infer<typeof updateUserSchema>
) {
  await requireAdmin();

  const validatedFields = updateUserSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  const user = await db.user.update({
    where: { id: userId },
    data: validatedFields.data,
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { success: true, user };
}

// Toggle admin role
export async function toggleAdminRole(userId: string) {
  const session = await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "User not found" };
  }

  const newRole = user.role === "ADMIN" ? "USER" : "ADMIN";
  const updatedUser = await db.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await logAudit({
    action: "user.role.toggle",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "User",
    entityId: userId,
    metadata: { from: user.role, to: newRole, email: user.email },
  });

  revalidatePath("/admin/users");
  return { success: true, user: updatedUser };
}

// Delete user (cascades to all their data)
export async function deleteUser(userId: string) {
  const session = await requireAdmin();

  // Prevent self-deletion
  if (session.user.id === userId) {
    return { error: "Cannot delete your own account" };
  }

  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  await db.user.delete({ where: { id: userId } });

  await logAudit({
    action: "user.delete",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "User",
    entityId: userId,
    metadata: { deletedEmail: user?.email },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Set user plan (admin override — bypasses Stripe)
export async function setUserPlan(userId: string, plan: Plan) {
  const session = await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  await db.user.update({
    where: { id: userId },
    data: { plan },
  });

  await logAudit({
    action: "user.plan.change",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "User",
    entityId: userId,
    metadata: { from: user.plan, to: plan, email: user.email },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Verify user email (admin override)
export async function verifyUserEmail(userId: string) {
  await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  if (user.emailVerified) return { error: "Already verified" };

  await db.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Reset user password (admin override)
export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await requireAdmin();

  if (newPassword.length < 8) return { error: "Password must be at least 8 characters" };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  await logAudit({
    action: "user.password.reset",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "User",
    entityId: userId,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// Get system stats
export async function getSystemStats() {
  await requireAdmin();

  const [
    totalUsers,
    adminUsers,
    verifiedUsers,
    freeUsers,
    proUsers,
    totalLayouts,
    totalLocations,
    totalFreightCars,
    totalLocomotives,
    totalTrains,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { emailVerified: { not: null } } }),
    db.user.count({ where: { plan: "FREE" } }),
    db.user.count({ where: { plan: "PRO" } }),
    db.layout.count(),
    db.location.count(),
    db.freightCar.count(),
    db.locomotive.count(),
    db.train.count(),
  ]);

  return {
    totalUsers,
    adminUsers,
    regularUsers: totalUsers - adminUsers,
    verifiedUsers,
    unverifiedUsers: totalUsers - verifiedUsers,
    freeUsers,
    proUsers,
    totalLayouts,
    totalLocations,
    totalFreightCars,
    totalLocomotives,
    totalTrains,
  };
}
