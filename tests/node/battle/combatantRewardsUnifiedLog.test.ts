import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle/battle';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { processCombatantExpAndEvs } from '@/logic/battle/rewards/combatantExpEvProcessor';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Unified Combatant Rewards Log (Tier 1)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('unifies EXP, accumulated EVs from multiple combatants, and friendship in 1 entry per Pokemon', async () => {
    const gs = useGameStore();
    const battleStore = useBattleStore();

    const nidorino = makePokemon('nidorino', 30)!;
    nidorino.exp = 0;
    nidorino.expNeeded = 500;
    nidorino.hp = 100;
    nidorino.maxHp = 100;
    nidorino.friendship = 70;
    nidorino.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    const blastoise = makePokemon('blastoise', 40)!;
    blastoise.exp = 0;
    blastoise.expNeeded = 1000;
    blastoise.hp = 120;
    blastoise.maxHp = 120;
    blastoise.friendship = 80;
    blastoise.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    // Fainted Pokemon that should gain nothing and be omitted
    const faintedMon = makePokemon('rattata', 10)!;
    faintedMon.hp = 0;
    faintedMon.fainted = true;
    faintedMon.friendship = 70;

    gs.state.team = [nidorino, blastoise, faintedMon];

    const enemyGengar = makePokemon('gengar', 35)!; // Yields 3 SpA EVs
    const enemyDragonite = makePokemon('dragonite', 35)!; // Yields 3 Atk EVs

    battleStore.state = {
      isPvP: false,
      isTrainer: true,
      player: nidorino,
      enemy: enemyGengar,
      participants: [nidorino.uid, blastoise.uid],
      _rewardCombatants: [enemyGengar, enemyDragonite],
      locationId: 'route1',
      initialFriendships: {
        [nidorino.uid]: 70,
        [blastoise.uid]: 80,
        [faintedMon.uid]: 70,
      },
      over: true,
    } as unknown as typeof battleStore.state;

    const loggedEntries: Array<{ msg: string; source: unknown }> = [];
    const ctx = battleStore.getContext();
    ctx.addLog = (msg: string, _type?: string, source?: unknown) => {
      loggedEntries.push({ msg, source });
    };

    await processCombatantExpAndEvs(ctx, {
      combatants: [enemyGengar, enemyDragonite],
      participantsSet: new Set([nidorino.uid, blastoise.uid]),
      classMult: 1,
      totalExpMult: 1,
      totalExpMultWithoutEvent: 1,
      eventExpMultiplier: 1,
    });

    // Check that faintedMon was completely omitted from the reward logs
    const faintedLogs = loggedEntries.filter(
      (l) => l.source && (l.source as Pokemon).uid === faintedMon.uid
    );
    expect(faintedLogs.length).toBe(0);

    // Check that nidorino got exactly ONE unified log entry
    const nidorinoLogs = loggedEntries.filter(
      (l) => l.source && (l.source as Pokemon).uid === nidorino.uid
    );
    expect(nidorinoLogs.length).toBe(1);

    const nidorinoMsg = nidorinoLogs[0]!.msg;
    // Renglón 1 must contain name, level, and EXP
    expect(nidorinoMsg).toContain('Nidorino');
    expect(nidorinoMsg).toContain('EXP');
    // Renglón 2 must contain aggregated EVs (+3 Atk and +3 At.Esp)
    expect(nidorinoMsg).toContain('EVs:');
    expect(nidorinoMsg).toContain('+3 Atk');
    expect(nidorinoMsg).toContain('+3 At.Esp');
    // No +0 should ever be present
    expect(nidorinoMsg).not.toContain('+0');

    // Check that blastoise also got exactly ONE unified log entry
    const blastoiseLogs = loggedEntries.filter(
      (l) => l.source && (l.source as Pokemon).uid === blastoise.uid
    );
    expect(blastoiseLogs.length).toBe(1);
    const blastoiseMsg = blastoiseLogs[0]!.msg;
    expect(blastoiseMsg).toContain('Blastoise');
    expect(blastoiseMsg).toContain('+3 Atk');
    expect(blastoiseMsg).toContain('+3 At.Esp');
  });

  it('renders a clean 1-line entry when there are no EV or friendship deltas', async () => {
    const gs = useGameStore();
    const battleStore = useBattleStore();

    const maxEvMon = makePokemon('pikachu', 50)!;
    maxEvMon.exp = 0;
    maxEvMon.expNeeded = 1000;
    maxEvMon.hp = 100;
    maxEvMon.maxHp = 100;
    maxEvMon.friendship = 100;
    // Maxed out EVs (510 total) so it cannot gain any EVs
    maxEvMon.evs = { hp: 252, atk: 252, def: 6, spa: 0, spd: 0, spe: 0 };

    gs.state.team = [maxEvMon];

    const enemy = makePokemon('rattata', 10)!;

    battleStore.state = {
      isPvP: false,
      isTrainer: false,
      player: maxEvMon,
      enemy,
      participants: [maxEvMon.uid],
      _rewardCombatants: [enemy],
      locationId: 'route1',
      initialFriendships: {
        [maxEvMon.uid]: 100,
      },
      over: true,
    } as unknown as typeof battleStore.state;

    const loggedEntries: Array<{ msg: string; source: unknown }> = [];
    const ctx = battleStore.getContext();
    ctx.addLog = (msg: string, _type?: string, source?: unknown) => {
      loggedEntries.push({ msg, source });
    };

    await processCombatantExpAndEvs(ctx, {
      combatants: [enemy],
      participantsSet: new Set([maxEvMon.uid]),
      classMult: 1,
      totalExpMult: 1,
      totalExpMultWithoutEvent: 1,
      eventExpMultiplier: 1,
    });

    const pokeLogs = loggedEntries.filter(
      (l) => l.source && (l.source as Pokemon).uid === maxEvMon.uid
    );
    expect(pokeLogs.length).toBe(1);

    const msg = pokeLogs[0]!.msg;
    expect(msg).toContain('Pikachu');
    expect(msg).toContain('EXP');
    // Secondary line (reward-line-secondary) should NOT exist because no EVs or friendship changed
    expect(msg).not.toContain('reward-line-secondary');
    expect(msg).not.toContain('EVs:');
    expect(msg).not.toContain('❤️');
  });

  it('displays level up in gold and friendship heart delta when level up awards friendship', async () => {
    const gs = useGameStore();
    const battleStore = useBattleStore();

    const lowLevelMon = makePokemon('caterpie', 2)!;
    lowLevelMon.exp = 0;
    lowLevelMon.expNeeded = 10; // easily levels up
    lowLevelMon.hp = 20;
    lowLevelMon.maxHp = 20;
    lowLevelMon.friendship = 70;
    lowLevelMon.evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    gs.state.team = [lowLevelMon];

    const enemy = makePokemon('pidgey', 20)!;

    battleStore.state = {
      isPvP: false,
      isTrainer: false,
      player: lowLevelMon,
      enemy,
      participants: [lowLevelMon.uid],
      _rewardCombatants: [enemy],
      locationId: 'route1',
      initialFriendships: {
        [lowLevelMon.uid]: 70,
      },
      over: true,
    } as unknown as typeof battleStore.state;

    const loggedEntries: Array<{ msg: string; source: unknown }> = [];
    const ctx = battleStore.getContext();
    ctx.addLog = (msg: string, _type?: string, source?: unknown) => {
      loggedEntries.push({ msg, source });
    };

    await processCombatantExpAndEvs(ctx, {
      combatants: [enemy],
      participantsSet: new Set([lowLevelMon.uid]),
      classMult: 1,
      totalExpMult: 1,
      totalExpMultWithoutEvent: 1,
      eventExpMultiplier: 1,
    });

    const pokeLogs = loggedEntries.filter(
      (l) => l.source && (l.source as Pokemon).uid === lowLevelMon.uid
    );
    expect(pokeLogs.length).toBe(1);

    const msg = pokeLogs[0]!.msg;
    expect(msg).toContain('Caterpie');
    expect(msg).toContain('¡Nv.');
    expect(msg).toContain('❤️');
    expect(msg).toContain('reward-lvl');
  });
});
