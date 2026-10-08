// @vitest-environment jsdom
// test-fragmentation-ok: Isolated single-purpose regression test for BattleTrainerEntities watch import
import { describe, it, expect } from 'vitest';

import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BattleTrainerEntities from '../../../../src/components/battle/BattleTrainerEntities.vue';

describe('BattleTrainerEntities.vue', () => {
  it('mounts cleanly without throwing ReferenceError: watch is not defined', () => {
    setActivePinia(createPinia());
    const wrapper = mount(BattleTrainerEntities, {
      props: {
        isTrainerVisible: true,
        showStandingTrainers: false,
        trainerAnimState: null,
        showGuides: false,
        p2Pos: { x: 100, y: 100 },
        baseEntitySizeEnemy: 64,
        baseEntitySizePlayer: 64,
        objectScale: 1,
        isTrainerOrGym: false,
        isPvP: false,
        trainerSprite: 'cazabichos',
        trainerGender: 'h',
        trainerName: 'Ash',
        playerBackSpriteUrl: '/assets/sprites/trainers/cazabichos_h_back.webp'
      }
    });

    expect(wrapper.exists()).toBe(true);
  });
});
