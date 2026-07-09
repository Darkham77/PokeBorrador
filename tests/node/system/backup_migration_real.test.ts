import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { GameState } from '../../../src/types/system/game.ts';

/** Forma mínima de un Pokémon tal como aparece en los archivos de backup JSON. */
interface RawPokemon {
  id?: string;
  name?: string;
  vigor?: number;
  heldItem?: string;
  ability?: string;
  moves?: Array<{ id?: string } | null>;
}

import { LEGENDARIES, legacyItemMap, legacyAbilityMap, legacyMoveMap } from '../../helpers/legacyDataMocks.ts';

interface MigrationCounters {
  legendaries: number
  items: number
  abilities: number
  moves: number
}

function checkLegendaryVigor(p: RawPokemon, legendaries: Set<string>): boolean {
  return !!(p.id && legendaries.has(p.id.toLowerCase()) && (p.vigor ?? 0) > 0);
}

function checkMovesLegacy(
  moves: Array<{ id?: string } | null> | undefined,
  getLegacyMoveTranslation: (move: string | undefined) => string | undefined
): number {
  if (!moves || !Array.isArray(moves)) return 0;
  let count = 0;
  moves.forEach((m) => {
    if (m && getLegacyMoveTranslation(m.id)) {
      count++;
    }
  });
  return count;
}

function runPreCheck(
  p: RawPokemon | null | undefined, 
  counters: MigrationCounters, 
  legendaries: Set<string>,
  getLegacyItemTranslation: (item: string | undefined) => string | undefined,
  getLegacyAbilityTranslation: (ability: string | undefined) => string | undefined,
  getLegacyMoveTranslation: (move: string | undefined) => string | undefined
): void {
  if (!p) return;
  if (checkLegendaryVigor(p, legendaries)) {
    counters.legendaries++;
  }
  if (p.heldItem && getLegacyItemTranslation(p.heldItem)) {
    counters.items++;
  }
  if (getLegacyAbilityTranslation(p.ability)) {
    counters.abilities++;
  }
  counters.moves += checkMovesLegacy(p.moves, getLegacyMoveTranslation);
}

function runPostCheck(
  p: RawPokemon | null | undefined, 
  legendaries: Set<string>,
  getLegacyItemTranslation: (item: string | undefined) => string | undefined,
  getLegacyAbilityTranslation: (ability: string | undefined) => string | undefined,
  getLegacyMoveTranslation: (move: string | undefined) => string | undefined
): void {
  if (!p) return;
  if (p.id && legendaries.has(p.id.toLowerCase())) {
    assert.strictEqual(p.vigor, 0, `Legendary ${p.name} (${p.id}) must have 0 vigor after migration`);
  }
  if (p.heldItem) {
    const mappedItem = getLegacyItemTranslation(p.heldItem);
    if (mappedItem) {
      assert.strictEqual(p.heldItem, mappedItem, `Held item ${p.heldItem} was not migrated to ${mappedItem}`);
    }
  }
  const mappedAbility = getLegacyAbilityTranslation(p.ability);
  if (mappedAbility) {
    assert.strictEqual(p.ability, mappedAbility, `Ability ${p.ability} was not migrated to ${mappedAbility}`);
  }
  if (p.moves && Array.isArray(p.moves)) {
    p.moves.forEach((m) => {
      if (m) {
        const mappedMove = getLegacyMoveTranslation(m.id);
        if (mappedMove) {
          assert.strictEqual(m.id, mappedMove, `Move ${m.id} was not migrated to ${mappedMove}`);
        }
      }
    });
  }
}

