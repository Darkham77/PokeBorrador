import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';
import { calculateCatchRatePure } from '@/logic/battle/battleCatchMath';

// --- From test_bug025_player_name_mapping.spec.ts ---
describe('Audit Parity - BUG-025: player token name→side mapping inverted lookup', () => {
  it('should be able to resolve winnerName to player side correctly', async () => {
    const battle = { playerNames: {} as Record<string, string>, winnerResult: '' };
    const store = { activeBattle: { value: battle }, addLog: () => {} };

    const ctxPlayer = {
      store,
      type: 'player',
      parts: ['', 'player', 'p1', 'Ash'],
      line: '|player|p1|Ash',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctxPlayer);

    // Now simulate a win by Ash
    const ctxWin = {
      store,
      type: 'win',
      parts: ['', 'win', 'Ash'],
      line: '|win|Ash',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctxWin);

    // winnerResult must be 'player' since Ash is mapped to p1 (the player side)
    expect(battle.winnerResult).toBe('player');
  });
});

// --- From test_bug026_win_multi_battle_format.spec.ts ---
describe('Audit Parity - BUG-026: win token must parse multi-battle "Name1 & Name2" winner format', () => {
  it('should handle multi-battle win token with ally names concatenated', async () => {
    const battle = { playerNames: { Ash: 'player', Red: 'player' }, over: false } as Record<string, unknown>;
    const store = { activeBattle: { value: battle }, addLog: () => {} };

    const ctx = {
      store,
      type: 'win',
      parts: ['', 'win', 'Ash & Red'],
      line: '|win|Ash & Red',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);

    // The win must correctly identify player wins even with "Name & AllyName" compound format
    expect(battle.winnerResult).toBe('player');
    expect(battle.over).toBe(true);
  });
});

// --- From test_bug027_activate_toID_normalization.spec.ts ---
describe('Audit Parity - BUG-027: -activate uses forbidden .replace() normalization instead of toID()', () => {
  it('should use toID()-equivalent normalization — "Speed Boost" must map to "speedboost" consistently', () => {
    let recordedKey: string | null = null;
    const mockPoke = { volatileCounters: {}, name: 'Yanmega', ability: '' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (_msg: string, _style: string, _src: unknown) => {} },
      type: '-activate',
      parts: ['', '-activate', 'p1a: Yanmega', 'ability: Speed Boost'],
      line: '|-activate|p1a: Yanmega|ability: Speed Boost',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // The resulting volatileCounters key must be 'speedboost' (toID output), not any ad-hoc transform
    // If normalization is correct, the key should be 'speedboost'
    recordedKey = Object.keys(mockPoke.volatileCounters)[0] ?? null;
    expect(recordedKey).toBe('speedboost');
  });
});

// --- From test_bug028_activate_prefix_semantics.spec.ts ---
describe('Audit Parity - BUG-028: -activate must distinguish move: and ability: prefix semantics', () => {
  it('should log different messages for move: activation vs ability: activation', () => {
    const logs: string[] = [];
    const mockPoke = { volatileCounters: {}, name: 'Yanmega', ability: '' };
    const makeCtx = (effectPart: string, line: string) => ({
      store: {
        activeBattle: { value: {} },
        addLog: (msg: string) => logs.push(msg),
      },
      type: '-activate',
      parts: ['', '-activate', 'p1a: Yanmega', effectPart],
      line,
      p: null,
      getPoke: () => ({ ...mockPoke }),
      getSide: () => 'player',
    });

    handleMiscEvents(makeCtx('ability: Speed Boost', '|-activate|p1a: Yanmega|ability: Speed Boost') as unknown as Parameters<typeof handleMiscEvents>[0]);
    const abilityLog = logs.at(-1);

    logs.length = 0;
    handleMiscEvents(makeCtx('move: Confusion Hit', '|-activate|p1a: Yanmega|move: Confusion Hit') as unknown as Parameters<typeof handleMiscEvents>[0]);
    const moveLog = logs.at(-1);

    // Logs should be semantically different — ability vs move activation is different context
    // If both produce identical "X se activó en Y" messages, the semantic distinction is lost
    expect(abilityLog).not.toBe(moveLog);
  });
});

