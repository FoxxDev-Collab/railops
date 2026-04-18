"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { generateToken, verifyToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { passwordSchema } from "@/lib/password-policy";

export async function requestPasswordReset(email: string) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`reset:${ip}`, { limit: 3, windowSec: 900 });
  if (!rl.success) {
    return { success: "If that email is registered, a reset link has been sent." };
  }

  const user = await db.user.findUnique({ where: { email } });

  // Always return success to not leak email existence
  if (!user) {
    return { success: "If that email is registered, a reset link has been sent." };
  }

  const token = await generateToken(email, "PASSWORD_RESET");
  await sendPasswordResetEmail(email, token);

  return { success: "If that email is registered, a reset link has been sent." };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid password" };
  }

  const result = await verifyToken(rawToken, "PASSWORD_RESET");
  if (!result) {
    return { error: "Invalid or expired reset link." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await db.user.update({
    where: { email: result.email },
    data: { password: hashedPassword, sessionVersion: { increment: 1 } },
  });

  return { success: "Password reset successfully. You can now sign in." };
}
