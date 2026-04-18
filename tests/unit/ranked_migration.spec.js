import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRankedValidation } from '@/composables/useRankedValidation';
import { useRankedStore } from '@/stores/rankedStore';

describe('Ranked Migration (Pinia)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const rankedStore = useRankedStore();
    rankedStore.rules = {
      seasonName: 'Test Season',
      levelCap: 50,
      maxPokemon: 3,
      allowedTypes: ['fire', 'water'],
      bannedPokemonIds: ['mewtwo']
    };
  });

  it('debe calcular el tier correctamente en el store', () => {
    const rankedStore = useRankedStore();
    expect(rankedStore.currentTier(1000).name).toBe('Bronce');
    expect(rankedStore.currentTier(2800).name).toBe('Diamante');
  });

  it('debe validar el nivel en el composable', () => {
    const { validatePokemon } = useRankedValidation();
    
    expect(validatePokemon({ name: 'Charmander', level: 10, type: ['fire'] }).ok).toBe(true);
    expect(validatePokemon({ name: 'Charizard', level: 60, type: ['fire'] }).ok).toBe(false);
  });

  it('debe validar los tipos permitidos', () => {
    const { validatePokemon } = useRankedValidation();
    
    expect(validatePokemon({ name: 'Squirtle', level: 10, type: ['water'] }).ok).toBe(true);
    expect(validatePokemon({ name: 'Pikachu', level: 10, type: ['electric'] }).ok).toBe(false);
  });

  it('debe validar el límite de pokémon en equipo', () => {
    const { validateTeam } = useRankedValidation();
    const team = [
      { name: 'P1', level: 10, type: ['fire'] },
      { name: 'P2', level: 10, type: ['fire'] },
      { name: 'P3', level: 10, type: ['fire'] },
      { name: 'P4', level: 10, type: ['fire'] }
    ];
    
    expect(validateTeam(team).ok).toBe(false);
    expect(validateTeam(team.slice(0, 3)).ok).toBe(true);
  });
});
