import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';
import { ref } from 'vue';
import { getEffectiveSpeed } from '@/logic/battle/battleEngine';
import { SBCtx } from '@/logic/battle/showdownBridgeCtx';
import { Pokemon } from '@/types/pokemon/pokemon';
import { BattleStages, BattleWeather } from '@/types/battle/battle';
import { setActivePinia, createPinia } from 'pinia';

// --- From test_bug031_end_disable_shadow_field.spec.ts ---
describe('Audit Parity - BUG-031: -end disable must also clear moves[i].disabled shadow field', () => {
  it('should clear disabled flag on the affected move object, not just the disabledMove reference', async () => {
    const mockMove = { id: 'hydropump', name: 'Hydro Pump', disabled: true };
    const mockPoke = {
      name: 'Blastoise',
      disabledMove: { id: 'hydropump', name: 'Hydro Pump' },
      disabledTurns: 2,
      volatileCounters: {},
      moves: [mockMove],
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-end',
      parts: ['', '-end', 'p1a: Blastoise', 'Disable'],
      line: '|-end|p1a: Blastoise|Disable',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // disabledMove reference must be cleared
    expect(mockPoke.disabledMove).toBeNull();
    expect(mockPoke.disabledTurns).toBe(0);
    // The actual move's disabled flag must ALSO be cleared
    expect(mockMove.disabled).toBe(false);
  });
});

// --- From test_bug032_fieldend_terrain_id.spec.ts ---
describe('Audit Parity - BUG-032: -fieldend must clear terrain when condition arrives in ID form', () => {
  it('should clear activeBattle.terrain when fieldend arrives as lowercase ID "electricterrain"', async () => {
    const battle = { terrain: 'electricterrain', fieldConditions: {} };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-fieldend',
      parts: ['', '-fieldend', 'electricterrain'],
      line: '|-fieldend|electricterrain',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // terrain must be cleared regardless of whether it arrives as display name or canonical ID
    expect(battle.terrain).toBeNull();
  });
});

// --- From test_bug033_fieldstart_terrain_detection.spec.ts ---
describe('Audit Parity - BUG-033: -fieldstart terrain detection by substring is fragile', () => {
  it('should NOT classify a pseudo-weather containing "terrain" in name as an actual terrain', async () => {
    const battle = { terrain: null, fieldConditions: {} as Record<string, unknown> };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-fieldstart',
      // Simulate a pseudo-weather move called "desolatedterrain" (hypothetical, but valid canonical ID)
      parts: ['', '-fieldstart', 'desolatedterrain'],
      line: '|-fieldstart|desolatedterrain',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      playerSide: 'p1',
    } as unknown as Parameters<typeof handleFieldEvents>[0];

    await handleFieldEvents(ctx);

    // A non-canonical terrain should go to fieldConditions, NOT overwrite activeBattle.terrain
    expect(battle.terrain).toBeNull();
    expect(battle.fieldConditions['desolatedterrain']).toBeDefined();
  });
});

// --- From test_bug034_sidestart_toid_normalization.spec.ts ---
describe('Audit Parity - BUG-034: -sidestart/-sideend must use toID() not .replace(/[^a-z0-9]/g, "")', () => {
  it('showdownBridgeField.ts must not use .replace(/[^a-z0-9]/g) for sidestart condition key normalization', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const bridgePath = resolve(process.cwd(), 'src/logic/battle/showdownBridgeField.ts');
    const content = readFileSync(bridgePath, 'utf-8');

    // Extract the -sidestart case block
    const sidestartSection = content.slice(
      content.indexOf("case '-sidestart'"),
      content.indexOf("case '-sideend'")
    );

    // The forbidden normalization pattern must not appear in the sidestart block
    expect(sidestartSection).not.toMatch(/\.replace\(\/\[.*?\]\/g?/);
    // toID() must be used instead
    expect(sidestartSection).toContain('toID(');
  });
});

