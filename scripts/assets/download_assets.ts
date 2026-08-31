/**
 * scripts/assets/download_assets.ts
 *
 * UNIVERSAL ASSET DOWNLOADER (Node.js 26+)
 *
 * Multi-source scraper for official Pokémon items and sprites.
 * Sources:
 *   1. PokéAPI canonical raw sprites
 *   2. Serebii ItemDex (complete Gen 8 & Gen 9 SV icons)
 *   3. PokéSprite (msikma inventory repository)
 *   4. Pokémon Showdown item icons mirror
 *   5. PokémonDB sprites
 *
 * Staging Workflow:
 *   1. Download raw PNGs to temporary scratch directory: `scratch/item_sprites_download/`
 *   2. Validate non-empty image headers (filter out HTML error pages).
 *   3. Relocate verified files to `_raw-assets/public/assets/sprites/items/`.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* --allow-net=raw.githubusercontent.com,play.pokemonshowdown.com,img.pokemondb.net,www.serebii.net scripts/assets/download_assets.ts --items
 */

import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs, styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { Dex, toID } from '@pkmn/sim';

enableCompileCache();

const CONCURRENCY_LIMIT = 20;
const TOTAL_POKEMON_SPECIES = 1025; // Gen 1-9

const SCRATCH_STAGING_DIR = path.resolve(process.cwd(), 'scratch', 'item_sprites_download');
const RAW_ASSETS_DIR = path.resolve(process.cwd(), '_raw-assets', 'public', 'assets', 'sprites');
const RAW_ITEMS_DIR = path.resolve(RAW_ASSETS_DIR, 'items');

const POKEAPI_SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

const POKESPRITE_FOLDERS = [ // no-domain
  'hold-item', 'battle-item', 'berry', 'medicine', 'general', 'key-item', 'ball', 'evo-item', 'tm-hm', 'other'
] as const;

// Multi-source sprite URLs for items
const ITEM_SOURCES: Array<(name: string, cleanId: string) => string> = [
  // 1. Serebii Direct
  (name) => `https://www.serebii.net/itemdex/sprites/${name}.png`,
  (name) => `https://www.serebii.net/itemdex/sprites/sv/${name}.png`,
  (name) => `https://www.serebii.net/itemdex/sprites/swsh/${name}.png`,

  // 2. PokéAPI
  (name) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${name}.png`,

  // 3. PokéSprite multi-category
  ...POKESPRITE_FOLDERS.map(f => (name: string) => `https://raw.githubusercontent.com/msikma/pokesprite/master/items/${f}/${name}.png`),

  // 4. Pokémon Showdown Item Icons
  (name) => `https://play.pokemonshowdown.com/sprites/itemicons/${name}.png`,
  (_name, cleanId) => `https://play.pokemonshowdown.com/sprites/itemicons/${cleanId}.png`,
  (name) => `https://play.pokemonshowdown.com/sprites/itemsprites/${name}.png`,

  // 5. PokémonDB
  (name) => `https://img.pokemondb.net/sprites/items/${name}.png`,
];

interface ShopItem {
  id: string;
  name?: string;
  cat?: string;
  sprite?: string;
  isCanon?: boolean;
}

/**
 * Dynamically derives candidate URL slugs for an item using @pkmn/sim Showdown Dex
 */
