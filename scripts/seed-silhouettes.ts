/**
 * Seed script: populates the Silhouette table from SVG files in public/silhouettes/light/
 * Run with: npx tsx scripts/seed-silhouettes.ts
 */

import { PrismaClient, SilhouetteCategory } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Slug → { name, category } mapping
// Every file in public/silhouettes/light/ must have an entry here.
// ---------------------------------------------------------------------------
const SILHOUETTE_MAP: Record<string, { name: string; category: SilhouetteCategory }> = {
  // ── Steam ──────────────────────────────────────────────────────────────────
  "0-4-0-switcher":        { name: "0-4-0 Switcher",             category: SilhouetteCategory.STEAM },
  "2-6-0-mogul":           { name: "2-6-0 Mogul",                category: SilhouetteCategory.STEAM },
  "2-6-2-prairie":         { name: "2-6-2 Prairie",              category: SilhouetteCategory.STEAM },
  "2-6-6-2-mallet":        { name: "2-6-6-2 Mallet",             category: SilhouetteCategory.STEAM },
  "2-8-0-consolidation":   { name: "2-8-0 Consolidation",        category: SilhouetteCategory.STEAM },
  "2-8-2-mikado":          { name: "2-8-2 Mikado",               category: SilhouetteCategory.STEAM },
  "2-8-2-mikado-alt":      { name: "2-8-2 Mikado (Alt)",         category: SilhouetteCategory.STEAM },
  "2-8-8-2-mallet":        { name: "2-8-8-2 Mallet",             category: SilhouetteCategory.STEAM },
  "3-truck-shay":          { name: "3-Truck Shay",               category: SilhouetteCategory.STEAM },
  "4-4-0-american":        { name: "4-4-0 American",             category: SilhouetteCategory.STEAM },
  "4-4-0-tank":            { name: "4-4-0 Tank Engine",          category: SilhouetteCategory.STEAM },
  "4-6-0-camelback":       { name: "4-6-0 Camelback",            category: SilhouetteCategory.STEAM },
  "4-6-0-ten-wheeler":     { name: "4-6-0 Ten-Wheeler",          category: SilhouetteCategory.STEAM },
  "4-6-2-pacific":         { name: "4-6-2 Pacific",              category: SilhouetteCategory.STEAM },
  "4-8-4-northern":        { name: "4-8-4 Northern",             category: SilhouetteCategory.STEAM },
  "4-8-4-northern-alt":    { name: "4-8-4 Northern (Alt)",       category: SilhouetteCategory.STEAM },
  "garratt":               { name: "Garratt",                    category: SilhouetteCategory.STEAM },
  "heavy-steam-locomotive":{ name: "Heavy Steam Locomotive",     category: SilhouetteCategory.STEAM },
  "heisler":               { name: "Heisler",                    category: SilhouetteCategory.STEAM },
  "steam-engine-frontal":  { name: "Steam Engine (Frontal)",     category: SilhouetteCategory.STEAM },
  "overview-steam":        { name: "Overview — Steam",           category: SilhouetteCategory.STEAM },

  // ── GP Diesels ─────────────────────────────────────────────────────────────
  "gp9":                   { name: "GP9",                        category: SilhouetteCategory.DIESEL_GP },
  "gp18":                  { name: "GP18",                       category: SilhouetteCategory.DIESEL_GP },
  "gp20":                  { name: "GP20",                       category: SilhouetteCategory.DIESEL_GP },
  "gp30":                  { name: "GP30",                       category: SilhouetteCategory.DIESEL_GP },
  "gp35":                  { name: "GP35",                       category: SilhouetteCategory.DIESEL_GP },
  "gp38-2":                { name: "GP38-2",                     category: SilhouetteCategory.DIESEL_GP },
  "gp38-2-switcher":       { name: "GP38-2 Switcher",            category: SilhouetteCategory.DIESEL_GP },
  "gmd-gp39-2":            { name: "GMD GP39-2",                 category: SilhouetteCategory.DIESEL_GP },
  "gmd-gp40-2":            { name: "GMD GP40-2",                 category: SilhouetteCategory.DIESEL_GP },
  "gmd-gp50":              { name: "GMD GP50",                   category: SilhouetteCategory.DIESEL_GP },

  // ── SD / Modern Diesels ────────────────────────────────────────────────────
  "sd70ace-t4":            { name: "SD70ACe-T4",                 category: SilhouetteCategory.DIESEL_SD },
  "sd70ah-t4":             { name: "SD70AH-T4",                  category: SilhouetteCategory.DIESEL_SD },
  "es44ac":                { name: "ES44AC",                     category: SilhouetteCategory.DIESEL_SD },
  "et44ac":                { name: "ET44AC",                     category: SilhouetteCategory.DIESEL_SD },
  "evolution-switcher":    { name: "Evolution Switcher",         category: SilhouetteCategory.DIESEL_SD },
  "modern-freight-diesel": { name: "Modern Freight Diesel",      category: SilhouetteCategory.DIESEL_SD },
  "modern-switcher":       { name: "Modern Switcher",            category: SilhouetteCategory.DIESEL_SD },
  "century-switcher":      { name: "Century Switcher",           category: SilhouetteCategory.DIESEL_SD },
  "overview-modern-diesel":{ name: "Overview — Modern Diesel",   category: SilhouetteCategory.DIESEL_SD },
  "overview-switcher":     { name: "Overview — Switcher",        category: SilhouetteCategory.DIESEL_SD },

  // ── Classic / Era Diesels ──────────────────────────────────────────────────
  "f3-a-unit":                   { name: "F3 A-Unit",                    category: SilhouetteCategory.DIESEL_ERA },
  "f7-b-unit":                   { name: "F7 B-Unit",                    category: SilhouetteCategory.DIESEL_ERA },
  "pa-1":                        { name: "PA-1",                         category: SilhouetteCategory.DIESEL_ERA },
  "dr-4-4-15":                   { name: "DR-4-4-15",                    category: SilhouetteCategory.DIESEL_ERA },
  "e8-a-unit":                   { name: "E8 A-Unit",                    category: SilhouetteCategory.DIESEL_ERA },
  "lh-1000hp-switcher":          { name: "LH 1000HP Switcher",           category: SilhouetteCategory.DIESEL_ERA },
  "streamlined-heritage-diesel": { name: "Streamlined Heritage Diesel",  category: SilhouetteCategory.DIESEL_ERA },
  "overview-streamlined":        { name: "Overview — Streamlined",       category: SilhouetteCategory.DIESEL_ERA },

  // ── Freight Cars ───────────────────────────────────────────────────────────
  "3-bay-hopper-coal":       { name: "3-Bay Hopper (Coal)",       category: SilhouetteCategory.FREIGHT_CAR },
  "40ft-boxcar":             { name: "40ft Boxcar",               category: SilhouetteCategory.FREIGHT_CAR },
  "covered-hopper-grain":    { name: "Covered Hopper (Grain)",    category: SilhouetteCategory.FREIGHT_CAR },
  "double-stack-intermodal": { name: "Double-Stack Intermodal",   category: SilhouetteCategory.FREIGHT_CAR },
  "hot-metal-car":           { name: "Hot Metal Car",             category: SilhouetteCategory.FREIGHT_CAR },
  "insulated-boxcar-reefer": { name: "Insulated Boxcar / Reefer", category: SilhouetteCategory.FREIGHT_CAR },
  "low-side-gondola":        { name: "Low-Side Gondola",          category: SilhouetteCategory.FREIGHT_CAR },
  "riveted-tank-car":        { name: "Riveted Tank Car",          category: SilhouetteCategory.FREIGHT_CAR },
  "spine-car-trailer":       { name: "Spine Car (Trailer)",       category: SilhouetteCategory.FREIGHT_CAR },
  "stake-flatcar-lumber":    { name: "Stake Flatcar (Lumber)",    category: SilhouetteCategory.FREIGHT_CAR },
  "tri-level-auto-carrier":  { name: "Tri-Level Auto Carrier",    category: SilhouetteCategory.FREIGHT_CAR },
  "overview-freight-car":    { name: "Overview — Freight Car",    category: SilhouetteCategory.FREIGHT_CAR },

  // ── Caboose ────────────────────────────────────────────────────────────────
  "standard-caboose":        { name: "Standard Caboose",          category: SilhouetteCategory.CABOOSE },

  // ── Passenger Cars / EMU ──────────────────────────────────────────────────
  "high-speed-emu":  { name: "High-Speed EMU",      category: SilhouetteCategory.PASSENGER_CAR },
  "overview-emu":    { name: "Overview — EMU",       category: SilhouetteCategory.PASSENGER_CAR },
};

