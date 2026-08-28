import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { ShowdownTeamMapper, type CustomPokemonSet } from '../../../src/logic/battle/helpers/showdownTeamMapper.ts';
import { ShowdownTeamResolver } from '../../../src/logic/battle/showdownTeamResolver.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';
import type { ShowdownPlayerRequest } from '../../../src/types/battle/battle.ts';

interface FullCustomSet extends CustomPokemonSet {
  moves: string[];
  level: number;
  ability?: string;
  item?: string;
  nature?: string;
  gender?: string;
}

describe('Reproduction: Turn 1 KO and forced switch synchronization', () => {
  it('reproduces and verifies the fix for enemy faint and switch sequence', () => {
    const p1Team: FullCustomSet[] = [{
      name: 'b5ca6dd1',
      species: 'aurorus',
      moves: ['icebeam', 'ancientpower', 'freezedry', 'thunderbolt'],
      stats: { hp: 244, atk: 100, def: 100, spa: 150, spd: 100, spe: 100 },
      uid: 'b5ca6dd1-e233-4455-bad2-40ffae942da5',
      level: 50
    }];

    const p2Team: FullCustomSet[] = [
      {
        name: '271ae09c',
        species: 'sandshrew',
        moves: ['earthquake', 'swordsdance', 'bodyslam', 'rockslide'],
        stats: { hp: 50, atk: 34, def: 31, spa: 14, spd: 15, spe: 25 },
        uid: '271ae09c-e91e-4a1c-9406-4dd3d8f4bf68',
        level: 18
      },
      {
        name: 'bbc25d5a',
        species: 'rhyhorn',
        moves: ['substitute', 'earthquake', 'rockslide', 'bodyslam'],
        stats: { hp: 59, atk: 35, def: 43, spa: 17, spd: 20, spe: 16 },
        uid: 'bbc25d5a-4377-4650-b681-fc9b0f7f425b',
        level: 18
      },
      {
        name: 'f5e75d2f',
        species: 'geodude',
        moves: ['earthquake', 'explosion', 'bodyslam', 'rockslide'],
        stats: { hp: 42, atk: 37, def: 44, spa: 20, spd: 16, spe: 16 },
        uid: 'f5e75d2f-931c-4fc2-add0-459a0d56e00a',
        level: 18
      }
    ];

    ShowdownTeamMapper.populateStatsMap(p1Team);
    ShowdownTeamMapper.populateStatsMap(p2Team);

    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, '1,2,3,4');
    battle.setPlayer('p1', { name: 'Player', team: p1Team as never });
    battle.setPlayer('p2', { name: 'Montañera Angela', team: p2Team as never });

    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon && p1Team[idx]?.uid) {
        Reflect.set(pokemon, 'uid', p1Team[idx]!.uid);
      }
    });
    battle.p2.pokemon.forEach((pokemon, idx) => {
      if (pokemon && p2Team[idx]?.uid) {
        Reflect.set(pokemon, 'uid', p2Team[idx]!.uid);
      }
    });

    const engine = new ShowdownBattleEngine({ mode: 'replayer' });
    Reflect.set(engine, 'battle', battle);

    // Turn 1: P1 uses Ice Beam, P2 switches to Rhyhorn (slot 2)
    const turn1Result = engine.executeTurn({
      p1Choice: 'move icebeam',
      p2Choice: 'switch 2',
      p1Skip: false,
      p2Skip: false
    });

    console.log('Turn 1 result:', turn1Result);
    console.log('Battle requestState after Turn 1:', battle.requestState);
    console.log('P2 activeRequest after Turn 1:', JSON.stringify(battle.p2.activeRequest));
    assert.strictEqual(battle.requestState, 'switch');

    // Turn 1 ended in KO, so P2 has forceSwitch: [true]
    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const slot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, '271ae09c-e91e-4a1c-9406-4dd3d8f4bf68');
    assert.strictEqual(slot, 2);

    // Faint switch execution: P1 skips, P2 chooses `switch 2` (Sandshrew)
    // Synchronizing client HPs (Rhyhorn: 0 HP, Sandshrew: 50 HP, Geodude: 42 HP)
    const switchResult = engine.executeTurn({
      p1Choice: '',
      p2Choice: `switch ${slot}`,
      p1Skip: true,
      p2Skip: false,
      p1Hps: { 'b5ca6dd1-e233-4455-bad2-40ffae942da5': 244 },
      p2Hps: {
        '271ae09c-e91e-4a1c-9406-4dd3d8f4bf68': 50,
        'bbc25d5a-4377-4650-b681-fc9b0f7f425b': 0,
        'f5e75d2f-931c-4fc2-add0-459a0d56e00a': 42
      }
    });

    console.log('Switch result:', switchResult);
    console.log('Battle requestState after Switch:', battle.requestState);
    console.log('P2 activeRequest after Switch:', JSON.stringify(battle.p2.activeRequest));
    assert.strictEqual(battle.requestState, 'move');

    // Turn 2: P1 uses Ice Beam, P2 uses Earthquake
    const turn2Result = engine.executeTurn({
      p1Choice: 'move icebeam',
      p2Choice: 'move earthquake',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'b5ca6dd1-e233-4455-bad2-40ffae942da5': 244 },
      p2Hps: {
        '271ae09c-e91e-4a1c-9406-4dd3d8f4bf68': 50,
        'bbc25d5a-4377-4650-b681-fc9b0f7f425b': 0,
        'f5e75d2f-931c-4fc2-add0-459a0d56e00a': 42
      }
    });

    console.log('Turn 2 result:', turn2Result);
    assert.ok(turn2Result.p1AcceptedChoice.startsWith('move'));
    assert.ok(turn2Result.p2AcceptedChoice.startsWith('move'));
  });
});
