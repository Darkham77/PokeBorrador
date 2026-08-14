import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { isValidTarget, itemEffects } from '@/logic/items/itemEffects';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { createDefaultEvs, MAX_STAT_EVS } from '@/logic/pokemon/evMath';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('All Consumable Items - Comprehensive Unit & Integrity Suite', () => {
  function createTestMon(overrides: Partial<Pokemon> = {}): Pokemon {
    const p = makePokemon('charmander', 20, { bypassWhitelist: true });
    assert.ok(p, 'Failed to create base test pokemon');
    p.evs = createDefaultEvs();
    Object.assign(p, overrides);
    return p;
  }

  describe('1. HP Healing Potions & Drinks', () => {
    const healItems = ['potion', 'superpotion', 'hyperpotion', 'maxpotion', 'sodapop', 'freshwater', 'lemonade'];

    healItems.forEach((itemId) => {
      it(`validates and applies ${itemId} to wounded Pokémon`, () => {
        const mon = createTestMon({ hp: 10, maxHp: 50 });
        assert.ok(isValidTarget(itemId, mon), `${itemId} should be valid target for damaged mon`);

        const effectFn = itemEffects[itemId];
        assert.ok(effectFn, `${itemId} must have registered effect function`);

        const res = effectFn(mon);
        assert.ok(res.success, `${itemId} execution should succeed`);
        assert.ok(mon.hp > 10, `${itemId} should heal HP`);
      });

      it(`rejects ${itemId} when Pokémon is at full HP or fainted`, () => {
        const fullHpMon = createTestMon({ hp: 50, maxHp: 50 });
        assert.strictEqual(isValidTarget(itemId, fullHpMon), false, `${itemId} cannot target full HP mon`);

        const faintedMon = createTestMon({ hp: 0, maxHp: 50 });
        assert.strictEqual(isValidTarget(itemId, faintedMon), false, `${itemId} cannot target fainted mon`);
      });
    });
  });

  describe('2. Revives', () => {
    const reviveItems = ['revive', 'revivemax'];

    reviveItems.forEach((itemId) => {
      it(`validates and applies ${itemId} to fainted Pokémon`, () => {
        const mon = createTestMon({ hp: 0, maxHp: 60, status: 'psn' });
        assert.ok(isValidTarget(itemId, mon), `${itemId} should target fainted mon`);

        const effectFn = itemEffects[itemId];
        assert.ok(effectFn, `${itemId} must have registered effect function`);

        const res = effectFn(mon);
        assert.ok(res.success);
        assert.ok(mon.hp > 0);
        assert.strictEqual(mon.status, '');
      });

      it(`rejects ${itemId} when Pokémon is alive`, () => {
        const aliveMon = createTestMon({ hp: 30, maxHp: 60 });
        assert.strictEqual(isValidTarget(itemId, aliveMon), false, `${itemId} cannot target alive mon`);
      });
    });
  });

  describe('3. Status Condition Healers', () => {
    const statusMap = [
      { item: 'antidote', status: 'psn' as const },
      { item: 'burnheal', status: 'brn' as const },
      { item: 'paralyzeheal', status: 'par' as const },
      { item: 'awakening', status: 'slp' as const },
      { item: 'iceheal', status: 'frz' as const },
      { item: 'fullheal', status: 'par' as const },
    ];

    statusMap.forEach(({ item, status }) => {
      it(`validates and heals ${status} with ${item}`, () => {
        const mon = createTestMon({ hp: 40, maxHp: 50, status });
        assert.ok(isValidTarget(item, mon), `${item} should target mon with ${status}`);

        const effectFn = itemEffects[item];
        assert.ok(effectFn, `${item} effect must exist`);

        const res = effectFn(mon);
        assert.ok(res.success);
        assert.strictEqual(mon.status, '');
      });

      it(`rejects ${item} when Pokémon does not have target status`, () => {
        const healthyMon = createTestMon({ hp: 50, maxHp: 50, status: '' });
        assert.strictEqual(isValidTarget(item, healthyMon), false);
      });
    });

    it('fullrestore heals HP and clears status', () => {
      const mon = createTestMon({ hp: 10, maxHp: 100, status: 'tox' });
      assert.ok(isValidTarget('fullrestore', mon));

      const effectFn = itemEffects['fullrestore'];
      assert.ok(effectFn);

      const res = effectFn(mon);
      assert.ok(res.success);
      assert.strictEqual(mon.hp, 100);
      assert.strictEqual(mon.status, '');
    });
  });

  describe('4. PP Restorers', () => {
    const ppItems = ['ether', 'elixir', 'elixirmax'];

    ppItems.forEach((itemId) => {
      it(`validates and applies ${itemId} when moves have depleted PP`, () => {
        const mon = createTestMon({ hp: 50, maxHp: 50 });
        mon.moves[0] = { ...mon.moves[0]!, pp: 2, maxPP: 20 };

        assert.ok(isValidTarget(itemId, mon));
        const effectFn = itemEffects[itemId];
        assert.ok(effectFn);

        const res = effectFn(mon);
        assert.ok(res.success);
        assert.ok(mon.moves[0]!.pp > 2);
      });
    });
  });

  describe('5. Evolutionary Stones & Usables', () => {
    it('validates firestone for growlithe evolution', () => {
      const mon = makePokemon('growlithe', 25, { bypassWhitelist: true });
      assert.ok(mon, 'Failed to create growlithe');
      assert.ok(isValidTarget('firestone', mon));

      const effectFn = itemEffects['firestone'];
      assert.ok(effectFn);
      const res = effectFn(mon);
      assert.ok(res.success);
      assert.strictEqual(res.resultType, 'evolution');
      assert.strictEqual(res.targetId, 'arcanine');
    });

    it('rejects firestone on species that does not evolve with it', () => {
      const mon = makePokemon('bulbasaur', 25, { bypassWhitelist: true });
      assert.ok(mon, 'Failed to create bulbasaur');
      assert.strictEqual(isValidTarget('firestone', mon), false);
    });
  });

  describe('6. Rare Candy & Vigor Candies', () => {
    it('applies rarecandy to level up and rejects at level 100', () => {
      const mon = createTestMon({ level: 40 });
      assert.ok(isValidTarget('rarecandy', mon));

      const effectFn = itemEffects['rarecandy'];
      assert.ok(effectFn);
      const res = effectFn(mon);
      assert.ok(res.success);
      assert.strictEqual(res.resultType, 'levelup');

      const maxMon = createTestMon({ level: 100 });
      assert.strictEqual(isValidTarget('rarecandy', maxMon), false);
    });

    it('applies vigorcandy and vigorrestorer', () => {
      const mon = createTestMon({ vigor: 5, maxVigor: 20 });
      assert.ok(isValidTarget('vigorcandy', mon));
      assert.ok(isValidTarget('vigorrestorer', mon));

      const resCandy = itemEffects['vigorcandy']!(mon);
      assert.ok(resCandy.success);
      assert.ok(Number(mon.vigor) > 5);

      const resRestorer = itemEffects['vigorrestorer']!(mon);
      assert.ok(resRestorer.success);
      assert.strictEqual(mon.vigor, 20);
    });
  });

  describe('7. EV Berries', () => {
    const berryList = [
      { item: 'pomegberry', stat: 'hp' as const },
      { item: 'kelpsyberry', stat: 'atk' as const },
      { item: 'qualotberry', stat: 'def' as const },
      { item: 'hondewberry', stat: 'spa' as const },
      { item: 'grepaberry', stat: 'spd' as const },
      { item: 'tamatoberry', stat: 'spe' as const },
    ];

    berryList.forEach(({ item, stat }) => {
      it(`applies ${item} to reduce ${stat} EVs and raise friendship`, () => {
        const mon = createTestMon();
        mon.evs = mon.evs || createDefaultEvs();
        mon.evs[stat] = 50;
        mon.friendship = 100;

        assert.ok(isValidTarget(item, mon));
        const effectFn = itemEffects[item];
        assert.ok(effectFn);

        const res = effectFn(mon);
        assert.ok(res.success);
        assert.strictEqual(mon.evs[stat], 40);
        assert.strictEqual(mon.friendship, 110);
      });

      it(`applies ${item} for friendship even if ${stat} EV is 0 (as long as friendship < 255)`, () => {
        const mon = createTestMon();
        mon.evs = mon.evs || createDefaultEvs();
        mon.evs[stat] = 0;
        mon.friendship = 100;

        assert.ok(isValidTarget(item, mon));
        const effectFn = itemEffects[item];
        const res = effectFn!(mon);
        assert.ok(res.success);
        assert.strictEqual(mon.friendship, 110);
      });

      it(`rejects ${item} when ${stat} EV is 0 AND friendship is at max 255`, () => {
        const mon = createTestMon();
        mon.evs = mon.evs || createDefaultEvs();
        mon.evs[stat] = 0;
        mon.friendship = 255;

        assert.strictEqual(isValidTarget(item, mon), false);
      });
    });
  });

  describe('8. Vitamins & Feathers', () => {
    const vitaminList = [
      { item: 'hpup', stat: 'hp' as const },
      { item: 'protein', stat: 'atk' as const },
      { item: 'iron', stat: 'def' as const },
      { item: 'calcium', stat: 'spa' as const },
      { item: 'zinc', stat: 'spd' as const },
      { item: 'carbos', stat: 'spe' as const },
    ];

    vitaminList.forEach(({ item, stat }) => {
      it(`applies ${item} to increase ${stat} EVs by +10`, () => {
        const mon = createTestMon();
        assert.ok(isValidTarget(item, mon));

        const effectFn = itemEffects[item];
        assert.ok(effectFn);

        const res = effectFn(mon);
        assert.ok(res.success);
        assert.ok(mon.evs);
        assert.strictEqual(mon.evs[stat], 10);
      });

      it(`rejects ${item} when ${stat} is capped at 252`, () => {
        const mon = createTestMon();
        mon.evs = mon.evs || createDefaultEvs();
        mon.evs[stat] = MAX_STAT_EVS;
        assert.strictEqual(isValidTarget(item, mon), false);
      });

      it(`rejects ${item} when total EVs reached 510 cap`, () => {
        const mon = createTestMon();
        mon.evs = { hp: 252, atk: 252, def: 6, spa: 0, spd: 0, spe: 0 };
        assert.strictEqual(isValidTarget(item, mon), false);
      });
    });

    const featherList = [
      { item: 'healthfeather', stat: 'hp' as const },
      { item: 'musclefeather', stat: 'atk' as const },
      { item: 'resistfeather', stat: 'def' as const },
      { item: 'geniusfeather', stat: 'spa' as const },
      { item: 'cleverfeather', stat: 'spd' as const },
      { item: 'swiftfeather', stat: 'spe' as const },
    ];

    featherList.forEach(({ item, stat }) => {
      it(`applies ${item} to increase ${stat} EVs by +1`, () => {
        const mon = createTestMon();
        assert.ok(isValidTarget(item, mon));

        const effectFn = itemEffects[item];
        assert.ok(effectFn);

        const res = effectFn(mon);
        assert.ok(res.success);
        assert.ok(mon.evs);
        assert.strictEqual(mon.evs[stat], 1);
      });
    });
  });
});
