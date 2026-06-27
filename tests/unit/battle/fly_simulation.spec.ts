import { describe, it } from 'vitest';
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from '../../../src/logic/battle/showdownAdapter.ts';

describe('Fly Simulator logs diagnostic', () => {
  it('should print simulator logs when using Fly', () => {
    const battle = new Battle({ formatid: getShowdownFormatId(3) });
    battle.setPlayer('p1', {
      name: 'Player',
      team: [
        {
          name: 'Rayquaza',
          species: 'Rayquaza',
          moves: ['fly'],
          ability: 'airlock',
          evs: { hp: 8, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          item: '',
          level: 100,
          nature: 'Serious',
          gender: ''
        }
      ]
    });
    battle.setPlayer('p2', {
      name: 'Enemy',
      team: [
        {
          name: 'Pikachu',
          species: 'Pikachu',
          moves: ['tackle'],
          ability: 'static',
          evs: { hp: 8, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          item: '',
          level: 100,
          nature: 'Serious',
          gender: ''
        }
      ]
    });

    console.log('--- TURN 1 ---');
    battle.makeChoices('move 1', 'move 1');
    console.log(battle.log.join('\n'));
 
    console.log('--- REQUEST p1 T2 ---', JSON.stringify(battle.p1.activeRequest));
    console.log('--- REQUEST p2 T2 ---', JSON.stringify(battle.p2.activeRequest));
    console.log('--- TURN 2 ---');
    battle.makeChoices('move 1', 'move 1');
    console.log(battle.log.join('\n'));
  });
});
