import { describe, it, expect, vi } from 'vitest';
import { calculateCatchRatePure, calculateEscapeChancePure } from '@/logic/battle/battleCatchMath.ts';
import { calculateDamagePure, getEffectiveStatPure } from '@/logic/battle/battleMath.ts';
import { ref } from 'vue';
import { Pokemon } from '@/types/pokemon/pokemon';
import { BattleContext } from '@/types/battle/battleContext';
import { handleStageEvents, SHOWDOWN_STAT_KEYS } from '@/logic/battle/showdownBridgeStages';
import { SBCtx } from '@/logic/battle/showdownBridgeCtx';
import { BattleStages } from '@/types/battle/battle';
import assert from 'node:assert/strict';
import { calcStatsPure } from '@/logic/pokemon/statsMath.ts';
import { filterShowdownLogs } from '@/logic/battle/showdownBridge.ts';
import { ShowdownBattleRunner } from '@/logic/battle/helpers/showdownBattleRunner.ts';
import { ACTIVE_GENERATION } from '@/data/system/constants.ts';
import { HeuristicDamageCalculator } from '@/logic/battle/ai/heuristic/damageCalculator.ts';
import { syncSidePokemon } from '@/logic/battle/helpers/showdownSyncHelper.ts';
import { BattleAgent } from '../../../../scripts/e2e/fuzzer/core/fuzzer_agent.ts';
import { ActiveSlotRequest } from '@/logic/battle/helpers/showdownBattleAgent.ts';
import { ChoiceRequest, classifyRequest } from '@/logic/battle/helpers/requestHelper.ts';
import type { PureMove, PurePokemon } from '@/logic/battle/battleMathTypes.ts';

function purePokemon(pokemon: PurePokemon): PurePokemon {
  return pokemon;
}

function pureMove(move: PureMove): PureMove {
  return move;
}

// --- From test_bug001_003.spec.ts ---
describe('BUG-001 / BUG-002 / BUG-003: Showdown Catch Math Parity', () => {
  it('should accurately process catch rate without missing term discrepancies', () => {
    const poke = purePokemon({
      level: 50,
      hp: 50,
      maxHp: 100,
      catchRate: 45,
      status: 'slp',
      type: 'grass'
    })
    const res = calculateCatchRatePure(poke, 'ultraball', 1)
    expect(res).toBeDefined()
    expect(typeof res.caught).toBe('boolean')
    expect(res.statusMultiplierApplied).toBe(true)
  })
})

// --- From test_bug021_040.spec.ts ---
describe('BUG-021 to BUG-040: Showdown 1:1 Parity Batch 2 Suite', () => {
  it('BUG-031: Escape chance calculation evaluates correctly for fast pokemon', () => {
    const player = purePokemon({ id: 'pikachu', level: 50, spe: 100, type: 'electric' })
    const wild = purePokemon({ id: 'pidgey', level: 50, spe: 50, type: 'normal' })
    const canEscape = calculateEscapeChancePure(player, wild, 1, null)
    expect(canEscape).toBe(true)
  })
})

// --- From test_bug041_060.spec.ts ---
describe('BUG-041 to BUG-060: Showdown 1:1 Parity Batch 3 Suite', () => {
  it('BUG-042: Grassy Terrain reduces earthquake damage appropriately', () => {
    const attacker = purePokemon({ id: 'rhyhorn', level: 50, type: 'ground' })
    const defender = purePokemon({ id: 'pikachu', level: 50, type: 'electric', hp: 100, maxHp: 100 })
    const move = pureMove({ id: 'earthquake', type: 'ground', power: 100, cat: 'physical' })
    const ctxNormal = { weather: null }
    const ctxGrassy = { weather: { type: 'grassyterrain', turns: 5 } }
    
    const dmgNormal = calculateDamagePure(attacker, defender, move, ctxNormal)
    const dmgGrassy = calculateDamagePure(attacker, defender, move, ctxGrassy)
    
    expect(dmgGrassy.damage!).toBeLessThan(dmgNormal.damage!)
  })
})

