import { describe, it, expect } from 'vitest';
import { BattleCheatManager } from '@/logic/battle/helpers/battleCheatManager.ts';
import { createShowdownBattle } from '@/logic/battle/helpers/showdownBattleFactory.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '@/data/system/constants.ts';

const makePoke = (species: string, moves: string[]) => ({
  name: species,
  species,
  moves,
  gender: 'M',
  ability: 'illuminate',
  evs: { hp: 85, atk: 85, def: 85, spa: 85, spd: 85, spe: 85 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  item: '',
  level: 100,
  nature: 'hardy'
});

describe('BattleCheatManager - Unit & Integrity Tests', () => {
  it('should parse history terna correctly and apply post-turn heal', () => {
    const history = [
      { turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1, p1Heal: true as const },
      { turnCount: 2, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 2 }
    ];

    const cheatManager = new BattleCheatManager(history);
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, [1, 2, 3, 4]);
    battle.setPlayer('p1', { name: 'Player', team: [makePoke('Mew', ['tackle'])] });
    battle.setPlayer('p2', { name: 'Enemy', team: [makePoke('Blissey', ['tackle'])] });

    // Simulate P1 taking damage so HP drops below max
    battle.p1.pokemon[0]!.hp = 50;

    expect(cheatManager.getAppliedCheatsCount()).toBe(0);

    // Evaluate post-turn cheat for turn 1
    cheatManager.applyPostTurnCheats(battle);

    expect(cheatManager.getAppliedCheatsCount()).toBe(1);
    expect(battle.p1.pokemon[0]!.hp).toBe(battle.p1.pokemon[0]!.maxhp);
  });

  it('should not re-apply heal cheat if already applied for the turn', () => {
    const history = [
      { turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1, p1Heal: true as const }
    ];

    const cheatManager = new BattleCheatManager(history);
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, [1, 2, 3, 4]);
    battle.setPlayer('p1', { name: 'Player', team: [makePoke('Mew', ['tackle'])] });
    battle.setPlayer('p2', { name: 'Enemy', team: [makePoke('Blissey', ['tackle'])] });

    battle.p1.pokemon[0]!.hp = 20;

    cheatManager.applyPostTurnCheats(battle);
    expect(cheatManager.getAppliedCheatsCount()).toBe(1);

    // Call again on same turn
    cheatManager.applyPostTurnCheats(battle);
    expect(cheatManager.getAppliedCheatsCount()).toBe(1);
  });

  it('should apply pre-turn cheat when active pokemon is fainted', () => {
    const history = [
      { turnCount: 1, p1Choice: 'move 1', p2Choice: 'move 1', battleTurn: 1, p1Heal: true as const }
    ];

    const cheatManager = new BattleCheatManager(history);
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, [1, 2, 3, 4]);
    battle.setPlayer('p1', { name: 'Player', team: [makePoke('Mew', ['tackle'])] });
    battle.setPlayer('p2', { name: 'Enemy', team: [makePoke('Blissey', ['tackle'])] });

    // Set fainted
    battle.p1.pokemon[0]!.hp = 0;
    battle.p1.pokemon[0]!.fainted = true;

    cheatManager.applyPreTurnCheats(battle, true);
    expect(cheatManager.getAppliedCheatsCount()).toBe(1);
    expect(battle.p1.pokemon[0]!.fainted).toBe(false);
    expect(battle.p1.pokemon[0]!.hp).toBe(battle.p1.pokemon[0]!.maxhp);
  });
});
