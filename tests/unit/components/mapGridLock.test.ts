// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import MapGrid from '@/components/map/MapGrid.vue';
import type { MapLocation } from '@/types/pokemon/encounters';

describe('MapGrid.vue Cerulean Cave Lock Logic', () => {
  setActivePinia(createPinia());

  const mockMaps: MapLocation[] = [
    {
      id: 'cerulean_cave',
      name: 'Cueva Celeste',
      badges: 8,
      desc: 'Mewtwo rest place',
      wild: {
        day: ['kadabra']
      },
      rates: {
        day: [100]
      },
      lv: [50, 70]
    }
  ];

  it('locks cerulean_cave when player has 0 badges and 0 ticket seconds', () => {
    const wrapper = mount(MapGrid, {
      props: {
        maps: mockMaps,
        badgeCount: 0,
        ceruleanTicketSecs: 0
      },
      global: {
        stubs: {
          MapCard: {
            template: '<div class="stub-map-card" :data-locked="isLocked" />',
            props: ['isLocked']
          }
        }
      }
    });

    const card = wrapper.find('.stub-map-card');
    expect(card.attributes('data-locked')).toBe('true');
  });

  it('unlocks cerulean_cave when player has 0 badges but ceruleanTicketSecs > 0', () => {
    const wrapper = mount(MapGrid, {
      props: {
        maps: mockMaps,
        badgeCount: 0,
        ceruleanTicketSecs: 1800
      },
      global: {
        stubs: {
          MapCard: {
            template: '<div class="stub-map-card" :data-locked="isLocked" />',
            props: ['isLocked']
          }
        }
      }
    });

    const card = wrapper.find('.stub-map-card');
    expect(card.attributes('data-locked')).toBe('false');
  });
});