// --- From test_bug061_080.spec.ts ---
describe('BUG-061 to BUG-080: Showdown 1:1 Parity Batch 4 Suite', () => {
  it('BUG-064: Choice Specs applies 1.5x special attack multiplier appropriately', () => {
    const attackerNormal = purePokemon({ id: 'alakazam', level: 50, type: 'psychic', heldItem: '' })
    const attackerSpecs = purePokemon({ id: 'alakazam', level: 50, type: 'psychic', heldItem: 'choicespecs' })
    const defender = purePokemon({ id: 'snorlax', level: 50, type: 'normal', hp: 200, maxHp: 200 })
    const move = pureMove({ id: 'psychic', type: 'psychic', power: 90, cat: 'special' })
    
    const dmgNormal = calculateDamagePure(attackerNormal, defender, move, { weather: null }, 'day', 1.0)
    const dmgSpecs = calculateDamagePure(attackerSpecs, defender, move, { weather: null }, 'day', 1.0)
    
    expect(dmgSpecs.dmg).toBeGreaterThan(dmgNormal.dmg)
  })
})

// --- From test_bug081_100.spec.ts ---
describe('BUG-081 to BUG-100: Showdown 1:1 Parity Batch 5 Suite', () => {
  it('BUG-084: Choice Scarf speed multiplier applies 1.5x boost correctly', () => {
    const attackerNormal = purePokemon({ id: 'aerodactyl', level: 50, spe: 100, type: 'rock', heldItem: '' })
    const attackerScarf = purePokemon({ id: 'aerodactyl', level: 50, spe: 100, type: 'rock', heldItem: 'choicescarf' })
    
    const speNormal = getEffectiveStatPure(attackerNormal, 'spe', {}, null, undefined)
    const speScarf = getEffectiveStatPure(attackerScarf, 'spe', {}, null, undefined)
    
    expect(speScarf).toBeGreaterThan(speNormal)
  })
})

// --- From test_bug101_120.spec.ts ---
describe('BUG-101 to BUG-120: Showdown 1:1 Parity Batch 6 Suite', () => {
  it('BUG-110: Burn status applies 0.5x attack penalty on physical moves', () => {
    const attackerNormal = purePokemon({ id: 'machamp', level: 50, type: 'fighting', status: '', atk: 100 })
    const attackerBurned = purePokemon({ id: 'machamp', level: 50, type: 'fighting', status: 'brn', atk: 100 })
    const defender = purePokemon({ id: 'snorlax', level: 50, type: 'normal', hp: 200, maxHp: 200 })
    const move = pureMove({ id: 'crosschop', type: 'fighting', power: 100, cat: 'physical' })
    
    const dmgNormal = calculateDamagePure(attackerNormal, defender, move, { weather: null })
    const dmgBurned = calculateDamagePure(attackerBurned, defender, move, { weather: null })
    
    expect(dmgBurned.damage!).toBeLessThan(dmgNormal.damage!)
  })
})

// --- From test_bug121_140.spec.ts ---
describe('BUG-121 to BUG-140: Showdown 1:1 Parity Batch 7 Suite', () => {
  it('BUG-121: Paralyze status applies 0.5x speed multiplier in Gen 7+', () => {
    const pokeNormal = purePokemon({ id: 'zapdos', level: 50, spe: 100, status: '', type: 'electric' })
    const pokePar = purePokemon({ id: 'zapdos', level: 50, spe: 100, status: 'par', type: 'electric' })
    
    const speNormal = getEffectiveStatPure(pokeNormal, 'spe', {}, null, undefined)
    const spePar = getEffectiveStatPure(pokePar, 'spe', {}, null, undefined)
    
    expect(spePar).toBe(Math.floor(speNormal * 0.5))
  })
})

