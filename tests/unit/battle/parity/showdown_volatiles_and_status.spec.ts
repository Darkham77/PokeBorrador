import { describe, it, expect } from 'vitest';
import { handleCoreEvents } from '@/logic/battle/showdownBridgeCore';
import { handleMiscEvents } from '@/logic/battle/showdownBridgeMisc';
import { handleFieldEvents } from '@/logic/battle/showdownBridgeField';

// --- From test_bug021_heal_status_injection.spec.ts ---
describe('Audit Parity - BUG-021: -heal silently applies appended status', () => {
  it('should NOT set status on target when healing even if status appears in HP string', async () => {
    const mockPoke = { hp: 100, maxHp: 200, status: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: '-heal',
      parts: ['', '-heal', 'p1a: Pikachu', '120/200 brn'],
      line: '|-heal|p1a: Pikachu|120/200 brn',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);
    // A -heal line must NEVER set status — it's informational only
    expect(mockPoke.status).toBeNull();
  });
});

// --- From test_bug022_damage_status_injection.spec.ts ---
describe('Audit Parity - BUG-022: -damage silently applies appended status', () => {
  it('should NOT set status on victim when the HP string contains a status code', async () => {
    const mockPoke = { hp: 150, maxHp: 200, status: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {}, animations: null },
      type: '-damage',
      parts: ['', '-damage', 'p1a: Pikachu', '120/200 brn'],
      line: '|-damage|p1a: Pikachu|120/200 brn',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);
    // The status in HP string is informational — only |-status| should set it
    expect(mockPoke.status).toBeNull();
  });
});

// --- From test_bug023_faint_fnt_status.spec.ts ---
describe('Audit Parity - BUG-023: faint sets invalid status fnt', () => {
  it('should NOT set target.status to "fnt" — faint is tracked via fainted flag, not status', async () => {
    const mockPoke = { hp: 10, maxHp: 200, status: null, fainted: false };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'faint',
      parts: ['', 'faint', 'p1a: Pikachu'],
      line: '|faint|p1a: Pikachu',
      p: null,
      getPoke: () => mockPoke,
      getSide: () => 'player',
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);
    // faint must only set fainted=true and hp=0; status should remain null or ''
    expect(mockPoke.fainted).toBe(true);
    expect(mockPoke.hp).toBe(0);
    expect(mockPoke.status).not.toBe('fnt');
  });
});

// --- From test_bug024_curestatusall_double_clear.spec.ts ---
describe('Audit Parity - BUG-024: -curestatusall must not create redundant double-clear on active slot', () => {
  it('should not separately set battle.player.status=null when it already cleared it via team loop', async () => {
    const activePlayer = { name: 'Pikachu', status: 'brn' as unknown };
    const playerTeam = [activePlayer, { name: 'Charizard', status: 'psn' as unknown }];
    const battle = {
      player: activePlayer,         // same reference as team[0]
      enemy: null,
      playerTeam,
      enemyTeam: [],
    };
    const store = { activeBattle: { value: battle }, addLog: () => {} };
    const ctx = {
      store,
      type: '-curestatusall',
      parts: ['', '-curestatusall'],
      line: '|-curestatusall',
      p: null,
      getPoke: () => null,
      getSide: () => null,
      turnLogs: [],
    } as unknown as Parameters<typeof handleCoreEvents>[0];
    await handleCoreEvents(ctx);

    // All team members must be cured
    expect(playerTeam[0]?.status).toBe('');
    expect(playerTeam[1]?.status).toBe('');
    // active player reference must also be empty string (same object)
    expect(battle.player.status).toBe('');
  });
});

// --- From test_bug044_faint_clears_volatiles.spec.ts ---
describe('Audit Parity - BUG-044: faint clears volatileCounters and boosts', () => {
  it('should clear target volatileCounters when faint event occurs', async () => {
    const target = {
      name: 'Pikachu',
      hp: 50,
      fainted: false,
      volatileCounters: { confusion: 1, substitute: 1 }
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'faint',
      parts: ['', 'faint', 'p1a: Pikachu'],
      line: '|faint|p1a: Pikachu',
      getPoke: () => target,
      getSide: () => 'player',
      turnLogs: []
    };

    await handleCoreEvents(ctx as any);
    expect(target.fainted).toBe(true);
    expect(Object.keys(target.volatileCounters).length).toBe(0);
  });
});

