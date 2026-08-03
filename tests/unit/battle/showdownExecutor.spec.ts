import { describe, it, expect, beforeEach } from 'vitest';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '@/logic/battle/helpers/showdownExecutor';
import { ACTIVE_SHOWDOWN_FORMAT } from '@/data/system/constants';

describe('showdownExecutor - Invalid Choice / Obsolete Turn Safeguard', () => {
  let battle: Battle;

  beforeEach(() => {
    battle = new Battle({ formatid: ACTIVE_SHOWDOWN_FORMAT as import('@pkmn/sim').ID });
    battle.setPlayer('p1', {
      name: 'Player 1',
      team: [
        { name: 'Rayquaza', species: 'Rayquaza', level: 55, moves: ['outrage', 'fly'], item: '', ability: 'Air Lock', nature: 'Hardy', gender: 'M', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 252, atk: 252, def: 4, spa: 0, spd: 0, spe: 0 } },
        { name: 'Charmander', species: 'Charmander', level: 5, moves: ['ember'], item: '', ability: 'Blaze', nature: 'Hardy', gender: 'F', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
      ]
    });
    battle.setPlayer('p2', {
      name: 'Player 2',
      team: [
        { name: 'Dragonite', species: 'Dragonite', level: 23, moves: ['blizzard'], item: '', ability: 'Inner Focus', nature: 'Hardy', gender: 'M', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
        { name: 'Nidoking', species: 'Nidoking', level: 23, moves: ['earthquake'], item: '', ability: 'Poison Point', nature: 'Hardy', gender: 'M', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
      ]
    });
    // Avanzar la selección inicial si está en modo Team Preview
    if (battle.p1.activeRequest && 'teamPreview' in battle.p1.activeRequest && battle.p1.activeRequest.teamPreview) {
      battle.choose('p1', 'default');
      battle.choose('p2', 'default');
    }
  });

  it('should safely ignore obsolete p2Choice when p1 action resolves the turn without throwing an error', () => {
    expect(() => {
      executeBattleTurn({
        battle,
        p1Choice: 'move outrage',
        p2Choice: 'switch 2'
      });
    }).not.toThrow();
  });
});