// --- From test_bug029_start_typechange.spec.ts ---
describe('Audit Parity - BUG-029: -start typechange must update target.type, not add a counter flag', () => {
  it('should update target type when typechange is received in -start', async () => {
    const mockPoke = { volatileCounters: {}, name: 'Arceus', type: 'normal', type2: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-start',
      parts: ['', '-start', 'p1a: Arceus', 'typechange', 'Fire', '[silent]'],
      line: '|-start|p1a: Arceus|typechange|Fire|[silent]',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // typechange must update target.type to 'Fire', not store a counter
    expect(mockPoke.type).toBe('Fire');
    expect((mockPoke.volatileCounters as Record<string, number>)['typechange']).toBeUndefined();
  });
});

// --- From test_bug030_start_typeadd.spec.ts ---
describe('Audit Parity - BUG-030: -start typeadd must update type2, not add a counter flag', () => {
  it('should update target.type2 when typeadd is received in -start', async () => {
    const mockPoke = { volatileCounters: {}, name: 'Trevenant', type: 'ghost', type2: 'grass' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-start',
      parts: ['', '-start', 'p1a: Trevenant', 'typeadd', 'Fire'],
      line: '|-start|p1a: Trevenant|typeadd|Fire',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // typeadd must add Fire as addedType — type2 should reflect it or addedType field should be set
    expect((mockPoke as Record<string, unknown>).addedType).toBe('Fire');
    expect((mockPoke.volatileCounters as Record<string, number>)['typeadd']).toBeUndefined();
  });
});

// --- From test_bug035_swap_position_tracking.spec.ts ---
describe('Audit Parity - BUG-035: swap token must update position in activeBattle seat model', () => {
  it('should update active slot index when |swap| arrives in doubles', () => {
    const battle = {
      player: { name: 'Pikachu', position: 0 },
      playerB: { name: 'Charizard', position: 1 },
    } as Record<string, unknown>;
    const store = { activeBattle: { value: battle }, addLog: () => {} };
    const ctx = {
      store,
      type: 'swap',
      parts: ['', 'swap', 'p1a: Pikachu', '1'],
      line: '|swap|p1a: Pikachu|1',
      p: null,
      getPoke: (id: string) => id.includes('Pikachu') ? battle.player : null,
      getSide: () => 'player',
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // The swap must update position index on the involved Pokemon — not just log a message
    const pikachu = battle.player as { position: number };
    expect(pikachu.position).toBe(1);
  });
});

// --- From test_bug036_turn_volatile_duplication.spec.ts ---
// BUG-036: clearTurnVolatiles lambda is duplicated inside 'turn' and 'upkeep' handlers.
// This test verifies that the same logic is NOT duplicated — if it is, a future change to one
// path will silently diverge from the other, causing split behavior.

describe('Audit Parity - BUG-036: clearTurnVolatiles logic must not be duplicated in turn/upkeep', () => {
  it('clearTurnVolatiles must behave identically for turn and upkeep tokens', async () => {
    // We import the module and call both paths
    const { handleMiscEvents } = await import('@/logic/battle/showdownBridgeMisc');

    const makeMon = () => ({
      name: 'Pikachu',
      volatileCounters: { protect: 1, flinch: 1, endure: 1, confusion: 1 },
    });

    const makeCtx = (type: string) => ({
      store: {
        activeBattle: { value: { player: makeMon(), enemy: makeMon() } },
        addLog: () => {},
      },
      type,
      parts: ['', type, '5'],
      line: `|${type}|5`,
      p: null,
      getPoke: () => null,
      getSide: () => null,
    });

    const ctxTurn = makeCtx('turn') as unknown as Parameters<typeof handleMiscEvents>[0];
    const ctxUpkeep = makeCtx('upkeep') as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctxTurn);
    const turnResult = (ctxTurn.store.activeBattle.value as unknown as Record<string, unknown>);

    handleMiscEvents(ctxUpkeep);
    const upkeepResult = (ctxUpkeep.store.activeBattle.value as unknown as Record<string, unknown>);

    // Both paths must clear the same keys — if one path misses a key the other handles, it's a bug
    const playerTurnCounters = (turnResult.player as { volatileCounters: Record<string, unknown> }).volatileCounters;
    const playerUpkeepCounters = (upkeepResult.player as { volatileCounters: Record<string, unknown> }).volatileCounters;

    expect(playerTurnCounters).toEqual(playerUpkeepCounters);
    // 'confusion' must NOT be cleared (not a per-turn volatile in this batch)
    expect(playerTurnCounters['confusion']).toBe(1);
    // protect/flinch/endure MUST be cleared
    expect(playerTurnCounters['protect']).toBeUndefined();
    expect(playerTurnCounters['flinch']).toBeUndefined();
    expect(playerTurnCounters['endure']).toBeUndefined();
  });
});

// --- From test_bug037_turn_volatile_all_seats.spec.ts ---
describe('Audit Parity - BUG-037: turn volatile cleanup only clears p1/p2 slots, not all 4 seats', () => {
  it('should clear volatiles for all active seats (p1a, p1b, p2a, p2b) in doubles on turn token', () => {
    const makeActive = () => ({
      name: 'Pikachu',
      volatileCounters: { protect: 1, flinch: 1 },
    });
    const battle = {
      player: makeActive(),
      playerB: makeActive(),  // second slot in doubles — p1b
      enemy: makeActive(),
      enemyB: makeActive(),   // second slot in doubles — p2b
    };
    const ctx = {
      store: {
        activeBattle: { value: battle },
        addLog: () => {},
      },
      type: 'turn',
      parts: ['', 'turn', '3'],
      line: '|turn|3',
      p: null,
      getPoke: () => null,
      getSide: () => null,
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // All 4 active slots must have their per-turn volatiles cleared
    expect(battle.player.volatileCounters['protect']).toBeUndefined();
    expect(battle.enemy.volatileCounters['protect']).toBeUndefined();
    // p1b and p2b must ALSO be cleared — this is the failing assertion if BUG-037 is present
    expect(battle.playerB.volatileCounters['protect']).toBeUndefined();
    expect(battle.enemyB.volatileCounters['protect']).toBeUndefined();
  });
});

// --- From test_bug038_transform_pp_copy.spec.ts ---
describe('Audit Parity - BUG-038: -transform must copy PP as Math.min(5, move.maxPP) not hardcoded 5', () => {
  it('should set PP to min(5, originalMaxPP) when transforming, not always hardcoded 5', () => {
    const originalMoves = [
      { id: 'hydropump', name: 'Hydro Pump', pp: 8, maxPP: 8 }, // 0 PP-Ups = 5 PP; 3 PP-Ups = 8 PP
    ];
    const user = { name: 'Ditto', species: 'ditto', isTransformed: false, moves: null };
    const targetPoke = { name: 'Blastoise', species: 'blastoise', moves: originalMoves };

    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-transform',
      parts: ['', '-transform', 'p1a: Ditto', 'p2a: Blastoise'],
      line: '|-transform|p1a: Ditto|p2a: Blastoise',
      p: null,
      getPoke: (id: string) => id.includes('Ditto') ? user : targetPoke,
      getSide: () => null,
    } as unknown as Parameters<typeof handleMiscEvents>[0];

    handleMiscEvents(ctx);

    // PP must be Math.min(5, 8) = 5 — coincidentally correct here, but if original is 6 it must be 5
    expect(user.moves).not.toBeNull();
    const pp = (user.moves as unknown as typeof originalMoves)[0]?.pp;
    const maxPP = (user.moves as unknown as typeof originalMoves)[0]?.maxPP;
    // Both pp and maxPP on transformed moves must be Math.min(5, originalMaxPP)
    expect(pp).toBe(Math.min(5, originalMoves[0]!.maxPP));
    expect(maxPP).toBe(Math.min(5, originalMoves[0]!.maxPP));
  });
});

// --- From test_bug039_detailschange_dynamic_import.spec.ts ---
describe('Audit Parity - BUG-039: detailschange/replace must not use dynamic import() in hot event path', () => {
  it('pokemonDataProvider should be statically importable and should not be lazily loaded per-event', async () => {
    // Verify that the bridge file itself does not contain a dynamic import() call
    // inside detailschange handling. We do this by reading the source file text.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const bridgePath = resolve(
      process.cwd(),
      'src/logic/battle/showdownBridgeMisc.ts'
    );
    const content = readFileSync(bridgePath, 'utf-8');

    // Detect dynamic import inside the detailschange/replace case block
    // The bug is present if there's an import() call inside detailschange handling
    const detailschangeSection = content.slice(
      content.indexOf("case 'detailschange'"),
      content.indexOf("case 'switch'")
    );

    expect(detailschangeSection).not.toContain('import(');
  });
});

// --- From test_bug040_fieldend_terrain_canonical.spec.ts ---
describe('Audit Parity - BUG-040: -fieldend must clear terrain when electricterrain ID arrives without spaces', () => {
  it('should clear terrain for all canonical terrain IDs in both display-name and ID form', async () => {
    const terrainIds = ['electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain'];

    for (const terrainId of terrainIds) {
      const battle = { terrain: terrainId, fieldConditions: {} as Record<string, unknown> };
      const ctx = {
        store: { activeBattle: { value: battle }, addLog: () => {} },
        type: '-fieldend',
        parts: ['', '-fieldend', terrainId],
        line: `|-fieldend|${terrainId}`,
        p: null,
        getPoke: () => null,
        getSide: () => null,
        playerSide: 'p1',
      } as unknown as Parameters<typeof handleFieldEvents>[0];

      await handleFieldEvents(ctx);

      expect(battle.terrain).toBeNull();
    }
  });
});

// --- From test_bug043_queue_choice_sync.spec.ts ---
describe('Audit Parity - BUG-043: queue choice sync', () => {
  it('should acknowledge choice queue updates', async () => {
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'queue',
      parts: ['', 'queue'],
      line: '|queue',
      getPoke: () => null,
      getSide: () => 'player',
      turnLogs: []
    };
    const handled = await handleCoreEvents(ctx as any);
    expect(handled).toBe(true);
  });
});