// ---------------------------------------------------------------------------

async function main() {
  const lightDir = path.join(process.cwd(), "public", "silhouettes", "light");
  const darkDir  = path.join(process.cwd(), "public", "silhouettes", "dark");

  const files = fs
    .readdirSync(lightDir)
    .filter((f) => f.endsWith(".svg"));

  console.log(`Found ${files.length} SVG files in ${lightDir}`);

  let upserted = 0;
  let skipped  = 0;

  for (const file of files) {
    const slug = file.replace(/\.svg$/, "");
    const meta = SILHOUETTE_MAP[slug];

    if (!meta) {
      console.warn(`  [SKIP] No mapping for slug: "${slug}"`);
      skipped++;
      continue;
    }

    const filePath = `/silhouettes/light/${file}`;
    const darkFile = path.join(darkDir, file);
    const darkPath = fs.existsSync(darkFile) ? `/silhouettes/dark/${file}` : filePath;

    await prisma.silhouette.upsert({
      where:  { slug },
      update: { name: meta.name, category: meta.category, filePath, darkPath },
      create: { name: meta.name, slug,  category: meta.category, filePath, darkPath },
    });

    console.log(`  [OK] ${slug} (${meta.category})`);
    upserted++;
  }

  console.log(`\nDone. Upserted: ${upserted}, Skipped: ${skipped}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
