import { describe, it, expect } from 'vitest';
import { calcStatsPure } from '@/logic/pokemon/statsMath';
import { Dex } from '@pkmn/sim';

describe('Pokémon Stats Parity', () => {
  it('should calculate identical stats for Blissey at level 100 with zero EVs and 31 IVs', () => {
    const speciesData = Dex.species.get('blissey');
    const baseStats = speciesData.baseStats;

    // Naturaleza seria (sin cambios)
    const natureData = { up: null, down: null };

    const level = 100;
    const ivs = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
    const evs = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    const calculated = calcStatsPure(
      level,
      ivs,
      {
        hp: baseStats.hp,
        atk: baseStats.atk,
        def: baseStats.def,
        spa: baseStats.spa,
        spd: baseStats.spd,
        spe: baseStats.spe
      },
      natureData,
      false,
      evs
    );

    // Blissey base stats en Gen 5+: HP 255, Atk 10, Def 10, SpA 75, SpD 135, Spe 55
    // HP calculado: ((255 * 2) + 31 + 0) * 100 / 100 + 100 + 10 = 510 + 31 + 110 = 651
    // Def calculada: ((10 * 2) + 31 + 0) * 100 / 100 + 5 = 20 + 31 + 5 = 56
    expect(calculated.maxHp).toBe(651);
    expect(calculated.def).toBe(56);
    expect(calculated.atk).toBe(56);
  });
});