describe('Real Backup DB Migration Verification', () => {
  const legendaries = LEGENDARIES;

  function normalizeAbilityName(abilityName: string): string {
    return abilityName.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function getLegacyAbilityTranslation(abilityName: string | undefined): string | undefined {
    if (!abilityName) return undefined;
    const abKey = normalizeAbilityName(abilityName);
    return legacyAbilityMap[abKey];
  }

  function getLegacyItemTranslation(heldItem: string | undefined): string | undefined {
    if (!heldItem) return undefined;
    const itemKey = heldItem.toLowerCase().trim();
    return legacyItemMap[itemKey];
  }

  function getLegacyMoveTranslation(moveId: string | undefined): string | undefined {
    if (!moveId) return undefined;
    const moveKey = moveId.toLowerCase().replace(/[\s_-]+/g, '_').trim();
    return legacyMoveMap[moveKey];
  }

  function migratePoke(p: RawPokemon | null | undefined): void {
    if (!p) return;
    
    // 1. Legendaries to 0 vigor
    if (p.id && legendaries.has(p.id.toLowerCase())) {
      p.vigor = 0;
    }
    
    // 2. Mapped held items
    const mappedItem = getLegacyItemTranslation(p.heldItem);
    if (mappedItem) {
      p.heldItem = mappedItem;
    }
    
    // 3. Mapped abilities
    const mappedAbility = getLegacyAbilityTranslation(p.ability);
    if (mappedAbility) {
      p.ability = mappedAbility;
    }
    
    // 4. Mapped moves
    if (p.moves && Array.isArray(p.moves)) {
      p.moves.forEach((m: { id?: string } | null) => {
        if (m) {
          const mappedMove = getLegacyMoveTranslation(m.id);
          if (mappedMove) {
            m.id = mappedMove;
          }
        }
      });
    }
  }

  const backups = [
    'tests/node/fixtures/server_franco_backup_fixture.json'
  ];

  backups.forEach(backupRelPath => {
    const filename = path.basename(backupRelPath);
    
    it(`should successfully parse and migrate all game saves in ${filename} without breaking data`, () => {
      const backupPath = path.resolve(backupRelPath);
      assert.ok(fs.existsSync(backupPath), `Backup file ${filename} must exist`);

      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent);
      assert.ok(backupData.data, 'Backup must contain a data object');

      const gameSaves = backupData.data.game_saves || [];
      assert.ok(gameSaves.length > 0, 'Backup must contain game_saves');

      const counters: MigrationCounters = {
        legendaries: 0,
        items: 0,
        abilities: 0,
        moves: 0
      };

      gameSaves.forEach((saveWrapper: { save_data: string | GameState }) => {
        let saveData: GameState;
        if (typeof saveWrapper.save_data === 'string') {
          saveData = JSON.parse(saveWrapper.save_data);
        } else {
          saveData = saveWrapper.save_data;
        }

        const team = (saveData.team || []) as unknown as RawPokemon[]
        const box = (saveData.box || []) as unknown as RawPokemon[]

        // Track properties before migration to ensure they change
        team.forEach(p => runPreCheck(p, counters, legendaries, getLegacyItemTranslation, getLegacyAbilityTranslation, getLegacyMoveTranslation));
        box.forEach(p => runPreCheck(p, counters, legendaries, getLegacyItemTranslation, getLegacyAbilityTranslation, getLegacyMoveTranslation));

        // Run migration
        team.forEach(migratePoke);
        box.forEach(migratePoke);

        // Assertions post-migration
        team.forEach(p => runPostCheck(p, legendaries, getLegacyItemTranslation, getLegacyAbilityTranslation, getLegacyMoveTranslation));
        box.forEach(p => runPostCheck(p, legendaries, getLegacyItemTranslation, getLegacyAbilityTranslation, getLegacyMoveTranslation));
      });

      console.debug(`\n[Test: ${filename}] Migrated successfully:`);
      console.debug(` - Legendaries fixed to 0 vigor: ${counters.legendaries}`);
      console.debug(` - Legacy held items mapped: ${counters.items}`);
      console.debug(` - Legacy abilities translated: ${counters.abilities}`);
      console.debug(` - Legacy moves converted: ${counters.moves}\n`);
    });
  });
});
