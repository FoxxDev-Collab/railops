import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";

// ─── Setting key definitions ────────────────────────────────────────────────

export const SETTING_KEYS = {
  // Stripe
  "stripe.publishableKey": { envFallback: "STRIPE_PUBLISHABLE_KEY", sensitive: false },
  "stripe.secretKey": { envFallback: "STRIPE_SECRET_KEY", sensitive: true },
  "stripe.webhookSecret": { envFallback: "STRIPE_WEBHOOK_SECRET", sensitive: true },
  "stripe.operatorPriceId": { envFallback: "STRIPE_OPERATOR_PRICE_ID", sensitive: false },

  // SMTP
  "smtp.host": { envFallback: "SMTP_HOST", sensitive: false },
  "smtp.port": { envFallback: "SMTP_PORT", sensitive: false },
  "smtp.user": { envFallback: "SMTP_USER", sensitive: false },
  "smtp.password": { envFallback: "SMTP_PASS", sensitive: true },
  "smtp.secure": { envFallback: "SMTP_SECURE", sensitive: false },
  "smtp.from": { envFallback: "EMAIL_FROM", sensitive: false },

  // Application
  "app.maintenanceMode": { envFallback: null, sensitive: false },
  "app.url": { envFallback: "NEXT_PUBLIC_APP_URL", sensitive: false },
} as const;

export type SettingKey = keyof typeof SETTING_KEYS;

// ─── In-memory cache (60s TTL) ──────────────────────────────────────────────

const cache = new Map<string, { value: string | null; expiry: number }>();
const CACHE_TTL = 60_000; // 60 seconds

function getCached(key: string): string | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache(key: string, value: string | null) {
  cache.set(key, { value, expiry: Date.now() + CACHE_TTL });
}

export function invalidateCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// ─── Read setting ───────────────────────────────────────────────────────────

/**
 * Gets a setting value. Priority: DB → env var fallback → null.
 */
export async function getSetting(key: SettingKey): Promise<string | null> {
  // Check cache first
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  try {
    const record = await db.systemSetting.findUnique({ where: { key } });

    if (record) {
      const value = record.encrypted ? decrypt(record.value) : record.value;
      setCache(key, value);
      return value;
    }
  } catch {
    // DB unavailable — fall through to env
  }

  // Env fallback
  const config = SETTING_KEYS[key];
  const envFallback = config.envFallback;
  const envValue = envFallback ? (process.env[envFallback] ?? null) : null;
  setCache(key, envValue);
  return envValue;
}

/**
 * Gets multiple settings at once.
 */
export async function getSettings(keys: SettingKey[]): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};
  // Batch — could optimize with findMany but keys list is small
  await Promise.all(
    keys.map(async (key) => {
      results[key] = await getSetting(key);
    })
  );
  return results;
}

// ─── Write setting ──────────────────────────────────────────────────────────

/**
 * Creates or updates a setting. Encrypts if the key is marked sensitive.
 */
export async function setSetting(
  key: SettingKey,
  value: string,
  adminId?: string
): Promise<void> {
  const config = SETTING_KEYS[key];
  const storeValue = config.sensitive ? encrypt(value) : value;

  await db.systemSetting.upsert({
    where: { key },
    create: {
      key,
      value: storeValue,
      encrypted: config.sensitive,
      updatedBy: adminId,
    },
    update: {
      value: storeValue,
      encrypted: config.sensitive,
      updatedBy: adminId,
    },
  });

  invalidateCache(key);
}

// ─── Read all settings for admin display ────────────────────────────────────

/**
 * Gets all settings for admin UI. Sensitive values are masked.
 */
export async function getAllSettingsForAdmin(): Promise<
  Array<{ key: string; value: string; encrypted: boolean; updatedAt: Date }>
> {
  const records = await db.systemSetting.findMany({ orderBy: { key: "asc" } });

  return records.map((record) => ({
    key: record.key,
    value: record.encrypted ? "••••••••" : record.value,
    encrypted: record.encrypted,
    updatedAt: record.updatedAt,
  }));
}
