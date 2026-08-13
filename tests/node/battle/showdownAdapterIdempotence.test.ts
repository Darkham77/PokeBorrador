import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import type { PokemonSet } from '@pkmn/sim';
import { patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';

const CERTIFIED_SEED = [31, 32, 33, 34];
const E2E_MODE = () => true;
const FUZZER_COVERAGE_FACTORY_INSTALLATIONS = 20_000;
const BASE_STATS = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
const FALLBACK_SET: PokemonSet = {
  name: 'AdapterFallback', species: 'Mew', item: '', ability: 'Synchronize', moves: ['splash'], nature: 'Serious', gender: 'M', level: 100,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
};

describe('Showdown spreadModify adapter installation', () => {
  it('remains usable after every shared caller installs the adapter', () => {
    for (let installation = 0; installation < FUZZER_COVERAGE_FACTORY_INSTALLATIONS; installation++) {
      createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, CERTIFIED_SEED);
    }
    patchShowdownSpreadModify(E2E_MODE);
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, CERTIFIED_SEED);

    assert.doesNotThrow(() => {
      battle.spreadModify(BASE_STATS, FALLBACK_SET);
      battle.setPlayer('p1', { name: 'P1', team: [{ name: 'AdapterPlayer', species: 'Mew', item: '', ability: 'Synchronize', moves: ['splash'], nature: 'Serious', gender: 'M', level: 100, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
      battle.setPlayer('p2', { name: 'P2', team: [{ name: 'AdapterEnemy', species: 'Blissey', item: '', ability: 'NaturalCure', moves: ['splash'], nature: 'Serious', gender: 'F', level: 100, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
    }, 'Repeated adapter installation must preserve the original Showdown spreadModify implementation.');
  });
});
