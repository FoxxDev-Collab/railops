# Vehicle Silhouette System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract ~46 vehicle silhouettes from sprite sheet SVGs into individual files, catalog them in a database table, and integrate a silhouette picker into all rolling stock inventory forms and the train builder.

**Architecture:** Node.js extraction script splits sprite sheets into individual SVGs stored in `public/silhouettes/`. A `Silhouette` Prisma model catalogs them with name, slug, category, and file paths. A reusable `SilhouettePicker` component lets users select silhouettes in forms; a `SilhouetteImage` component renders them throughout the app.

**Tech Stack:** Next.js 16 App Router, Prisma, TypeScript, Tailwind CSS v4, shadcn/ui, next-themes, xmldom (for SVG parsing)

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `scripts/extract-silhouettes.ts` | Parse sprite sheet SVGs, cluster paths, extract individual vehicle SVGs |
| `scripts/seed-silhouettes.ts` | Populate Silhouette DB table from extracted files |
| `public/silhouettes/light/*.svg` | Individual light-mode vehicle silhouette SVGs |
| `public/silhouettes/dark/*.svg` | Individual dark-mode vehicle silhouette SVGs |
| `components/ui/silhouette-picker.tsx` | Reusable grid picker for selecting a silhouette |
| `components/ui/silhouette-image.tsx` | Display component that renders a silhouette by ID |
| `app/actions/silhouettes.ts` | Server action to fetch silhouettes |

### Modified Files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `SilhouetteCategory` enum, `Silhouette` model, `silhouetteId` FK on 5 rolling stock models |
| `app/actions/locomotives.ts` | Add `silhouetteId` to schema and create/update |
| `app/actions/freight-cars.ts` | Add `silhouetteId` to schema and create/update |
| `app/actions/cabooses.ts` | Add `silhouetteId` to schema and create/update |
| `app/actions/passenger-cars.ts` | Add `silhouetteId` to schema and create/update |
| `app/actions/mow-equipment.ts` | Add `silhouetteId` to schema and create/update |
| `components/locomotives/locomotive-form.tsx` | Add SilhouettePicker field |
| `components/freight-cars/freight-car-form.tsx` | Add SilhouettePicker field |
| `components/cabooses/caboose-form.tsx` | Add SilhouettePicker field |
| `components/passenger-cars/passenger-car-form.tsx` | Add SilhouettePicker field |
| `components/mow-equipment/mow-equipment-form.tsx` | Add SilhouettePicker field |
| `components/locomotives/locomotive-card-list.tsx` | Add silhouette image to card |
| `components/freight-cars/freight-car-card-list.tsx` | Add silhouette image to card |
| `components/cabooses/caboose-card-list.tsx` | Add silhouette image to card |
| `components/passenger-cars/passenger-car-card-list.tsx` | Add silhouette image to card |
| `components/mow-equipment/mow-equipment-card-list.tsx` | Add silhouette image to card |
| `components/consists/rolling-stock-svg.tsx` | Extend `RollingStockIcon` to accept silhouetteId |
| `components/consists/train-builder.tsx` | Pass silhouetteId through to RollingStockIcon |

---

## Task 1: SVG Extraction Script

**Files:**
- Create: `scripts/extract-silhouettes.ts`
- Create: `public/silhouettes/light/` (directory)
- Create: `public/silhouettes/dark/` (directory)

This task requires installing `@xmldom/xmldom` for SVG parsing.

- [ ] **Step 1: Install xmldom**

Run: `npm install --save-dev @xmldom/xmldom`

- [ ] **Step 2: Create the extraction script**

This script parses each sprite sheet SVG, groups paths by spatial clustering (the sheets use a grid layout), and writes individual SVGs. Each sheet has a known grid layout (rows x cols) and a manual label-to-slug mapping.

Create `scripts/extract-silhouettes.ts`:

