"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

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
          stations: true,
          rollingStock: true,
          routes: true,
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
              stations: true,
              rollingStock: true,
              routes: true,
            },
          },
        },
      },
      _count: {
        select: {
          layouts: true,
          stations: true,
          rollingStock: true,
          engines: true,
          routes: true,
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
    },
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
  await requireAdmin();

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: "User not found" };
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      role: user.role === "ADMIN" ? "USER" : "ADMIN",
    },
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

  await db.user.delete({
    where: { id: userId },
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
    totalLayouts,
    totalStations,
    totalRollingStock,
    totalRoutes,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "ADMIN" } }),
    db.layout.count(),
    db.station.count(),
    db.rollingStock.count(),
    db.route.count(),
  ]);

  return {
    totalUsers,
    adminUsers,
    regularUsers: totalUsers - adminUsers,
    totalLayouts,
    totalStations,
    totalRollingStock,
    totalRoutes,
  };
}
