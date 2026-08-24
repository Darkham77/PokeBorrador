/**
 * tests/node/battle/battle_presentation_and_search_persistence.test.ts
 *
 * Unit tests verifying activeBattle serialization during presentation (before turn 1)
 * and wild search mode persistence / anti-cheat restoration.
 */

import { describe, it, beforeEach } from 'vitest';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { serializeState } from '../../../src/logic/auth/saveSerializer.ts';
import { restoreBattleState } from '../../../src/logic/battle/orchestratorRestoreHelper.ts';
import { createBattleStateMachine, BATTLE_STATES, BATTLE_SUBSTATES } from '../../../src/logic/battle/battleStateMachine.ts';
import type { BattleContext } from '../../../src/types/battle/battleContext.ts';
import type { GameState } from '../../../src/types/system/game.ts';
import type { Pokemon, Move } from '../../../src/types/pokemon/pokemon.ts';
import type { BattleState } from '../../../src/types/battle/battle.ts';
import type { PokemonSpeciesId } from '../../../src/data/pokemon/pokedex.ts';

function createMockPokemon(uid: string, id: PokemonSpeciesId, name: string, hp = 100): Pokemon {
  const mockMove: Move = {
    id: 'thunderbolt',
    name: 'Thunderbolt',
    type: 'electric',
    cat: 'special',
    power: 90,
    acc: 100,
    pp: 15,
    maxPP: 15
  };

  return {
    uid,
    id,
    species: id,
    name,
    level: 25,
    hp,
    maxHp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    type: 'electric',
    moves: [mockMove],
    status: '',
    isShiny: false,
    gender: 'm',
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    nature: 'hardy',
    ability: 'static',
    exp: 1000,
    expNeeded: 2000,
    friendship: 70
  };
}