```typescript
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import * as fs from "fs";
import * as path from "path";

// ─── Configuration ──────────────────────────────────────────────────────────

interface SheetConfig {
  file: string;
  darkFile: string;
  rows: number;
  cols: number;
  vehicles: string[]; // slugs, left-to-right, top-to-bottom
}

const SHEETS: SheetConfig[] = [
  {
    file: "railops_freight_cars.svg",
    darkFile: "railops_freight_cars_darkmode.svg",
    rows: 4,
    cols: 3,
    vehicles: [
      "3-bay-hopper-coal",
      "40ft-boxcar",
      "riveted-tank-car",
      "covered-hopper-grain",
      "stake-flatcar-lumber",
      "insulated-boxcar-reefer",
      "low-side-gondola",
      "double-stack-intermodal",
      "spine-car-trailer",
      "hot-metal-car",
      "tri-level-auto-carrier",
      "standard-caboose",
    ],
  },
  {
    file: "railops_gp_diesels.svg",
    darkFile: "railops_gp_diesels_darkmode.svg",
    rows: 3,
    cols: 3,
    vehicles: [
      "gp9", "gp18", "gp20",
      "gp30", "gp35", "gp38-2",
      "gmd-gp39-2", "gmd-gp40-2", "gmd-gp50",
    ],
  },
  {
    file: "railops_sd_modern_diesels.svg",
    darkFile: "railops_sd_modern_diesels_darkmode.svg",
    rows: 3,
    cols: 2,
    vehicles: [
      "sd70ah-t4", "es44ac",
      "sd70ace-t4", "et44ac",
      "gp38-2-switcher", "evolution-switcher",
    ],
  },
  {
    file: "railops_steam_locomotives.svg",
    darkFile: "railops_steam_locomotives_darkmode.svg",
    rows: 4,
    cols: 3,
    vehicles: [
      "4-4-0-tank", "2-6-0-mogul", "0-4-0-switcher",
      "2-8-0-consolidation", "2-6-2-prairie", "3-truck-shay",
      "2-8-2-mikado", "garratt", "2-6-6-2-mallet",
      "4-8-4-northern", "heisler", "4-6-0-ten-wheeler",
    ],
  },
  {
    file: "railops_sheet1_diesel_era.svg",
    darkFile: "railops_sheet1_diesel_era_darkmode.svg",
    rows: 3,
    cols: 2,
    vehicles: [
      "f3-a-unit", "f7-b-unit",
      "pa-1", "dr-4-4-15",
      "e8-a-unit", "lh-1000hp-switcher",
    ],
  },
  {
    file: "railops_sheet2_steam_types.svg",
    darkFile: "railops_sheet2_steam_types_darkmode.svg",
    rows: 3,
    cols: 2,
    vehicles: [
      "4-4-0-american", "2-8-2-mikado-heavy",
      "2-8-8-2-mallet", "4-6-2-pacific",
      "4-8-4-northern-large", "4-6-0-camelback",
    ],
  },
  {
    file: "railops_sheet3_transition_diesels.svg",
    darkFile: "railops_sheet3_transition_diesels_darkmode.svg",
    rows: 3,
    cols: 2,
    vehicles: [
      "modern-freight-diesel", "streamlined-heritage-diesel",
      "heavy-steam-locomotive", "modern-switcher",
      "high-speed-emu", "steam-engine-frontal",
    ],
  },
  {
    file: "railops_sheet4_loco_overview.svg",
    darkFile: "railops_sheet4_loco_overview_darkmode.svg",
    rows: 3,
    cols: 2,
    vehicles: [
      "overview-modern-diesel", "overview-streamlined",
      "overview-steam", "overview-switcher",
      "overview-emu", "overview-freight-car",
    ],
  },
];

// Human-readable names for each slug
const SLUG_TO_NAME: Record<string, string> = {
  "3-bay-hopper-coal": "3-Bay Hopper (Coal)",
  "40ft-boxcar": "40ft Boxcar",
  "riveted-tank-car": "Riveted Tank Car",
  "covered-hopper-grain": "Covered Hopper (Grain)",
  "stake-flatcar-lumber": "Stake Flatcar (Lumber)",
  "insulated-boxcar-reefer": "Insulated Boxcar (Reefer)",
  "low-side-gondola": "Low-Side Gondola",
  "double-stack-intermodal": "Double-Stack Intermodal",
  "spine-car-trailer": "Spine Car (Trailer)",
  "hot-metal-car": "Hot Metal Car",
  "tri-level-auto-carrier": "Tri-Level Auto Carrier",
  "standard-caboose": "Standard Caboose",
  "gp9": "GP9",
  "gp18": "GP18",
  "gp20": "GP20",
  "gp30": "GP30",
  "gp35": "GP35",
  "gp38-2": "GP38-2",
  "gmd-gp39-2": "GMD GP39-2",
  "gmd-gp40-2": "GMD GP40-2",
  "gmd-gp50": "GMD GP50",
  "sd70ah-t4": "SD70AH-T4",
  "es44ac": "ES44AC",
  "sd70ace-t4": "SD70ACe-T4",
  "et44ac": "ET44AC",
  "gp38-2-switcher": "GP38-2 Switcher",
  "evolution-switcher": "Evolution Switcher",
  "f3-a-unit": "F3 A-unit",
  "f7-b-unit": "F7 B-unit",
  "pa-1": "PA-1",
  "dr-4-4-15": "DR-4-4-15",
  "e8-a-unit": "E8 A-unit",
  "lh-1000hp-switcher": "L-H 1000hp Switcher",
  "4-4-0-tank": "4-4-0 Tank Locomotive",
  "2-6-0-mogul": "2-6-0 Mogul Tender",
  "0-4-0-switcher": "0-4-0 Switcher",
  "2-8-0-consolidation": "2-8-0 Consolidation Freight",
  "2-6-2-prairie": "2-6-2 Prairie Mixed Traffic",
  "3-truck-shay": "3-Truck Shay Geared Engine",
  "2-8-2-mikado": "2-8-2 Mikado Heavy Freight",
  "garratt": "Articulated Garratt Locomotive",
  "2-6-6-2-mallet": "2-6-6-2 Mallet Compound",
  "4-8-4-northern": "4-8-4 Northern Narrow Gauge",
  "heisler": "Heisler Geared Locomotive",
  "4-6-0-ten-wheeler": "4-6-0 Ten-Wheeler Passenger",
  "4-4-0-american": "4-4-0 American",
  "2-8-2-mikado-heavy": "2-8-2 Mikado",
  "2-8-8-2-mallet": "2-8-8-2 Mallet",
  "4-6-2-pacific": "4-6-2 Pacific",
  "4-8-4-northern-large": "4-8-4 Northern",
  "4-6-0-camelback": "4-6-0 Camelback",
  "modern-freight-diesel": "Modern Freight Diesel",
  "streamlined-heritage-diesel": "Streamlined Heritage Diesel",
  "heavy-steam-locomotive": "Heavy Steam Locomotive",
  "modern-switcher": "Modern Switcher",
  "high-speed-emu": "High-Speed EMU",
  "steam-engine-frontal": "Steam Engine (Frontal)",
  "overview-modern-diesel": "Overview Modern Diesel",
  "overview-streamlined": "Overview Streamlined",
  "overview-steam": "Overview Steam",
  "overview-switcher": "Overview Switcher",
  "overview-emu": "Overview EMU",
  "overview-freight-car": "Overview Freight Car",
};

// ─── Path bounding box helpers ──────────────────────────────────────────────

interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Approximate bounding box from an SVG path's d attribute.
 * Extracts all numeric coordinates and finds the extremes.
 * This is an approximation — it uses raw coordinate values from the path data,
 * which works well for potrace output (all absolute coordinates after transform).
 */
function approximatePathBBox(d: string): BBox {
  // Extract all numbers from the path data
  const nums = d.match(/-?\d+\.?\d*/g);
  if (!nums || nums.length < 2) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  // Potrace paths use pairs of numbers as x,y coordinates
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = parseFloat(nums[i]);
    const y = parseFloat(nums[i + 1]);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

function bboxCenter(b: BBox): { cx: number; cy: number } {
  return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 };
}

// ─── Extraction ─────────────────────────────────────────────────────────────

function extractVehicles(svgContent: string, config: SheetConfig): Map<string, string[]> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svgEl = doc.documentElement;

  // Get the viewBox dimensions (potrace uses pts * 10 in the transform)
  const vbAttr = svgEl.getAttribute("viewBox") || "0 0 14080 7680";
  const [, , vbW, vbH] = vbAttr.split(" ").map(Number);

  // Get all path elements
  const gEl = svgEl.getElementsByTagName("g")[0];
  const paths = gEl ? gEl.getElementsByTagName("path") : svgEl.getElementsByTagName("path");

  // The potrace output has a transform: translate(0, height) scale(0.1, -0.1)
  // This flips Y axis. We need to account for this when computing bounding boxes.
  // The raw path coordinates are in the transformed space (potrace units).

  // Compute bounding boxes for all paths
  interface PathInfo {
    element: Element;
    bbox: BBox;
    d: string;
  }

  const pathInfos: PathInfo[] = [];
  for (let i = 0; i < paths.length; i++) {
    const p = paths[i];
    const d = p.getAttribute("d");
    if (!d) continue;
    const bbox = approximatePathBBox(d);
    pathInfos.push({ element: p, bbox, d });
  }

  if (pathInfos.length === 0) {
    console.warn(`No paths found in ${config.file}`);
    return new Map();
  }

  // Determine grid cell boundaries
  // The sheets are laid out in a grid of rows x cols
  const cellW = vbW / config.cols;
  const cellH = vbH / config.rows;

  // Assign each path to a grid cell based on its center
  const cells = new Map<string, PathInfo[]>();
  for (const pi of pathInfos) {
    const center = bboxCenter(pi.bbox);
    const col = Math.min(Math.floor(center.cx / cellW), config.cols - 1);
    const row = Math.min(Math.floor(center.cy / cellH), config.rows - 1);
    const key = `${row}-${col}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key)!.push(pi);
  }

  // Map each cell to the corresponding vehicle slug
  const vehiclePathDs = new Map<string, string[]>();
  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      const idx = row * config.cols + col;
      if (idx >= config.vehicles.length) break;
      const slug = config.vehicles[idx];
      const key = `${row}-${col}`;
      const cellPaths = cells.get(key) || [];
      vehiclePathDs.set(slug, cellPaths.map((p) => p.d));
    }
  }

  return vehiclePathDs;
}

