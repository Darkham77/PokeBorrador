/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue';

describe('FriendshipSealBadge.vue', () => {
  it('renders distrust seal for 0 friendship', () => {
    const wrapper = mount(FriendshipSealBadge, {
      props: {
        friendship: 0,
        size: 'md',
      },
    });

    const badge = wrapper.find('.friendship-seal-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.classes()).toContain('tier-distrust');
    expect(badge.find('.seal-icon').text()).toBe('⛓️');
  });

  it('renders sprout seal for 70 friendship (default)', () => {
    const wrapper = mount(FriendshipSealBadge, {
      props: {
        friendship: 70,
        size: 'sm',
      },
    });

    const badge = wrapper.find('.friendship-seal-badge');
    expect(badge.classes()).toContain('tier-sprout');
    expect(badge.find('.seal-icon').text()).toBe('🌱');
  });

  it('renders comrade seal for 120 friendship', () => {
    const wrapper = mount(FriendshipSealBadge, {
      props: {
        friendship: 120,
        size: 'md',
      },
    });

    const badge = wrapper.find('.friendship-seal-badge');
    expect(badge.classes()).toContain('tier-comrade');
    expect(badge.find('.seal-icon').text()).toBe('🤝');
  });

  it('renders radiant_prism seal for 180 friendship (evolution ready)', () => {
    const wrapper = mount(FriendshipSealBadge, {
      props: {
        friendship: 180,
        size: 'md',
      },
    });

    const badge = wrapper.find('.friendship-seal-badge');
    expect(badge.classes()).toContain('tier-radiant_prism');
    expect(badge.find('.seal-icon').text()).toBe('💎');
  });

  it('renders best_friends ribbon for 255 friendship (combat perks active)', () => {
    const wrapper = mount(FriendshipSealBadge, {
      props: {
        friendship: 255,
        size: 'lg',
      },
    });

    const badge = wrapper.find('.friendship-seal-badge');
    expect(badge.classes()).toContain('tier-best_friends');
    expect(badge.find('.seal-icon').text()).toBe('🎀');
  });
});