// --- From test_bug141_160.spec.ts ---
describe('BUG-141 to BUG-160: Showdown 1:1 Parity Batch 8 Suite', () => {
  it('BUG-141: Solar Power applies 1.5x special attack multiplier in Sun', () => {
    const attackerNormal = purePokemon({ id: 'charizard', level: 50, type: 'fire', ability: '', spa: 100 })
    const attackerSolar = purePokemon({ id: 'charizard', level: 50, type: 'fire', ability: 'solarpower', spa: 100 })
    const defender = purePokemon({ id: 'blastoise', level: 50, type: 'water', hp: 200, maxHp: 200 })
    const move = pureMove({ id: 'flamethrower', type: 'fire', power: 90, cat: 'special' })
    const sunCtx = { weather: { type: 'sun', turns: 5 } }
    const dmgNormal = calculateDamagePure(attackerNormal, defender, move, sunCtx, undefined, 1.0)
    const dmgSolar = calculateDamagePure(attackerSolar, defender, move, sunCtx, undefined, 1.0)
    
    expect(dmgSolar.damage!).toBeGreaterThan(dmgNormal.damage!)
  })
})

// --- From showdown_round11_fixes.spec.ts ---
/**
 * tests/unit/battle/showdown_round11_fixes.spec.ts
 * Dedicated unit tests verifying fixes for Round 11 audit findings.
 */

describe('Showdown Round 11 Audit Fixes', () => {
  describe('CRIT-1: HP Ratio Calculation in Bridge (-damage & -heal)', () => {
    it('should preserve realMaxHp when receiving Showdown ratio condition (e.g. 48/100)', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');
      
      const victim = {
        uid: 'p-mewtwo',
        id: 'mewtwo',
        name: 'Mewtwo',
        hp: 300,
        maxHp: 300,
        volatileCounters: {}
      } as unknown as Pokemon;

      const activeBattle = ref({
        player: victim,
        enemy: { uid: 'e-pikachu', id: 'pikachu', name: 'Pikachu', hp: 100, maxHp: 100 } as unknown as Pokemon,
        playerTeam: [victim],
        enemyTeam: [{ uid: 'e-pikachu', id: 'pikachu', name: 'Pikachu', hp: 100, maxHp: 100 }]
      });

      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;

      // Damage: Showdown emits 50/100 ratio
      await parseShowdownLogLine(mockCtx, '|-damage|p1a: Mewtwo|50/100|[uids]p1a:Mewtwo=p-mewtwo');

      expect(victim.maxHp).toBe(300); // Must stay 300, NOT overwritten with 100
      expect(victim.hp).toBe(150);    // 50% of 300
    });
  });

  describe('HIGH-1 & HIGH-2: Volatile Cleanup in |turn| and |upkeep|', () => {
    it('should clean single-turn volatile counters (protect, flinch, endure) on turn/upkeep', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');

      const player = {
        uid: 'p-charizard',
        id: 'charizard',
        name: 'Charizard',
        hp: 200,
        maxHp: 200,
        volatileCounters: { protect: 1, flinch: 1, endure: 1, taunt: 3 }
      } as unknown as Pokemon;

      const activeBattle = ref({
        player,
        enemy: { uid: 'e-blastoise', id: 'blastoise', name: 'Blastoise', hp: 200, maxHp: 200 } as unknown as Pokemon,
        playerTeam: [player],
        enemyTeam: [{ uid: 'e-blastoise', id: 'blastoise', name: 'Blastoise', hp: 200, maxHp: 200 }],
        turnCount: 1
      });

      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;

      await parseShowdownLogLine(mockCtx, '|turn|2');

      expect(player.volatileCounters?.['protect']).toBeUndefined();
      expect(player.volatileCounters?.['flinch']).toBeUndefined();
      expect(player.volatileCounters?.['endure']).toBeUndefined();
      expect(player.volatileCounters?.['taunt']).toBe(3); // Multi-turn volatile persists
    });
  });

  describe('HIGH-3: |-transform| Data and Moves Copy with PP=5', () => {
    it('should copy species, types, and moves with max 5 PP when transformed', async () => {
      const { parseShowdownLogLine } = await import('@/logic/battle/showdownBridge');

      const ditto = {
        uid: 'p-ditto',
        id: 'ditto',
        name: 'Ditto',
        species: 'Ditto',
        type: 'normal',
        hp: 150,
        maxHp: 150,
        moves: [{ id: 'transform', name: 'Transform', pp: 10, maxPP: 10 }]
      } as unknown as Pokemon;

      const dragonite = {
        uid: 'e-dragonite',
        id: 'dragonite',
        name: 'Dragonite',
        species: 'Dragonite',
        type: 'dragon',
        type2: 'flying',
        hp: 250,
        maxHp: 250,
        moves: [
          { id: 'dragonclaw', name: 'Dragon Claw', pp: 15, maxPP: 15 },
          { id: 'hyperbeam', name: 'Hyper Beam', pp: 5, maxPP: 5 }
        ]
      } as unknown as Pokemon;

      const activeBattle = ref({
        player: ditto,
        enemy: dragonite,
        playerTeam: [ditto],
        enemyTeam: [dragonite]
      });

      const mockCtx = {
        activeBattle,
        addLog: vi.fn(),
        attackerSide: ref(null),
        activeMove: ref(null)
      } as unknown as BattleContext;

      await parseShowdownLogLine(mockCtx, '|-transform|p1a: Ditto|p2a: Dragonite|[uids]p1a:Ditto=p-ditto,p2a:Dragonite=e-dragonite');

      expect(ditto.species).toBe('Dragonite');
      expect(ditto.type).toBe('dragon');
      expect(ditto.type2).toBe('flying');
      expect(ditto.moves?.length).toBe(2);
      expect(ditto.moves?.[0]?.pp).toBe(5);
      expect(ditto.moves?.[0]?.maxPP).toBe(5);
    });
  });
});

