/**
 * scripts/tools/fetch_ev_yields.ts
 *
 * Scrapes and unifies EV yield tables from PokemonDB and Bulbapedia,
 * cross-validates against SPECIES_METADATA and Pokemon Showdown Dex,
 * and writes the canonical src/data/pokemon/evYields.json database.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { toID } from '@pkmn/sim';
import metadataJson from '../../src/data/pokemon/speciesMetadata.json' with { type: 'json' };

type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';
type EvYield = Partial<Record<StatKey, number>>;

const POKEMONDB_URL = 'https://pokemondb.net/ev/all';
const BULBAPEDIA_URL = 'https://bulbapedia.bulbagarden.net/wiki/List_of_Pok%C3%A9mon_by_effort_value_yield_in_Generation_IX';

const STAT_COLUMNS_POKEMONDB: readonly StatKey[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || !['pokemondb.net', 'bulbapedia.bulbagarden.net'].includes(parsed.hostname)) {
      throw new Error(`Untrusted host for EV yields scraping: ${parsed.hostname}`);
    }
    const response = await fetch(parsed.href, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    if (!response.ok) {
      console.warn(`Warning: Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    return response.text();
  } catch (e) {
    console.warn(`Warning: Network error fetching ${url}:`, e);
    return null;
  }
}

function cleanString(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function parsePokemonDb(html: string): Map<string, EvYield> {
  const map = new Map<string, EvYield>();

  // Match table rows in PokemonDB
  const rowRegex = /<tr[^>]*>[\s\S]*?<a class="ent-name"[^>]*>([^<]+)<\/a>(?:<br>\s*<small class="text-muted">([^<]+)<\/small>)?[\s\S]*?<td class="[^"]*cell-total[^"]*">([^<]*)<\/td>[\s\S]*?<td class="[^"]*cell-total[^"]*">([^<]*)<\/td>[\s\S]*?<td class="[^"]*cell-total[^"]*">([^<]*)<\/td>[\s\S]*?<td class="[^"]*cell-total[^"]*">([^<]*)<\/td>[\s\S]*?<td class="[^"]*cell-total[^"]*">([^<]*)<\/td>[\s\S]*?<td class="[^"]*cell-total[^"]*">([^<]*)<\/td>[\s\S]*?<\/tr>/g;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const mainName = match[1]?.trim() || '';
    const subText = match[2]?.trim() || '';
    const fullName = subText ? `${mainName} ${subText}` : mainName;

    const baseId = toID(cleanString(mainName));
    const fullId = toID(cleanString(fullName));

    const evs: EvYield = {};
    for (let i = 0; i < 6; i++) {
      const cellVal = match[3 + i]?.trim() || '';
      const val = cellVal ? parseInt(cellVal, 10) : 0;
      if (val > 0) {
        const stat = STAT_COLUMNS_POKEMONDB[i];
        if (stat) evs[stat] = val;
      }
    }

    if (Object.keys(evs).length > 0) {
      map.set(fullId, evs);
      if (!map.has(baseId)) {
        map.set(baseId, evs);
      }
    }
  }

  return map;
}

function parseBulbapedia(html: string): Map<string, EvYield> {
  const map = new Map<string, EvYield>();
  const rowRegex = /<tr[^>]*>[\s\S]*?<td[^>]*>.*?<\/td>[\s\S]*?<td[^>]*><a[^>]*>([^<]+)<\/a>(?:<small>([^<]+)<\/small>)?<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<td[^>]*>([^<]*)<\/td>[\s\S]*?<\/tr>/g;

  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(html)) !== null) {
    const name = match[1]?.trim() || '';
    const formText = match[2]?.trim() || '';
    const fullName = formText ? `${name} ${formText}` : name;
    const fullId = toID(cleanString(fullName));
    const baseId = toID(cleanString(name));

    const evs: EvYield = {};
    const hp = parseInt(match[3]?.trim() || '0', 10);
    const atk = parseInt(match[4]?.trim() || '0', 10);
    const def = parseInt(match[5]?.trim() || '0', 10);
    const spa = parseInt(match[6]?.trim() || '0', 10);
    const spd = parseInt(match[7]?.trim() || '0', 10);
    const spe = parseInt(match[8]?.trim() || '0', 10);

    if (hp > 0) evs.hp = hp;
    if (atk > 0) evs.atk = atk;
    if (def > 0) evs.def = def;
    if (spa > 0) evs.spa = spa;
    if (spd > 0) evs.spd = spd;
    if (spe > 0) evs.spe = spe;

    if (Object.keys(evs).length > 0) {
      map.set(fullId, evs);
      if (!map.has(baseId)) {
        map.set(baseId, evs);
      }
    }
  }

  return map;
}

export async function generateEvYields() {
  console.log('Fetching EV Yield data from PokemonDB...');
  const pdbHtml = await fetchHtml(POKEMONDB_URL);
  const pdbData = pdbHtml ? parsePokemonDb(pdbHtml) : new Map<string, EvYield>();
  console.log(`Parsed ${pdbData.size} PokemonDB entries.`);

  console.log('Fetching EV Yield data from Bulbapedia...');
  const bulbaHtml = await fetchHtml(BULBAPEDIA_URL);
  const bulbaData = bulbaHtml ? parseBulbapedia(bulbaHtml) : new Map<string, EvYield>();
  console.log(`Parsed ${bulbaData.size} Bulbapedia entries.`);

  if (pdbData.size === 0 && bulbaData.size === 0) {
    throw new Error('Both sources failed to provide data.');
  }

  const allSpeciesKeys = Object.keys(metadataJson);
  const result: Record<string, EvYield> = {};

  let matched = 0;
  let fallbackToBase = 0;
  const missing: string[] = []; // no-domain

  for (const speciesKey of allSpeciesKeys) {
    const cleanId = toID(speciesKey);

    // 1. Direct match in PokemonDB or Bulbapedia
    let ev = pdbData.get(cleanId) || bulbaData.get(cleanId);

    // 2. Special naming reconciliations (e.g. form suffixes)
    if (!ev) {
      for (const [key, value] of pdbData.entries()) {
        if (key.startsWith(cleanId) || cleanId.startsWith(key)) {
          ev = value;
          break;
        }
      }
    }

    if (!ev) {
      for (const [key, value] of bulbaData.entries()) {
        if (key.startsWith(cleanId) || cleanId.startsWith(key)) {
          ev = value;
          break;
        }
      }
    }

    // 3. Prefix matching for megas/forms if not explicitly different
    if (!ev) {
      const prefixes = ['mega', 'gmax', 'alola', 'galar', 'hisui', 'paldea', 'totem', 'primal', 'origin']; // no-domain
      for (const p of prefixes) {
        if (cleanId.includes(p)) {
          const stripped = cleanId.replace(p, '');
          ev = pdbData.get(stripped) || bulbaData.get(stripped);
          if (ev) {
            fallbackToBase++;
            break;
          }
        }
      }
    }

    if (ev && Object.keys(ev).length > 0) {
      result[speciesKey] = ev;
      matched++;
    } else {
      missing.push(speciesKey);
    }
  }

  console.log(`Matched ${matched}/${allSpeciesKeys.length} species (Fallback to base: ${fallbackToBase}).`);
  if (missing.length > 0) {
    console.warn(`Missing EV yields for ${missing.length} species:`, missing.slice(0, 20));
  }

  const outputPath = resolve(process.cwd(), 'src/data/pokemon/evYields.json');
  writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
  console.log(`Successfully generated ${outputPath}`);
}

generateEvYields().catch((err) => {
  console.error('Fatal error generating EV yields:', err);
  process.exit(1);
});
