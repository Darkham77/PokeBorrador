import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';

import { runBatteryOfDiagnostics, testInMemoryMigrations } from '../../../scripts/maintenance/diagnose_account.ts';
import type { GameState } from '@/types/system/game';
import { INITIAL_STATE } from '@/stores/gameInitialState';
import { serializeState } from '@/logic/auth/saveSerializer';
import { validateSaveData } from '@/logic/validation/schemas';
import { mulberry32, hashString } from '@/logic/utils/math';
import { resolveNpcSprite, type NpcSpriteId } from '@/logic/utils/npcSpriteRouter';
import { VALID_NPC_SPRITES } from '@/data/pokemon/npcSpriteCatalog';
import { serializeState as serializeStateService } from '@/logic/auth/saveService';
import { canSaveState } from '@/stores/game/actions/saveActionHelpers';
import { ShowdownBattleRunner } from '@/logic/battle/helpers/showdownBattleRunner';

describe('System Utilities & Save Services Domain Suite', () => {
  describe('Diagnose Account Tool', () => {
    const backupRelPath = 'database/backups/server_franco/server_franco_backup_2026-06-27T05-06-25-158315918Z.json';
    const backupPath = path.resolve(backupRelPath);
    assert.ok(fs.existsSync(backupPath), `Backup file must exist at ${backupRelPath}`);

    const backupContent = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(backupContent);
    const profiles: Array<{ id: string; email?: string; username?: string }> = backupData.data.profiles || [];
    const gameSaves: Array<{ user_id?: string; save_data: string | GameState }> = backupData.data.game_saves || [];

    it('should diagnose kenviota account from recent backup and verify migration fix', () => {
      const kenProfile = profiles.find((p: { email?: string }) => p.email === 'kenviota@gmail.com');
      assert.ok(kenProfile, 'Must find kenviota profile');

      const kenSaveRow = gameSaves.find((s: { user_id?: string }) => s.user_id === kenProfile.id);
      assert.ok(kenSaveRow, 'Must find kenviota save row');

      const rawSave: GameState = typeof kenSaveRow.save_data === 'string' ? JSON.parse(kenSaveRow.save_data) : kenSaveRow.save_data;

      const initialFindings = runBatteryOfDiagnostics(rawSave);
      const errors = initialFindings.filter(f => f.severity === 'error');
      assert.ok(errors.length > 0, 'Must find critical errors in legacy unmigrated save');

      const migSim = testInMemoryMigrations(rawSave, kenProfile.id);
      assert.strictEqual(migSim.success, true, 'Migration simulation must successfully resolve all critical errors');
      assert.ok(migSim.fixedCount > 0, 'Must fix errors');
      assert.strictEqual(migSim.remainingFindings.filter(f => f.severity === 'error').length, 0, 'Must have 0 remaining critical errors');
    });

    it('should diagnose oucae account and verify egg IDs and negative inventory fix', () => {
      const oucaeProfile = profiles.find((p: { username?: string }) => p.username === 'oucae');
      assert.ok(oucaeProfile, 'Must find oucae profile');

      const oucaeSaveRow = gameSaves.find((s: { user_id?: string }) => s.user_id === oucaeProfile.id);
      assert.ok(oucaeSaveRow, 'Must find oucae save row');

      const rawSave: GameState = typeof oucaeSaveRow.save_data === 'string' ? JSON.parse(oucaeSaveRow.save_data) : oucaeSaveRow.save_data;

      const initialFindings = runBatteryOfDiagnostics(rawSave);
      const errors = initialFindings.filter(f => f.severity === 'error');
      assert.ok(errors.length > 0, 'Must find critical errors in oucae save');

      const migSim = testInMemoryMigrations(rawSave, oucaeProfile.id);
      assert.strictEqual(migSim.success, true, 'Migration simulation must successfully resolve all critical errors for oucae');
      assert.strictEqual(migSim.remainingFindings.filter(f => f.severity === 'error').length, 0, 'Must have 0 remaining critical errors');
    });
  });

  describe('Initial Game State Save Validation Parity', () => {
    it('serializes INITIAL_STATE into a payload that passes validateSaveData cleanly', () => {
      const rawState = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
      rawState.trainer = 'TestTrainer';
      rawState.starterChosen = true;

      const serialized = serializeState(rawState);
      const res = validateSaveData(serialized);

      assert.strictEqual(
        res.success,
        true,
        `Validation failed: ${JSON.stringify(res.issues)}`
      );
    });
  });

  describe('Global Math Utilities (math.ts)', () => {
    describe('mulberry32 PRNG', () => {
      it('debe generar valores deterministas a partir de la misma semilla', () => {
        const prng1 = mulberry32(54321);
        const prng2 = mulberry32(54321);
        assert.strictEqual(prng1(), prng2());
        assert.strictEqual(prng1(), prng2());
      });

      it('debe generar valores dentro del rango [0, 1)', () => {
        const prng = mulberry32(10101);
        for (let i = 0; i < 100; i++) {
          const val = prng();
          assert.ok(val >= 0 && val < 1, `Valor fuera de rango: ${val}`);
        }
      });

      it('semillas diferentes deben producir secuencias diferentes', () => {
        const prng1 = mulberry32(111);
        const prng2 = mulberry32(222);
        assert.notStrictEqual(prng1(), prng2());
      });
    });

    describe('hashString DJB2', () => {
      it('debe ser determinista para la misma cadena', () => {
        assert.strictEqual(hashString('pallet_town'), hashString('pallet_town'));
      });

      it('cadenas diferentes deben producir hashes diferentes', () => {
        assert.notStrictEqual(hashString('route1'), hashString('route2'));
      });

      it('debe devolver un número entero sin signo de 32 bits', () => {
        const hash = hashString('viridian_forest');
        assert.ok(hash >= 0 && hash <= 4294967295, `Hash fuera de rango 32-bit: ${hash}`);
      });
    });
  });

  describe('npcSpriteRouter strict validation', () => {
    it('should resolve valid catalog sprites without error', () => {
      const sprite = resolveNpcSprite('youngster');
      assert.equal(sprite, 'youngster');
      assert.ok(VALID_NPC_SPRITES.includes('youngster'));
    });

    it('should throw an explicit Error when an invalid sprite identifier is passed', () => {
      assert.throws(() => {
        resolveNpcSprite('Simulador E2E' as NpcSpriteId);
      }, /Invalid NPC sprite identifier: 'Simulador E2E'/);
    });
  });

  describe('Router Chunk Error Detection', () => {
    it('should identify "Couldn\'t resolve component" as a chunk reload error', () => {
      const isChunkError = (message: string): boolean => {
        const chunkErrorRegex = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk|Couldn't resolve component/i;
        return chunkErrorRegex.test(message);
      };

      const error1 = 'Couldn\'t resolve component "default" at "/login"';
      const error2 = 'Failed to fetch dynamically imported module: https://example.com/assets/LoginView-123.js';
      const error3 = 'TypeError: Cannot read properties of undefined';

      expect(isChunkError(error1)).toBe(true);
      expect(isChunkError(error2)).toBe(true);
      expect(isChunkError(error3)).toBe(false);
    });
  });

  describe('saveService serialization integrity', () => {
    it('serializes active battle without ReferenceError for requireAbilityId', () => {
      const mockState: any = {
        trainer: { name: 'Ash', level: 1 },
        team: [{ uid: '1', id: 'pikachu', name: 'Pikachu', hp: 100, maxHp: 100, ability: 'static' }],
        box: [],
        starterChosen: true,
        activeBattle: {
          isTrainer: true,
          over: false,
          enemyTeam: [{ uid: '2', id: 'mew', name: 'Mew', hp: 100, maxHp: 100, ability: 'synchronize', moves: [] }],
        },
      };

      assert.doesNotThrow(() => {
        serializeStateService(mockState);
      });
    });
  });

  describe('saveActionHelpers - canSaveState shield restrictions', () => {
    const baseState = {
      team: [{ id: 'p1' }],
      box: [],
      starterChosen: true,
    } as unknown as GameState;

    it('should block saving when pokemon count is 0', () => {
      const state = {
        ...baseState,
        team: [],
        box: [],
        starterChosen: true,
      } as unknown as GameState;

      const result = canSaveState(state, () => false);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Cannot save with 0 Pokémon or unchosen starter');
    });

    it('should block saving when starterChosen is false', () => {
      const state = {
        ...baseState,
        team: [{ id: 'p1' }],
        box: [],
        starterChosen: false,
      } as unknown as GameState;

      const result = canSaveState(state, () => false);
      expect(result.allowed).toBe(false);
      expect(result.error).toBe('Cannot save with 0 Pokémon or unchosen starter');
    });

    it('should block saving when evolution or move learning modal is open', () => {
      const resultEvo = canSaveState(baseState, (name) => name === 'Evolution');
      expect(resultEvo.allowed).toBe(false);
      expect(resultEvo.error).toBe('Cannot save during evolution or move learning');

      const resultMove = canSaveState(baseState, (name) => name === 'MoveLearning');
      expect(resultMove.allowed).toBe(false);
      expect(resultMove.error).toBe('Cannot save during evolution or move learning');
    });

    it('should allow saving when state is valid and no modal is blocking', () => {
      const result = canSaveState(baseState, () => false);
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('ShowdownBattleRunner: History Cursor & Boundary Conditions', () => {
    it('returns null from requirePendingHistoryEntry when historyIndex equals history.length (exhausted)', () => {
      const mockDebug = {
        history: [
          { p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 }
        ],
        replayHistoryIdx: 1,
        certifiedReplayWorkerEnded: true
      };

      const entry = ShowdownBattleRunner.requirePendingHistoryEntry(mockDebug);
      assert.strictEqual(entry, null);
    });

    it('marks certifiedReplayWorkerEnded when advancing cursor past the last history entry', () => {
      const mockDebug = {
        history: [
          { p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1 }
        ],
        replayHistoryIdx: 0,
        p1ChoiceIdx: 0,
        p2ChoiceIdx: 0,
        certifiedReplayWorkerEnded: false
      };

      ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(mockDebug);
      assert.strictEqual(mockDebug.replayHistoryIdx, 1);
      assert.strictEqual(mockDebug.certifiedReplayWorkerEnded, true);
    });
  });
});