function buildSvg(pathDs: string[], padding: number = 50): string {
  // Compute combined bounding box
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const d of pathDs) {
    const bbox = approximatePathBBox(d);
    if (bbox.minX < minX) minX = bbox.minX;
    if (bbox.minY < minY) minY = bbox.minY;
    if (bbox.maxX > maxX) maxX = bbox.maxX;
    if (bbox.maxY > maxY) maxY = bbox.maxY;
  }

  const w = maxX - minX + padding * 2;
  const h = maxY - minY + padding * 2;
  const vbX = minX - padding;
  const vbY = minY - padding;

  const pathEls = pathDs.map((d) => `<path d="${d}"/>`).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vbX} ${vbY} ${w} ${h}" fill="currentColor">
<g>
${pathEls}
</g>
</svg>`;
}

// ─── Main ───────────────────────────────────────────────────────────────────

const ASSETS_DIR = path.join(__dirname, "..", "railops_assets");
const LIGHT_DIR = path.join(__dirname, "..", "public", "silhouettes", "light");
const DARK_DIR = path.join(__dirname, "..", "public", "silhouettes", "dark");

// Track seen slugs for deduplication
const seen = new Set<string>();

fs.mkdirSync(LIGHT_DIR, { recursive: true });
fs.mkdirSync(DARK_DIR, { recursive: true });

let totalExtracted = 0;
let totalDuplicates = 0;

for (const sheet of SHEETS) {
  console.log(`\nProcessing: ${sheet.file}`);

  const lightSvg = fs.readFileSync(path.join(ASSETS_DIR, sheet.file), "utf-8");
  const darkSvg = fs.readFileSync(path.join(ASSETS_DIR, sheet.darkFile), "utf-8");

  const lightVehicles = extractVehicles(lightSvg, sheet);
  const darkVehicles = extractVehicles(darkSvg, sheet);

  for (const slug of sheet.vehicles) {
    if (seen.has(slug)) {
      console.log(`  SKIP (duplicate): ${slug}`);
      totalDuplicates++;
      continue;
    }

    const lightPaths = lightVehicles.get(slug);
    const darkPaths = darkVehicles.get(slug);

    if (!lightPaths || lightPaths.length === 0) {
      console.warn(`  WARN: No paths for ${slug} in ${sheet.file}`);
      continue;
    }

    const lightOut = buildSvg(lightPaths);
    const darkOut = darkPaths && darkPaths.length > 0 ? buildSvg(darkPaths) : lightOut;

    fs.writeFileSync(path.join(LIGHT_DIR, `${slug}.svg`), lightOut);
    fs.writeFileSync(path.join(DARK_DIR, `${slug}.svg`), darkOut);

    seen.add(slug);
    totalExtracted++;
    console.log(`  OK: ${slug} (${lightPaths.length} paths)`);
  }
}

console.log(`\nDone! Extracted ${totalExtracted} vehicles, skipped ${totalDuplicates} duplicates.`);
console.log(`Files written to:`);
console.log(`  Light: ${LIGHT_DIR}`);
console.log(`  Dark:  ${DARK_DIR}`);
```