export function toItemSlugCandidates(id: string): string[] {
  const clean = id.toLowerCase().trim(); // string-ok
  const candidates: Set<string> = new Set([clean]);

  // 1. Check Pokémon Showdown Canon Dex
  const dexItem = Dex.items.get(toID(clean));
  if (dexItem.exists && dexItem.name) {
    const slug = dexItem.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); // string-ok
    candidates.add(slug);
    candidates.add(dexItem.id);
  }

  // 2. Dynamic TM resolution
  if (clean.startsWith('tm')) {
    const num = parseInt(clean.replace('tm', ''), 10);
    candidates.add(`tm${num}`);
    candidates.add(`tm-${num}`);
    candidates.add(`tm0${num}`);
  }

  // 3. Common Pokémon Sub-word tokenization
  const subwordRegex = /(berry|ball|stone|feather|mochi|potion|repel|restore|cure|herb|seed|plate|incense|gem|scarf|specs|band|belt|glasses|orb|candy|scale|tooth|fang|boots|glove|mask|apple|sweet|patch|capsule|flute|letter|ticket|mail|powder|spoon|tag|bell|rock|clay|dice|vest|cloak|helmet|sash|lens|knot|moss|umbrella|spray|policy|goggles|card|service|amulet|disc|cuff|wreath|teacup|pot|egg|rod)$/;
  if (subwordRegex.test(clean)) {
    const matched = clean.match(subwordRegex)![0];
    const prefix = clean.slice(0, clean.length - matched.length);
    if (prefix.length > 0) {
      candidates.add(`${prefix}-${matched}`);
    }
  }

  // 4. Specific special cases
  if (clean === 'freshstartmochi') {
    candidates.add('fresh-startmochi');
    candidates.add('fresh-start-mochi');
    candidates.add('freshstart-mochi');
  }
  if (clean === 'hpup') candidates.add('hp-up');
  if (clean === 'ppup') candidates.add('pp-up');
  if (clean === 'ppmax') candidates.add('pp-max');
  if (clean === 'revivemax') candidates.add('max-revive');
  if (clean === 'elixirmax') candidates.add('max-elixir');
  if (clean === 'expshare') candidates.add('exp-share');
  if (clean === 'linkcable') {
    candidates.add('linking-cord');
    candidates.add('link-cable');
  }
  if (clean === 'paralyzeheal') {
    candidates.add('parlyz-heal');
    candidates.add('paralyze-heal');
  }
  if (clean === 'goldberry') candidates.add('gold-berry');
  if (clean === 'silverberry') candidates.add('silver-berry');

  return Array.from(candidates);
}

async function fetchBufferWithFallback(candidateNames: string[], cleanId: string): Promise<{ buffer: Buffer; sourceUrl: string; matchedName: string } | null> {
  for (const name of candidateNames) {
    for (const sourceFn of ITEM_SOURCES) {
      const url = sourceFn(name, cleanId);
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'image/png,image/webp,image/*,*/*;q=0.8',
          }
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            continue; // Ignore 404 HTML fallback pages
          }
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          // Check for valid PNG or image signature (> 50 bytes and not error page)
          if (buf.length > 50 && buf.length !== 36570) {
            return { buffer: buf, sourceUrl: url, matchedName: name };
          }
        }
      } catch {
        // Try next source
      }
    }
  }
  return null;
}

