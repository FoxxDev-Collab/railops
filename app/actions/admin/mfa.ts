"use server";

import { adminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { generateTOTPSetup, verifyTOTPCode } from "@/lib/mfa/totp";
import { generateBackupCodes, verifyBackupCode } from "@/lib/mfa/backup-codes";
import { rateLimit } from "@/lib/rate-limit";
import { headers, cookies } from "next/headers";

async function setMfaVerifiedCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set("admin-mfa-verified", userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60, // match admin session maxAge
  });
}

async function getClientIp() {
  const hdrs = await headers();
  return hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

async function requireAdminSession() {
  const session = await adminAuth();
  if (!session?.user?.email || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user as { id: string; email: string; role: string; name: string | null };
}

/**
 * Generate a new TOTP setup (secret + QR code + backup codes).
 * Called when loading the setup page. Does NOT persist anything yet.
 */
export async function generateMfaSetup() {
  const user = await requireAdminSession();

  const totpSetup = await generateTOTPSetup(user.email);
  const { plaintextCodes, hashedCodes } = await generateBackupCodes();

  // Store the setup data temporarily in the DB (not yet enabled)
  // so the confirm step can access the encrypted secret and hashed codes
  await db.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: totpSetup.encryptedSecret,
      mfaBackupCodes: JSON.stringify(hashedCodes),
      mfaBackupCodesUsed: 0,
      // mfaEnabled stays false until confirmed
    },
  });

  return {
    qrDataUri: totpSetup.qrDataUri,
    secret: totpSetup.secret,
    backupCodes: plaintextCodes,
  };
}

/**
 * Confirm MFA setup by verifying the user can produce a valid TOTP code.
 * This enables MFA on the account.
 */
export async function confirmMfaSetup(code: string) {
  const ip = await getClientIp();
  const rl = rateLimit(`mfa-setup:${ip}`, { limit: 5, windowSec: 900 });
  if (!rl.success) {
    return { error: "Too many attempts. Please try again later." };
  }

  const user = await requireAdminSession();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!dbUser?.mfaSecret) {
    return { error: "MFA setup not started. Please refresh and try again." };
  }

  if (dbUser.mfaEnabled) {
    return { error: "MFA is already enabled." };
  }

  const isValid = verifyTOTPCode(dbUser.mfaSecret, code);
  if (!isValid) {
    return { error: "Invalid code. Please try again." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });

  await setMfaVerifiedCookie(user.id);

  return { success: true };
}

/**
 * Verify a TOTP code or backup code during login.
 */
export async function verifyMfaCode(code: string) {
  const ip = await getClientIp();
  const rl = rateLimit(`mfa-verify:${ip}`, { limit: 5, windowSec: 900 });
  if (!rl.success) {
    return { error: "Too many attempts. Please try again later." };
  }

  const user = await requireAdminSession();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { mfaSecret: true, mfaEnabled: true, mfaBackupCodes: true, mfaBackupCodesUsed: true },
  });

  if (!dbUser?.mfaSecret || !dbUser.mfaEnabled) {
    return { error: "MFA is not enabled." };
  }

  const normalizedCode = code.trim();

  // Try TOTP first (6 digits)
  if (/^\d{6}$/.test(normalizedCode)) {
    const isValid = verifyTOTPCode(dbUser.mfaSecret, normalizedCode);
    if (isValid) {
      await setMfaVerifiedCookie(user.id);
      return { success: true };
    }
    return { error: "Invalid code. Please try again." };
  }

  // Try backup code (xxxx-xxxx format or 8 chars)
  const hashedCodes: string[] = dbUser.mfaBackupCodes
    ? JSON.parse(dbUser.mfaBackupCodes)
    : [];

  const matchIndex = await verifyBackupCode(normalizedCode, hashedCodes);
  if (matchIndex === -1) {
    return { error: "Invalid code. Please try again." };
  }

  // Remove the used backup code
  hashedCodes.splice(matchIndex, 1);
  await db.user.update({
    where: { id: user.id },
    data: {
      mfaBackupCodes: JSON.stringify(hashedCodes),
      mfaBackupCodesUsed: (dbUser.mfaBackupCodesUsed ?? 0) + 1,
    },
  });

  await setMfaVerifiedCookie(user.id);

  return { success: true, backupCodeUsed: true, remainingCodes: hashedCodes.length };
}

/**
 * Regenerate backup codes. Requires a valid TOTP code for authorization.
 */
export async function regenerateBackupCodes(totpCode: string) {
  const ip = await getClientIp();
  const rl = rateLimit(`mfa-regen:${ip}`, { limit: 5, windowSec: 900 });
  if (!rl.success) {
    return { error: "Too many attempts. Please try again later." };
  }

  const user = await requireAdminSession();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!dbUser?.mfaSecret || !dbUser.mfaEnabled) {
    return { error: "MFA is not enabled." };
  }

  const isValid = verifyTOTPCode(dbUser.mfaSecret, totpCode);
  if (!isValid) {
    return { error: "Invalid TOTP code." };
  }

  const { plaintextCodes, hashedCodes } = await generateBackupCodes();

  await db.user.update({
    where: { id: user.id },
    data: {
      mfaBackupCodes: JSON.stringify(hashedCodes),
      mfaBackupCodesUsed: 0,
    },
  });

  return { success: true, backupCodes: plaintextCodes };
}

/**
 * Disable MFA. Requires a valid TOTP code for authorization.
 */
export async function disableMfa(totpCode: string) {
  const ip = await getClientIp();
  const rl = rateLimit(`mfa-disable:${ip}`, { limit: 5, windowSec: 900 });
  if (!rl.success) {
    return { error: "Too many attempts. Please try again later." };
  }

  const user = await requireAdminSession();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!dbUser?.mfaSecret || !dbUser.mfaEnabled) {
    return { error: "MFA is not enabled." };
  }

  const isValid = verifyTOTPCode(dbUser.mfaSecret, totpCode);
  if (!isValid) {
    return { error: "Invalid TOTP code." };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      mfaSecret: null,
      mfaEnabled: false,
      mfaBackupCodes: null,
      mfaBackupCodesUsed: 0,
    },
  });

  return { success: true };
}

/**
 * Get MFA status for the current admin user.
 */
export async function getMfaStatus() {
  const user = await requireAdminSession();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { mfaEnabled: true, mfaBackupCodes: true, mfaBackupCodesUsed: true },
  });

  if (!dbUser) {
    return { enabled: false, backupCodesRemaining: 0, backupCodesUsed: 0 };
  }

  const hashedCodes: string[] = dbUser.mfaBackupCodes
    ? JSON.parse(dbUser.mfaBackupCodes)
    : [];

  return {
    enabled: dbUser.mfaEnabled,
    backupCodesRemaining: hashedCodes.length,
    backupCodesUsed: dbUser.mfaBackupCodesUsed ?? 0,
  };
}