- [ ] **Step 3: Run the extraction script**

Run: `npx tsx scripts/extract-silhouettes.ts`

Expected: Console output showing each vehicle extracted, with skip messages for duplicates. Files appear in `public/silhouettes/light/` and `public/silhouettes/dark/`.

- [ ] **Step 4: Verify extraction results**

Run: `ls public/silhouettes/light/ | wc -l && ls public/silhouettes/light/`

Expected: ~46 SVG files. Spot-check a few by opening in a browser to verify they contain recognizable vehicle silhouettes (not blank, not the whole sheet). If any vehicle is blank or malformed, adjust the grid dimensions or padding in the script config and re-run.

- [ ] **Step 5: Commit**

```bash
git add scripts/extract-silhouettes.ts public/silhouettes/ package.json package-lock.json
git commit -m "feat(silhouettes): add extraction script and extract vehicle SVGs from sprite sheets"
```

---

## Task 2: Prisma Schema — Silhouette Model

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add SilhouetteCategory enum and Silhouette model**

In `prisma/schema.prisma`, after the existing enums (after `MOWEquipmentType` around line 104), add:

```prisma
enum SilhouetteCategory {
  DIESEL_GP
  DIESEL_SD
  DIESEL_ERA
  STEAM
  FREIGHT_CAR
  PASSENGER_CAR
  CABOOSE
  MOW
}
```

After the `User` model section (before the rolling stock models), add:

```prisma
// ─────────────────────────────────────────────
// SILHOUETTES
// ─────────────────────────────────────────────

model Silhouette {
  id        String              @id @default(cuid())
  name      String
  slug      String              @unique
  category  SilhouetteCategory
  filePath  String              // "/silhouettes/light/<slug>.svg"
  darkPath  String              // "/silhouettes/dark/<slug>.svg"

  locomotives   Locomotive[]
  freightCars   FreightCar[]
  passengerCars PassengerCar[]
  cabooses      Caboose[]
  mowEquipment  MOWEquipment[]

  createdAt DateTime @default(now())

  @@index([category])
}
```

- [ ] **Step 2: Add silhouetteId FK to all five rolling stock models**

In each of these models, add after `imageUrl`:

```prisma
  silhouetteId      String?
  silhouette        Silhouette?      @relation(fields: [silhouetteId], references: [id], onDelete: SetNull)
```

Models to modify:
- `Locomotive` (around line 472, after `imageUrl`)
- `FreightCar` (around line 505, after `imageUrl`)
- `PassengerCar` (around line 539, after `imageUrl`)
- `MOWEquipment` (around line 568, after `imageUrl`)
- `Caboose` (around line 597, after `imageUrl`)

- [ ] **Step 3: Push schema to database**

Run: `npx prisma db push`

Expected: Schema pushed successfully with new `Silhouette` table and new `silhouetteId` columns.

- [ ] **Step 4: Regenerate Prisma client**

Run: `npx prisma generate`

Expected: Prisma Client generated successfully.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(silhouettes): add Silhouette model and silhouetteId FK to rolling stock"
```

---

## Task 3: Seed Script

**Files:**
- Create: `scripts/seed-silhouettes.ts`

- [ ] **Step 1: Create the seed script**

Create `scripts/seed-silhouettes.ts`:

```typescript
import { PrismaClient, SilhouetteCategory } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();

