import { describe, it, expect } from 'vitest';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory';
import { ShowdownPerspectiveAdapter } from '../../../src/logic/battle/helpers/showdownPerspectiveAdapter';
import { ShowdownLogEnricher } from '../../../src/logic/battle/helpers/showdownLogEnricher';
import { classifyRequest, requiresAction } from '../../../src/logic/battle/helpers/requestHelper';
import type { ShowdownPlayerRequest } from '../../../src/types/battle/battle';

function createPvPTestBattle() {
  const battle = createShowdownBattle('gen5customgame', [1337, 42, 999, 123]);
  ShowdownLogEnricher.setupRealtimeEnrichment(battle);

  const team1 = [
    {
      name: 'Pikachu',
      species: 'Pikachu',
      item: '',
      ability: 'Static',
      moves: ['thunderbolt', 'quickattack'],
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    {
      name: 'Bulbasaur',
      species: 'Bulbasaur',
      item: '',
      ability: 'Overgrow',
      moves: ['vinewhip', 'tackle'],
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    }
  ];

  const team2 = [
    {
      name: 'Charmander',
      species: 'Charmander',
      item: '',
      ability: 'Blaze',
      moves: ['flamethrower', 'scratch'],
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    },
    {
      name: 'Squirtle',
      species: 'Squirtle',
      item: '',
      ability: 'Torrent',
      moves: ['watergun', 'tackle'],
      level: 50,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
    }
  ];

  battle.setPlayer('p1', { name: 'Host Player', team: team1 as any });
  battle.setPlayer('p2', { name: 'Guest Player', team: team2 as any });
  return battle;
}

describe('Showdown PvP Runner & Protocol Integration', () => {
  it('1. Authoritative Host executes turn with two human choices', () => {
    const battle = createPvPTestBattle();
    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    const out = engine.executeTurn({
      p1Choice: 'move 1',
      p2Choice: 'move 1'
    });

    expect(out.p1AcceptedChoice).toMatch(/^move 1/);
    expect(out.p2AcceptedChoice).toMatch(/^move 1/);
    expect(out.turnLogs.length).toBeGreaterThan(0);
    expect(battle.turn).toBe(2);

    // Logs contain move executions from both sides
    const hasP1Move = out.turnLogs.some(l => l.includes('|move|p1a:'));
    const hasP2Move = out.turnLogs.some(l => l.includes('|move|p2a:'));
    expect(hasP1Move).toBe(true);
    expect(hasP2Move).toBe(true);
  });

  it('2. Stream inversion for Guest perspective reverses p1/p2 correctly', () => {
    const battle = createPvPTestBattle();
    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    const out = engine.executeTurn({
      p1Choice: 'move 1',
      p2Choice: 'move 1'
    });

    const hostLogs = out.turnLogs;
    const guestLogs = ShowdownPerspectiveAdapter.invertStream(hostLogs);

    // If host has |move|p1a: Pikachu..., guest must see |move|p2a: Pikachu...
    const hostP1Line = hostLogs.find(l => l.startsWith('|move|p1a:'));
    expect(hostP1Line).toBeDefined();
    expect(guestLogs.some(l => l.startsWith('|move|p2a: Pikachu'))).toBe(true);

    const hostP2Line = hostLogs.find(l => l.startsWith('|move|p2a:'));
    expect(hostP2Line).toBeDefined();
    expect(guestLogs.some(l => l.startsWith('|move|p1a: Charmander'))).toBe(true);
  });

  it('3. Request inversion for Guest translates side and preserves choices', () => {
    const p2ReqFromHost: ShowdownPlayerRequest = {
      active: [
        {
          moves: [
            { move: 'Flamethrower', id: 'flamethrower', pp: 24, maxpp: 24, target: 'normal', disabled: false },
            { move: 'Scratch', id: 'scratch', pp: 35, maxpp: 35, target: 'normal', disabled: false }
          ]
        }
      ],
      side: {
        name: 'Guest Player',
        id: 'p2',
        pokemon: [
          { ident: 'p2: Charmander', details: 'Charmander, L50, M', condition: '100/100', active: true, stats: { atk: 52, def: 43, spa: 60, spd: 50, spe: 65 }, moves: ['flamethrower', 'scratch'], baseAbility: 'blaze', item: '', pokeball: 'pokeball' }
        ]
      },
      rqid: 1
    };

    const guestInverted = ShowdownPerspectiveAdapter.invertRequest(p2ReqFromHost);
    expect(guestInverted).toBeDefined();
    expect(guestInverted?.side?.id).toBe('p1');
    expect(guestInverted?.side?.pokemon[0]?.ident).toBe('p1: Charmander');
    expect(guestInverted?.active?.[0]?.moves?.length).toBe(2);
    expect(guestInverted?.active?.[0]?.moves?.[0]?.move).toBe('Flamethrower');
  });

  it('4. Faint sequence: P2 OHKO triggers forceSwitch and replacement switch', () => {
    const battle = createPvPTestBattle();
    // Set P2 active to 1 HP and P1 to level 100 so P1 OHKOs P2
    battle.p2.pokemon[0]!.hp = 1;
    (battle.p1.pokemon[0] as any).level = 100;

    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    // Turn 1: P1 attacks, P2 faints
    turn1Out();

    function turn1Out() {
      engine.executeTurn({
        p1Choice: 'move 1',
        p2Choice: 'move 1'
      });
    }

    expect(battle.p2.pokemon[0]!.hp).toBe(0);
    expect(battle.p2.pokemon[0]!.fainted).toBe(true);
    expect(classifyRequest(battle.p2.activeRequest)).toBe('force-switch');
    expect(requiresAction(battle.p2.activeRequest)).toBe(true);

    // Turn 2: P2 sends switch 2, P1 defaults to pass
    const turn2Out = engine.executeTurn({
      p1Choice: 'pass',
      p2Choice: 'switch 2'
    });

    expect(turn2Out.p2AcceptedChoice).toBe('switch 2');
    const switchLine = turn2Out.turnLogs.find(l => l.startsWith('|switch|p2a:'));
    expect(switchLine).toBeDefined();
    expect(switchLine).toContain('Squirtle');

    // Guest stream inversion turns it into p1a for Guest
    const guestLogs = ShowdownPerspectiveAdapter.invertStream(turn2Out.turnLogs);
    const guestSwitchLine = guestLogs.find(l => l.startsWith('|switch|p1a:'));
    expect(guestSwitchLine).toBeDefined();
    expect(guestSwitchLine).toContain('Squirtle');
  });

  it('5. Mid-turn switch: P1 switch executes before P2 attack', () => {
    const battle = createPvPTestBattle();
    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    const out = engine.executeTurn({
      p1Choice: 'switch 2',
      p2Choice: 'move 1'
    });

    expect(out.p1AcceptedChoice).toBe('switch 2');
    expect(out.p2AcceptedChoice).toMatch(/^move 1/);

    // In Showdown, regular switches execute with priority before normal attacks
    const switchIdx = out.turnLogs.findIndex(l => l.startsWith('|switch|p1a:'));
    const p2MoveIdx = out.turnLogs.findIndex(l => l.startsWith('|move|p2a:'));
    expect(switchIdx).toBeGreaterThan(-1);
    expect(p2MoveIdx).toBeGreaterThan(-1);
    expect(switchIdx).toBeLessThan(p2MoveIdx);
  });
});
