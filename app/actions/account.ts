"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/password-policy";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// ─── Update profile ─────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(80, "Name is too long")
    .optional()
    .or(z.literal("")),
});

export async function updateProfile(values: z.infer<typeof profileSchema>) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid fields" };
  }

  const name = parsed.data.name?.trim() || null;

  await db.user.update({
    where: { id: session.user.id },
    data: { name },
  });

  revalidatePath("/dashboard/account");
  return { success: true };
}

// ─── Change password ────────────────────────────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export async function changePassword(values: z.infer<typeof changePasswordSchema>) {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid fields" };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { password: true, email: true },
  });
  if (!user) return { error: "User not found" };

  const matches = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!matches) {
    return { error: "Current password is incorrect" };
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 10);

  await db.user.update({
    where: { id: session.user.id },
    data: {
      password: hashed,
      sessionVersion: { increment: 1 },
    },
  });

  await logAudit({
    action: "account.password.changed",
    adminId: session.user.id,
    adminEmail: user.email,
    entityType: "User",
    entityId: session.user.id,
  });

  revalidatePath("/dashboard/account");
  return { success: true };
}
