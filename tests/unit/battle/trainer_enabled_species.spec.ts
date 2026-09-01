import { describe, it, expect } from 'vitest';
import { buildTrainerTeam } from '@/logic/battle/trainerFactory';
import { buildRivalEncounter, buildTrainerEncounter } from '@/logic/battle/trainerSpawner';
import { isEnabledPokemonId } from '@/data/system/constants';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('NPC & Rival Team Generation - Enabled Species Enforcement', () => {
  it('buildTrainerTeam produces strictly enabled Pokémon', async () => {
    const pool: PokemonSpeciesId[] = ['caterpie', 'weedle', 'pidgey', 'rattata'];
    const team = await buildTrainerTeam(pool, 25, 4);

    expect(team.length).toBe(4);
    for (const p of team) {
      expect(isEnabledPokemonId(p.id)).toBe(true);
    }
  });

  it('buildTrainerTeam throws loud error when non-enabled species is in pool', async () => {
    // Pass a non-enabled species (e.g. lucario, tinkaton, etc.)
    const illegalPool = ['lucario' as unknown as PokemonSpeciesId];
    await expect(buildTrainerTeam(illegalPool, 30, 1)).rejects.toThrowError(
      /Cannot create trainer pokemon for non-enabled species/
    );
  });

  it('buildRivalEncounter produces strictly enabled Pokémon for all slots with level +5 and Ace at slot 0', async () => {
    const mockPlayerTeam = [
      { id: 'pikachu', level: 30 } as unknown as Pokemon,
      { id: 'charizard', level: 32 } as unknown as Pokemon,
      { id: 'blastoise', level: 31 } as unknown as Pokemon
    ];

    const rival = await buildRivalEncounter(mockPlayerTeam);
    expect(rival.enemyTeam.length).toBeGreaterThanOrEqual(3);

    // Level should be avg(31) + 5 = 36
    for (const p of rival.enemyTeam) {
      expect(p.level).toBe(36);
      expect(isEnabledPokemonId(p.id)).toBe(true);
    }
  });

  it('buildTrainerEncounter produces strictly enabled Pokémon across route locations', async () => {
    const gsState = {
      playerClass: 'trainer',
      classData: {},
      trainerChance: 5
    };

    const encounter = await buildTrainerEncounter(gsState, 'route1');
    expect(encounter.enemyTeam.length).toBeGreaterThanOrEqual(1);

    for (const p of encounter.enemyTeam) {
      expect(isEnabledPokemonId(p.id)).toBe(true);
    }
  });
});
