/**
 * tests/node/player/classDeploymentPersistence.test.ts
 *
 * Tier 1 Isolated Unit / Parity Test for Class Deployment (activeMission) Persistence.
 * Verifies that active deployment data survives serializeState, validateAndSanitize,
 * and database roundtrip persistence across all active database engines.
 */

import { describe, it, expect } from 'vitest';
import { describeWithDatabase } from '../../dbTestHelper.ts';
import { serializeState } from '@/logic/auth/saveSerializer.ts';
import { validateAndSanitize } from '@/logic/auth/saveSanitizer.ts';
import { INITIAL_STATE } from '@/stores/gameInitialState.ts';
import type { GameState } from '@/types/system/game.ts';
import { makePokemon } from '@/logic/pokemon/pokemonFactory.ts';
import { healStuckMissions } from '@/logic/player/missionRecovery.ts';

describe('Class Deployment Persistence - Serialization & Sanitization (RED -> GREEN)', () => {
  it('preserves activeMission when serializing and validating SaveData', () => {
    const ekans = makePokemon('ekans', 15)!;
    ekans.uid = 'sacrifice-ekans-uid';
    ekans.onMission = true;

    const missionEndsAt = 1780021600000;
    const missionStartedAt = 1780000000000;

    const state: GameState = {
      ...INITIAL_STATE,
      playerClass: 'rocket',
      classLevel: 1,
      classXP: 50,
      money: 5000,
      team: [makePokemon('pikachu', 20)!],
      box: [ekans],
      classData: {
        ...INITIAL_STATE.classData,
        blackMarketSales: 10,
        criminality: 5,
        activeMission: {
          id: 'mission_6h',
          startedAt: missionStartedAt,
          endsAt: missionEndsAt,
          targetPokemonUid: ekans.uid,
          targetPokemonIdx: 0,
          projectedReward: 25000
        }
      }
    };

    // 1. serializeState must output activeMission
    const serialized = serializeState(state);
    expect(serialized.classData).toBeDefined();
    expect((serialized.classData as any).activeMission).toBeDefined();
    expect((serialized.classData as any).activeMission).not.toBeNull();
    expect((serialized.classData as any).activeMission?.id).toBe('mission_6h');
    expect((serialized.classData as any).activeMission?.endsAt).toBe(missionEndsAt);
    expect((serialized.classData as any).activeMission?.targetPokemonUid).toBe(ekans.uid);

    // 2. validateAndSanitize must NOT strip activeMission
    const validation = validateAndSanitize(serialized);
    expect(validation.valid).toBe(true);
    if (!validation.valid) throw new Error(validation.error);

    const sanitizedMission = (validation.data.classData as any).activeMission;
    expect(sanitizedMission).toBeDefined();
    expect(sanitizedMission).not.toBeNull();
    expect(sanitizedMission?.id).toBe('mission_6h');
    expect(sanitizedMission?.endsAt).toBe(missionEndsAt);
    expect(sanitizedMission?.targetPokemonUid).toBe(ekans.uid);
    expect(sanitizedMission?.projectedReward).toBe(25000);

    // 3. healStuckMissions must NOT unmark pokemon because activeMission is recognized
    const fixedAny = healStuckMissions(validation.data.team as any, validation.data.box as any, sanitizedMission);
    expect(fixedAny).toBe(false);
    expect((validation.data.box[0] as any)?.onMission).toBe(true);
  });
});

describeWithDatabase('Class Deployment Persistence - Multi-Engine Database Parity', (_engine, getDb) => {
  it('persists and restores activeMission across database save and load cycles', async () => {
    const db = getDb();
    const testUserId = crypto.randomUUID();

    const ekans = makePokemon('ekans', 15)!;
    ekans.uid = 'sacrifice-ekans-db-uid';
    ekans.onMission = true;

    const missionEndsAt = 1780021600000;
    const missionStartedAt = 1780000000000;

    const testState: GameState = {
      ...INITIAL_STATE,
      trainer: 'TestDeployer',
      playerClass: 'rocket',
      classLevel: 5,
      classXP: 500,
      team: [makePokemon('pikachu', 25)!],
      box: [ekans],
      classData: {
        ...INITIAL_STATE.classData,
        blackMarketSales: 15,
        criminality: 25,
        activeMission: {
          id: 'mission_12h',
          startedAt: missionStartedAt,
          endsAt: missionEndsAt,
          targetPokemonUid: ekans.uid,
          projectedReward: 45000
        }
      }
    };

    const serialized = serializeState(testState);
    const sanitized = validateAndSanitize(serialized);
    expect(sanitized.valid).toBe(true);
    if (!sanitized.valid) throw new Error(sanitized.error);

    // Save to DB
    await db.run(
      'INSERT INTO game_saves (user_id, save_data, last_save_id) VALUES (?, ?, ?)',
      [testUserId, JSON.stringify(sanitized.data), crypto.randomUUID()]
    );

    // Load from DB
    const rows = await db.query<{ save_data: unknown }>(
      'SELECT save_data FROM game_saves WHERE user_id = ?',
      [testUserId]
    );
    expect(rows.length).toBe(1);
    const loadedData = typeof rows[0]!.save_data === 'string'
      ? (JSON.parse(rows[0]!.save_data as string) as any)
      : (rows[0]!.save_data as any);

    expect(loadedData).toBeDefined();
    expect(loadedData?.classData).toBeDefined();
    expect(loadedData?.classData?.activeMission).toBeDefined();
    expect(loadedData?.classData?.activeMission).not.toBeNull();
    expect(loadedData?.classData?.activeMission?.id).toBe('mission_12h');
    expect(loadedData?.classData?.activeMission?.endsAt).toBe(missionEndsAt);
    expect(loadedData?.classData?.activeMission?.targetPokemonUid).toBe(ekans.uid);
  });
});
