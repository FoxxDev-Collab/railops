"use server";

import { auth } from "@/auth";
import { getSetting, setSetting, invalidateCache, type SettingKey } from "@/lib/settings";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  crewSeatPrice?: string;
  layoutPackPrice?: string;
}

export interface PricingConfig {
  free: PricingTier;
  pro: PricingTier;
}

const DEFAULTS: PricingConfig = {
  free: {
    name: "Free",
    price: "0",
    description: "For getting started with a single layout",
    features: [
      "1 layout",
      "50 total items (rolling stock & locations)",
      "Waybill generation",
      "Operating sessions",
      "Maintenance tracking",
    ],
  },
  pro: {
    name: "Pro",
    price: "5",
    description: "Unlimited items for serious railroaders",
    features: [
      "Everything in Free",
      "Unlimited items",
      "5 layouts included",
      "1 crew member included",
      "Print switch lists & manifests",
      "CSV import / export",
      "Priority support",
      "Additional crew seats $5/mo each",
      "Additional 5-layout packs $5/mo each",
    ],
    crewSeatPrice: "5",
    layoutPackPrice: "5",
  },
};

async function getTierFromDb(tier: "free" | "pro"): Promise<PricingTier> {
  const prefix = `pricing.${tier}` as const;
  const keys = [
    `${prefix}.name`,
    `${prefix}.price`,
    `${prefix}.description`,
    `${prefix}.features`,
  ] as const;

  const [name, price, description, featuresJson] = await Promise.all(
    keys.map((k) => getSetting(k as SettingKey))
  );

  const defaults = DEFAULTS[tier];

  let features: string[];
  if (featuresJson) {
    try {
      features = JSON.parse(featuresJson);
    } catch {
      features = defaults.features;
    }
  } else {
    features = defaults.features;
  }

  const result: PricingTier = {
    name: name || defaults.name,
    price: price || defaults.price,
    description: description || defaults.description,
    features,
  };

  if (tier === "pro") {
    const [crewSeatPrice, layoutPackPrice] = await Promise.all([
      getSetting("pricing.pro.crewSeatPrice" as SettingKey),
      getSetting("pricing.pro.layoutPackPrice" as SettingKey),
    ]);
    result.crewSeatPrice = crewSeatPrice || defaults.crewSeatPrice;
    result.layoutPackPrice = layoutPackPrice || defaults.layoutPackPrice;
  }

  return result;
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const [free, pro] = await Promise.all([
    getTierFromDb("free"),
    getTierFromDb("pro"),
  ]);
  return { free, pro };
}

export async function updatePricingTier(
  tier: "free" | "pro",
  data: PricingTier
) {
  const session = await requireAdmin();
  const prefix = `pricing.${tier}`;

  await Promise.all([
    setSetting(`${prefix}.name` as SettingKey, data.name, session.user.id),
    setSetting(`${prefix}.price` as SettingKey, data.price, session.user.id),
    setSetting(`${prefix}.description` as SettingKey, data.description, session.user.id),
    setSetting(`${prefix}.features` as SettingKey, JSON.stringify(data.features), session.user.id),
    ...(tier === "pro" && data.crewSeatPrice
      ? [setSetting("pricing.pro.crewSeatPrice" as SettingKey, data.crewSeatPrice, session.user.id)]
      : []),
    ...(tier === "pro" && data.layoutPackPrice
      ? [setSetting("pricing.pro.layoutPackPrice" as SettingKey, data.layoutPackPrice, session.user.id)]
      : []),
  ]);

  await logAudit({
    action: "pricing.update",
    adminId: session.user.id,
    adminEmail: session.user.email!,
    entityType: "SystemSetting",
    metadata: { tier, name: data.name, price: data.price },
  });

  invalidateCache();
  revalidatePath("/admin/billing");
  revalidatePath("/");
  revalidatePath("/pricing");
  return { success: true };
}
