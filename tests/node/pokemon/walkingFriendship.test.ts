/**
 * tests/node/pokemon/walkingFriendship.test.ts
 *
 * Tier 1 Unit & Tier 2 Integration Tests for Canonical Walking Friendship System:
 * 1. 128-step cycle accumulation & canonical 50% probability roll.
 * 2. Friendship gain (+1 base, +2 with Soothe Bell).
 * 3. Per-Pokémon step accumulation: each Pokémon carries its own persistent `friendshipSteps`.
 * 4. Priority lead walking companion & cascading past fainted, eggs, or maxed members.
 * 5. Toast notification integration ('❤️').
 * 6. Breeding store reduceHatchTimers coordination (0 eggs vs eggs present).
 * 7. Dual-engine persistence parity across SQLite and PostgreSQL (describeWithDatabase).
 */

import { it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import crypto from 'node:crypto';
import { describeWithDatabase } from '../../dbTestHelper.ts';
import {
  FRIENDSHIP_WALK_CONSTANTS,
  calculateWalkingFriendshipGain,
  resolveWalkingFriendshipRecipient,
  processWalkingFriendshipStepAccumulation,
} from '../../../src/logic/pokemon/friendshipLogic.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import { requirePokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';
import { useGameStore } from '../../../src/stores/game.ts';
import { useBreedingStore } from '../../../src/stores/breeding.ts';
import { useNotificationStore } from '../../../src/stores/notifications.ts';
import { serializeState, deserializePokemonTeam } from '../../../src/logic/auth/saveSerializer.ts';
import { validateAndSanitize } from '../../../src/logic/auth/saveSanitizer.ts';
import { INITIAL_STATE } from '../../../src/stores/gameInitialState.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describeWithDatabase('Walking Friendship Canonical System Suite', (_engine, getDb) => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('adheres strictly to canonical Game Freak constants (128 steps, 50% chance, +1 gain, +1 Soothe Bell)', () => {
    expect(FRIENDSHIP_WALK_CONSTANTS.CYCLE_STEPS).toBe(128);
    expect(FRIENDSHIP_WALK_CONSTANTS.SUCCESS_PROBABILITY).toBe(0.5);
    expect(FRIENDSHIP_WALK_CONSTANTS.BASE_GAIN).toBe(1);
    expect(FRIENDSHIP_WALK_CONSTANTS.SOOTHE_BELL_BONUS).toBe(1);
  });

  it('calculates walking friendship gain (+1 base, +2 with Soothe Bell)', () => {
    const pikachu = makePokemon(requirePokemonSpeciesId('pikachu'), 10)!;
    pikachu.heldItem = null;
    expect(calculateWalkingFriendshipGain(pikachu)).toBe(1);

    pikachu.heldItem = 'soothebell';
    expect(calculateWalkingFriendshipGain(pikachu)).toBe(2);
  });

  it('resolves walking companion: prioritizes conscious lead and cascades past fainted, eggs, or maxed', () => {
    const lead = makePokemon(requirePokemonSpeciesId('pikachu'), 10)!;
    const second = makePokemon(requirePokemonSpeciesId('charmander'), 10)!;
    const third = makePokemon(requirePokemonSpeciesId('bulbasaur'), 10)!;

    lead.friendship = 70;
    second.friendship = 70;
    third.friendship = 70;

    // 1. Healthy lead gets priority
    expect(resolveWalkingFriendshipRecipient([lead, second, third])?.uid).toBe(lead.uid);

    // 2. Lead is fainted -> cascades to second
    lead.hp = 0;
    lead.fainted = true;
    expect(resolveWalkingFriendshipRecipient([lead, second, third])?.uid).toBe(second.uid);

    // 3. Lead is an egg -> cascades to second
    lead.hp = 50;
    lead.fainted = false;
    lead.isEgg = true;
    expect(resolveWalkingFriendshipRecipient([lead, second, third])?.uid).toBe(second.uid);

    // 4. Lead is at max friendship (255) -> cascades to second
    lead.isEgg = false;
    lead.friendship = 255;
    expect(resolveWalkingFriendshipRecipient([lead, second, third])?.uid).toBe(second.uid);

    // 5. All eligible members maxed -> returns null
    second.friendship = 255;
    third.friendship = 255;
    expect(resolveWalkingFriendshipRecipient([lead, second, third])).toBeNull();
  });

  it('stores friendship steps per Pokemon independently, preserving counters when swapping team members', () => {
    const pikachu = makePokemon(requirePokemonSpeciesId('pikachu'), 10)!;
    const charmander = makePokemon(requirePokemonSpeciesId('charmander'), 10)!;
    pikachu.friendship = 70;
    pikachu.friendshipSteps = 0;
    charmander.friendship = 70;
    charmander.friendshipSteps = 0;

    // Team starts with Pikachu as lead
    const team: Pokemon[] = [pikachu, charmander];

    // Walk 50 steps: Pikachu accumulates 50 steps, Charmander remains at 0
    processWalkingFriendshipStepAccumulation({
      team,
      addedSteps: 50,
      rollFn: () => 0.1,
    });
    expect(pikachu.friendshipSteps).toBe(50);
    expect(charmander.friendshipSteps).toBe(0);

    // Swap team members: Charmander is now lead
    team[0] = charmander;
    team[1] = pikachu;

    // Walk 30 steps: Charmander accumulates 30 steps, Pikachu still retains its 50 steps
    processWalkingFriendshipStepAccumulation({
      team,
      addedSteps: 30,
      rollFn: () => 0.1,
    });
    expect(charmander.friendshipSteps).toBe(30);
    expect(pikachu.friendshipSteps).toBe(50);

    // Swap back: Pikachu is lead again
    team[0] = pikachu;
    team[1] = charmander;

    // Walk 78 steps: Pikachu had 50 + 78 = 128 steps (exact cycle reached!)
    // Mock roll passes (< 0.5) -> Pikachu gains friendship, its counter resets to 0
    // Charmander retains its 30 steps untouched!
    const res = processWalkingFriendshipStepAccumulation({
      team,
      addedSteps: 78,
      rollFn: () => 0.2, // Passes 50% roll
    });
    expect(res.rewardedPokemon?.uid).toBe(pikachu.uid);
    expect(pikachu.friendship).toBe(71);
    expect(pikachu.friendshipSteps).toBe(0);
    expect(charmander.friendshipSteps).toBe(30);
  });

  it('accumulates steps and triggers roll deterministically at 128-step boundary with toast notification', () => {
    const lead = makePokemon(requirePokemonSpeciesId('eevee'), 10)!;
    lead.friendship = 70;
    lead.friendshipSteps = 0;
    const team: Pokemon[] = [lead];

    const notifications: Array<{ msg: string; icon?: string }> = [];
    const notifyFn = (msg: string, icon?: string) => {
      notifications.push({ msg, icon });
    };

    // Sub-threshold: 100 steps -> no roll, friendship unchanged
    const res1 = processWalkingFriendshipStepAccumulation({
      team,
      addedSteps: 100,
      notifyFn,
      rollFn: () => 0.1, // Would pass, but threshold not reached
    });

    expect(res1.remainingSteps).toBe(100);
    expect(lead.friendshipSteps).toBe(100);
    expect(res1.rewardedPokemon).toBeNull();
    expect(lead.friendship).toBe(70);
    expect(notifications.length).toBe(0);

    // Threshold reached: 100 + 28 = 128 steps, roll fails (0.6 >= 0.5)
    const res2 = processWalkingFriendshipStepAccumulation({
      team,
      addedSteps: 28,
      notifyFn,
      rollFn: () => 0.6, // Fails 50% check
    });

    expect(res2.remainingSteps).toBe(0);
    expect(lead.friendshipSteps).toBe(0);
    expect(res2.rewardedPokemon).toBeNull();
    expect(lead.friendship).toBe(70);
    expect(notifications.length).toBe(0);

    // Threshold reached again: 130 steps = 1 cycle + 2 leftover, roll succeeds (0.2 < 0.5)
    const res3 = processWalkingFriendshipStepAccumulation({
      team,
      addedSteps: 130,
      notifyFn,
      rollFn: () => 0.2, // Passes 50% check
    });

    expect(res3.remainingSteps).toBe(2);
    expect(lead.friendshipSteps).toBe(2);
    expect(res3.rewardedPokemon?.uid).toBe(lead.uid);
    expect(lead.friendship).toBe(71); // +1 gain
    expect(notifications.length).toBe(1);
    expect(notifications[0]!.icon).toBe('❤️');
    expect(notifications[0]!.msg).toContain('Eevee');
  });

  it('integrates with breedingStore.reduceHatchTimers accumulating steps on companion even with 0 eggs', () => {
    const gameStore = useGameStore();
    const breedingStore = useBreedingStore();
    const notifStore = useNotificationStore();

    const gengar = makePokemon(requirePokemonSpeciesId('gengar'), 20)!;
    gengar.friendship = 100;
    gengar.friendshipSteps = 126; // 2 steps away from 128-step cycle
    gengar.heldItem = 'soothebell'; // +2 per successful cycle
    gameStore.state.team = [gengar];
    gameStore.state.eggs = []; // 0 eggs in incubator!

    // Verify initial state
    expect(gengar.friendship).toBe(100);
    expect(gengar.friendshipSteps).toBe(126);

    // Simulate a battle (gives 2 steps in reduceHatchTimers)
    // 126 + 2 = 128 steps!
    // We mock Math.random to return 0.1 (< 0.5)
    const originalRandom = Math.random;
    try {
      Math.random = () => 0.1;
      breedingStore.reduceHatchTimers('battle');

      // Friendship should increase by 2 (+1 base + 1 Soothe Bell)
      expect(gengar.friendship).toBe(102);
      expect(gengar.friendshipSteps).toBe(0);

      // Notification should be emitted
      const lastNotif = notifStore.notifications[notifStore.notifications.length - 1];
      expect(lastNotif).toBeDefined();
      expect(lastNotif!.icon).toBe('❤️');
      expect(lastNotif!.msg).toContain('Gengar');
    } finally {
      Math.random = originalRandom;
    }
  });

  it('persists and restores exact per-Pokemon friendshipSteps across database save and load cycles', async () => {
    const db = getDb();
    const userId = crypto.randomUUID();

    const monA = makePokemon(requirePokemonSpeciesId('pikachu'), 25)!;
    monA.friendship = 85;
    monA.friendshipSteps = 47;

    const monB = makePokemon(requirePokemonSpeciesId('gengar'), 35)!;
    monB.friendship = 140;
    monB.friendshipSteps = 112;

    const testState: GameState = {
      ...INITIAL_STATE,
      team: [monA, monB],
    };

    // 1. Serialization & Validation
    const serialized = serializeState(testState);
    const sanitized = validateAndSanitize(serialized);
    expect(sanitized.valid).toBe(true);
    if (!sanitized.valid) throw new Error(sanitized.error);

    // 2. Persist to database game_saves table
    await db.run(
      'INSERT INTO game_saves (user_id, save_data, last_save_id) VALUES (?, ?, ?)',
      [userId, JSON.stringify(sanitized.data), crypto.randomUUID()]
    );

    // 3. Query back from database
    const rows = await db.query<{ save_data: unknown }>(
      'SELECT save_data FROM game_saves WHERE user_id = ?',
      [userId]
    );
    expect(rows.length).toBe(1);

    const loadedRaw = rows[0]!.save_data;
    const loadedData = typeof loadedRaw === 'string' ? JSON.parse(loadedRaw) : loadedRaw;

    // 4. Deserialize team
    const restoredTeam = deserializePokemonTeam((loadedData as Record<string, unknown>).team);
    expect(restoredTeam.length).toBe(2);

    // 5. Assert 100% fidelity on per-Pokemon friendship and friendshipSteps
    const restoredMonA = restoredTeam[0]!;
    const restoredMonB = restoredTeam[1]!;

    expect(restoredMonA.id).toBe('pikachu');
    expect(restoredMonA.friendship).toBe(85);
    expect(restoredMonA.friendshipSteps).toBe(47);

    expect(restoredMonB.id).toBe('gengar');
    expect(restoredMonB.friendship).toBe(140);
    expect(restoredMonB.friendshipSteps).toBe(112);
  });
});
