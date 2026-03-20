"use server";

import { db } from "@/lib/db";
import { verifyToken, generateToken, hasRecentToken } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mail";

export async function verifyEmail(rawToken: string) {
  const result = await verifyToken(rawToken, "EMAIL_VERIFICATION");

  if (!result) {
    return { error: "Invalid or expired verification link." };
  }

  const user = await db.user.findUnique({
    where: { email: result.email },
  });

  if (!user) {
    return { error: "User not found." };
  }

  if (user.emailVerified) {
    return { success: "Email already verified. You can sign in." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });

  return { success: "Email verified! You can now sign in." };
}

export async function resendVerification(email: string) {
  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user || user.emailVerified) {
    // Don't leak whether the email exists
    return { success: "If that email is registered, a new verification link has been sent." };
  }

  const recentlySent = await hasRecentToken(email, "EMAIL_VERIFICATION");
  if (recentlySent) {
    return { error: "Please wait at least 60 seconds before requesting another email." };
  }

  const token = await generateToken(email, "EMAIL_VERIFICATION");
  await sendVerificationEmail(email, token);

  return { success: "If that email is registered, a new verification link has been sent." };
}