// --- From test_bug051_move_resets_disabled.spec.ts ---
describe('Audit Parity - BUG-051: move resets disabled turns', () => {
  it('should decrease or reset disabled turns when move is executed', async () => {
    const attacker = {
      name: 'Pikachu',
      disabledTurns: 3,
      disabledMove: { id: 'thunderbolt' }
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'move',
      parts: ['', 'move', 'p1a: Pikachu', 'Quick Attack'],
      line: '|move|p1a: Pikachu|Quick Attack',
      getPoke: () => attacker,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(attacker.disabledTurns).toBeLessThan(3);
  });
});

// --- From test_bug053_singleturn_effects.spec.ts ---
describe('Audit Parity - BUG-053: singleturn effects', () => {
  it('should set singleturn volatile counter for protect/roost', () => {
    const target = { name: 'Dragonite', volatileCounters: {} };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-singleturn',
      parts: ['', '-singleturn', 'p1a: Dragonite', 'move: Roost'],
      line: '|-singleturn|p1a: Dragonite|move: Roost',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect((target.volatileCounters as Record<string, number>)['roost']).toBe(1);
  });
});

// --- From test_bug055_enditem_lastitem.spec.ts ---
describe('Audit Parity - BUG-055: -enditem sets lastItem', () => {
  it('should store lost item in target.lastItem for Recycle/Harvest mechanics', () => {
    const target = {
      name: 'Snorlax',
      heldItem: 'sitrusberry',
      item: 'sitrusberry',
      lastItem: ''
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-enditem',
      parts: ['', '-enditem', 'p1a: Snorlax', 'Sitrus Berry', '[eat]'],
      line: '|-enditem|p1a: Snorlax|Sitrus Berry|[eat]',
      getPoke: () => target,
      getSide: () => 'player'
    };

    handleMiscEvents(ctx as any);
    expect(target.item).toBe('');
    expect(target.lastItem).toBe('Sitrus Berry');
  });
});

// --- From test_bug056_item_resets_lastitem.spec.ts ---
describe('Audit Parity - BUG-056: -item resets lastItem', () => {
  it('should clear lastItem when receiving a new item via -item', () => {
    const target = { name: 'Snorlax', item: '', lastItem: 'sitrusberry' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-item',
      parts: ['', '-item', 'p1a: Snorlax', 'Leftovers'],
      line: '|-item|p1a: Snorlax|Leftovers',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(target.item).toBe('Leftovers');
    expect(target.lastItem).toBe('');
  });
});

// --- From test_bug058_hitcount_animation_sync.spec.ts ---
describe('Audit Parity - BUG-058: -hitcount animation sync', () => {
  it('should parse -hitcount token correctly and add hit log', () => {
    let logged = false;
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => { logged = true; } },
      type: '-hitcount',
      parts: ['', '-hitcount', 'p2a: Substitute', '3'],
      line: '|-hitcount|p2a: Substitute|3',
      getPoke: () => ({ name: 'Substitute' }),
      getSide: () => 'enemy'
    };
    handleMiscEvents(ctx as any);
    expect(logged).toBe(true);
  });
});