// Map slug to category
const SLUG_CATEGORY: Record<string, SilhouetteCategory> = {
  // Freight cars
  "3-bay-hopper-coal": "FREIGHT_CAR",
  "40ft-boxcar": "FREIGHT_CAR",
  "riveted-tank-car": "FREIGHT_CAR",
  "covered-hopper-grain": "FREIGHT_CAR",
  "stake-flatcar-lumber": "FREIGHT_CAR",
  "insulated-boxcar-reefer": "FREIGHT_CAR",
  "low-side-gondola": "FREIGHT_CAR",
  "double-stack-intermodal": "FREIGHT_CAR",
  "spine-car-trailer": "FREIGHT_CAR",
  "hot-metal-car": "FREIGHT_CAR",
  "tri-level-auto-carrier": "FREIGHT_CAR",
  // Caboose
  "standard-caboose": "CABOOSE",
  // GP Diesels
  "gp9": "DIESEL_GP",
  "gp18": "DIESEL_GP",
  "gp20": "DIESEL_GP",
  "gp30": "DIESEL_GP",
  "gp35": "DIESEL_GP",
  "gp38-2": "DIESEL_GP",
  "gmd-gp39-2": "DIESEL_GP",
  "gmd-gp40-2": "DIESEL_GP",
  "gmd-gp50": "DIESEL_GP",
  // SD/Modern Diesels
  "sd70ah-t4": "DIESEL_SD",
  "es44ac": "DIESEL_SD",
  "sd70ace-t4": "DIESEL_SD",
  "et44ac": "DIESEL_SD",
  "gp38-2-switcher": "DIESEL_SD",
  "evolution-switcher": "DIESEL_SD",
  // Note: century-switcher was visible in the sheet but the SD sheet config
  // only has 6 vehicles in 3x2 grid. If the sheet actually has 7, adjust
  // the extraction config. For now we extract what the grid covers.
  // Diesel Era
  "f3-a-unit": "DIESEL_ERA",
  "f7-b-unit": "DIESEL_ERA",
  "pa-1": "DIESEL_ERA",
  "dr-4-4-15": "DIESEL_ERA",
  "e8-a-unit": "DIESEL_ERA",
  "lh-1000hp-switcher": "DIESEL_ERA",
  // Steam
  "4-4-0-tank": "STEAM",
  "2-6-0-mogul": "STEAM",
  "0-4-0-switcher": "STEAM",
  "2-8-0-consolidation": "STEAM",
  "2-6-2-prairie": "STEAM",
  "3-truck-shay": "STEAM",
  "2-8-2-mikado": "STEAM",
  "garratt": "STEAM",
  "2-6-6-2-mallet": "STEAM",
  "4-8-4-northern": "STEAM",
  "heisler": "STEAM",
  "4-6-0-ten-wheeler": "STEAM",
  // Sheet 2 steam (deduped variants)
  "4-4-0-american": "STEAM",
  "2-8-2-mikado-heavy": "STEAM",
  "2-8-8-2-mallet": "STEAM",
  "4-6-2-pacific": "STEAM",
  "4-8-4-northern-large": "STEAM",
  "4-6-0-camelback": "STEAM",
  // Sheet 3 transition
  "modern-freight-diesel": "DIESEL_SD",
  "streamlined-heritage-diesel": "DIESEL_ERA",
  "heavy-steam-locomotive": "STEAM",
  "modern-switcher": "DIESEL_SD",
  "high-speed-emu": "PASSENGER_CAR",
  "steam-engine-frontal": "STEAM",
  // Sheet 4 overview
  "overview-modern-diesel": "DIESEL_SD",
  "overview-streamlined": "DIESEL_ERA",
  "overview-steam": "STEAM",
  "overview-switcher": "DIESEL_SD",
  "overview-emu": "PASSENGER_CAR",
  "overview-freight-car": "FREIGHT_CAR",
};

// Human-readable names (same as extraction script)
const SLUG_TO_NAME: Record<string, string> = {
  "3-bay-hopper-coal": "3-Bay Hopper (Coal)",
  "40ft-boxcar": "40ft Boxcar",
  "riveted-tank-car": "Riveted Tank Car",
  "covered-hopper-grain": "Covered Hopper (Grain)",
  "stake-flatcar-lumber": "Stake Flatcar (Lumber)",
  "insulated-boxcar-reefer": "Insulated Boxcar (Reefer)",
  "low-side-gondola": "Low-Side Gondola",
  "double-stack-intermodal": "Double-Stack Intermodal",
  "spine-car-trailer": "Spine Car (Trailer)",
  "hot-metal-car": "Hot Metal Car",
  "tri-level-auto-carrier": "Tri-Level Auto Carrier",
  "standard-caboose": "Standard Caboose",
  "gp9": "GP9",
  "gp18": "GP18",
  "gp20": "GP20",
  "gp30": "GP30",
  "gp35": "GP35",
  "gp38-2": "GP38-2",
  "gmd-gp39-2": "GMD GP39-2",
  "gmd-gp40-2": "GMD GP40-2",
  "gmd-gp50": "GMD GP50",
  "sd70ah-t4": "SD70AH-T4",
  "es44ac": "ES44AC",
  "sd70ace-t4": "SD70ACe-T4",
  "et44ac": "ET44AC",
  "gp38-2-switcher": "GP38-2 Switcher",
  "evolution-switcher": "Evolution Switcher",
  "f3-a-unit": "F3 A-unit",
  "f7-b-unit": "F7 B-unit",
  "pa-1": "PA-1",
  "dr-4-4-15": "DR-4-4-15",
  "e8-a-unit": "E8 A-unit",
  "lh-1000hp-switcher": "L-H 1000hp Switcher",
  "4-4-0-tank": "4-4-0 Tank Locomotive",
  "2-6-0-mogul": "2-6-0 Mogul Tender",
  "0-4-0-switcher": "0-4-0 Switcher",
  "2-8-0-consolidation": "2-8-0 Consolidation Freight",
  "2-6-2-prairie": "2-6-2 Prairie Mixed Traffic",
  "3-truck-shay": "3-Truck Shay Geared Engine",
  "2-8-2-mikado": "2-8-2 Mikado Heavy Freight",
  "garratt": "Articulated Garratt Locomotive",
  "2-6-6-2-mallet": "2-6-6-2 Mallet Compound",
  "4-8-4-northern": "4-8-4 Northern Narrow Gauge",
  "heisler": "Heisler Geared Locomotive",
  "4-6-0-ten-wheeler": "4-6-0 Ten-Wheeler Passenger",
  "4-4-0-american": "4-4-0 American",
  "2-8-2-mikado-heavy": "2-8-2 Mikado",
  "2-8-8-2-mallet": "2-8-8-2 Mallet",
  "4-6-2-pacific": "4-6-2 Pacific",
  "4-8-4-northern-large": "4-8-4 Northern",
  "4-6-0-camelback": "4-6-0 Camelback",
  "modern-freight-diesel": "Modern Freight Diesel",
  "streamlined-heritage-diesel": "Streamlined Heritage Diesel",
  "heavy-steam-locomotive": "Heavy Steam Locomotive",
  "modern-switcher": "Modern Switcher",
  "high-speed-emu": "High-Speed EMU",
  "steam-engine-frontal": "Steam Engine (Frontal)",
  "overview-modern-diesel": "Overview Modern Diesel",
  "overview-streamlined": "Overview Streamlined",
  "overview-steam": "Overview Steam",
  "overview-switcher": "Overview Switcher",
  "overview-emu": "Overview EMU",
  "overview-freight-car": "Overview Freight Car",
};

