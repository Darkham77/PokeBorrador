import type { DisplayText } from '@francogp/auditor';
import { defineCommand, runMain } from 'citty';
/**
 * scripts/assets/init_shadow_overrides.ts
 *
 * Bootstraps src/data/pokemon/spriteShadowOverrides.json by reading
 * hardcoded POKEMON_AESTHETICS (floating: true) and pairing each with its current coordinates.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  POKEMON_AESTHETICS,
  POKEMON_SPRITE_IDS,
  requirePokemonSpeciesId
} from '../../src/data/pokemon/pokedex.ts';
import feetDbJson from '../../src/data/pokemon/pokemonFeetDatabase.json' with { type: 'json' };
import type { SpriteShadowOverride } from '../../src/types/pokemon/spriteShadows.ts';

const TARGET_FILE = path.resolve(process.cwd(), 'src/data/pokemon/spriteShadowOverrides.json');

async function main() {
  const overrides: Record<DisplayText, SpriteShadowOverride> = {};

  try {
    const raw = await fs.readFile(TARGET_FILE, 'utf8');
    const existing = JSON.parse(raw);
    Object.assign(overrides, existing);
  } catch (err) {
    err;
  }

  const pGroup = feetDbJson.p as Record<DisplayText, readonly number[]>; // open-record: Generic key-value data dictionary container

  for (const [speciesId, aesthetic] of Object.entries(POKEMON_AESTHETICS)) {
    if (!aesthetic || !aesthetic.floating) continue;

    const validSpeciesId = requirePokemonSpeciesId(speciesId);
    const num = POKEMON_SPRITE_IDS[validSpeciesId];
    if (!num) continue;

    const candidates = [
      `animated/Front/${num}i`,
      `animated/Front/${num}i_f`,
      `animated/Back/${num}i`,
      `animated/Back/${num}i_f`,
      `animated/Front shiny/${num}i`,
      `animated/Back shiny/${num}i`,
      `${num}`,
      `Back/${num}`,
      `Front shiny/${num}`,
      `Back shiny/${num}`
    ];

    for (const subKey of candidates) {
      const fullPath = `/assets/sprites/pokemon/${subKey}.webp`;
      if (overrides[fullPath]) continue;

      const tuple = pGroup[subKey];
      if (tuple && tuple.length >= 2) {
        overrides[fullPath] = {
          feetY: tuple[0]!,
          feetX: tuple[1]!,
          isFlying: true
        };
      }
    }
  }

  await fs.writeFile(TARGET_FILE, JSON.stringify(overrides, null, 2), 'utf8');
  console.log(
    `✅ [init_shadow_overrides] Initialized ${Object.keys(overrides).length} entries in ${TARGET_FILE}`
  );
}

export const command = defineCommand({
  meta: {
    name: 'init-shadow-overrides',
    description: 'Inicializa las coordenadas de sombras de sprites de Pokémon flotantes'
  },
  async run() {
    await main();
  }
});

runMain(command);
