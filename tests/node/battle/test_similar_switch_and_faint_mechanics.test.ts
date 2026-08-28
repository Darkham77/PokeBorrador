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

function setupBattle(p1Team: FullCustomSet[], p2Team: FullCustomSet[], seed = '1,2,3,4') {
  p1Team.forEach(p => {
    if (p.uid && !p.name) p.name = getShowdownNickname(p.uid);
  });
  p2Team.forEach(p => {
    if (p.uid && !p.name) p.name = getShowdownNickname(p.uid);
  });

  ShowdownTeamMapper.populateStatsMap(p1Team);
  ShowdownTeamMapper.populateStatsMap(p2Team);

  const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
  battle.setPlayer('p1', { name: 'Player 1', team: p1Team as never });
  battle.setPlayer('p2', { name: 'Player 2', team: p2Team as never });

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

  return { battle, engine };
}

describe('Similar Battle Mechanics - Switch, Faint, Phazing, and Pivot Parity', () => {
  it('Scenario 1: Pivot move (U-turn) deals damage, forces self-switch, and next turn resolves cleanly', () => {
    const p1Team: FullCustomSet[] = [
      {
        name: 'a1111111',
        species: 'crobat',
        moves: ['uturn', 'bravebird', 'roost', 'toxic'],
        stats: { hp: 160, atk: 120, def: 100, spa: 90, spd: 100, spe: 150 },
        uid: 'a1111111-1111-4111-a111-111111111111',
        level: 50
      },
      {
        name: 'a2222222',
        species: 'lucario',
        moves: ['aurasphere', 'flashcannon', 'extremespeed', 'nastyplot'],
        stats: { hp: 145, atk: 130, def: 90, spa: 135, spd: 90, spe: 110 },
        uid: 'a2222222-2222-4222-a222-222222222222',
        level: 50
      }
    ];

    const p2Team: FullCustomSet[] = [
      {
        name: 'b1111111',
        species: 'blissey',
        moves: ['softboiled', 'seismictoss', 'toxic', 'aromatherapy'],
        stats: { hp: 330, atk: 30, def: 30, spa: 95, spd: 155, spe: 75 },
        uid: 'b1111111-1111-4111-b111-111111111111',
        level: 50
      },
      {
        name: 'b2222222',
        species: 'skarmory',
        moves: ['roost', 'spikes', 'bravebird', 'whirlwind'],
        stats: { hp: 140, atk: 100, def: 160, spa: 60, spd: 90, spe: 90 },
        uid: 'b2222222-2222-4222-b222-222222222222',
        level: 50
      }
    ];

    const { battle, engine } = setupBattle(p1Team, p2Team);

    // Turn 1: P1 uses U-turn, P2 uses Toxic. U-turn hits Blissey and requests P1 switch
    engine.executeTurn({
      p1Choice: 'move uturn',
      p2Choice: 'move toxic',
      p1Skip: false,
      p2Skip: false
    });

    assert.strictEqual(battle.requestState, 'switch');
    const p1Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p1', battle.p1.activeRequest) as ShowdownPlayerRequest | null;
    const lucarioSlot = ShowdownTeamResolver.getShowdownSlotForUid(p1Req, 'a2222222-2222-4222-a222-222222222222');
    assert.strictEqual(lucarioSlot, 2);

    // Pivot Switch Execution: P1 switches to Lucario (slot 2), P2 skips
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

    // Turn 2: P1 uses Aura Sphere, P2 uses Soft-Boiled
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
    const p1Team: FullCustomSet[] = [
      {
        name: 'c1111111',
        species: 'cinderace',
        moves: ['uturn', 'pyroball', 'highjumpkick', 'gunkshot'],
        stats: { hp: 155, atk: 136, def: 95, spa: 85, spd: 95, spe: 139 },
        uid: 'c1111111-1111-4111-c111-111111111111',
        level: 50
      },
      {
        name: 'c2222222',
        species: 'gengar',
        moves: ['shadowball', 'sludgebomb', 'focusblast', 'nastyplot'],
        stats: { hp: 135, atk: 85, def: 80, spa: 150, spd: 95, spe: 130 },
        uid: 'c2222222-2222-4222-c222-222222222222',
        level: 50
      }
    ];

    const p2Team: FullCustomSet[] = [
      {
        name: 'd1111111',
        species: 'abomasnow',
        moves: ['blizzard', 'woodhammer', 'iceshard', 'earthquake'],
        stats: { hp: 40, atk: 112, def: 95, spa: 112, spd: 105, spe: 80 },
        uid: 'd1111111-1111-4111-d111-111111111111',
        level: 50
      },
      {
        name: 'd2222222',
        species: 'swampert',
        moves: ['earthquake', 'waterfall', 'icepunch', 'stealthrock'],
        stats: { hp: 175, atk: 130, def: 110, spa: 105, spd: 110, spe: 80 },
        uid: 'd2222222-2222-4222-d222-222222222222',
        level: 50
      }
    ];

    const { battle, engine } = setupBattle(p1Team, p2Team);

    // Turn 1: P1 uses U-turn (kills Abomasnow). Mid-turn pivot triggers first for P1.
    engine.executeTurn({
      p1Choice: 'move uturn',
      p2Choice: 'move blizzard',
      p1Skip: false,
      p2Skip: false
    });

    assert.strictEqual(battle.requestState, 'switch');

    // Step 1: P1 executes mid-turn pivot switch to Gengar
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

    // Step 2: Now at upkeep, P2 executes faint replacement switch to Swampert
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

    // Turn 2: Both new combatants fight
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
    const p1Team: FullCustomSet[] = [
      {
        name: 'e1111111',
        species: 'golem',
        moves: ['explosion', 'earthquake', 'stoneedge', 'stealthrock'],
        stats: { hp: 155, atk: 140, def: 150, spa: 75, spd: 85, spe: 65 },
        uid: 'e1111111-1111-4111-e111-111111111111',
        level: 50
      },
      {
        name: 'e2222222',
        species: 'machamp',
        moves: ['dynamicpunch', 'stoneedge', 'bulletpunch', 'knockoff'],
        stats: { hp: 165, atk: 150, def: 100, spa: 85, spd: 105, spe: 75 },
        uid: 'e2222222-2222-4222-e222-222222222222',
        level: 50
      }
    ];

    const p2Team: FullCustomSet[] = [
      {
        name: 'f1111111',
        species: 'clefable',
        moves: ['moonblast', 'softboiled', 'calmmind', 'flamethrower'],
        stats: { hp: 80, atk: 90, def: 93, spa: 115, spd: 110, spe: 80 },
        uid: 'f1111111-1111-4111-f111-111111111111',
        level: 50
      },
      {
        name: 'f2222222',
        species: 'tyranitar',
        moves: ['stoneedge', 'crunch', 'earthquake', 'dragondance'],
        stats: { hp: 175, atk: 154, def: 130, spa: 115, spd: 120, spe: 81 },
        uid: 'f2222222-2222-4222-f222-222222222222',
        level: 50
      }
    ];

    const { battle, engine } = setupBattle(p1Team, p2Team);

    // Turn 1: Golem uses Explosion (kills Clefable and Golem dies to self-destruct)
    engine.executeTurn({
      p1Choice: 'move explosion',
      p2Choice: 'move moonblast',
      p1Skip: false,
      p2Skip: false
    });

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

    // Turn 2
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
    const p1Team: FullCustomSet[] = [
      {
        name: 'g1111111',
        species: 'rampardos',
        moves: ['headsmash', 'earthquake', 'zenheadbutt', 'firepunch'],
        stats: { hp: 10, atk: 185, def: 80, spa: 85, spd: 70, spe: 150 },
        uid: 'g1111111-1111-4111-g111-111111111111',
        level: 50
      },
      {
        name: 'g2222222',
        species: 'starmie',
        moves: ['hydropump', 'psychic', 'icebeam', 'recover'],
        stats: { hp: 135, atk: 95, def: 105, spa: 120, spd: 105, spe: 135 },
        uid: 'g2222222-2222-4222-g222-222222222222',
        level: 50
      }
    ];

    const p2Team: FullCustomSet[] = [
      {
        name: 'h1111111',
        species: 'charizard',
        moves: ['flamethrower', 'airslash', 'roost', 'dragonpulse'],
        stats: { hp: 100, atk: 104, def: 98, spa: 129, spd: 105, spe: 100 },
        uid: 'h1111111-1111-4111-h111-111111111111',
        level: 50
      },
      {
        name: 'h2222222',
        species: 'heatran',
        moves: ['magmastorm', 'earthpower', 'taunt', 'stealthrock'],
        stats: { hp: 166, atk: 110, def: 126, spa: 150, spd: 126, spe: 97 },
        uid: 'h2222222-2222-4222-h222-222222222222',
        level: 50
      }
    ];

    const { battle, engine } = setupBattle(p1Team, p2Team);

    // Turn 1: Rampardos (Spe 150 > 100) moves first with Head Smash, KOs Charizard and faints from recoil
    engine.executeTurn({
      p1Choice: 'move headsmash',
      p2Choice: 'move airslash',
      p1Skip: false,
      p2Skip: false
    });

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

    // Turn 2
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
    const p1Team: FullCustomSet[] = [
      {
        name: 'i1111111',
        species: 'garchomp',
        moves: ['dragontail', 'earthquake', 'swordsdance', 'stoneedge'],
        stats: { hp: 183, atk: 150, def: 115, spa: 100, spd: 105, spe: 122 },
        uid: 'i1111111-1111-4111-i111-111111111111',
        level: 50
      }
    ];

    const p2Team: FullCustomSet[] = [
      {
        name: 'j1111111',
        species: 'latias',
        moves: ['dracometeor', 'psychic', 'roost', 'calmmind'],
        stats: { hp: 155, atk: 100, def: 110, spa: 130, spd: 150, spe: 130 },
        uid: 'j1111111-1111-4111-j111-111111111111',
        level: 50
      },
      {
        name: 'j2222222',
        species: 'ferrothorn',
        moves: ['powerwhip', 'gyroball', 'leechseed', 'spikes'],
        stats: { hp: 149, atk: 114, def: 151, spa: 74, spd: 136, spe: 40 },
        uid: 'j2222222-2222-4222-j222-222222222222',
        level: 50
      }
    ];

    const { battle, engine } = setupBattle(p1Team, p2Team);

    // Turn 1: P1 uses Dragon Tail (-6 priority). Dragon Tail hits Latias and drags in Ferrothorn
    engine.executeTurn({
      p1Choice: 'move dragontail',
      p2Choice: 'move calmmind',
      p1Skip: false,
      p2Skip: false
    });

    assert.strictEqual(battle.requestState, 'move');
    assert.strictEqual(battle.p2.pokemon[0]?.name, 'j2222222');

    // Turn 2: P1 uses Earthquake against dragged Ferrothorn
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
    const p1Team: FullCustomSet[] = [
      {
        name: 'k1111111',
        species: 'weavile',
        moves: ['knockoff', 'tripleaxel', 'iceshard', 'swordsdance'],
        stats: { hp: 145, atk: 140, def: 85, spa: 65, spd: 105, spe: 145 },
        uid: 'k1111111-1111-4111-k111-111111111111',
        level: 50
      }
    ];

    const p2Team: FullCustomSet[] = [
      {
        name: 'l1111111',
        species: 'amoonguss',
        moves: ['spore', 'gigadrain', 'sludgebomb', 'clearsmog'],
        stats: { hp: 189, atk: 105, def: 90, spa: 105, spd: 100, spe: 50 },
        item: 'ejectbutton',
        uid: 'l1111111-1111-4111-l111-111111111111',
        level: 50
      },
      {
        name: 'l2222222',
        species: 'volcarona',
        moves: ['bugbuzz', 'fierydance', 'quiverdance', 'gigadrain'],
        stats: { hp: 160, atk: 80, def: 85, spa: 155, spd: 125, spe: 120 },
        uid: 'l2222222-2222-4222-l222-222222222222',
        level: 50
      }
    ];

    const { battle, engine } = setupBattle(p1Team, p2Team);

    // Turn 1: Weavile uses Triple Axel. Amoonguss takes damage -> Eject Button activates -> triggers P2 switch
    engine.executeTurn({
      p1Choice: 'move tripleaxel',
      p2Choice: 'move spore',
      p1Skip: false,
      p2Skip: false
    });

    assert.strictEqual(battle.requestState, 'switch');

    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const volcaronaSlot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, 'l2222222-2222-4222-l222-222222222222');
    assert.strictEqual(volcaronaSlot, 2);

    // P2 executes Eject Button switch to Volcarona
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

    // Turn 2: Weavile uses Ice Shard, Volcarona uses Fiery Dance
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
    const p1Team: FullCustomSet[] = [
      {
        name: 'm1111111',
        species: 'tapukoko',
        moves: ['thunderbolt', 'dazzlinggleam', 'voltswitch', 'roost'],
        stats: { hp: 145, atk: 135, def: 105, spa: 115, spd: 95, spe: 150 },
        uid: 'm1111111-1111-4111-m111-111111111111',
        level: 50
      }
    ];

    const p2Team: FullCustomSet[] = [
      {
        name: 'n1111111',
        species: 'golisopod',
        moves: ['firstimpression', 'liquidation', 'suckerpunch', 'leechlife'],
        ability: 'emergencyexit',
        stats: { hp: 150, atk: 145, def: 160, spa: 80, spd: 110, spe: 60 },
        uid: 'n1111111-1111-4111-n111-111111111111',
        level: 50
      },
      {
        name: 'n2222222',
        species: 'corviknight',
        moves: ['bravebird', 'roost', 'defog', 'u-turn'],
        stats: { hp: 173, atk: 107, def: 125, spa: 73, spd: 105, spe: 87 },
        uid: 'n2222222-2222-4222-n222-222222222222',
        level: 50
      }
    ];

    const { battle, engine } = setupBattle(p1Team, p2Team);

    // Turn 1: Tapu Koko uses Thunderbolt (drops Golisopod below 50% HP) -> Emergency Exit activates
    engine.executeTurn({
      p1Choice: 'move thunderbolt',
      p2Choice: 'move liquidation',
      p1Skip: false,
      p2Skip: false
    });

    assert.strictEqual(battle.requestState, 'switch');

    const p2Req = ShowdownTeamMapper.injectUidsIntoRequest(battle, 'p2', battle.p2.activeRequest) as ShowdownPlayerRequest | null;
    const corviknightSlot = ShowdownTeamResolver.getShowdownSlotForUid(p2Req, 'n2222222-2222-4222-n222-222222222222');

    // P2 executes Emergency Exit switch to Corviknight
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

    // Turn 2
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
