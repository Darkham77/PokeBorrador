/**
 * tests/unit/battle/useCombatantStatus.spec.ts
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBattleStore } from '../../../src/stores/battle/battle.ts';
import { useCombatantStatus } from '../../../src/composables/battle/useCombatantStatus.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import type { BattleState } from '../../../src/types/battle/battle.ts';

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn((type, id) => `mock-url-${type}-${id}`),
  ASSET_TYPES: {
    POKEMON: 'pokemon',
    TRAINER: 'trainer',
    ITEM: 'item'
  }
}));

vi.mock('@/data/system/constants', () => ({
  ACTIVE_GENERATION: 4
}));

describe('useCombatantStatus - Weather display filtering', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should not show a weather status tag if the weather in Gen 3 is none', () => {
    const battleStore = useBattleStore();
    
    // Mock the battle state with Gen 3 none weather
    battleStore.state = {
      weather: {
        type: 'none',
        visual: 'fog',
        turns: -1
      },
      player: {
        id: 'charmeleon',
        name: 'Charmeleon',
        hp: 52,
        maxHp: 52,
        type: 'fire',
        moves: [{ name: 'Tackle' }]
      } as unknown as Pokemon,
      enemy: null,
      locationId: 'route1',
      turnCount: 1,
      turn: 'player',
      over: false,
      isGym: false
    } as unknown as BattleState;

    const pokemonRef = () => battleStore.state?.player;
    const isPlayer = () => true;

    const { unifiedStatuses } = useCombatantStatus(pokemonRef, battleStore, isPlayer);

    // Should only have the ability (if any), but not the weather badge
    const weatherStatus = unifiedStatuses.value.find(s => s.id === 'fog' || s.title?.toLowerCase().includes('niebla'));
    expect(weatherStatus).toBeUndefined();
  });

  it('should show a weather status tag if the weather in Gen 4+ is fog', () => {
    const battleStore = useBattleStore();

    // Mock the battle state with fog weather
    battleStore.state = {
      weather: {
        type: 'fog',
        visual: 'fog',
        turns: -1
      },
      player: {
        id: 'charmeleon',
        name: 'Charmeleon',
        hp: 52,
        maxHp: 52,
        type: 'fire',
        moves: [{ name: 'Tackle', accuracy: 100 }]
      } as unknown as Pokemon,
      enemy: null,
      locationId: 'route1',
      turnCount: 1,
      turn: 'player',
      over: false,
      isGym: false
    } as unknown as BattleState;

    const pokemonRef = () => battleStore.state?.player;
    const isPlayer = () => true;

    const { unifiedStatuses } = useCombatantStatus(pokemonRef, battleStore, isPlayer);

    const weatherStatus = unifiedStatuses.value.find(s => 
      s.description?.toLowerCase().includes('niebla') || 
      s.description?.toLowerCase().includes('bruma') ||
      s.title?.toLowerCase().includes('niebla') ||
      s.title?.toLowerCase().includes('bruma')
    );
    expect(weatherStatus).toBeDefined();
  });
});
