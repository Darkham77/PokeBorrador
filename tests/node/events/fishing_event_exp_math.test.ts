import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { calculateBaseExp, processExpGain } from '@/logic/battle/battleRewards.ts';
import { calculateEncounterTypeWeights } from '@/logic/encounters/encounterHelpers.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation, EncounterState } from '@/types/pokemon/encounters';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

function createMockPokemon(opts: { id: string; level: number; uid: string }): Pokemon {
  return {
    uid: opts.uid,
    id: requirePokemonSpeciesId(opts.id),
    name: opts.id.toUpperCase(),
    level: opts.level,
    exp: 0,
    expNeeded: 1000,
    hp: 100,
    maxHp: 100,
    atk: 50,
    def: 50,
    spa: 50,
    spd: 50,
    spe: 50,
    types: ['normal'],
    moves: [],
    status: null,
    friendship: 70,
    nature: 'hardy',
    isShiny: false,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  } as unknown as Pokemon;
}

describe('Fishing & Event Experience Mathematics', () => {
  it('calculates base experience and scales correctly with event multiplier', () => {
    const enemy = createMockPokemon({ id: 'magikarp', level: 20, uid: 'enemy-1' });
    const baseExp = calculateBaseExp(enemy); // 20 * 4 = 80
    assert.strictEqual(baseExp, 80);

    const playerMonWithoutEvent = createMockPokemon({ id: 'pikachu', level: 25, uid: 'p1' });
    const participantsSet = new Set(['p1']);

    // Standard multiplier without event (totalExpMult: 1.0)
    const rewardBase = processExpGain(playerMonWithoutEvent, baseExp, participantsSet, {
      isActive: true,
      classMult: 1,
      totalExpMult: 1,
      participantsSet
    });
    assert.ok(rewardBase);
    assert.strictEqual(rewardBase.gained, 80);

    // With event multiplier x2 (totalExpMult: 2.0)
    const playerMonWithEvent = createMockPokemon({ id: 'pikachu', level: 25, uid: 'p1' });
    const rewardWithEvent = processExpGain(playerMonWithEvent, baseExp, participantsSet, {
      isActive: true,
      classMult: 1,
      totalExpMult: 2,
      participantsSet
    });
    assert.ok(rewardWithEvent);
    assert.strictEqual(rewardWithEvent.gained, 160);

    const extraEventExp = rewardWithEvent.gained - rewardBase.gained;
    assert.strictEqual(extraEventExp, 80);

    // Format string verification
    const formattedLog = `${playerMonWithEvent.name} ganó ${rewardWithEvent.gained} EXP (+${extraEventExp} EXP evento).`;
    assert.strictEqual(formattedLog, 'PIKACHU ganó 160 EXP (+80 EXP evento).');
  });

  it('correctly calculates encounter weights when fishing event bonus is active', () => {
    const mockMapLocation: MapLocation = {
      id: 'route22',
      name: 'Ruta 22',
      icon: 'map_r22',
      badges: 0,
      desc: 'Ruta con zona de pesca',
      wild: {
        morning: [requirePokemonSpeciesId('rattata')],
        day: [requirePokemonSpeciesId('rattata')],
        dusk: [requirePokemonSpeciesId('rattata')],
        night: [requirePokemonSpeciesId('rattata')]
      },
      rates: {
        morning: [100],
        day: [100],
        dusk: [100],
        night: [100]
      },
      lv: [10, 20],
      fishing: {
        pool: [requirePokemonSpeciesId('magikarp'), requirePokemonSpeciesId('poliwag')],
        rates: [70, 30],
        lv: [10, 20]
      }
    };

    const mockState: EncounterState = {
      faction: null,
      fishingRodType: 'standard',
      fishingRodSecs: 0
    };

    // 1. Without event (bonus = 1)
    const weightsNormal = calculateEncounterTypeWeights(mockMapLocation, 'clear', mockState, {
      eventFishingBonus: 1
    });

    // 2. With Dia de Pesca event (bonus = 2)
    const weightsEvent = calculateEncounterTypeWeights(mockMapLocation, 'clear', mockState, {
      eventFishingBonus: 2
    });

    assert.strictEqual(weightsEvent.fishingWeight, weightsNormal.fishingWeight * 2);
    assert.ok(weightsEvent.totalWeight > weightsNormal.totalWeight);
    assert.ok((weightsEvent.fishingWeight / weightsEvent.totalWeight) > (weightsNormal.fishingWeight / weightsNormal.totalWeight));
  });
});