describe('Active Battle Presentation and Search Persistence', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });
  it('serializes trainer/rival battle during presentation when player and enemy seats are not yet bound', () => {
    const playerMon = createMockPokemon('p1-uid', 'pikachu', 'Pikachu');
    const rivalMon = createMockPokemon('e1-uid', 'eevee', 'Eevee');

    const mockState: Partial<GameState> = {
      trainer: 'Red',
      team: [playerMon],
      box: [],
      starterChosen: true,
      map: { currentMap: 'route1', region: 'kanto', lastNavigateAt: 0 },
      activeBattle: {
        isTrainer: true,
        isRival: true,
        trainerName: 'Azul',
        trainerSprite: 'youngster-masters',
        trainerArchetype: 'rival',
        quote: '¡No podrás vencerme!',
        locationId: 'route1',
        wasSearching: true,
        player: null,
        enemy: null,
        enemyTeam: [rivalMon],
        enemyTeamIndex: 0,
        playerTeamIndex: 0,
        turnCount: 1,
        over: false,
        escapeAttempts: 0,
        weather: { type: 'clear', visual: 'clear', turns: -1 },
        participants: [playerMon.uid],
        playerSideConditions: {},
        enemySideConditions: {}
      } as unknown as BattleState
    };

    const serialized = serializeState(mockState as GameState);
    assert.ok(serialized.activeBattle, 'activeBattle should NOT be null during presentation');
    assert.strictEqual(serialized.activeBattle.isTrainer, true);
    assert.strictEqual(serialized.activeBattle.trainerName, 'Azul');
    assert.strictEqual(serialized.activeBattle.isRival, true);
    assert.strictEqual(serialized.activeBattle.wasSearching, true);
    assert.ok(Array.isArray(serialized.activeBattle.enemyTeam));
    assert.strictEqual(serialized.activeBattle.enemyTeam.length, 1);
  });

  it('serializes wild / search mode active battle state so player stays in search mode upon reload', () => {
    const playerMon = createMockPokemon('p1-uid', 'pikachu', 'Pikachu');
    const wildMon = createMockPokemon('wild-uid', 'pidgey', 'Pidgey');

    const mockState: Partial<GameState> = {
      trainer: 'Red',
      team: [playerMon],
      box: [],
      starterChosen: true,
      map: { currentMap: 'route1', region: 'kanto', lastNavigateAt: 0 },
      activeBattle: {
        isTrainer: false,
        isGym: false,
        isRival: false,
        locationId: 'route1',
        wasSearching: true,
        player: playerMon,
        enemy: wildMon,
        enemyTeam: [wildMon],
        enemyTeamIndex: 0,
        playerTeamIndex: 0,
        turnCount: 1,
        over: false,
        escapeAttempts: 0,
        weather: { type: 'clear', visual: 'clear', turns: -1 },
        participants: [playerMon.uid],
        playerSideConditions: {},
        enemySideConditions: {}
      } as unknown as BattleState
    };

    const serialized = serializeState(mockState as GameState);
    assert.ok(serialized.activeBattle, 'Wild search activeBattle should NOT be null');
    assert.strictEqual(serialized.activeBattle.isTrainer, false);
    assert.strictEqual(serialized.activeBattle.wasSearching, true);
    assert.strictEqual(serialized.activeBattle.locationId, 'route1');
  });

  it('restores wild search battle into SEARCH_PHASE on the specified route', async () => {
    const playerMon = createMockPokemon('p1-uid', 'pikachu', 'Pikachu');
    const fsm = createBattleStateMachine();
    const activeBattleRef = ref<BattleState | null>(null);

    const mockCtx: Partial<BattleContext> = {
      activeBattle: activeBattleRef,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: {
        state: {
          team: [playerMon],
          box: [],
          map: { currentMap: 'route1', region: 'kanto', lastNavigateAt: 0 },
          activeBattle: null
        }
      } as any,
      playerStages: ref({} as any),
      enemyStages: ref({} as any),
      battleLogs: ref([]),
      isProcessing: ref(false),
      isIntroAnimating: ref(false),
      clearLogs: () => {},
      addLog: () => {},
      persistBattle: () => {},
      animations: {
        resetAll: () => {}
      } as any
    };

    const savedBattleData = {
      isTrainer: false,
      isGym: false,
      wasSearching: true,
      locationId: 'route2',
      over: false,
      timestamp: Date.now()
    };

    await restoreBattleState(mockCtx as BattleContext, savedBattleData);

    assert.strictEqual(fsm.currentState.value, BATTLE_STATES.SEARCH_PHASE);
    assert.strictEqual(activeBattleRef.value?.locationId, 'route2');
    assert.strictEqual(activeBattleRef.value?.wasSearching, true);
  });

  it('restores trainer/rival battle to ACTIVE_BATTLE and WAIT_INPUT with isRival preserved', async () => {
    const playerMon = createMockPokemon('p1-uid', 'pikachu', 'Pikachu');
    const rivalMon = createMockPokemon('e1-uid', 'eevee', 'Eevee');
    const fsm = createBattleStateMachine();
    const activeBattleRef = ref<BattleState | null>(null);

    const mockCtx: Partial<BattleContext> = {
      activeBattle: activeBattleRef,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: {
        state: {
          team: [playerMon],
          box: [],
          map: { currentMap: 'route1', region: 'kanto', lastNavigateAt: 0 },
          activeBattle: null
        }
      } as any,
      playerStages: ref({} as any),
      enemyStages: ref({} as any),
      battleLogs: ref([]),
      isProcessing: ref(false),
      isIntroAnimating: ref(false),
      clearLogs: () => {},
      addLog: () => {},
      persistBattle: () => {},
      animations: {
        resetAll: () => {}
      } as any
    };

    const savedBattleData = {
      isTrainer: true,
      isRival: true,
      trainerName: 'Azul',
      trainerSprite: 'youngster-masters',
      trainerArchetype: 'rival',
      locationId: 'route1',
      wasSearching: true,
      enemyTeam: [rivalMon],
      enemyTeamIndex: 0,
      over: false,
      timestamp: Date.now()
    };

    await restoreBattleState(mockCtx as BattleContext, savedBattleData);

    assert.strictEqual(fsm.currentState.value, BATTLE_STATES.ACTIVE_BATTLE);
    assert.strictEqual(fsm.currentSubState.value, BATTLE_SUBSTATES.WAIT_INPUT);
    assert.strictEqual(activeBattleRef.value?.isRival, true);
    assert.strictEqual(activeBattleRef.value?.trainerName, 'Azul');
    assert.strictEqual(activeBattleRef.value?.player?.uid, playerMon.uid);
    assert.strictEqual(activeBattleRef.value?.enemy?.uid, rivalMon.uid);
  });

  it('exhaustively serializes and restores complex in-combat states including weather, side conditions, volatiles, held items, and active player slot', async () => {
    const playerMon1 = createMockPokemon('p1-uid', 'pikachu', 'Pikachu');
    const playerMon2 = createMockPokemon('p2-uid', 'charizard', 'Charizard');
    const rivalMon = createMockPokemon('e1-uid', 'blastoise', 'Blastoise');
    rivalMon.heldItem = 'focussash';
    rivalMon.sleepTurns = 2;
    rivalMon.choiceMove = 'surf';
    rivalMon.evs = { hp: 252, atk: 0, def: 0, spa: 252, spd: 4, spe: 0 };

    const mockState: Partial<GameState> = {
      trainer: 'Red',
      last_renamed_at: '2026-08-20T10:00:00Z',
      team: [playerMon1, playerMon2],
      box: [],
      starterChosen: true,
      map: { currentMap: 'route1', region: 'kanto', lastNavigateAt: 0 },
      activeBattle: {
        isTrainer: true,
        isRival: true,
        trainerName: 'Azul',
        locationId: 'route1',
        wasSearching: false,
        player: playerMon2,
        enemy: rivalMon,
        enemyTeam: [rivalMon],
        enemyTeamIndex: 0,
        playerTeamIndex: 1,
        turnCount: 4,
        escapeAttempts: 1,
        cannotEscape: true,
        weather: { type: 'rain', visual: 'rain', turns: 3 },
        initialMapWeather: 'clear',
        terrain: 'electricterrain',
        fieldConditions: {
          electricterrain: { turns: 4 }
        },
        playerSideConditions: {
          lightscreen: { turns: 3 },
          stealthrock: { turns: -1 }
        },
        enemySideConditions: {
          spikes: { turns: -1 }
        },
        pendingSlotEffects: [
          { move: 'futuresight', side: 'player', targetSlot: 0, turnsLeft: 1, damage: 65, sourceName: 'Alakazam' }
        ],
        enemyInventory: { potion: 2 },
        stolenResources: { money: 500, items: { pokeball: 3 } },
        isFishing: false,
        isArchaeology: false,
        isCave: true,
        isIndoors: false,
        isCrystalCave: false,
        difficulty: 'hard',
        over: false,
        participants: [playerMon2.uid]
      } as unknown as BattleState
    };

    // 1. Verify Serialization
    const serialized = serializeState(mockState as GameState);
    assert.strictEqual(serialized.last_renamed_at, '2026-08-20T10:00:00Z');
    assert.ok(serialized.activeBattle);
    assert.strictEqual(serialized.activeBattle.playerTeamIndex, 1);
    assert.strictEqual(serialized.activeBattle.turnCount, 4);
    assert.strictEqual(serialized.activeBattle.cannotEscape, true);
    assert.strictEqual(serialized.activeBattle.weather?.type, 'rain');
    assert.strictEqual(serialized.activeBattle.weather?.turns, 3);
    assert.strictEqual(serialized.activeBattle.terrain, 'electricterrain');
    assert.strictEqual(serialized.activeBattle.fieldConditions?.electricterrain?.turns, 4);
    assert.strictEqual(serialized.activeBattle.playerSideConditions?.lightscreen?.turns, 3);
    assert.strictEqual(serialized.activeBattle.isCave, true);
    assert.strictEqual(serialized.activeBattle.difficulty, 'hard');
    assert.strictEqual(serialized.activeBattle.stolenResources?.money, 500);

    const enemySerialized = serialized.activeBattle.enemyTeam?.[0];
    assert.ok(enemySerialized);
    assert.strictEqual(enemySerialized.heldItem, 'focussash');
    assert.strictEqual(enemySerialized.sleepTurns, 2);
    assert.strictEqual(enemySerialized.choiceMove, 'surf');
    assert.strictEqual(enemySerialized.evs?.hp, 252);

    // 2. Verify Restoration
    const fsm = createBattleStateMachine();
    const activeBattleRef = ref<BattleState | null>(null);
    const mockCtx: Partial<BattleContext> = {
      activeBattle: activeBattleRef,
      fsm,
      BATTLE_STATES,
      BATTLE_SUBSTATES,
      gs: {
        state: {
          team: [playerMon1, playerMon2],
          box: [],
          map: { currentMap: 'route1', region: 'kanto', lastNavigateAt: 0 },
          activeBattle: null
        }
      } as any,
      playerStages: ref({} as any),
      enemyStages: ref({} as any),
      battleLogs: ref([]),
      isProcessing: ref(false),
      isIntroAnimating: ref(false),
      clearLogs: () => {},
      addLog: () => {},
      persistBattle: () => {},
      animations: { resetAll: () => {} } as any
    };

    await restoreBattleState(mockCtx as BattleContext, serialized.activeBattle);

    assert.strictEqual(activeBattleRef.value?.player?.uid, playerMon2.uid, 'Should restore active player slot #1 (Charizard)');
    assert.strictEqual(activeBattleRef.value?.playerTeamIndex, 1);
    assert.strictEqual(activeBattleRef.value?.turnCount, 4);
    assert.strictEqual(activeBattleRef.value?.cannotEscape, true);
    assert.strictEqual(activeBattleRef.value?.weather?.type, 'rain');
    assert.strictEqual(activeBattleRef.value?.weather?.turns, 3);
    assert.strictEqual(activeBattleRef.value?.fieldConditions?.electricterrain?.turns, 4);
    assert.strictEqual(activeBattleRef.value?.playerSideConditions?.lightscreen?.turns, 3);
    assert.strictEqual(activeBattleRef.value?.stolenResources?.money, 500);
    assert.strictEqual(activeBattleRef.value?.isCave, true);
  });
});
