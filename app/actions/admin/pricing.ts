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
}

export interface PricingConfig {
  hobbyist: PricingTier;
  operator: PricingTier;
  club: PricingTier;
}

const DEFAULTS: PricingConfig = {
  hobbyist: {
    name: "Hobbyist",
    price: "0",
    description: "For getting started with a single railroad",
    features: [
      "1 railroad",
      "25 locations",
      "25 locomotives",
      "25 freight cars",
      "25 trains",
      "Waybill generation",
      "Operating sessions",
      "Maintenance tracking",
    ],
  },
  operator: {
    name: "Operator",
    price: "5",
    description: "Unlimited everything for serious railroaders",
    features: [
      "Everything in Hobbyist",
      "Unlimited railroads",
      "Unlimited inventory",
      "Unlimited trains & waybills",
      "Print switch lists & manifests",
      "CSV import / export",
      "Priority support",
    ],
  },
  club: {
    name: "Club",
    price: "25",
    description: "Multi-crew operations for clubs and groups",
    features: [
      "Everything in Operator",
      "5 crew seats included",
      "Role-based access control",
      "Dispatcher, Yardmaster, Conductor roles",
      "Shared session management",
      "Crew activity log",
      "Additional seats $5/mo each",
    ],
    crewSeatPrice: "5",
  },
};

async function getTierFromDb(tier: "hobbyist" | "operator" | "club"): Promise<PricingTier> {
  const prefix = `pricing.${tier}` as const;
  const [name, price, description, featuresJson, crewSeatPrice] = await Promise.all([
    getSetting(`${prefix}.name` as SettingKey),
    getSetting(`${prefix}.price` as SettingKey),
    getSetting(`${prefix}.description` as SettingKey),
    getSetting(`${prefix}.features` as SettingKey),
    tier === "club" ? getSetting("pricing.club.crewSeatPrice" as SettingKey) : null,
  ]);

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

  return {
    name: name || defaults.name,
    price: price || defaults.price,
    description: description || defaults.description,
    features,
    ...(tier === "club" ? { crewSeatPrice: crewSeatPrice || defaults.crewSeatPrice } : {}),
  };
}

export async function getPricingConfig(): Promise<PricingConfig> {
  const [hobbyist, operator, club] = await Promise.all([
    getTierFromDb("hobbyist"),
    getTierFromDb("operator"),
    getTierFromDb("club"),
  ]);
  return { hobbyist, operator, club };
}

export async function updatePricingTier(
  tier: "hobbyist" | "operator" | "club",
  data: PricingTier
) {
  const session = await requireAdmin();
  const prefix = `pricing.${tier}`;

  await Promise.all([
    setSetting(`${prefix}.name` as SettingKey, data.name, session.user.id),
    setSetting(`${prefix}.price` as SettingKey, data.price, session.user.id),
    setSetting(`${prefix}.description` as SettingKey, data.description, session.user.id),
    setSetting(`${prefix}.features` as SettingKey, JSON.stringify(data.features), session.user.id),
    ...(tier === "club" && data.crewSeatPrice
      ? [setSetting("pricing.club.crewSeatPrice" as SettingKey, data.crewSeatPrice, session.user.id)]
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