// --- From test_bug042_weather_upkeep_flag.spec.ts ---
describe('Audit Parity - BUG-042: -weather [upkeep] flag suppresses log', () => {
  it('should not add a new log entry when -weather line contains [upkeep]', async () => {
    let logsCount = 0;
    const mockStore = {
      activeBattle: { value: { weather: { type: 'clear' } } },
      addLog: () => { logsCount++; }
    };
    const ctx = {
      store: mockStore,
      type: '-weather',
      parts: ['', '-weather', 'RainDance', '[upkeep]'],
      line: '|-weather|RainDance|[upkeep]',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };

    await handleFieldEvents(ctx as any);
    expect(logsCount).toBe(0);
  });
});

// --- From test_bug052_weather_none_clear.spec.ts ---
describe('Audit Parity - BUG-052: -weather none clear', () => {
  it('should set activeBattle weather type to clear when -weather none is received', async () => {
    const battle = { weather: { type: 'rain' } };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-weather',
      parts: ['', '-weather', 'none'],
      line: '|-weather|none',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };

    await handleFieldEvents(ctx as any);
    expect(battle.weather.type).toBe('clear');
  });
});

// --- From test_bug054_spikes_cap.spec.ts ---
describe('Audit Parity - BUG-054: spikes cap at 3 layers', () => {
  it('should cap spikes layers strictly at 3', async () => {
    const battle = { playerSideConditions: { spikes: { turns: 3 } } };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-sidestart',
      parts: ['', '-sidestart', 'p1: Player', 'Spikes'],
      line: '|-sidestart|p1: Player|Spikes',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(battle.playerSideConditions.spikes.turns).toBe(3);
  });
});

// --- From test_bug057_swapsideconditions_null.spec.ts ---
describe('Audit Parity - BUG-057: -swapsideconditions null safety', () => {
  it('should swap side conditions safely even when one side conditions object is null/undefined', async () => {
    const battle = { playerSideConditions: { reflect: { turns: 5 } }, enemySideConditions: undefined };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-swapsideconditions',
      parts: ['', '-swapsideconditions'],
      line: '|-swapsideconditions',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect((battle.enemySideConditions as unknown as Record<string, { turns: number }> | undefined)?.reflect?.turns).toBe(5);
    expect(battle.playerSideConditions).toBeUndefined();
  });
});

// --- From test_bug074_fieldend_terrain_msg.spec.ts ---
describe('Audit Parity - BUG-074: fieldend terrain log clear message', () => {
  it('should format electricterrain fieldend log correctly', async () => {
    let logMsg = '';
    const battle = { terrain: 'electricterrain' };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-fieldend',
      parts: ['', '-fieldend', 'move: Electric Terrain'],
      line: '|-fieldend|move: Electric Terrain',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(battle.terrain).toBeNull();
    expect(logMsg).toContain('desapareció');
  });
});

// --- From test_bug075_fieldstart_gravity.spec.ts ---
describe('Audit Parity - BUG-075: fieldstart gravity message log', () => {
  it('should format gravity fieldstart log correctly', async () => {
    let logMsg = '';
    const battle = { fieldConditions: {} };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-fieldstart',
      parts: ['', '-fieldstart', 'move: Gravity'],
      line: '|-fieldstart|move: Gravity',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(logMsg).toContain('gravedad');
  });
});

// --- From test_fieldend_terrain_clear.spec.ts ---
describe('Audit Parity - Normalized Fieldend Terrain Token (|fieldend|)', () => {
  it('should clear active terrain when fieldend receives normalized lowercase terrain token (electricterrain)', async () => {
    const mockStore = {
      activeBattle: {
        value: {
          terrain: 'electricterrain',
          fieldConditions: {}
        }
      },
      addLog: () => {}
    };

    const ctx = {
      store: mockStore,
      type: '-fieldend',
      parts: ['', '-fieldend', 'move: Electric Terrain'],
      line: '|-fieldend|move: Electric Terrain',
      getPoke: () => null,
      playerSide: 'p1'
    };

    // Simulated log line with normalized terrain token 'electricterrain'
    const normalizedCtx = {
      ...ctx,
      parts: ['', '-fieldend', 'electricterrain'],
      line: '|-fieldend|electricterrain'
    };

    await handleFieldEvents(normalizedCtx as any);

    // Expect active battle terrain to be cleared to null
    expect(mockStore.activeBattle.value.terrain).toBeNull();
  });
});

