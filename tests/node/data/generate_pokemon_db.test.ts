import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, expect } from 'vite-plus/test';

import { generatePokemonDatabase } from '../../../scripts/data/generate_pokemon_db.ts';

const OUTPUT_FILE = path.resolve(process.cwd(), 'src/data/pokemon/pokemonDB.json');

describe('generatePokemonDatabase & Pokemon DB Integrity', () => {
  it('generates the pokemon database without ReferenceErrors', async () => {
    await expect(generatePokemonDatabase()).resolves.toBeUndefined();
  });

  it('produces a valid JSON database file in public/data/pokemon_db.json', async () => {
    const raw = await fs.readFile(OUTPUT_FILE, 'utf8');
    expect(raw).toBeTruthy();

    const parsed: unknown = JSON.parse(raw);
    expect(parsed).toBeTypeOf('object');
    expect(parsed).not.toBeNull();
  });

  it('contains canonical benchmark species with valid structural contracts', async () => {
    const raw = await fs.readFile(OUTPUT_FILE, 'utf8');
    const db = JSON.parse(raw) as Record<string, Record<string, unknown>>;

    const benchmarkSpecies = ['pikachu', 'charizard', 'mewtwo', 'bulbasaur', 'gengar'];
    for (const id of benchmarkSpecies) {
      const entry = db[id];
      expect(entry, `Species [${id}] must be defined in pokemonDB.json`).toBeDefined();
      expect(entry?.name).toBeTypeOf('string');
      expect(entry?.type).toBeDefined();
      expect(entry?.hp).toBeGreaterThan(0);
      expect(entry?.atk).toBeGreaterThan(0);
      expect(entry?.def).toBeGreaterThan(0);
      expect(Array.isArray(entry?.learnset)).toBe(true);
    }
  });

  it('guarantees positive numeric values for all base stats across sampled species', async () => {
    const raw = await fs.readFile(OUTPUT_FILE, 'utf8');
    const db = JSON.parse(raw) as Record<
      string,
      { hp?: number; atk?: number; def?: number; spa?: number; spd?: number; spe?: number }
    >;

    const keys = Object.keys(db).slice(0, 50);
    expect(keys.length).toBeGreaterThanOrEqual(10);

    for (const key of keys) {
      const entry = db[key];
      expect(entry).toBeDefined();
      if (entry) {
        expect(entry.hp).toBeGreaterThan(0);
        expect(entry.atk).toBeGreaterThan(0);
        expect(entry.def).toBeGreaterThan(0);
        expect(entry.spa).toBeGreaterThan(0);
        expect(entry.spd).toBeGreaterThan(0);
        expect(entry.spe).toBeGreaterThan(0);
      }
    }
  });

  it('ensures no keys contain undefined, null, or empty string entries', async () => {
    const raw = await fs.readFile(OUTPUT_FILE, 'utf8');
    const db = JSON.parse(raw) as Record<string, unknown>;

    for (const [key, value] of Object.entries(db)) {
      expect(key.trim()).not.toBe('');
      expect(value).not.toBeNull();
      expect(value).not.toBeUndefined();
    }
  });
});