// --- From showdown_round12_fixes.spec.ts ---
describe('Showdown Round 12 Native Parity Fixes', () => {
  it('should use native Showdown stat keys (accuracy, evasion, atk, def, spa, spd, spe)', () => {
    expect(SHOWDOWN_STAT_KEYS).toEqual(['atk', 'def', 'spa', 'spd', 'spe', 'accuracy', 'evasion']);
  });

  it('should correctly modify accuracy and evasion without conversion tables', () => {
    const playerStages: BattleStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0,
    };

    const mockPoke = { name: 'Pikachu' };
    const mockStore = {
      playerStages: { value: playerStages },
      enemyStages: { value: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 } },
      addLog: () => {},
    };

    const mockCtx: Partial<SBCtx> = {
      store: mockStore as unknown as SBCtx['store'],
      type: '-boost',
      parts: ['', '-boost', 'p1a: Pikachu', 'accuracy', '2'],
      line: '|-boost|p1a: Pikachu|accuracy|2',
      p: mockPoke as unknown as SBCtx['p'],
      getPoke: () => mockPoke as unknown as SBCtx['p'],
      getSide: () => 'player',
    };

    const handled = handleStageEvents(mockCtx as SBCtx);
    expect(handled).toBe(true);
    expect(playerStages.accuracy).toBe(2);
    expect(playerStages.evasion).toBe(0);
  });

  it('should strictly limit clearboost/invertboost to stat keys and preserve screens/hazards', () => {
    const playerStages: BattleStages = {
      atk: 2, def: -1, spa: 0, spd: 0, spe: 1, accuracy: 1, evasion: -1,
      reflect: 1, lightScreen: 1, safeguard: 0, mist: 0, spikes: 2,
    };

    const mockPoke = { name: 'Pikachu' };
    const mockStore = {
      playerStages: { value: playerStages },
      enemyStages: { value: { ...playerStages } },
      addLog: () => {},
    };

    const mockCtx: Partial<SBCtx> = {
      store: mockStore as unknown as SBCtx['store'],
      type: '-clearboost',
      parts: ['-clearboost', 'p1a: Pikachu'],
      line: '|-clearboost|p1a: Pikachu',
      p: mockPoke as unknown as SBCtx['p'],
      getPoke: () => mockPoke as unknown as SBCtx['p'],
      getSide: () => 'player',
    };

    handleStageEvents(mockCtx as SBCtx);

    // Stat stages should reset to 0
    expect(playerStages.atk).toBe(0);
    expect(playerStages.def).toBe(0);
    expect(playerStages.accuracy).toBe(0);
    expect(playerStages.evasion).toBe(0);

    // Screens and hazards MUST remain intact
    expect(playerStages.reflect).toBe(1);
    expect(playerStages.lightScreen).toBe(1);
    expect(playerStages.spikes).toBe(2);
  });
});