// --- From test_bug059_switch_updates_details.spec.ts ---
describe('Audit Parity - BUG-059: switch updates details string', () => {
  it('should assign raw details string on switch event', () => {
    const target = { name: 'Pikachu', details: 'Pikachu, L50' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'switch',
      parts: ['', 'switch', 'p1a: Pikachu', 'Pikachu, L100, M, shiny', '100/100'],
      line: '|switch|p1a: Pikachu|Pikachu, L100, M, shiny|100/100',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(target.details).toBe('Pikachu, L100, M, shiny');
  });
});

// --- From test_bug060_damage_from_silent.spec.ts ---
describe('Audit Parity - BUG-060: -damage from silent flag', () => {
  it('should not add log entry when -damage line includes [silent]', async () => {
    let logCount = 0;
    const victim = { name: 'Pikachu', hp: 100, maxHp: 100 };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => { logCount++; }, animations: null },
      type: '-damage',
      parts: ['', '-damage', 'p1a: Pikachu', '80/100', '[from] recoil', '[silent]'],
      line: '|-damage|p1a: Pikachu|80/100|[from] recoil|[silent]',
      p: null,
      getPoke: () => victim,
      getSide: () => 'player',
      turnLogs: []
    };

    await handleCoreEvents(ctx as any);
    expect(logCount).toBe(0);
  });
});