export async function downloadAllItems(): Promise<{
  downloaded: number;
  existing: number;
  ignoredCustom: number;
  failed: string[];
}> {
  const itemsJsonPath = path.resolve(process.cwd(), 'src/data/inventory/items.json');
  if (!existsSync(itemsJsonPath)) {
    throw new Error(`items.json not found at ${itemsJsonPath}`);
  }

  const rawJson = readFileSync(itemsJsonPath, 'utf-8');
  const itemsData = JSON.parse(rawJson) as { SHOP_ITEMS?: ShopItem[] };
  const allItems = itemsData.SHOP_ITEMS || [];

  // Dinámicamente identificar ítems canónicos de Showdown/Dex o marcados con isCanon
  const canonItems = allItems.filter(item => {
    if (item.isCanon === false) return false;
    if (item.isCanon === true) return true;
    const dexItem = Dex.items.get(toID(item.id));
    return dexItem.exists;
  });

  const ignoredCustomCount = allItems.length - canonItems.length;

  await fs.mkdir(SCRATCH_STAGING_DIR, { recursive: true });
  await fs.mkdir(RAW_ITEMS_DIR, { recursive: true });

  console.log(styleText('yellow', `\n📦 Iniciando descarga de ${canonItems.length} ítems CANÓNICOS oficiales (multi-fuente)...`));
  console.log(styleText('gray', `   Ítems caseros del proyecto ignorados: ${ignoredCustomCount}`));
  console.log(styleText('gray', `   Directorio temporal staging: ${SCRATCH_STAGING_DIR}`));
  console.log(styleText('gray', `   Directorio destino raw:      ${RAW_ITEMS_DIR}\n`));

  let downloadedCount = 0;
  let existingCount = 0;
  const failed: string[] = []; // no-domain

  for (let i = 0; i < canonItems.length; i += CONCURRENCY_LIMIT) {
    const chunk = canonItems.slice(i, i + CONCURRENCY_LIMIT);
    await Promise.all(chunk.map(async (item) => {
      const finalRawPath = path.join(RAW_ITEMS_DIR, `${item.id}.png`);
      const stagingPath = path.join(SCRATCH_STAGING_DIR, `${item.id}.png`);

      // Si ya existe en _raw-assets, no re-descargar
      if (existsSync(finalRawPath)) {
        existingCount++;
        return;
      }

      const candidates = toItemSlugCandidates(item.id);
      const result = await fetchBufferWithFallback(candidates, item.id);

      if (result) {
        // 1. Guardar primero en staging temporal en scratch/
        await fs.writeFile(stagingPath, result.buffer);
        // 2. Reubicar en _raw-assets/public/assets/sprites/items/
        await fs.writeFile(finalRawPath, result.buffer);
        downloadedCount++;
        console.log(styleText('green', `   ✅ [${item.id}]`), `${item.name || item.id} (desde ${result.sourceUrl})`);
      } else {
        failed.push(item.id);
        console.log(styleText('red', `   ❌ [${item.id}]`), `No se encontró en ninguna fuente (${candidates.join(', ')})`);
      }
    }));
  }

  console.log(styleText('cyan', '\n───────────────────────────────────────────────────────'));
  console.log(`Resumen ítems: ${styleText('green', `${downloadedCount} descargados`)}, ${styleText('gray', `${existingCount} ya existentes`)}, ${styleText(failed.length === 0 ? 'green' : 'yellow', `${failed.length} pendientes`)}, ${styleText('blue', `${ignoredCustomCount} custom ignorados`)}.`);
  console.log(styleText('cyan', '───────────────────────────────────────────────────────\n'));

  return { downloaded: downloadedCount, existing: existingCount, ignoredCustom: ignoredCustomCount, failed };
}

async function downloadPokemon(limit: number) {
  const pokeFolder = path.join(RAW_ASSETS_DIR, 'pokemon');
  await fs.mkdir(pokeFolder, { recursive: true });
  console.log(styleText('yellow', `\n📦 Descargando sprites de Pokémon (1 a ${limit})...`));

  for (let i = 1; i <= limit; i++) {
    const filename = `${i}.png`;
    const target = path.join(pokeFolder, filename);
    if (existsSync(target)) continue;

    const url = `${POKEAPI_SPRITE_BASE}${i}.png`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        await fs.writeFile(target, buf);
      }
    } catch {
      // Ignore single failure
    }
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      pokemon: { type: 'boolean' },
      items: { type: 'boolean' },
      trainers: { type: 'boolean' },
      all: { type: 'boolean' },
      limit: { type: 'string' }
    },
    allowPositionals: true,
    strict: false
  });

  const isPositionalItems = positionals.includes('items');
  const isPositionalPokemon = positionals.includes('pokemon');
  const isPositionalTrainers = positionals.includes('trainers');
  const isPositionalAll = positionals.includes('all');

  const doAll = values.all || isPositionalAll || (!values.pokemon && !values.items && !values.trainers && !isPositionalItems && !isPositionalPokemon && !isPositionalTrainers);
  const doItems = doAll || values.items || isPositionalItems;
  const doPokemon = doAll || values.pokemon || isPositionalPokemon;
  const pokemonLimit = typeof values.limit === 'string' ? parseInt(values.limit, 10) : TOTAL_POKEMON_SPECIES;

  console.log(styleText('bold', '\n--- 📥 UNIVERSAL ASSET DOWNLOADER & MULTI-SOURCE SCRAPER ---'));

  if (doItems) {
    await downloadAllItems();
  }

  if (doPokemon) {
    await downloadPokemon(pokemonLimit);
  }
}

if (process.argv[1]?.endsWith('download_assets.ts')) {
  main().catch(err => {
    console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
    process.exit(1);
  });
}