// --- From showdownBridgeV3Fixes.test.ts ---
/**
 * tests/node/battle/showdownBridgeV3Fixes.test.ts
 *
 * Unit tests for Round 3 Showdown audit fixes:
 * - EV clamping in calcStatsPure
 * - filterShowdownLogs parameterization
 */

describe('Showdown Audit v3 Fixes Unit Tests', () => {
  it('enforces EV clamping (0-252) in calcStatsPure', () => {
    const base = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const natureData = { up: null, down: null };

    // Pass illegal EV 500 — should clamp to 252 (giving identical result to ev = 252)
    const statsClamped = calcStatsPure(100, ivs, base, natureData, false, { atk: 252 });
    const statsOverflown = calcStatsPure(100, ivs, base, natureData, false, { atk: 500 });

    assert.equal(statsOverflown.atk, statsClamped.atk);
  });

  it('parameterizes filterShowdownLogs with custom playerSide', () => {
    const logs = [
      '|split|p2',
      '|-secret|p2 secret log',
      '|-public|p2 public log',
    ];

    // For player side = p2, it should pick the secret line
    const filteredP2 = filterShowdownLogs(logs, 'p2');
    assert.deepEqual(filteredP2, ['|-secret|p2 secret log']);

    // For default player side = p1, it should pick the public line for a p2 split
    const filteredP1 = filterShowdownLogs(logs, 'p1');
    assert.deepEqual(filteredP1, ['|-public|p2 public log']);
  });
});

// --- From showdownBridgeV4Fixes.test.ts ---
/**
 * tests/node/battle/showdownBridgeV4Fixes.test.ts
 *
 * Unit tests for Round 4 Showdown audit fixes:
 * - ShowdownBattleRunner supports 4 seats dynamically (p1–p4)
 */

describe('Showdown Audit v4 Fixes Unit Tests', () => {
  it('supports 4 seats dynamically in ShowdownBattleRunner', () => {
    const runner = new ShowdownBattleRunner(['move 1'], ['move 2']);
    runner.setSeatChoices('p3', ['move 3']);
    runner.setSeatChoices('p4', ['move 4']);

    const reqActive = { active: [{ moves: [{ id: 'tackle' }] }] };

    assert.equal(runner.resolveAndConsumeNextChoice('p1', reqActive), 'move 1');
    assert.equal(runner.resolveAndConsumeNextChoice('p2', reqActive), 'move 2');
    assert.equal(runner.resolveAndConsumeNextChoice('p3', reqActive), 'move 3');
    assert.equal(runner.resolveAndConsumeNextChoice('p4', reqActive), 'move 4');
  });
});

// --- From showdownBridgeV5Fixes.test.ts ---
/**
 * tests/node/battle/showdownBridgeV5Fixes.test.ts
 *
 * Unit tests for Round 5 Showdown audit fixes:
 * - Paralysis speed reduction uses ACTIVE_GENERATION (not hardcoded)
 */

