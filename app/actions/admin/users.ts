"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { Plan } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAudit } from "@/lib/audit";
import { passwordSchema } from "@/lib/password-policy";

// Authorization helper
async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

// Get all users with stats
export async function getAllUsers() {
  await requireAdmin();

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      image: true,
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
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      image: true,
      stripeCustomerId: true,
      stripeSubId: true,
      planExpiresAt: true,
      lastLoginAt: true,
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
  password: passwordSchema,
  name: z.string().min(2).optional(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  plan: z.enum(["FREE", "PRO"]).default("FREE"),
});

export async function createUser(values: z.infer<typeof createUserSchema>) {
  await requireAdmin();

  const validatedFields = createUserSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Invalid fields" };
  }

  const { email, password, name, role, plan } = validatedFields.data;

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
      plan,
      emailVerified: new Date(), // Admin-created users are pre-verified
    },
  });

  const adminSession = await requireAdmin();
  await logAudit({
    action: "user.create",
    adminId: adminSession.user.id,
    adminEmail: adminSession.user.email ?? "unknown",
    entityType: "User",
    entityId: user.id,
    metadata: { email, role, plan },
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
    data: { role: newRole, sessionVersion: { increment: 1 } },
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
    data: { password: hashedPassword, sessionVersion: { increment: 1 } },
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

// Get user timeline events
export async function getUserTimeline(userId: string) {
  await requireAdmin();

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      createdAt: true,
      emailVerified: true,
      plan: true,
      lastLoginAt: true,
    },
  });

  if (!user) return [];

  const events: Array<{ date: Date; label: string; type: string }> = [];
  events.push({ date: user.createdAt, label: "Account created", type: "signup" });

  if (user.emailVerified) {
    events.push({ date: user.emailVerified, label: "Email verified", type: "verified" });
  }

  // Check for first layout
  const firstLayout = await db.layout.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, name: true },
  });
  if (firstLayout) {
    events.push({
      date: firstLayout.createdAt,
      label: `First railroad created: ${firstLayout.name}`,
      type: "milestone",
    });
  }

  // Check for first session
  const firstSession = await db.operatingSession.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });
  if (firstSession) {
    events.push({ date: firstSession.createdAt, label: "First operating session", type: "milestone" });
  }

  if (user.lastLoginAt) {
    events.push({ date: user.lastLoginAt, label: "Last login", type: "login" });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

// Get user activity feed (paginated)
export async function getUserActivityFeed(
  userId: string,
  { page = 1, action }: { page?: number; action?: string } = {}
) {
  await requireAdmin();

  const pageSize = 20;
  const where: Record<string, unknown> = { userId };
  if (action) where.action = action;

  const [activities, total] = await Promise.all([
    db.userActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.userActivity.count({ where }),
  ]);

  return {
    activities,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
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
