/**
 * SVG Silhouette Extraction Script
 *
 * Parses potrace-generated SVG sprite sheets from railops_assets/ and extracts
 * individual vehicle silhouettes into public/silhouettes/light/ and dark/.
 *
 * Usage: npx tsx scripts/extract-silhouettes.ts
 */

import { DOMParser } from "@xmldom/xmldom";
import * as fs from "fs";
import * as path from "path";

const ASSETS_DIR = path.resolve(__dirname, "../railops_assets");
const OUT_LIGHT = path.resolve(__dirname, "../public/silhouettes/light");
const OUT_DARK = path.resolve(__dirname, "../public/silhouettes/dark");

const PADDING = 50;

interface SheetConfig {
  file: string;
  grid: number[][] | [number, number];
  slugs: string[];
}

const SHEETS: SheetConfig[] = [
  {
    file: "railops_freight_cars",
    grid: [4, 3],
    slugs: [
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
    file: "railops_gp_diesels",
    grid: [3, 3],
    slugs: [
      "gp9",
      "gp18",
      "gp20",
      "gp30",
      "gp35",
      "gp38-2",
      "gmd-gp39-2",
      "gmd-gp40-2",
      "gmd-gp50",
    ],
  },
  {
    file: "railops_sd_modern_diesels",
    grid: [[2], [2], [3]],
    slugs: [
      "sd70ah-t4",
      "es44ac",
      "sd70ace-t4",
      "et44ac",
      "gp38-2-switcher",
      "evolution-switcher",
      "century-switcher",
    ],
  },
  {
    file: "railops_steam_locomotives",
    grid: [4, 3],
    slugs: [
      "4-4-0-tank",
      "2-6-0-mogul",
      "0-4-0-switcher",
      "2-8-0-consolidation",
      "2-6-2-prairie",
      "3-truck-shay",
      "2-8-2-mikado",
      "garratt",
      "2-6-6-2-mallet",
      "4-8-4-northern",
      "heisler",
      "4-6-0-ten-wheeler",
    ],
  },
  {
    file: "railops_sheet1_diesel_era",
    grid: [3, 2],
    slugs: [
      "f3-a-unit",
      "f7-b-unit",
      "pa-1",
      "dr-4-4-15",
      "e8-a-unit",
      "lh-1000hp-switcher",
    ],
  },
  {
    file: "railops_sheet2_steam_types",
    grid: [3, 2],
    slugs: [
      "4-4-0-american",
      "2-8-2-mikado-alt",
      "2-8-8-2-mallet",
      "4-6-2-pacific",
      "4-8-4-northern-alt",
      "4-6-0-camelback",
    ],
  },
  {
    file: "railops_sheet3_transition_diesels",
    grid: [3, 2],
    slugs: [
      "modern-freight-diesel",
      "streamlined-heritage-diesel",
      "heavy-steam-locomotive",
      "modern-switcher",
      "high-speed-emu",
      "steam-engine-frontal",
    ],
  },
  {
    file: "railops_sheet4_loco_overview",
    grid: [3, 2],
    slugs: [
      "overview-modern-diesel",
      "overview-streamlined",
      "overview-steam",
      "overview-switcher",
      "overview-emu",
      "overview-freight-car",
    ],
  },
];

/**
 * Parse SVG path d attribute and return all absolute coordinates.
 * Handles M/m, L/l, C/c, S/s, Q/q, T/t, H/h, V/v, Z/z, A/a commands.
 */
function getAbsoluteCoords(d: string): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  let curX = 0,
    curY = 0;

  // Tokenize: split into commands and numbers
  const tokens = d.match(/[a-zA-Z]|-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g);
  if (!tokens) return { xs, ys };

  let i = 0;
  let cmd = "M";

  function nextNum(): number {
    while (i < tokens.length && /[a-zA-Z]/.test(tokens[i])) i++;
    return i < tokens.length ? parseFloat(tokens[i++]) : 0;
  }

  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) {
      cmd = tokens[i++];
    }

    switch (cmd) {
      case "M":
        curX = nextNum();
        curY = nextNum();
        xs.push(curX);
        ys.push(curY);
        cmd = "L"; // subsequent coords are lineto
        break;
      case "m":
        curX += nextNum();
        curY += nextNum();
        xs.push(curX);
        ys.push(curY);
        cmd = "l";
        break;
      case "L":
        curX = nextNum();
        curY = nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "l":
        curX += nextNum();
        curY += nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "H":
        curX = nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "h":
        curX += nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "V":
        curY = nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "v":
        curY += nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "C":
        for (let j = 0; j < 3; j++) {
          const x = nextNum(),
            y = nextNum();
          xs.push(x);
          ys.push(y);
          if (j === 2) {
            curX = x;
            curY = y;
          }
        }
        break;
      case "c":
        for (let j = 0; j < 3; j++) {
          const dx = nextNum(),
            dy = nextNum();
          const ax = curX + dx,
            ay = curY + dy;
          xs.push(ax);
          ys.push(ay);
          if (j === 2) {
            curX = ax;
            curY = ay;
          }
        }
        break;
      case "S":
        for (let j = 0; j < 2; j++) {
          const x = nextNum(),
            y = nextNum();
          xs.push(x);
          ys.push(y);
          if (j === 1) {
            curX = x;
            curY = y;
          }
        }
        break;
      case "s":
        for (let j = 0; j < 2; j++) {
          const dx = nextNum(),
            dy = nextNum();
          const ax = curX + dx,
            ay = curY + dy;
          xs.push(ax);
          ys.push(ay);
          if (j === 1) {
            curX = ax;
            curY = ay;
          }
        }
        break;
      case "Q":
        for (let j = 0; j < 2; j++) {
          const x = nextNum(),
            y = nextNum();
          xs.push(x);
          ys.push(y);
          if (j === 1) {
            curX = x;
            curY = y;
          }
        }
        break;
      case "q":
        for (let j = 0; j < 2; j++) {
          const dx = nextNum(),
            dy = nextNum();
          const ax = curX + dx,
            ay = curY + dy;
          xs.push(ax);
          ys.push(ay);
          if (j === 1) {
            curX = ax;
            curY = ay;
          }
        }
        break;
      case "T":
        curX = nextNum();
        curY = nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "t":
        curX += nextNum();
        curY += nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "A":
        nextNum(); nextNum(); nextNum(); nextNum(); nextNum(); // rx ry rotation large-arc sweep
        curX = nextNum();
        curY = nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "a":
        nextNum(); nextNum(); nextNum(); nextNum(); nextNum();
        curX += nextNum();
        curY += nextNum();
        xs.push(curX);
        ys.push(curY);
        break;
      case "Z":
      case "z":
        break;
      default:
        // Unknown command, skip
        i++;
        break;
    }
  }
  return { xs, ys };
}

