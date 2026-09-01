import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import RouteSpawnsTable from '@/components/modals/RouteSpawnsTable.vue';
import type { RouteSpawnMappedItem } from '@/logic/utils/routeSpawnHelpers';
import type { NpcChanceInfo } from '@/logic/weather/weatherUtils';
import type { ArchaeologyRewardData } from '@/composables/modals/useRouteSpawnsArchaeology';

describe('RouteSpawnsTable Component', () => {
  it('renders pokemon spawns mode correctly and emits select-pokemon', async () => {
    const mockPokemon: RouteSpawnMappedItem = {
      id: 'pikachu',
      name: 'Pikachu',
      sprite: '/sprites/25.png',
      types: ['Electric'],
      percentage: 15.5,
      basePercentage: 10.0,
      baseRate: 10,
      diff: 5.5,
      multiplier: 1.5,
      spawnType: 'Visitante',
      statusClass: 'visitor',
      totalStats: 320,
      hp: 35,
      atk: 55,
      def: 40,
      spa: 50,
      spd: 50,
      spe: 90,
      isSeen: true,
      isCaught: true,
      isEventBoosted: false
    };

    const wrapper = mount(RouteSpawnsTable, {
      props: {
        title: 'Pokémon en la Ruta',
        probability: 100,
        baseProbability: 100,
        items: [mockPokemon],
        mode: 'pokemon',
        probClass: 'info',
        weatherEmoji: '⚡',
        weatherLabel: 'Tormenta Eléctrica'
      }
    });

    expect(wrapper.text()).toContain('Pikachu');
    expect(wrapper.text()).toContain('15.5%');
    expect(wrapper.text()).toContain('320');

    // Click on pokemon row
    const row = wrapper.find('.report-row');
    expect(row.exists()).toBe(true);
    await row.trigger('click');

    expect(wrapper.emitted('select-pokemon')).toBeTruthy();
    expect(wrapper.emitted('select-pokemon')![0]).toEqual(['pikachu', true]);
  });

  it('renders NPC mode correctly', () => {
    const mockNpc: NpcChanceInfo = {
      name: 'Entrenador Guay',
      type: 'trainer',
      active: true,
      chance: 25.0,
      details: 'Equipo nivel 30'
    };

    const wrapper = mount(RouteSpawnsTable, {
      props: {
        title: 'Encuentros Especiales',
        probability: 50,
        baseProbability: 50,
        items: [mockNpc],
        mode: 'npc',
        probClass: 'info',
        weatherEmoji: '',
        weatherLabel: ''
      }
    });

    expect(wrapper.text()).toContain('Entrenador Guay');
    expect(wrapper.text()).toContain('ENTRENADOR');
    expect(wrapper.text()).toContain('ACTIVO');
    expect(wrapper.text()).toContain('25.0%');
  });

  it('renders archaeology items mode correctly', () => {
    const mockItem: ArchaeologyRewardData = {
      name: 'Fósil Hélix',
      sprite: '/items/helix-fossil.png',
      icon: '/items/helix-fossil.png',
      type: 'Fósil',
      statusClass: 'rare',
      percentage: 5.0,
      basePercentage: 5.0,
      baseWeight: 10,
      activeWeight: 10,
      addedWeight: 0,
      baseTotalWeight: 100,
      activeTotalWeight: 100,
      description: 'Un fósil antiguo en espiral'
    };

    const wrapper = mount(RouteSpawnsTable, {
      props: {
        title: 'Arqueología y Fósiles',
        probability: 30,
        baseProbability: 30,
        items: [mockItem],
        mode: 'item',
        probClass: 'info',
        weatherEmoji: '',
        weatherLabel: ''
      }
    });

    expect(wrapper.text()).toContain('Fósil Hélix');
    expect(wrapper.text()).toContain('Fósil');
    expect(wrapper.text()).toContain('5.0%');
  });
});
