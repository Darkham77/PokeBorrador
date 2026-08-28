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
  ability?: string;
  item?: string;
  nature?: string;
  gender?: string;
}

function makeMon(uid: string, species: string, moves: string[], hp: number, atk = 100, spe = 100, item?: string, ability?: string): FullCustomSet {
  return {
    name: getShowdownNickname(uid),
    species,
    moves,
    stats: { hp, atk, def: 100, spa: 100, spd: 100, spe },
    uid,
    level: 50,
    item,
    ability
  };
}

function setupBattle(p1Team: FullCustomSet[], p2Team: FullCustomSet[], seed = '1,2,3,4') {
  ShowdownTeamMapper.populateStatsMap(p1Team);
  ShowdownTeamMapper.populateStatsMap(p2Team);

  const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
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
  return { battle, engine };
}

describe('Similar Battle Mechanics - Switch, Faint, Phazing, and Pivot Parity', () => {
  it('Scenario 1: Pivot move (U-turn) deals damage, forces self-switch, and next turn resolves cleanly', () => {
    const p1 = [makeMon('a1111111-1111-4111-a111-111111111111', 'crobat', ['uturn', 'bravebird'], 160, 120, 150), makeMon('a2222222-2222-4222-a222-222222222222', 'lucario', ['aurasphere'], 145, 130, 110)];
    const p2 = [makeMon('b1111111-1111-4111-b111-111111111111', 'blissey', ['softboiled', 'toxic'], 330, 30, 75), makeMon('b2222222-2222-4222-b222-222222222222', 'skarmory', ['roost'], 140, 100, 90)];
    const { battle, engine } = setupBattle(p1, p2);

    engine.executeTurn({ p1Choice: 'move uturn', p2Choice: 'move toxic', p1Skip: false, p2Skip: false });
    assert.strictEqual(battle.requestState, 'switch');

    const p1Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p1', battle.p1.activeRequest) as ShowdownPlayerRequest | null;
    const lucarioSlot = ShowdownTeamResolver.getShowdownSlotForUid(p1Req, 'a2222222-2222-4222-a222-222222222222');

    engine.executeTurn({
      p1Choice: `switch ${lucarioSlot}`,
      p2Choice: '',
      p1Skip: false,
      p2Skip: true,
      p1Hps: { 'a1111111-1111-4111-a111-111111111111': 160, 'a2222222-2222-4222-a222-222222222222': 145 },
      p2Hps: { 'b1111111-1111-4111-b111-111111111111': 250, 'b2222222-2222-4222-b222-222222222222': 140 }
    });

    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p1.pokemon[0]?.name, 'a2222222');

    const t2 = engine.executeTurn({
      p1Choice: 'move aurasphere',
      p2Choice: 'move softboiled',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'a1111111-1111-4111-a111-111111111111': 160, 'a2222222-2222-4222-a222-222222222222': 145 },
      p2Hps: { 'b1111111-1111-4111-b111-111111111111': 180, 'b2222222-2222-4222-b222-222222222222': 140 }
    });
    assert.ok(t2.p1AcceptedChoice.startsWith('move'));
    assert.ok(t2.p2AcceptedChoice.startsWith('move'));
  });

  it('Scenario 2: Pivot move (U-turn) KOs defender, sequencing mid-turn pivot switch followed by upkeep faint switch', () => {
    const p1 = [makeMon('c1111111-1111-4111-c111-111111111111', 'cinderace', ['uturn'], 155, 136, 139), makeMon('c2222222-2222-4222-c222-222222222222', 'gengar', ['shadowball'], 135, 85, 130)];
    const p2 = [makeMon('d1111111-1111-4111-d111-111111111111', 'abomasnow', ['blizzard'], 40, 112, 80), makeMon('d2222222-2222-4222-d222-222222222222', 'swampert', ['waterfall'], 175, 130, 80)];
    const { battle, engine } = setupBattle(p1, p2);

    engine.executeTurn({ p1Choice: 'move uturn', p2Choice: 'move blizzard', p1Skip: false, p2Skip: false });
    assert.strictEqual(battle.requestState, 'switch');

    const p1Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p1', battle.p1.activeRequest) as ShowdownPlayerRequest | null;
    const gengarSlot = ShowdownTeamResolver.getShowdownSlotForUid(p1Req, 'c2222222-2222-4222-c222-222222222222');

    engine.executeTurn({
      p1Choice: `switch ${gengarSlot}`,
      p2Choice: '',
      p1Skip: false,
      p2Skip: true,
      p1Hps: { 'c1111111-1111-4111-c111-111111111111': 155, 'c2222222-2222-4222-c222-222222222222': 135 },
      p2Hps: { 'd1111111-1111-4111-d111-111111111111': 0, 'd2222222-2222-4222-d222-222222222222': 175 }
    });

    assert.strictEqual(battle.requestState, 'switch');
    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const swampertSlot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, 'd2222222-2222-4222-d222-222222222222');

    engine.executeTurn({
      p1Choice: '',
      p2Choice: `switch ${swampertSlot}`,
      p1Skip: true,
      p2Skip: false,
      p1Hps: { 'c1111111-1111-4111-c111-111111111111': 155, 'c2222222-2222-4222-c222-222222222222': 135 },
      p2Hps: { 'd1111111-1111-4111-d111-111111111111': 0, 'd2222222-2222-4222-d222-222222222222': 175 }
    });

    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p1.pokemon[0]?.name, 'c2222222');
    assert.strictEqual(battle.p2.pokemon[0]?.name, 'd2222222');

    const t2 = engine.executeTurn({
      p1Choice: 'move shadowball',
      p2Choice: 'move waterfall',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'c1111111-1111-4111-c111-111111111111': 155, 'c2222222-2222-4222-c222-222222222222': 135 },
      p2Hps: { 'd1111111-1111-4111-d111-111111111111': 0, 'd2222222-2222-4222-d222-222222222222': 175 }
    });
    assert.ok(t2.p1AcceptedChoice.startsWith('move'));
    assert.ok(t2.p2AcceptedChoice.startsWith('move'));
  });

  it('Scenario 3: Self-Destruct / Explosion causes Double KO, both sides replace and Turn 2 executes cleanly', () => {
    const p1 = [makeMon('e1111111-1111-4111-e111-111111111111', 'golem', ['explosion'], 155, 140, 65), makeMon('e2222222-2222-4222-e222-222222222222', 'machamp', ['dynamicpunch'], 165, 150, 75)];
    const p2 = [makeMon('f1111111-1111-4111-f111-111111111111', 'clefable', ['moonblast'], 80, 90, 80), makeMon('f2222222-2222-4222-f222-222222222222', 'tyranitar', ['stoneedge'], 175, 154, 81)];
    const { battle, engine } = setupBattle(p1, p2);

    engine.executeTurn({ p1Choice: 'move explosion', p2Choice: 'move moonblast', p1Skip: false, p2Skip: false });
    assert.strictEqual(battle.requestState, 'switch');
    assert.strictEqual(battle.p1.pokemon[0]?.fainted, true);
    assert.strictEqual(battle.p2.pokemon[0]?.fainted, true);

    const p1Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p1', battle.p1.activeRequest) as ShowdownPlayerRequest | null;
    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const machampSlot = ShowdownTeamResolver.getShowdownSlotForUid(p1Req, 'e2222222-2222-4222-e222-222222222222');
    const tyranitarSlot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, 'f2222222-2222-4222-f222-222222222222');

    engine.executeTurn({
      p1Choice: `switch ${machampSlot}`,
      p2Choice: `switch ${tyranitarSlot}`,
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'e1111111-1111-4111-e111-111111111111': 0, 'e2222222-2222-4222-e222-222222222222': 165 },
      p2Hps: { 'f1111111-1111-4111-f111-111111111111': 0, 'f2222222-2222-4222-f222-222222222222': 175 }
    });

    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p1.pokemon[0]?.name, 'e2222222');
    assert.strictEqual(battle.p2.pokemon[0]?.name, 'f2222222');

    const t2 = engine.executeTurn({
      p1Choice: 'move dynamicpunch',
      p2Choice: 'move stoneedge',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'e1111111-1111-4111-e111-111111111111': 0, 'e2222222-2222-4222-e222-222222222222': 165 },
      p2Hps: { 'f1111111-1111-4111-f111-111111111111': 0, 'f2222222-2222-4222-f222-222222222222': 175 }
    });
    assert.ok(t2.p1AcceptedChoice.startsWith('move'));
    assert.ok(t2.p2AcceptedChoice.startsWith('move'));
  });

  it('Scenario 4: Recoil move (Head Smash) causes Double KO via fatal recoil, resolves cleanly', () => {
    const p1 = [makeMon('g1111111-1111-4111-g111-111111111111', 'rampardos', ['headsmash'], 10, 185, 150), makeMon('g2222222-2222-4222-g222-222222222222', 'starmie', ['hydropump'], 135, 95, 135)];
    const p2 = [makeMon('h1111111-1111-4111-h111-111111111111', 'charizard', ['airslash', 'flamethrower'], 100, 104, 100), makeMon('h2222222-2222-4222-h222-222222222222', 'heatran', ['earthpower'], 166, 110, 97)];
    const { battle, engine } = setupBattle(p1, p2);

    engine.executeTurn({ p1Choice: 'move headsmash', p2Choice: 'move airslash', p1Skip: false, p2Skip: false });
    assert.strictEqual(battle.requestState, 'switch');
    assert.strictEqual(battle.p1.pokemon[0]?.fainted, true);
    assert.strictEqual(battle.p2.pokemon[0]?.fainted, true);

    const p1Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p1', battle.p1.activeRequest) as ShowdownPlayerRequest | null;
    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const starmieSlot = ShowdownTeamResolver.getShowdownSlotForUid(p1Req, 'g2222222-2222-4222-g222-222222222222');
    const heatranSlot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, 'h2222222-2222-4222-h222-222222222222');

    engine.executeTurn({
      p1Choice: `switch ${starmieSlot}`,
      p2Choice: `switch ${heatranSlot}`,
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'g1111111-1111-4111-g111-111111111111': 0, 'g2222222-2222-4222-g222-222222222222': 135 },
      p2Hps: { 'h1111111-1111-4111-h111-111111111111': 0, 'h2222222-2222-4222-h222-222222222222': 166 }
    });

    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p1.pokemon[0]?.name, 'g2222222');
    assert.strictEqual(battle.p2.pokemon[0]?.name, 'h2222222');

    const t2 = engine.executeTurn({
      p1Choice: 'move hydropump',
      p2Choice: 'move earthpower',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'g1111111-1111-4111-g111-111111111111': 0, 'g2222222-2222-4222-g222-222222222222': 135 },
      p2Hps: { 'h1111111-1111-4111-h111-111111111111': 0, 'h2222222-2222-4222-h222-222222222222': 166 }
    });
    assert.ok(t2.p1AcceptedChoice.startsWith('move'));
    assert.ok(t2.p2AcceptedChoice.startsWith('move'));
  });

  it('Scenario 5: Forced Phazing (Dragon Tail) drags out opponent, Turn 2 executes cleanly against dragged combatant', () => {
    const p1 = [makeMon('i1111111-1111-4111-i111-111111111111', 'garchomp', ['dragontail', 'earthquake'], 183, 150, 122)];
    const p2 = [makeMon('j1111111-1111-4111-j111-111111111111', 'latias', ['calmmind'], 155, 100, 130), makeMon('j2222222-2222-4222-j222-222222222222', 'ferrothorn', ['gyroball'], 149, 114, 40)];
    const { battle, engine } = setupBattle(p1, p2);

    engine.executeTurn({ p1Choice: 'move dragontail', p2Choice: 'move calmmind', p1Skip: false, p2Skip: false });
    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p2.pokemon[0]?.name, 'j2222222');

    const t2 = engine.executeTurn({
      p1Choice: 'move earthquake',
      p2Choice: 'move gyroball',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'i1111111-1111-4111-i111-111111111111': 183 },
      p2Hps: { 'j1111111-1111-4111-j111-111111111111': 110, 'j2222222-2222-4222-j222-222222222222': 149 }
    });
    assert.ok(t2.p1AcceptedChoice.startsWith('move'));
    assert.ok(t2.p2AcceptedChoice.startsWith('move'));
  });

  it('Scenario 6: Item Switch (Eject Button) triggers switch out upon receiving attack damage', () => {
    const p1 = [makeMon('k1111111-1111-4111-k111-111111111111', 'weavile', ['tripleaxel', 'iceshard'], 145, 140, 145)];
    const p2 = [makeMon('l1111111-1111-4111-l111-111111111111', 'amoonguss', ['spore'], 189, 105, 50, 'ejectbutton'), makeMon('l2222222-2222-4222-l222-222222222222', 'volcarona', ['fierydance'], 160, 80, 120)];
    const { battle, engine } = setupBattle(p1, p2);

    engine.executeTurn({ p1Choice: 'move tripleaxel', p2Choice: 'move spore', p1Skip: false, p2Skip: false });
    assert.strictEqual(battle.requestState, 'switch');

    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const volcaronaSlot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, 'l2222222-2222-4222-l222-222222222222');

    engine.executeTurn({
      p1Choice: '',
      p2Choice: `switch ${volcaronaSlot}`,
      p1Skip: true,
      p2Skip: false,
      p1Hps: { 'k1111111-1111-4111-k111-111111111111': 145 },
      p2Hps: { 'l1111111-1111-4111-l111-111111111111': 140, 'l2222222-2222-4222-l222-222222222222': 160 }
    });

    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p2.pokemon[0]?.name, 'l2222222');

    const t2 = engine.executeTurn({
      p1Choice: 'move iceshard',
      p2Choice: 'move fierydance',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'k1111111-1111-4111-k111-111111111111': 145 },
      p2Hps: { 'l1111111-1111-4111-l111-111111111111': 140, 'l2222222-2222-4222-l222-222222222222': 160 }
    });
    assert.ok(t2.p1AcceptedChoice.startsWith('move'));
    assert.ok(t2.p2AcceptedChoice.startsWith('move'));
  });

  it('Scenario 7: Ability Switch (Emergency Exit) triggers switch out upon dropping below 50% HP', () => {
    const p1 = [makeMon('m1111111-1111-4111-m111-111111111111', 'tapukoko', ['thunderbolt'], 145, 135, 150)];
    const p2 = [makeMon('n1111111-1111-4111-n111-111111111111', 'golisopod', ['liquidation'], 150, 145, 60, undefined, 'emergencyexit'), makeMon('n2222222-2222-4222-n222-222222222222', 'corviknight', ['bravebird'], 173, 107, 87)];
    const { battle, engine } = setupBattle(p1, p2);

    engine.executeTurn({ p1Choice: 'move thunderbolt', p2Choice: 'move liquidation', p1Skip: false, p2Skip: false });
    assert.strictEqual(battle.requestState, 'switch');

    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const corviknightSlot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, 'n2222222-2222-4222-n222-222222222222');

    engine.executeTurn({
      p1Choice: '',
      p2Choice: `switch ${corviknightSlot}`,
      p1Skip: true,
      p2Skip: false,
      p1Hps: { 'm1111111-1111-4111-m111-111111111111': 145 },
      p2Hps: { 'n1111111-1111-4111-n111-111111111111': 45, 'n2222222-2222-4222-n222-222222222222': 173 }
    });

    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p2.pokemon[0]?.name, 'n2222222');

    const t2 = engine.executeTurn({
      p1Choice: 'move thunderbolt',
      p2Choice: 'move bravebird',
      p1Skip: false,
      p2Skip: false,
      p1Hps: { 'm1111111-1111-4111-m111-111111111111': 145 },
      p2Hps: { 'n1111111-1111-4111-n111-111111111111': 45, 'n2222222-2222-4222-n222-222222222222': 173 }
    });
    assert.ok(t2.p1AcceptedChoice.startsWith('move'));
    assert.ok(t2.p2AcceptedChoice.startsWith('move'));
  });
});
