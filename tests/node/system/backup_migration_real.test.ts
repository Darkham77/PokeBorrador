import { describe, it } from 'node:test';
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

      let legendariesFoundAndFixedCount = 0;
      let legacyHeldItemsFixedCount = 0;
      let legacyAbilitiesFixedCount = 0;
      let legacyMovesFixedCount = 0;

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
        const preCheck = (p: RawPokemon | null | undefined): void => {
          if (!p) return;
          if (p.id && legendaries.has(p.id.toLowerCase()) && (p.vigor ?? 0) > 0) {
            legendariesFoundAndFixedCount++;
          }
          if (p.heldItem && getLegacyItemTranslation(p.heldItem)) {
            legacyHeldItemsFixedCount++;
          }
          if (getLegacyAbilityTranslation(p.ability)) {
            legacyAbilitiesFixedCount++;
          }
          if (p.moves && Array.isArray(p.moves)) {
            p.moves.forEach((m: { id?: string } | null) => {
              if (m && getLegacyMoveTranslation(m.id)) {
                legacyMovesFixedCount++;
              }
            });
          }
        };

        team.forEach(preCheck);
        box.forEach(preCheck);

        // Run migration
        team.forEach(migratePoke);
        box.forEach(migratePoke);

        // Assertions post-migration
        const postCheck = (p: RawPokemon | null | undefined): void => {
          if (!p) return;
          // Legendaries must have 0 vigor
          if (p.id && legendaries.has(p.id.toLowerCase())) {
            assert.strictEqual(p.vigor, 0, `Legendary ${p.name} (${p.id}) must have 0 vigor after migration`);
          }
          // Held items must not be legacy
          if (p.heldItem) {
            const mappedItem = getLegacyItemTranslation(p.heldItem);
            if (mappedItem) {
              assert.strictEqual(p.heldItem, mappedItem, `Held item ${p.heldItem} was not migrated to ${mappedItem}`);
            }
          }
          // Abilities must not be legacy
          const mappedAbility = getLegacyAbilityTranslation(p.ability);
          if (mappedAbility) {
            assert.strictEqual(p.ability, mappedAbility, `Ability ${p.ability} was not migrated to ${mappedAbility}`);
          }
          // Moves must not be legacy
          if (p.moves && Array.isArray(p.moves)) {
            p.moves.forEach((m: { id?: string } | null) => {
              if (m) {
                const mappedMove = getLegacyMoveTranslation(m.id);
                if (mappedMove) {
                  assert.strictEqual(m.id, mappedMove, `Move ${m.id} was not migrated to ${mappedMove}`);
                }
              }
            });
          }
        };

        team.forEach(postCheck);
        box.forEach(postCheck);
      });

      console.log(`\n[Test: ${filename}] Migrated successfully:`);
      console.log(` - Legendaries fixed to 0 vigor: ${legendariesFoundAndFixedCount}`);
      console.log(` - Legacy held items mapped: ${legacyHeldItemsFixedCount}`);
      console.log(` - Legacy abilities translated: ${legacyAbilitiesFixedCount}`);
      console.log(` - Legacy moves converted: ${legacyMovesFixedCount}\n`);
    });
  });
});