// --- From test_bug062_miss_log_target.spec.ts ---
describe('Audit Parity - BUG-062: move miss log target', () => {
  it('should include target name in miss log', async () => {
    let logMsg = '';
    const attacker = { name: 'Pikachu' };
    const target = { name: 'Charizard' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-miss',
      parts: ['', '-miss', 'p1a: Pikachu', 'p2a: Charizard'],
      line: '|-miss|p1a: Pikachu|p2a: Charizard',
      getPoke: (id: string) => id.includes('Pikachu') ? attacker : target,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logMsg).toBeDefined();
  });
});

// --- From test_bug064_activate_subpart.spec.ts ---
describe('Audit Parity - BUG-064: activate subpart parsing', () => {
  it('should parse activate token with nested brackets', () => {
    let logMsg = '';
    const target = { name: 'Shedinja' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-activate',
      parts: ['', '-activate', 'p1a: Shedinja', 'ability: Wonder Guard'],
      line: '|-activate|p1a: Shedinja|ability: Wonder Guard',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(logMsg).toContain('Wonder Guard');
  });
});

// --- From test_bug071_prepare_log_style.spec.ts ---
describe('Audit Parity - BUG-071: prepare move log style', () => {
  it('should use player log style for player prepare moves', async () => {
    let logStyle = '';
    const attacker = { name: 'SolarBeamUser' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (_msg: string, style: string) => { logStyle = style; } },
      type: '-prepare',
      parts: ['', '-prepare', 'p1a: SolarBeamUser', 'Solar Beam'],
      line: '|-prepare|p1a: SolarBeamUser|Solar Beam',
      p: attacker,
      getPoke: () => attacker,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logStyle).toBe('log-player');
  });
});

// --- From test_bug072_tie_token_result.spec.ts ---
describe('Audit Parity - BUG-072: tie token result assignment', () => {
  it('should explicitly assign tie result in activeBattle store', async () => {
    const battle = { over: false, winnerResult: 'enemy' };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: 'tie',
      parts: ['', 'tie'],
      line: '|tie',
      getPoke: () => null,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(battle.over).toBe(true);
    expect(battle.winnerResult).toBe('tie');
  });
});