// --- From test_bug045_switch_clears_volatiles.spec.ts ---
describe('Audit Parity - BUG-045: switch/drag clears volatileCounters', () => {
  it('should clear volatileCounters on switching pokemon', () => {
    const target = {
      name: 'Charizard',
      hp: 100,
      maxHp: 100,
      volatileCounters: { confusion: 1, taunt: 1 }
    };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: () => {} },
      type: 'switch',
      parts: ['', 'switch', 'p1a: Charizard', 'Charizard, L100', '100/100'],
      line: '|switch|p1a: Charizard|Charizard, L100|100/100',
      getPoke: () => target,
      getSide: () => 'player'
    };

    handleMiscEvents(ctx as any);
    expect(Object.keys(target.volatileCounters).length).toBe(0);
  });
});

// --- From test_bug061_cant_truancy.spec.ts ---
describe('Audit Parity - BUG-061: cant truancy message', () => {
  it('should parse cant truancy reason correctly', () => {
    let logMsg = '';
    const target = { name: 'Slaking' };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: 'cant',
      parts: ['', 'cant', 'p1a: Slaking', 'ability: Truant'],
      line: '|cant|p1a: Slaking|ability: Truant',
      getPoke: () => target,
      getSide: () => 'player'
    };
    handleMiscEvents(ctx as any);
    expect(logMsg).toContain('Truant');
  });
});

// --- From test_bug063_toxicspikes_cap.spec.ts ---
describe('Audit Parity - BUG-063: sidestart toxicspikes 2 layers cap', () => {
  it('should cap toxicspikes strictly at 2 layers', async () => {
    const battle = { playerSideConditions: { toxicspikes: { turns: 2 } } };
    const ctx = {
      store: { activeBattle: { value: battle }, addLog: () => {} },
      type: '-sidestart',
      parts: ['', '-sidestart', 'p1: Player', 'move: Toxic Spikes'],
      line: '|-sidestart|p1: Player|move: Toxic Spikes',
      getPoke: () => null,
      getSide: () => 'player',
      playerSide: 'p1'
    };
    await handleFieldEvents(ctx as any);
    expect(battle.playerSideConditions.toxicspikes.turns).toBe(2);
  });
});

// --- From test_bug080_status_msg_mapping.spec.ts ---
describe('Audit Parity - BUG-080: status message custom mappings', () => {
  it('should include target name in status application log', async () => {
    let logMsg = '';
    const target = { name: 'Gengar', status: null };
    const ctx = {
      store: { activeBattle: { value: {} }, addLog: (msg: string) => { logMsg = msg; } },
      type: '-status',
      parts: ['', '-status', 'p1a: Gengar', 'psn'],
      line: '|-status|p1a: Gengar|psn',
      getPoke: () => target,
      getSide: () => 'player',
      turnLogs: []
    };
    await handleCoreEvents(ctx as any);
    expect(logMsg).toContain('Gengar');
    expect(target.status).toBe('psn');
  });
});

// --- From test_curestatus_silent_parity.spec.ts ---
describe('Audit Parity - Curestatus Silent Override', () => {
  it('should respect [silent] flag in -curestatus event', async () => {
    let logCount = 0;
    const mockStore = {
      addLog: () => { logCount++; },
      activeBattle: { value: {} }
    };
    const ctx = {
      store: mockStore,
      type: '-curestatus',
      parts: ['', '-curestatus', 'p1a: Pikachu', 'brn'],
      line: '|-curestatus|p1a: Pikachu|brn|[silent]',
      getPoke: () => ({ name: 'Pikachu', status: 'brn' }),
      getSide: () => 'player'
    };

    await handleCoreEvents(ctx as any);
    expect(logCount).toBe(0);
  });
});

// --- From test_status_silent_parity.spec.ts ---
describe('Audit Parity - Status Message Silent Override', () => {
  it('should respect [silent] flag in -status event', async () => {
    let logCount = 0;
    const mockStore = {
      addLog: () => { logCount++; },
      activeBattle: { value: {} }
    };
    const ctx = {
      store: mockStore,
      type: '-status',
      parts: ['', '-status', 'p1a: Pikachu', 'brn'],
      line: '|-status|p1a: Pikachu|brn|[silent]',
      getPoke: () => ({ name: 'Pikachu' }),
      getSide: () => 'player'
    };

    await handleCoreEvents(ctx as any);
    expect(logCount).toBe(0);
  });
});
