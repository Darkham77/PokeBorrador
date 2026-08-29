import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { ShowdownTeamMapper, type CustomPokemonSet } from '../../../src/logic/battle/helpers/showdownTeamMapper.ts';
import { ShowdownTeamResolver } from '../../../src/logic/battle/showdownTeamResolver.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';
import { getShowdownNickname } from '../../../src/logic/battle/showdownUidMapper.ts';
import type { ShowdownPlayerRequest } from '../../../src/types/battle/battle.ts';

interface FullCustomSet extends CustomPokemonSet {
  moves: string[];
  level: number;
}

function makeMon(uid: string, species: string, moves: string[], hp: number, atk = 100, spe = 100): FullCustomSet {
  return {
    name: getShowdownNickname(uid),
    species,
    moves,
    stats: { hp, atk, def: 100, spa: 100, spd: 100, spe },
    uid,
    level: 50
  };
}

describe('Reproduce Fuzzer Case 32611f053627 (Faint Switch Cursor and Infestation PP Parity)', () => {
  it('correctly advances turn and consumes faint replacement switch without re-executing switch choice', () => {
    // Mew 1 with Infestation (10 HP to guarantee KO), Mew 2 with Inferno
    const p1Team = [
      makeMon('7f0e0063-8920-4970-871d-23ce3595c61d', 'mew', ['infestation', 'psychic'], 10, 100, 150),
      makeMon('75ad06e0-780e-4b6d-9215-a248ee2badc5', 'mew', ['inferno', 'psychic'], 342, 100, 150)
    ];

    // Blissey with Flamethrower
    const p2Team = [
      makeMon('38ac5462-847a-44a6-8485-1531e84b3efc', 'blissey', ['flamethrower', 'softboiled'], 651, 100, 50)
    ];

    ShowdownTeamMapper.populateStatsMap(p1Team);
    ShowdownTeamMapper.populateStatsMap(p2Team);

    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, '1,2,3,4');
    battle.setPlayer('p1', { name: 'Player 1', team: p1Team as never });
    battle.setPlayer('p2', { name: 'Player 2', team: p2Team as never });

    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon && p1Team[idx]?.uid) Reflect.set(pokemon, 'uid', p1Team[idx]!.uid);
    });
    battle.p2.pokemon.forEach((pokemon, idx) => {
      if (pokemon && p2Team[idx]?.uid) Reflect.set(pokemon, 'uid', p2Team[idx]!.uid);
    });

    const engine = new ShowdownBattleEngine({ mode: 'replayer' });
    Reflect.set(engine, 'battle', battle);

    // Turn 1: Mew uses Infestation, Blissey uses Flamethrower (KOs Mew 1)
    engine.executeTurn({
      p1Choice: 'move 1',
      p2Choice: 'move 1',
      p1Skip: false,
      p2Skip: false
    });

    assert.strictEqual(battle.requestState, 'switch', 'Battle must request faint switch after KO');
    assert.strictEqual(battle.p1.pokemon[0]?.fainted, true, 'Mew 1 must be fainted');

    const p1Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p1', battle.p1.activeRequest) as ShowdownPlayerRequest | null;
    const mew2Slot = ShowdownTeamResolver.getShowdownSlotForUid(p1Req, '75ad06e0-780e-4b6d-9215-a248ee2badc5');
    assert.strictEqual(mew2Slot, 2, 'Mew 2 must be in slot 2');

    // Faint replacement: P1 switches to Mew 2
    engine.executeTurn({
      p1Choice: `switch ${mew2Slot}`,
      p2Choice: '',
      p1Skip: false,
      p2Skip: true,
      p1Hps: { '7f0e0063-8920-4970-871d-23ce3595c61d': 0, '75ad06e0-780e-4b6d-9215-a248ee2badc5': 342 },
      p2Hps: { '38ac5462-847a-44a6-8485-1531e84b3efc': 600 }
    });

    assert.strictEqual(battle.requestState, 'move', 'Battle must return to move request after switch');
    assert.strictEqual(battle.p1.pokemon[0]?.name, '75ad06e0', 'Mew 2 must now be active');

    // Turn 2: Mew 2 uses Inferno (move 1), Blissey uses Flamethrower
    const t2 = engine.executeTurn({
      p1Choice: 'move 1',
      p2Choice: 'move 1',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { '7f0e0063-8920-4970-871d-23ce3595c61d': 0, '75ad06e0-780e-4b6d-9215-a248ee2badc5': 342 },
      p2Hps: { '38ac5462-847a-44a6-8485-1531e84b3efc': 600 }
    });

    assert.ok(t2.p1AcceptedChoice.startsWith('move'), 'Turn 2 move choice must be accepted');
    assert.ok(t2.p2AcceptedChoice.startsWith('move'), 'P2 move choice must be accepted');
  });
});
