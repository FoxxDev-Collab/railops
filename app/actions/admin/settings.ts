"use server";

import { adminAuth } from "@/lib/admin-auth";
import { getSetting, setSetting, getAllSettingsForAdmin, invalidateCache, type SettingKey, SETTING_KEYS } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await adminAuth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

// ─── Get all settings ────────────────────────────────────────────────────────

export async function getAdminSettings() {
  await requireAdmin();
  const dbSettings = await getAllSettingsForAdmin();

  // Build a complete map including env fallbacks for unconfigured keys
  const result: Record<string, { value: string; source: "database" | "env" | "unset"; encrypted: boolean }> = {};

  for (const [key, config] of Object.entries(SETTING_KEYS)) {
    const dbEntry = dbSettings.find((s) => s.key === key);

    if (dbEntry) {
      result[key] = { value: dbEntry.value, source: "database", encrypted: dbEntry.encrypted };
    } else if (config.envFallback && process.env[config.envFallback]) {
      result[key] = {
        value: config.sensitive ? "••••••••" : process.env[config.envFallback]!,
        source: "env",
        encrypted: config.sensitive,
      };
    } else {
      result[key] = { value: "", source: "unset", encrypted: false };
    }
  }

  return result;
}

// ─── Update settings ─────────────────────────────────────────────────────────

export async function updateSettings(
  settings: Array<{ key: SettingKey; value: string }>
) {
  const session = await requireAdmin();

  const changes: Record<string, { from: string; to: string }> = {};

  for (const { key, value } of settings) {
    // Skip empty values and masked values (unchanged encrypted fields)
    if (!value || value === "••••••••") continue;

    // Validate key exists
    if (!(key in SETTING_KEYS)) continue;

    const oldValue = await getSetting(key);
    await setSetting(key, value, session.user.id);
    changes[key] = { from: oldValue ? "***" : "(unset)", to: "***" };
  }

  if (Object.keys(changes).length > 0) {
    await logAudit({
      action: "settings.update",
      adminId: session.user.id,
      adminEmail: session.user.email!,
      entityType: "SystemSetting",
      metadata: { keysUpdated: Object.keys(changes) },
    });
  }

  invalidateCache();
  revalidatePath("/admin/system");
  return { success: true, updatedCount: Object.keys(changes).length };
}

// ─── Test SMTP connection ────────────────────────────────────────────────────

export async function testSmtpConnection(): Promise<{ success: boolean; message: string }> {
  await requireAdmin();

  try {
    const [host, port, user, pass, secure] = await Promise.all([
      getSetting("smtp.host"),
      getSetting("smtp.port"),
      getSetting("smtp.user"),
      getSetting("smtp.password"),
      getSetting("smtp.secure"),
    ]);

    if (!host || !port) {
      return { success: false, message: "SMTP host and port are required." };
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: secure === "true",
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.verify();
    return { success: true, message: "SMTP connection successful." };
  } catch (error) {
    return {
      success: false,
      message: `SMTP connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ─── Test Stripe connection ──────────────────────────────────────────────────

export async function testStripeConnection(): Promise<{ success: boolean; message: string }> {
  await requireAdmin();

  try {
    const { getStripeClient } = await import("@/lib/stripe");
    const stripe = await getStripeClient();

    // Simple API call to verify the key works
    const balance = await stripe.balance.retrieve();
    return {
      success: true,
      message: `Stripe connected. Available balance: ${balance.available.map((b) => `${(b.amount / 100).toFixed(2)} ${b.currency.toUpperCase()}`).join(", ") || "0.00"}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Stripe connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ─── Toggle maintenance mode ─────────────────────────────────────────────────

export async function toggleMaintenanceMode(): Promise<{ enabled: boolean }> {
  const session = await requireAdmin();
  const current = await getSetting("app.maintenanceMode");
  const newValue = current === "true" ? "false" : "true";

  await setSetting("app.maintenanceMode", newValue, session.user.id);

  await logAudit({
    action: "settings.maintenance",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "SystemSetting",
    metadata: { maintenanceMode: newValue },
  });

  invalidateCache();
  revalidatePath("/admin/system");
  return { enabled: newValue === "true" };
}
