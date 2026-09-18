/**
 * tests/unit/battle/battle_info_card_suite.spec.ts
 * Consolidated domain test suite for BattleInfoCard & BattleInfoCardHeader:
 * Ability tooltips & descriptions, Gender badges (male/female/casing),
 * and level rendering format.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import BattleInfoCard from '@/components/battle/BattleInfoCard.vue';
import BattleInfoCardHeader from '@/components/battle/BattleInfoCardHeader.vue';
import type { Pokemon } from '@/types/pokemon/pokemon';

vi.mock('@/stores/battle/battle', () => ({
  useBattleStore: vi.fn(() => ({
    state: { weather: { type: 'clear' } },
    playerStages: {},
    enemyStages: {}
  }))
}));

vi.mock('@/stores/player/profile', () => ({
  useProfileStore: vi.fn(() => ({
    profileData: { isAdmin: false }
  }))
}));

vi.mock('@/components/shared/PokemonTypePills.vue', () => ({
  default: { template: '<div class="types-mock"></div>' }
}));

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(() => '/assets/mock-item.png'),
  ASSET_TYPES: { ITEM: 'item' }
}));

vi.mock('@/logic/utils/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'day')
}));

vi.mock('@/logic/weather/weatherRegistry', () => ({
  getMechanicalWeather: vi.fn(() => 'clear'),
  WEATHER_MECHANICAL: {
    SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', CLEAR: 'clear'
  },
  WEATHER_UI_METADATA: {},
  WEATHER_VISUAL_METADATA: {}
}));

import { mockLocalStorage } from '../../helpers/debugSetup.ts';

mockLocalStorage();

interface BattleInfoCardInstance {
  volatileStatuses: { icon: string; text: string }[];
}

// =============================================================================
// 1. BattleInfoCard - Ability Tooltips
// =============================================================================
describe('BattleInfoCard - Ability Tooltips', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const mockPokemon = {
    name: 'Nidorina',
    level: 16,
    hp: 159,
    maxHp: 159,
    gender: 'F',
    ability: 'poisonpoint',
    type: 'poison'
  };

  it('should display the ability description in the tooltip', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: mockPokemon as unknown as Pokemon,
        isPlayer: false
      }
    });

    const badges = wrapper.findAll('.m-status-tag');
    const abilityBadge = badges.find(b => b.text().includes('🧠'));
    
    expect(abilityBadge).toBeDefined();
    
    const vm = wrapper.vm as unknown as BattleInfoCardInstance;
    const vs = vm.volatileStatuses;
    const abilityStatus = vs.find(s => s.icon === '🧠');
    
    expect(abilityStatus).toBeDefined();
    expect(abilityStatus!.text).toContain('HABILIDAD - PUNTO TÓXICO:');
    expect(abilityStatus!.text).toContain('• El contacto físico puede envenenar al rival (30%).');
  });

  it('should handle case-insensitive ability names', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: { ...mockPokemon, ability: 'POISONPOINT' } as unknown as Pokemon,
        isPlayer: false
      }
    });

    const vm = wrapper.vm as unknown as BattleInfoCardInstance;
    const vs = vm.volatileStatuses;
    const abilityStatus = vs.find(s => s.icon === '🧠');
    
    expect(abilityStatus).toBeDefined();
    expect(abilityStatus!.text).toContain('HABILIDAD - PUNTO TÓXICO:');
    expect(abilityStatus!.text).toContain('• El contacto físico puede envenenar al rival (30%).');
  });

  it('should show "Sin descripción disponible" for unknown abilities', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: { ...mockPokemon, ability: 'Habilidad Inventada' } as unknown as Pokemon,
        isPlayer: false
      }
    });

    const vm = wrapper.vm as unknown as BattleInfoCardInstance;
    const vs = vm.volatileStatuses;
    const abilityStatus = vs.find(s => s.icon === '🧠');
    
    expect(abilityStatus).toBeDefined();
    expect(abilityStatus!.text).toContain('Sin descripción disponible');
  });
});

// =============================================================================
// 2. BattleInfoCard - Gender Badge and Level Formatting
// =============================================================================
describe('BattleInfoCard - Gender Badge and Level Formatting', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders standard female badge with female classes and symbol', () => {
    const femaleMon = {
      name: 'Gengar',
      level: 60,
      hp: 150,
      maxHp: 150,
      gender: 'f',
      type: 'ghost',
      type2: 'poison'
    } as unknown as Pokemon;

    const wrapper = mount(BattleInfoCardHeader, {
      props: {
        pokemon: femaleMon,
        isPlayer: false,
        isScrambled: false
      }
    });

    const genderBadge = wrapper.findComponent({ name: 'PVGenderBadge' });
    expect(genderBadge.exists()).toBe(true);
    expect(genderBadge.classes()).toContain('female');
    expect(genderBadge.text()).toContain('♀');
  });

  it('renders standard male badge with male classes and symbol', () => {
    const maleMon = {
      name: 'Butterfree',
      level: 5,
      hp: 50,
      maxHp: 50,
      gender: 'm',
      type: 'bug',
      type2: 'flying'
    } as unknown as Pokemon;

    const wrapper = mount(BattleInfoCardHeader, {
      props: {
        pokemon: maleMon,
        isPlayer: false,
        isScrambled: false
      }
    });

    const genderBadge = wrapper.findComponent({ name: 'PVGenderBadge' });
    expect(genderBadge.exists()).toBe(true);
    expect(genderBadge.classes()).toContain('male');
    expect(genderBadge.text()).toContain('♂');
  });

  it('supports uppercase gender codes (M/F)', () => {
    const femaleMon = {
      name: 'Nidorina',
      level: 25,
      hp: 80,
      maxHp: 80,
      gender: 'F',
      type: 'poison'
    } as unknown as Pokemon;

    const wrapper = mount(BattleInfoCardHeader, {
      props: {
        pokemon: femaleMon,
        isPlayer: false,
        isScrambled: false
      }
    });

    const genderBadge = wrapper.findComponent({ name: 'PVGenderBadge' });
    expect(genderBadge.exists()).toBe(true);
    expect(genderBadge.classes()).toContain('female');
    expect(genderBadge.text()).toContain('♀');
  });

  it('renders level horizontally in single line without splitting', () => {
    const mon = {
      name: 'Gengar',
      level: 60,
      hp: 150,
      maxHp: 150,
      gender: 'f',
      type: 'ghost',
      type2: 'poison'
    } as unknown as Pokemon;

    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: mon,
        isPlayer: false
      }
    });

    const levelBadge = wrapper.find('.poke-level');
    expect(levelBadge.exists()).toBe(true);
    expect(levelBadge.text()).toContain('Nv. 60');
  });
});