async function main() {
  const lightDir = path.join(__dirname, "..", "public", "silhouettes", "light");
  const files = fs.readdirSync(lightDir).filter((f) => f.endsWith(".svg"));

  console.log(`Found ${files.length} silhouette SVGs`);

  let created = 0;
  let skipped = 0;

  for (const file of files) {
    const slug = file.replace(".svg", "");
    const name = SLUG_TO_NAME[slug] || slug;
    const category = SLUG_CATEGORY[slug];

    if (!category) {
      console.warn(`  SKIP: No category mapping for ${slug}`);
      skipped++;
      continue;
    }

    await db.silhouette.upsert({
      where: { slug },
      create: {
        name,
        slug,
        category,
        filePath: `/silhouettes/light/${slug}.svg`,
        darkPath: `/silhouettes/dark/${slug}.svg`,
      },
      update: {
        name,
        category,
        filePath: `/silhouettes/light/${slug}.svg`,
        darkPath: `/silhouettes/dark/${slug}.svg`,
      },
    });

    created++;
    console.log(`  OK: ${name} [${category}]`);
  }

  console.log(`\nDone! Upserted ${created}, skipped ${skipped}.`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
```

- [ ] **Step 2: Run the seed script**

Run: `npx tsx scripts/seed-silhouettes.ts`

Expected: Console output showing each silhouette upserted with its category.

- [ ] **Step 3: Verify via Prisma Studio**

Run: `npx prisma studio`

Expected: Open browser, navigate to Silhouette table, see all entries with correct names, slugs, categories, and paths.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-silhouettes.ts
git commit -m "feat(silhouettes): add seed script to populate Silhouette table"
```

---

## Task 4: Server Action — getSilhouettes

**Files:**
- Create: `app/actions/silhouettes.ts`

- [ ] **Step 1: Create the server action**

Create `app/actions/silhouettes.ts`:

```typescript
"use server";

import { db } from "@/lib/db";
import { SilhouetteCategory } from "@prisma/client";

export async function getSilhouettes(category?: SilhouetteCategory) {
  return db.silhouette.findMany({
    where: category ? { category } : undefined,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/actions/silhouettes.ts
git commit -m "feat(silhouettes): add getSilhouettes server action"
```

---

## Task 5: SilhouetteImage Component

**Files:**
- Create: `components/ui/silhouette-image.tsx`

- [ ] **Step 1: Create the component**

Create `components/ui/silhouette-image.tsx`:

```tsx
"use client";

import { useTheme } from "next-themes";
import Image from "next/image";

interface SilhouetteImageProps {
  filePath: string;
  darkPath: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function SilhouetteImage({
  filePath,
  darkPath,
  alt,
  className,
  width = 120,
  height = 60,
}: SilhouetteImageProps) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? darkPath : filePath;

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={{ width: "auto", height: "auto", maxWidth: "100%", maxHeight: "100%" }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/silhouette-image.tsx
git commit -m "feat(silhouettes): add SilhouetteImage display component"
```

---

## Task 6: SilhouettePicker Component

**Files:**
- Create: `components/ui/silhouette-picker.tsx`

- [ ] **Step 1: Create the picker component**

Create `components/ui/silhouette-picker.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getSilhouettes } from "@/app/actions/silhouettes";
import { Search, X } from "lucide-react";
import { SilhouetteCategory } from "@prisma/client";

interface Silhouette {
  id: string;
  name: string;
  slug: string;
  category: SilhouetteCategory;
  filePath: string;
  darkPath: string;
}

const CATEGORY_LABELS: Record<SilhouetteCategory, string> = {
  DIESEL_GP: "GP Diesels",
  DIESEL_SD: "SD / Modern",
  DIESEL_ERA: "Classic Diesel",
  STEAM: "Steam",
  FREIGHT_CAR: "Freight Cars",
  PASSENGER_CAR: "Passenger",
  CABOOSE: "Caboose",
  MOW: "MOW",
};

interface SilhouettePickerProps {
  value?: string | null;
  onChange: (id: string | null) => void;
}

export function SilhouettePicker({ value, onChange }: SilhouettePickerProps) {
  const [silhouettes, setSilhouettes] = useState<Silhouette[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<SilhouetteCategory | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    getSilhouettes().then(setSilhouettes);
  }, []);

  const filtered = silhouettes.filter((s) => {
    if (activeCategory && s.category !== activeCategory) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Get categories that actually have silhouettes
  const categories = [...new Set(silhouettes.map((s) => s.category))].sort();

  const selected = silhouettes.find((s) => s.id === value);

  return (
    <div className="space-y-3">
      {/* Selected preview */}
      {selected && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
          <Image
            src={resolvedTheme === "dark" ? selected.darkPath : selected.filePath}
            alt={selected.name}
            width={80}
            height={40}
            className="h-8 w-auto"
            style={{ width: "auto" }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selected.name}</p>
            <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[selected.category]}</p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search silhouettes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Category filter tabs */}
      <div className="flex flex-wrap gap-1">
        <Badge
          variant={activeCategory === null ? "default" : "outline"}
          className="cursor-pointer text-[10px] px-1.5 py-0 h-5"
          onClick={() => setActiveCategory(null)}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            className="cursor-pointer text-[10px] px-1.5 py-0 h-5"
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
          >
            {CATEGORY_LABELS[cat]}
          </Badge>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
        {filtered.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id === value ? null : s.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150",
              "hover:border-primary/40 hover:bg-accent/50",
              s.id === value
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : "border-border/50 bg-card"
            )}
          >
            <Image
              src={resolvedTheme === "dark" ? s.darkPath : s.filePath}
              alt={s.name}
              width={80}
              height={40}
              className="h-8 w-auto object-contain"
              style={{ width: "auto" }}
            />
            <span className="text-[9px] text-muted-foreground text-center leading-tight truncate w-full">
              {s.name}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && silhouettes.length > 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No silhouettes match your search
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/silhouette-picker.tsx
git commit -m "feat(silhouettes): add SilhouettePicker grid component"
```

---

## Task 7: Add silhouetteId to Server Actions

**Files:**
- Modify: `app/actions/locomotives.ts`
- Modify: `app/actions/freight-cars.ts`
- Modify: `app/actions/cabooses.ts`
- Modify: `app/actions/passenger-cars.ts`
- Modify: `app/actions/mow-equipment.ts`

The same change applies to all five files: add `silhouetteId` to the Zod schema and let it flow through to create/update.

- [ ] **Step 1: Update locomotives.ts**

In `app/actions/locomotives.ts`, add to the `locomotiveSchema` z.object (after `currentLocationId`):

```typescript
  silhouetteId: z.string().optional().nullable(),
```

No other changes needed — the `...parsed.data` spread already passes it through to Prisma.

- [ ] **Step 2: Update freight-cars.ts**

In `app/actions/freight-cars.ts`, add `silhouetteId: z.string().optional().nullable()` to the Zod schema.

- [ ] **Step 3: Update cabooses.ts**

In `app/actions/cabooses.ts`, add `silhouetteId: z.string().optional().nullable()` to the Zod schema.

- [ ] **Step 4: Update passenger-cars.ts**

In `app/actions/passenger-cars.ts`, add `silhouetteId: z.string().optional().nullable()` to the Zod schema.

- [ ] **Step 5: Update mow-equipment.ts**

In `app/actions/mow-equipment.ts`, add `silhouetteId: z.string().optional().nullable()` to the Zod schema.

- [ ] **Step 6: Commit**

```bash
git add app/actions/locomotives.ts app/actions/freight-cars.ts app/actions/cabooses.ts app/actions/passenger-cars.ts app/actions/mow-equipment.ts
git commit -m "feat(silhouettes): add silhouetteId to all rolling stock server actions"
```

---

## Task 8: Add SilhouettePicker to Inventory Forms

**Files:**
- Modify: `components/locomotives/locomotive-form.tsx`
- Modify: `components/freight-cars/freight-car-form.tsx`
- Modify: `components/cabooses/caboose-form.tsx`
- Modify: `components/passenger-cars/passenger-car-form.tsx`
- Modify: `components/mow-equipment/mow-equipment-form.tsx`

Each form uses react-hook-form with a Zod schema. The pattern is identical for all five forms:

1. Add `silhouetteId` to the form's Zod schema
2. Add the `SilhouettePicker` import
3. Add a `FormField` for silhouetteId using `SilhouettePicker`
4. Set the default value from the existing record (for edit mode)

- [ ] **Step 1: Update locomotive-form.tsx**

Add to the Zod schema in the file (around line 56):
```typescript
  silhouetteId: z.string().optional().nullable(),
```

Add import at top:
```typescript
import { SilhouettePicker } from "@/components/ui/silhouette-picker";
```

Add `silhouetteId` to the `defaultValues` in `useForm()` (use `initialData?.silhouetteId ?? null`).

Add a FormField after the status field (or at the top of the form for visual prominence). Place it in its own Card section:

```tsx
<Card>
  <CardHeader className="pb-4">
    <CardTitle className="text-sm font-medium">Silhouette</CardTitle>
    <CardDescription>Choose a silhouette that matches your locomotive model</CardDescription>
  </CardHeader>
  <CardContent>
    <FormField
      control={form.control}
      name="silhouetteId"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <SilhouettePicker
              value={field.value}
              onChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  </CardContent>
</Card>
```

- [ ] **Step 2: Update freight-car-form.tsx**

Same pattern as Step 1: add `silhouetteId` to Zod schema, import `SilhouettePicker`, add the FormField Card section. Use description: "Choose a silhouette that matches your freight car type".

- [ ] **Step 3: Update caboose-form.tsx**

Same pattern. Description: "Choose a silhouette that matches your caboose".

- [ ] **Step 4: Update passenger-car-form.tsx**

Same pattern. Description: "Choose a silhouette that matches your passenger car".

- [ ] **Step 5: Update mow-equipment-form.tsx**

Same pattern. Description: "Choose a silhouette that matches your equipment".

- [ ] **Step 6: Verify forms load correctly**

Run: `npm run dev`

Navigate to create/edit forms for each rolling stock type. Verify:
- SilhouettePicker renders with the grid of silhouettes
- Search and category filtering works
- Selecting a silhouette highlights it and shows the preview
- Saving the form persists the silhouetteId

- [ ] **Step 7: Commit**

```bash
git add components/locomotives/locomotive-form.tsx components/freight-cars/freight-car-form.tsx components/cabooses/caboose-form.tsx components/passenger-cars/passenger-car-form.tsx components/mow-equipment/mow-equipment-form.tsx
git commit -m "feat(silhouettes): add SilhouettePicker to all inventory forms"
```

---

## Task 9: Add Silhouettes to Card Lists

**Files:**
- Modify: `components/locomotives/locomotive-card-list.tsx`
- Modify: `components/freight-cars/freight-car-card-list.tsx`
- Modify: `components/cabooses/caboose-card-list.tsx`
- Modify: `components/passenger-cars/passenger-car-card-list.tsx`
- Modify: `components/mow-equipment/mow-equipment-card-list.tsx`

Each card list needs to:
1. Accept `silhouetteId`, `silhouette` (with filePath/darkPath/name) in its data interface
2. Render `SilhouetteImage` at the top of each card

The silhouette data should be included via Prisma's `include: { silhouette: true }` in the page-level query that feeds these components. That query lives in the page file — the card list just needs to accept the data.

- [ ] **Step 1: Update the Locomotive interface and card in locomotive-card-list.tsx**

Add to the `Locomotive` interface:
```typescript
  silhouette: {
    id: string;
    name: string;
    filePath: string;
    darkPath: string;
  } | null;
```

Add import:
```typescript
import { SilhouetteImage } from "@/components/ui/silhouette-image";
```

Inside the Card, before the CardHeader, add:
```tsx
{loco.silhouette && (
  <div className="px-4 pt-4 flex justify-center">
    <SilhouetteImage
      filePath={loco.silhouette.filePath}
      darkPath={loco.silhouette.darkPath}
      alt={loco.silhouette.name}
      className="h-12 w-auto opacity-80"
    />
  </div>
)}
```

- [ ] **Step 2: Update freight-car-card-list.tsx**

Same pattern: add `silhouette` to interface, import `SilhouetteImage`, render above CardHeader.

- [ ] **Step 3: Update caboose-card-list.tsx**

Same pattern.

- [ ] **Step 4: Update passenger-car-card-list.tsx**

Same pattern.

- [ ] **Step 5: Update mow-equipment-card-list.tsx**

Same pattern.

- [ ] **Step 6: Update page queries to include silhouette**

Find the page files that query rolling stock and add `include: { silhouette: true }` to the Prisma queries. These are likely in the layout-specific page files under `app/(dashboard)/`. Search for `db.locomotive.findMany` (and similar for other types) and add the include.

- [ ] **Step 7: Verify cards display silhouettes**

Run: `npm run dev`

Navigate to inventory list pages. Cards with assigned silhouettes should show the silhouette image above the title. Cards without silhouettes should render normally (no empty space).

- [ ] **Step 8: Commit**

```bash
git add components/locomotives/locomotive-card-list.tsx components/freight-cars/freight-car-card-list.tsx components/cabooses/caboose-card-list.tsx components/passenger-cars/passenger-car-card-list.tsx components/mow-equipment/mow-equipment-card-list.tsx
git commit -m "feat(silhouettes): display silhouettes on inventory cards"
```

---

## Task 10: Integrate Silhouettes into Train Builder

**Files:**
- Modify: `components/consists/rolling-stock-svg.tsx`
- Modify: `components/consists/train-builder.tsx`

- [ ] **Step 1: Extend RollingStockIcon to accept silhouette data**

In `components/consists/rolling-stock-svg.tsx`, update the `RollingStockIcon` component:

Add import at top:
```typescript
import { SilhouetteImage } from "@/components/ui/silhouette-image";
```

Update the component props and body:

```tsx
export function RollingStockIcon({
  type,
  className,
  facing,
  label,
  silhouette,
}: {
  type: StockType;
  className?: string;
  facing?: "F" | "R";
  label?: string;
  silhouette?: { filePath: string; darkPath: string; name: string } | null;
}) {
  // If a specific silhouette is assigned, use it
  if (silhouette) {
    return (
      <div className={className} style={facing === "R" ? { transform: "scaleX(-1)" } : undefined}>
        <SilhouetteImage
          filePath={silhouette.filePath}
          darkPath={silhouette.darkPath}
          alt={silhouette.name}
          className="h-full w-auto"
        />
      </div>
    );
  }

  // Fall back to generic inline SVG
  const color = STOCK_COLORS[type];
  const props = { className, color, label, facing };

  switch (type) {
    case "LOCOMOTIVE":
      return <LocomotiveSvg {...props} />;
    case "FREIGHT_CAR":
      return <BoxcarSvg {...props} />;
    case "PASSENGER_CAR":
      return <PassengerCarSvg {...props} />;
    case "CABOOSE":
      return <CabooseSvg {...props} />;
    case "MOW_EQUIPMENT":
      return <MowEquipmentSvg {...props} />;
  }
}
```

- [ ] **Step 2: Pass silhouette data through train-builder.tsx**

In `components/consists/train-builder.tsx`, the `ConsistPositionData` type and `availableStock` types need to carry silhouette info. Update the data types to include:

```typescript
silhouette?: { filePath: string; darkPath: string; name: string } | null;
```

Then pass `silhouette={pos.silhouette}` (or the stock item's silhouette) to every `RollingStockIcon` usage in the file (there are 3 usages found in the grep results at approximately lines 219, 245, and 285).

The parent page that loads consist data will need to include silhouette relations in its Prisma query — add `silhouette: true` to the include for each rolling stock relation.

- [ ] **Step 3: Verify train builder shows silhouettes**

Run: `npm run dev`

Navigate to a consist/train builder page. Stock items with assigned silhouettes should display their specific silhouette instead of the generic shape. Items without silhouettes should still show the generic fallback.

- [ ] **Step 4: Commit**

```bash
git add components/consists/rolling-stock-svg.tsx components/consists/train-builder.tsx
git commit -m "feat(silhouettes): integrate silhouettes into train builder and consist view"
```

---

## Task 11: Build Verification

- [ ] **Step 1: Run the linter**

Run: `npm run lint`

Expected: No new lint errors. Fix any that appear.

- [ ] **Step 2: Run the build**

Run: `npm run build`

Expected: Build succeeds with no TypeScript errors. Fix any type errors.

- [ ] **Step 3: Commit any fixes**

If lint/build fixes were needed:
```bash
git add -u
git commit -m "fix(silhouettes): resolve lint and type errors"
```
