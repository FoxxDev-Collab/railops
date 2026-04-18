import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const INPUT = path.join(ROOT, "public", "new_logo_2026.png");
const OUTPUT = path.join(ROOT, "public", "railroadops-logo.png");

// Threshold constants for the white-to-transparent mask.
// Pixels whose minimum RGB channel is >= HARD_WHITE become fully transparent.
// Pixels between SOFT_WHITE and HARD_WHITE get gradient alpha to preserve
// anti-aliased edges (avoids jagged fringe).
const HARD_WHITE = 240;
const SOFT_WHITE = 200;
const TARGET_SIZE = 1024;

async function main() {
  const { data, info } = await sharp(INPUT)
    .resize(TARGET_SIZE, TARGET_SIZE, { fit: "inside", withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (channels !== 4) {
    throw new Error(`Expected 4 channels (RGBA), got ${channels}`);
  }

  let cleared = 0;
  let softened = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const minCh = Math.min(r, g, b);

    if (minCh >= HARD_WHITE) {
      data[i + 3] = 0;
      cleared++;
    } else if (minCh >= SOFT_WHITE) {
      const t = (minCh - SOFT_WHITE) / (HARD_WHITE - SOFT_WHITE);
      data[i + 3] = Math.round(data[i + 3] * (1 - t));
      softened++;
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT);

  console.log(`Wrote ${OUTPUT}`);
  console.log(`  Size: ${width}x${height}`);
  console.log(`  Pixels fully cleared: ${cleared}`);
  console.log(`  Pixels softened: ${softened}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