// --- From test_fieldstart_clean_key.spec.ts ---
describe('Audit Parity - Clean Key Fieldstart Token', () => {
  it('should recognize fieldstart token with move prefix', async () => {
    const mockStore = {
      activeBattle: { value: { fieldConditions: {} } },
      addLog: () => {}
    };
    const ctx = {
      store: mockStore,
      type: '-fieldstart',
      parts: ['', '-fieldstart', 'move: Trick Room'],
      line: '|-fieldstart|move: Trick Room',
      getPoke: () => null,
      playerSide: 'p1'
    };
    const handled = await handleFieldEvents(ctx as any);
    expect(handled).toBe(true);
    const conds = mockStore.activeBattle.value.fieldConditions as Record<string, unknown>;
    expect(conds['trickroom']).toBeDefined();
  });
});

// --- From test_sideend_clean_key.spec.ts ---
describe('Audit Parity - Clean Key Sideend Token', () => {
  it('should remove side condition when sideend has move prefix', () => {
    const mockStore = {
      activeBattle: {
        value: {
          playerSideConditions: {
            reflect: { turns: 5 }
          }
        }
      },
      addLog: () => {}
    };
    const ctx = {
      store: mockStore,
      type: '-sideend',
      parts: ['', '-sideend', 'p1', 'move: Reflect'],
      line: '|-sideend|p1|move: Reflect',
      getSide: () => 'player',
      playerSide: 'p1'
    };
    handleFieldEvents(ctx as any);
    expect(mockStore.activeBattle.value.playerSideConditions.reflect).toBeUndefined();
  });
});

// --- From test_weather_terrain.spec.ts ---
vi.mock('@/logic/utils/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'night'),
  sleep: vi.fn(async () => {})
}))

describe('Battle Weather and Terrain Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('updates battle weather in store when handling -weather events', () => {
    const activeBattle = ref({
      weather: { type: 'clear', visual: 'clear', turns: -1 }
    })
    const logs: string[] = []

    const mockCtx = {
      store: {
        activeBattle,
        addLog: (msg: string) => logs.push(msg)
      },
      type: '-weather',
      parts: ['', '-weather', 'SunnyDay'],
      line: '|-weather|SunnyDay',
      getPoke: () => null
    } as unknown as SBCtx

    handleFieldEvents(mockCtx)

    expect(activeBattle.value.weather.type).toBe('sun')
    expect(activeBattle.value.weather.visual).toBe('sun')
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]).toContain('clima')
  })

  it('correctly calculates speed doubling under Sun for Chlorophyll ability', () => {
    const pokemon = {
      uid: 'p1',
      name: 'Oddish',
      spe: 100,
      ability: 'chlorophyll'
    } as unknown as Pokemon

    const stages: BattleStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    }

    const clearWeather: BattleWeather = { type: 'clear', visual: 'clear', turns: -1 }
    const sunWeather: BattleWeather = { type: 'sun', visual: 'sun', turns: 5 }

    const speedClear = getEffectiveSpeed(pokemon, stages, { weather: clearWeather })
    const speedSun = getEffectiveSpeed(pokemon, stages, { weather: sunWeather })

    expect(speedClear).toBe(100)
    expect(speedSun).toBe(200) // Chlorophyll doubles speed in sun
  })

  it('correctly calculates speed doubling under Rain for Swift Swim ability', () => {
    const pokemon = {
      uid: 'p2',
      name: 'Horsea',
      spe: 100,
      ability: 'swiftswim'
    } as unknown as Pokemon

    const stages: BattleStages = {
      atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0,
      reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
    }

    const clearWeather: BattleWeather = { type: 'clear', visual: 'clear', turns: -1 }
    const rainWeather: BattleWeather = { type: 'rain', visual: 'rain', turns: 5 }

    const speedClear = getEffectiveSpeed(pokemon, stages, { weather: clearWeather })
    const speedRain = getEffectiveSpeed(pokemon, stages, { weather: rainWeather })

    expect(speedClear).toBe(100)
    expect(speedRain).toBe(200) // Swift Swim doubles speed in rain
  })
})