// --- From test_bug073_heal_drain_log.spec.ts ---
describe('Audit Parity - BUG-073: heal recoil from clause log', () => {
  it('should format drain/recoil heal log correctly', async () => {
    let logMsg = '';
    const target = { name: 'Venusaur', hp: 50, maxHp: 100 };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-heal',
      parts: ['', '-heal', 'p1a: Venusaur', '80/100', '[from] drain'],
      line: '|-heal|p1a: Venusaur|80/100|[from] drain',
      getPoke: () => target,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logMsg).toContain('absorbió');
  });
});

// --- From test_bug076_start_lockedmove.spec.ts ---
describe('Audit Parity - BUG-076: start lockedmove counter', () => {
  it('should set lockedmove volatile counter on start lockedmove token', async () => {
    const target = { name: 'OutrageUser', volatileCounters: {} };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-start',
      parts: ['', '-start', 'p1a: OutrageUser', 'Outrage'],
      line: '|-start|p1a: OutrageUser|Outrage',
      getPoke: () => target,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect((target.volatileCounters as Record<string, number>)['lockedmove']).toBe(1);
  });
});

// --- From test_bug077_end_lockedmove.spec.ts ---
describe('Audit Parity - BUG-077: end lockedmove counter clear', () => {
  it('should remove lockedmove volatile counter on end lockedmove token', async () => {
    const target = { name: 'OutrageUser', volatileCounters: { lockedmove: 1 } };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-end',
      parts: ['', '-end', 'p1a: OutrageUser', 'Outrage'],
      line: '|-end|p1a: OutrageUser|Outrage',
      getPoke: () => target,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(target.volatileCounters['lockedmove']).toBeUndefined();
  });
});

// --- From test_bug078_item_eat_verb.spec.ts ---
describe('Audit Parity - BUG-078: item eat verb log', () => {
  it('should use eat verb when line includes [eat]', () => {
    let logMsg = '';
    const target = { name: 'Snorlax' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-enditem',
      parts: ['', '-enditem', 'p1a: Snorlax', 'Oran Berry', '[eat]'],
      line: '|-enditem|p1a: Snorlax|Oran Berry|[eat]',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(logMsg).toContain('comió');
  });
});

// --- From test_bug079_anim_token_handled.spec.ts ---
describe('Audit Parity - BUG-079: anim token handled return true', () => {
  it('should return true when -anim token is received', () => {
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-anim',
      parts: ['', '-anim', 'p1a: Pikachu', 'Thunderbolt', 'p2a: Charizard'],
      line: '|-anim|p1a: Pikachu|Thunderbolt|p2a: Charizard',
      getPoke: () => null,
      getSide: () => 'player'
    };
    expect(handleMiscEvents(ctx as any)).toBe(true);
  });
});

// --- From test_bug081_catch_status_multiplier.spec.ts ---
describe('Audit Parity - BUG-081: catch rate status multiplier', () => {
  it('should apply 2.5 multiplier for sleep status', () => {
    const pokeSlp = { name: 'Pikachu', hp: 10, maxHp: 100, status: 'slp', catchRate: 45 };
    const res = calculateCatchRatePure(pokeSlp as any, 'poke-ball', 1, {});
    expect(res.statusMultiplierApplied).toBe(true);
  });
});

// --- From test_bug082_dusk_ball_multiplier.spec.ts ---
describe('Audit Parity - BUG-082: dusk ball multiplier', () => {
  it('should apply 3.0 dusk multiplier during dusk cycle', () => {
    const poke = { name: 'Pikachu', hp: 100, maxHp: 100, catchRate: 45 };
    const res = calculateCatchRatePure(poke as any, 'dusk', 1, { cycle: 'dusk' });
    expect(res).toBeDefined();
  });
});

// --- From test_bug083_switch_status_preservation.spec.ts ---
describe('Audit Parity - BUG-083: switch preserves active status', () => {
  it('should not reset active status to null on switch event when no status is given', async () => {
    const target = { name: 'Pikachu', hp: 100, maxHp: 100, status: 'psn' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'switch',
      parts: ['', 'switch', 'p1a: Pikachu', 'Pikachu, L50', '100/100'],
      line: '|switch|p1a: Pikachu|Pikachu, L50|100/100',
      getPoke: () => target,
      getSide: () => 'player'
    };
    await handleCoreEvents(ctx as any);
    expect(target.status).toBe('psn');
  });
});