interface PathInfo {
  d: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  cx: number;
  cy: number;
}

interface GridCell {
  row: number;
  col: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function buildGridCells(
  grid: SheetConfig["grid"],
  vbWidth: number,
  vbHeight: number
): GridCell[] {
  const cells: GridCell[] = [];
  const W = vbWidth * 10;
  const H = vbHeight * 10;

  if (Array.isArray(grid[0])) {
    const rows = grid as number[][];
    const numRows = rows.length;
    const rowH = H / numRows;
    for (let r = 0; r < numRows; r++) {
      const cols = rows[r][0];
      const colW = W / cols;
      for (let c = 0; c < cols; c++) {
        cells.push({
          row: r,
          col: c,
          minX: c * colW,
          maxX: (c + 1) * colW,
          minY: H - (r + 1) * rowH,
          maxY: H - r * rowH,
        });
      }
    }
  } else {
    const [numRows, numCols] = grid as [number, number];
    const rowH = H / numRows;
    const colW = W / numCols;
    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        cells.push({
          row: r,
          col: c,
          minX: c * colW,
          maxX: (c + 1) * colW,
          minY: H - (r + 1) * rowH,
          maxY: H - r * rowH,
        });
      }
    }
  }
  return cells;
}

function assignToCell(cx: number, cy: number, cells: GridCell[]): number {
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (cx >= c.minX && cx <= c.maxX && cy >= c.minY && cy <= c.maxY) {
      return i;
    }
  }
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    const dx = cx - (c.minX + c.maxX) / 2;
    const dy = cy - (c.minY + c.maxY) / 2;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function processSheet(config: SheetConfig, seenSlugs: Set<string>) {
  const lightFile = path.join(ASSETS_DIR, `${config.file}.svg`);
  const darkFile = path.join(ASSETS_DIR, `${config.file}_darkmode.svg`);

  for (const [variant, filePath, outDir] of [
    ["light", lightFile, OUT_LIGHT],
    ["dark", darkFile, OUT_DARK],
  ] as const) {
    if (!fs.existsSync(filePath)) {
      console.warn(`  Skipping ${variant}: ${filePath} not found`);
      continue;
    }

    const svgText = fs.readFileSync(filePath, "utf-8");
    const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const svgEl = doc.documentElement;

    const vb = svgEl.getAttribute("viewBox")!.split(/\s+/).map(parseFloat);
    const vbWidth = vb[2];
    const vbHeight = vb[3];

    const paths = svgEl.getElementsByTagName("path");
    const cells = buildGridCells(config.grid, vbWidth, vbHeight);

    // Parse all paths
    const pathInfos: PathInfo[] = [];
    for (let i = 0; i < paths.length; i++) {
      const d = paths[i].getAttribute("d");
      if (!d) continue;
      const coords = getAbsoluteCoords(d);
      if (coords.xs.length === 0) continue;
      const minX = Math.min(...coords.xs);
      const maxX = Math.max(...coords.xs);
      const minY = Math.min(...coords.ys);
      const maxY = Math.max(...coords.ys);
      pathInfos.push({
        d,
        minX,
        maxX,
        minY,
        maxY,
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
      });
    }

    // Group by cell
    const cellPaths = new Map<number, PathInfo[]>();
    for (const p of pathInfos) {
      const ci = assignToCell(p.cx, p.cy, cells);
      if (!cellPaths.has(ci)) cellPaths.set(ci, []);
      cellPaths.get(ci)!.push(p);
    }

    for (let si = 0; si < config.slugs.length; si++) {
      const slug = config.slugs[si];
      const cellIdx = si; // cells are in row-major order matching slugs

      if (variant === "light") {
        if (seenSlugs.has(slug)) {
          console.log(`  Skipping duplicate: ${slug}`);
          continue;
        }
        seenSlugs.add(slug);
      } else {
        if (!fs.existsSync(path.join(OUT_LIGHT, `${slug}.svg`))) {
          continue;
        }
      }

      const group = cellPaths.get(cellIdx);
      if (!group || group.length === 0) {
        console.warn(`  No paths for cell ${si} (${slug})`);
        continue;
      }

      // Tight bounding box
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of group) {
        minX = Math.min(minX, p.minX);
        maxX = Math.max(maxX, p.maxX);
        minY = Math.min(minY, p.minY);
        maxY = Math.max(maxY, p.maxY);
      }
      minX -= PADDING;
      minY -= PADDING;
      maxX += PADDING;
      maxY += PADDING;

      // Convert to screen coords via the potrace transform
      const screenMinX = minX * 0.1;
      const screenMaxX = maxX * 0.1;
      const screenMinY = vbHeight - maxY * 0.1;
      const screenMaxY = vbHeight - minY * 0.1;
      const screenW = screenMaxX - screenMinX;
      const screenH = screenMaxY - screenMinY;

      const pathDs = group.map((p) => `<path d="${p.d}"/>`).join("\n");

      const outSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${screenMinX.toFixed(2)} ${screenMinY.toFixed(2)} ${screenW.toFixed(2)} ${screenH.toFixed(2)}">
<g transform="translate(0.000000,${vbHeight.toFixed(6)}) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
${pathDs}
</g>
</svg>`;

      fs.writeFileSync(path.join(outDir, `${slug}.svg`), outSvg, "utf-8");
    }
  }
}

// Main
fs.mkdirSync(OUT_LIGHT, { recursive: true });
fs.mkdirSync(OUT_DARK, { recursive: true });

const seenSlugs = new Set<string>();
for (const sheet of SHEETS) {
  console.log(`Processing ${sheet.file}...`);
  processSheet(sheet, seenSlugs);
}

const lightFiles = fs.readdirSync(OUT_LIGHT).filter((f) => f.endsWith(".svg"));
const darkFiles = fs.readdirSync(OUT_DARK).filter((f) => f.endsWith(".svg"));
console.log(
  `\nDone! Extracted ${lightFiles.length} light + ${darkFiles.length} dark SVGs.`
);
