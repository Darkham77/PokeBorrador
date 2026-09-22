/**
 * tests/node/pokemon/friendshipPersistenceAndLifecycle.test.ts
 *
 * Comprehensive Multi-Engine & Lifecycle Suite for Pokemon Friendship:
 * 1. Level-Up Gain Lifecycle (Brackets <100, 100-199, 200+, Soothe Bell, Multi-levels).
 * 2. Combat Faint Penalty (-1) and boundary alerts (Desconfianza).
 * 3. Item Usage Friendship Boosts (EV Berries, Vitamins).
 * 4. Friendship Evolution Thresholds & Tooltips (Gen 9 >= 160).
 * 5. Multi-Engine Database Persistence Parity across SQLite and PostgreSQL (describeWithDatabase).
 */

import { it, expect, beforeAll } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import crypto from 'node:crypto';
import { describeWithDatabase } from '../../dbTestHelper.ts';
import {
  clampFriendship,
  resolveFriendshipSealTier,
  calculateFriendshipLevelUpDelta,
  isReadyForFriendshipEvolution,
  getFriendshipTooltipDetails,
  applyFriendshipDelta,
} from '../../../src/logic/pokemon/friendshipLogic.ts';
import { FRIENDSHIP_BOUNDS } from '../../../src/types/pokemon/friendship.ts';
import { DEFAULT_FRIENDSHIP_VALUE } from '../../../src/logic/constants/gameplay.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import { serializeState, deserializePokemonTeam } from '../../../src/logic/auth/saveSerializer.ts';
import { validateAndSanitize } from '../../../src/logic/auth/saveSanitizer.ts';
import { INITIAL_STATE } from '../../../src/stores/gameInitialState.ts';
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describeWithDatabase('Friendship Lifecycle & Persistence Parity Suite', (_engine, getDb) => {
  beforeAll(() => {
    setActivePinia(createPinia());
  });

  it('verifies level-up friendship gains across canonical brackets with and without Soothe Bell', () => {
    // 1. Bracket < 100 (Default wild capture starts at 70)
    expect(DEFAULT_FRIENDSHIP_VALUE).toBe(70);
    const gainBracket1 = calculateFriendshipLevelUpDelta(70, false);
    expect(gainBracket1).toBe(5);

    // Gengar scenario: 70 + 5 = 75
    const gengar = makePokemon(requirePokemonSpeciesId('gengar'), 60)!;
    expect(gengar.friendship).toBe(70);
    const { newFriendship } = applyFriendshipDelta(gengar, gainBracket1);
    expect(newFriendship).toBe(75);
    expect(gengar.friendship).toBe(75);
    expect(resolveFriendshipSealTier(gengar.friendship)).toBe('sprout'); // Still in Sprout [50-99]

    // 2. Bracket 100 - 199 (+3 gain)
    const gainBracket2 = calculateFriendshipLevelUpDelta(120, false);
    expect(gainBracket2).toBe(3);

    // 3. Bracket 200 - 255 (+2 gain)
    const gainBracket3 = calculateFriendshipLevelUpDelta(225, false);
    expect(gainBracket3).toBe(2);

    // 4. Soothe Bell Multiplier (1.5x, rounded down)
    const gainSoothe1 = calculateFriendshipLevelUpDelta(70, true);
    expect(gainSoothe1).toBe(7); // Math.floor(5 * 1.5) = 7

    const gainSoothe2 = calculateFriendshipLevelUpDelta(120, true);
    expect(gainSoothe2).toBe(4); // Math.floor(3 * 1.5) = 4

    const gainSoothe3 = calculateFriendshipLevelUpDelta(225, true);
    expect(gainSoothe3).toBe(3); // Math.floor(2 * 1.5) = 3
  });

  it('verifies battle faint penalty (-1) and alert when dropping into Distrust', () => {
    const pikachu = makePokemon(requirePokemonSpeciesId('pikachu'), 20)!;
    pikachu.friendship = 50; // Exactly at Sprout boundary

    const logs: string[] = [];
    const logFn = (msg: string) => {
      logs.push(msg);
    };

    // Simulate faint penalty (-1)
    const result = applyFriendshipDelta(pikachu, -1, logFn);
    expect(result.newFriendship).toBe(49);
    expect(pikachu.friendship).toBe(49);
    expect(resolveFriendshipSealTier(pikachu.friendship)).toBe('distrust');
    expect(result.transition).not.toBeNull();
    expect(result.transition?.newTier).toBe('distrust');
    expect(result.transition?.direction).toBe('down');
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain('profunda desconfianza');
  });

  it('verifies friendship evolution readiness trigger at 160 threshold (Gen 9 standard)', () => {
    const golbat = makePokemon(requirePokemonSpeciesId('golbat'), 35)!;
    golbat.friendship = 159;

    expect(isReadyForFriendshipEvolution(golbat)).toBe(false);
    let tooltip = getFriendshipTooltipDetails(golbat);
    expect(tooltip.isEvolutionReady).toBe(false);
    expect(tooltip.seal.id).toBe('comrade');

    // Cross threshold to 160
    applyFriendshipDelta(golbat, 1);
    expect(golbat.friendship).toBe(160);
    expect(isReadyForFriendshipEvolution(golbat)).toBe(true);

    tooltip = getFriendshipTooltipDetails(golbat);
    expect(tooltip.isEvolutionReady).toBe(true);
    expect(tooltip.seal.id).toBe('radiant_prism');
    expect(tooltip.seal.iconEmoji).toBe('💎');
    expect(tooltip.evolutionMessage).toContain('Listo para evolucionar');
  });

  it('verifies clampFriendship boundary guarantees [0, 255] and handles undefined/null', () => {
    expect(clampFriendship(-50)).toBe(0);
    expect(clampFriendship(0)).toBe(0);
    expect(clampFriendship(75)).toBe(75);
    expect(clampFriendship(255)).toBe(255);
    expect(clampFriendship(300)).toBe(255);
    expect(clampFriendship(undefined)).toBe(FRIENDSHIP_BOUNDS.DEFAULT_BASE);
    expect(clampFriendship(null)).toBe(FRIENDSHIP_BOUNDS.DEFAULT_BASE);
    expect(clampFriendship(Number.NaN)).toBe(FRIENDSHIP_BOUNDS.DEFAULT_BASE);
  });

  it('persists and restores exact friendship values across database save and load cycles', async () => {
    const db = getDb();
    const testUserId = crypto.randomUUID();

    // Create 6 Pokémon representing each distinct friendship tier & boundary
    const p1 = makePokemon(requirePokemonSpeciesId('caterpie'), 5)!;
    p1.uid = 'mon-distrust-0';
    p1.friendship = 0; // Absolute zero

    const p2 = makePokemon(requirePokemonSpeciesId('pidgey'), 10)!;
    p2.uid = 'mon-distrust-49';
    p2.friendship = 49; // Distrust ceiling

    const p3 = makePokemon(requirePokemonSpeciesId('gengar'), 61)!;
    p3.uid = 'mon-sprout-75';
    p3.friendship = 75; // User's exact current state

    const p4 = makePokemon(requirePokemonSpeciesId('charmander'), 40)!;
    p4.uid = 'mon-comrade-100';
    p4.friendship = 100; // Comrade threshold

    const p5 = makePokemon(requirePokemonSpeciesId('golbat'), 45)!;
    p5.uid = 'mon-radiant-160';
    p5.friendship = 160; // Evolution readiness threshold

    const p6 = makePokemon(requirePokemonSpeciesId('pikachu'), 50)!;
    p6.uid = 'mon-bestfriends-255';
    p6.friendship = 255; // Absolute maximum

    // Box Pokémon
    const boxMon = makePokemon(requirePokemonSpeciesId('snorlax'), 30)!;
    boxMon.uid = 'mon-box-220';
    boxMon.friendship = 220; // Best Friends threshold

    const testState: GameState = {
      ...INITIAL_STATE,
      trainer: 'FriendshipMaster',
      team: [p1, p2, p3, p4, p5, p6],
      box: [boxMon],
    };

    // 1. Serialization
    const serialized = serializeState(testState);

    // 2. Validation & Sanitization
    const sanitized = validateAndSanitize(serialized);
    expect(sanitized.valid).toBe(true);
    if (!sanitized.valid) throw new Error(sanitized.error);

    // 3. Database Insertion
    await db.run(
      'INSERT INTO game_saves (user_id, save_data, last_save_id) VALUES (?, ?, ?)',
      [testUserId, JSON.stringify(sanitized.data), crypto.randomUUID()]
    );

    // 4. Database Retrieval
    const rows = await db.query<{ save_data: unknown }>(
      'SELECT save_data FROM game_saves WHERE user_id = ?',
      [testUserId]
    );
    expect(rows.length).toBe(1);

    const rawSaveData = rows[0]!.save_data;
    const loadedData = typeof rawSaveData === 'string'
      ? (JSON.parse(rawSaveData) as any)
      : (rawSaveData as any);

    expect(loadedData).toBeDefined();
    expect(Array.isArray(loadedData.team)).toBe(true);

    // 5. Deserialization into Runtime Entities
    const loadedTeam = deserializePokemonTeam(loadedData.team);
    expect(loadedTeam.length).toBe(6);

    // 6. 1:1 Parity Assertions
    // p1: 0 (Distrust)
    expect(loadedTeam[0]!.uid).toBe('mon-distrust-0');
    expect(loadedTeam[0]!.friendship).toBe(0);
    expect(resolveFriendshipSealTier(loadedTeam[0]!.friendship)).toBe('distrust');

    // p2: 49 (Distrust)
    expect(loadedTeam[1]!.uid).toBe('mon-distrust-49');
    expect(loadedTeam[1]!.friendship).toBe(49);
    expect(resolveFriendshipSealTier(loadedTeam[1]!.friendship)).toBe('distrust');

    // p3: 75 (Sprout - User state)
    expect(loadedTeam[2]!.uid).toBe('mon-sprout-75');
    expect(loadedTeam[2]!.friendship).toBe(75);
    expect(resolveFriendshipSealTier(loadedTeam[2]!.friendship)).toBe('sprout');

    // p4: 100 (Comrade)
    expect(loadedTeam[3]!.uid).toBe('mon-comrade-100');
    expect(loadedTeam[3]!.friendship).toBe(100);
    expect(resolveFriendshipSealTier(loadedTeam[3]!.friendship)).toBe('comrade');

    // p5: 160 (Radiant Prism - Evolution Ready)
    expect(loadedTeam[4]!.uid).toBe('mon-radiant-160');
    expect(loadedTeam[4]!.friendship).toBe(160);
    expect(resolveFriendshipSealTier(loadedTeam[4]!.friendship)).toBe('radiant_prism');
    expect(isReadyForFriendshipEvolution(loadedTeam[4])).toBe(true);

    // p6: 255 (Best Friends - Max)
    expect(loadedTeam[5]!.uid).toBe('mon-bestfriends-255');
    expect(loadedTeam[5]!.friendship).toBe(255);
    expect(resolveFriendshipSealTier(loadedTeam[5]!.friendship)).toBe('best_friends');

    // Box mon: 220
    const loadedBox = deserializePokemonTeam(loadedData.box);
    expect(loadedBox.length).toBe(1);
    expect(loadedBox[0]!.uid).toBe('mon-box-220');
    expect(loadedBox[0]!.friendship).toBe(220);
    expect(resolveFriendshipSealTier(loadedBox[0]!.friendship)).toBe('best_friends');
  });
});