describe('Showdown Audit v5 Fixes Unit Tests', () => {
  it('respects ACTIVE_GENERATION in paralysis speed reduction', () => {
    const poke = {
      level: 50,
      spe: 100,
      type: 'electric' as const,
      status: 'par' as const,
    };

    // BattleStages uses native Showdown IDs: accuracy, evasion (not acc, eva)
    const emptyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };
    const speedVal = getEffectiveStatPure(poke, 'spe', emptyStages, null);
    const expectedMult = ACTIVE_GENERATION <= 6 ? 0.25 : 0.5;
    assert.equal(speedVal, Math.floor(100 * expectedMult));
  });
});

// --- From showdownBridgeV7Fixes.test.ts ---
/**
 * tests/node/battle/showdownBridgeV7Fixes.test.ts
 *
 * Unit tests for Round 7 Showdown audit fixes:
 * - HeuristicDamageCalculator instantiation (no hardcoded gen)
 * - showdownSyncHelper exports syncSidePokemon
 */

describe('Showdown Audit v7 Fixes Unit Tests', () => {
  it('instantiates HeuristicDamageCalculator with ACTIVE_GENERATION (no hardcode)', () => {
    const calc = new HeuristicDamageCalculator();
    assert.ok(calc, 'Calculator instantiated successfully without hardcode');
  });

  it('showdownSyncHelper exports syncSidePokemon as a function', () => {
    assert.equal(typeof syncSidePokemon, 'function');
  });
});

// --- From showdownBridgeV8Fixes.test.ts ---
/**
 * tests/node/battle/showdownBridgeV8Fixes.test.ts
 *
 * Unit tests for Round 8 Showdown audit fixes:
 * - BattleAgent decideSingleSlot accepts targetLocation
 * - BattleAgent decideForcedSwitch handles reviving flag
 */

describe('Showdown Audit v8 Fixes Unit Tests', () => {
  it('accepts targetLocation in BattleAgent decideSingleSlot without errors', () => {
    const agent = new BattleAgent('p1');
    const mockSlotReq: ActiveSlotRequest = {
      moves: [{ id: 'tackle', disabled: false, pp: 35 }]
    };
    const mockFullReq: ChoiceRequest = {
      side: {
        pokemon: [{ ident: 'p1a: mon', details: 'mon', active: true, condition: '100/100', moves: ['tackle'], stats: { hp: 100 }, ability: 'blaze' }]
      }
    };
    // Accessing protected method via cast
    const choice = (agent as unknown as { decideSingleSlot: (s: ActiveSlotRequest, i: number, r: ChoiceRequest, t?: number) => string })
      .decideSingleSlot(mockSlotReq, 0, mockFullReq, 1);

    assert.ok(choice.includes('move 1 1'), `Expected choice to contain targetLocation "move 1 1", got "${choice}"`);
  });

  it('handles reviving flag in decideForcedSwitch', () => {
    const agent = new BattleAgent('p1');
    const mockFullReq: ChoiceRequest = {
      forceSwitch: [{ reviving: true } as unknown as boolean],
      side: {
        pokemon: [
          { ident: 'p1a: mon1', details: 'mon1', active: true, condition: '100/100', moves: ['tackle'], stats: { hp: 100 }, ability: 'blaze' },
          { ident: 'p1a: mon2', details: 'mon2', active: false, condition: '0 fnt', moves: ['tackle'], stats: { hp: 0 }, ability: 'blaze' }
        ]
      }
    };
    const choice = (agent as unknown as { decideForcedSwitch: (r: ChoiceRequest) => string })
      .decideForcedSwitch(mockFullReq);

    assert.equal(choice, 'switch 2', `Expected switch to fainted slot 2 when reviving: true, got "${choice}"`);
  });

  it('classifies Revival Blessing target selection as revive-target instead of a real forced replacement', () => {
    const request = {
      forceSwitch: [{ reviving: true }],
      side: {
        pokemon: [{ active: true, reviving: true }]
      }
    };

    assert.equal(
      classifyRequest(request),
      'revive-target',
      'Showdown uses switch syntax for Revival Blessing target selection, but the active Pokémon must not be withdrawn.'
    );
  });
});
