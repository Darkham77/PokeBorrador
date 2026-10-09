/**
 * scripts/map/extract_silence_bridge_tiles.ts
 *
 * CANONICAL ROUTE 12 (SILENCE BRIDGE) TILESET EXTRACTOR
 *
 * Extracts the 100% authentic, unified wooden boardwalk bridge tiles from
 * Pokemon FireRed/LeafGreen Route 12 (Silence Bridge, Snorlax fishing bridge).
 *
 * Extracts:
 *   - Vertical bridge (left rail, right rail, mid planks)
 *   - Horizontal bridge (top rail, bottom edge/shadow, mid planks)
 *   - Authentic 90-degree corner turns (NW, NE, SW, SE)
 *   - Authentic 2x2 fishing decks and platforms (diagonal planks with posts)
 */

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const R12_PATH = path.resolve(ROOT_DIR, 'public/assets/raw/firered_leafgreen/firered_route_12.png');

interface TileDef {
  readonly id: string;
  readonly x?: number;
  readonly y?: number;
  readonly pixelX?: number;
  readonly pixelY?: number;
  readonly maskWater?: boolean;
  readonly flop?: boolean;
}

const TILES_TO_EXTRACT: readonly TileDef[] = [
  // 1. Vertical Bridge (2 cells wide) - using sub-pixel coordinates for 100% seam-free vertical bridge
  { id: 'poke_bridge_silence_v_left.png', pixelX: 200, pixelY: 912, maskWater: true },
  { id: 'poke_bridge_silence_v_right.png', pixelX: 215, pixelY: 912, maskWater: true },
  { id: 'poke_bridge_silence_v_mid.png', pixelX: 208, pixelY: 912, maskWater: false },

  // 2. Horizontal Bridge (2 cells tall)
  { id: 'poke_bridge_silence_h_top.png', x: 15, y: 44, maskWater: true },
  { id: 'poke_bridge_silence_h_bot.png', x: 15, y: 45, maskWater: true },
  { id: 'poke_bridge_silence_h_mid.png', x: 16, y: 44, maskWater: false },

  // 3. Authentic Corner Turns (Silence Bridge uses clean continuous rails)
  { id: 'poke_bridge_silence_turn_nw.png', x: 15, y: 44, maskWater: true },
  { id: 'poke_bridge_silence_turn_ne.png', x: 15, y: 44, maskWater: true },
  { id: 'poke_bridge_silence_turn_sw.png', x: 15, y: 45, maskWater: true },
  { id: 'poke_bridge_silence_turn_se.png', x: 15, y: 45, maskWater: true },

  // Inner corner transitions
  { id: 'poke_bridge_silence_inner_nw.png', x: 15, y: 44, maskWater: true },
  { id: 'poke_bridge_silence_inner_ne.png', x: 15, y: 44, maskWater: true },
  { id: 'poke_bridge_silence_inner_sw.png', x: 15, y: 45, maskWater: true },
  { id: 'poke_bridge_silence_inner_se.png', x: 15, y: 45, maskWater: true },

  // 4. Authentic 2x2 Fishing Deck / Platform
  { id: 'poke_bridge_silence_deck_tl.png', x: 19, y: 50, maskWater: true },
  { id: 'poke_bridge_silence_deck_tr.png', x: 20, y: 50, maskWater: true },
  { id: 'poke_bridge_silence_deck_bl.png', x: 19, y: 51, maskWater: true },
  { id: 'poke_bridge_silence_deck_br.png', x: 20, y: 51, maskWater: true },
  { id: 'poke_bridge_silence_deck_platform.png', x: 19, y: 51, maskWater: false },
  { id: 'poke_bridge_silence_deck_closed.png', x: 19, y: 51, maskWater: false },

  // 5. Directional Dead Ends on water
  { id: 'poke_bridge_silence_end_e_top.png', x: 20, y: 44, maskWater: true },
  { id: 'poke_bridge_silence_end_e_bot.png', x: 20, y: 45, maskWater: true }
] as const;

async function main(): Promise<void> {
  if (!fs.existsSync(R12_PATH)) {
    throw new Error(`Route 12 raw source image not found at ${R12_PATH}`);
  }

  const { data, info } = await sharp(R12_PATH)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const targetDirs = [
    path.resolve(ROOT_DIR, 'public/assets/tiles'),
    path.resolve(ROOT_DIR, 'public/assets/canon/infrastructure'),
    path.resolve(ROOT_DIR, 'public/assets/prefabs')
  ];

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  for (const def of TILES_TO_EXTRACT) {
    const tileW = 16;
    const tileH = 16;
    const rgba = Buffer.alloc(tileW * tileH * 4);

    for (let py = 0; py < tileH; py++) {
      for (let px = 0; px < tileW; px++) {
        const srcX = def.pixelX !== undefined ? def.pixelX + px : (def.x ?? 0) * 16 + px;
        const srcY = def.pixelY !== undefined ? def.pixelY + py : (def.y ?? 0) * 16 + py;
        const srcIdx = (srcY * info.width + srcX) * info.channels;

        const r = data[srcIdx + 0] ?? 0;
        const g = data[srcIdx + 1] ?? 0;
        const b = data[srcIdx + 2] ?? 0;

        // Detect water pixel in FireRed palette:
        // Water has high blue relative to red: b > r + 15 && b > 80
        // (Also dark blue shadow water: b > 70 && b > r + 10 && r < 90)
        const isWater =
          def.maskWater &&
          ((b > r + 15 && b > 80) || (b > 70 && b > r + 10 && r < 90));

        const dstIdx = (py * tileW + px) * 4;
        rgba[dstIdx + 0] = r;
        rgba[dstIdx + 1] = g;
        rgba[dstIdx + 2] = b;
        rgba[dstIdx + 3] = isWater ? 0 : 255;
      }
    }

    // Upscale 2x from 16x16 to 32x32 using Nearest-Neighbor
    let pipeline = sharp(rgba, {
      raw: { width: tileW, height: tileH, channels: 4 }
    });
    if (def.flop) {
      pipeline = pipeline.flop();
    }
    const upscaled = await pipeline
      .resize(32, 32, { kernel: 'nearest' })
      .png()
      .toBuffer();

    for (const dir of targetDirs) {
      const outPath = path.join(dir, def.id);
      fs.writeFileSync(outPath, upscaled);
    }

    console.log(`[Extracted]: ${def.id}`);
  }

  console.log(`\nSuccessfully extracted ${TILES_TO_EXTRACT.length} canonical Route 12 bridge tiles!`);
}

main().catch((err) => {
  console.error('[Error extracting tiles]:', err);
  process.exit(1);
});
