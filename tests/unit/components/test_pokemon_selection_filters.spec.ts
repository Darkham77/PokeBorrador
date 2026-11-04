import { mount } from '@vue/test-utils';
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vite-plus/test';

import PokemonSelectionFilters from '@/components/modals/PokemonSelectionFilters.vue';
import PokemonSortBar from '@/components/pokemon/PokemonSortBar.vue';

describe('PokemonSelectionFilters.vue', () => {
  it('debe resolver y renderizar correctamente el componente PokemonSortBar', () => {
    const warnSpy = vi.spyOn(console, 'warn');
    const wrapper = mount(PokemonSelectionFilters, {
      props: {
        searchQuery: '',
        'onUpdate:searchQuery': () => {},
        sortBy: 'recent',
        'onUpdate:sortBy': () => {},
        sortOrder: 'desc',
        'onUpdate:sortOrder': () => {},
        activeTags: [],
        'onUpdate:activeTags': () => {},
        filterCompatibleOnly: false,
        'onUpdate:filterCompatibleOnly': () => {}
      },
      global: {
        directives: {
          'gsap-hover': () => {}
        }
      }
    });

    const unresolvedWarnings = warnSpy.mock.calls.filter((args) =>
      args.some(
        (arg) =>
          typeof arg === 'string' && arg.includes('Failed to resolve component: PokemonSortBar')
      )
    );

    expect(unresolvedWarnings).toHaveLength(0);
    expect(wrapper.findComponent(PokemonSortBar).exists()).toBe(true);
    expect(wrapper.classes()).not.toContain('is-compact');
    expect(wrapper.findAll('.ps-tag-label').length).toBeGreaterThan(0);

    warnSpy.mockRestore();
  });

  it('debe soportar modo compacto ocultando abreviaciones de texto y mostrando emojis', () => {
    const wrapper = mount(PokemonSelectionFilters, {
      props: {
        searchQuery: '',
        'onUpdate:searchQuery': () => {},
        sortBy: 'recent',
        'onUpdate:sortBy': () => {},
        sortOrder: 'desc',
        'onUpdate:sortOrder': () => {},
        activeTags: [],
        'onUpdate:activeTags': () => {},
        filterCompatibleOnly: false,
        'onUpdate:filterCompatibleOnly': () => {},
        compact: true
      },
      global: {
        directives: {
          'gsap-hover': () => {}
        }
      }
    });

    expect(wrapper.classes()).toContain('is-compact');
    const sortBar = wrapper.findComponent(PokemonSortBar);
    expect(sortBar.exists()).toBe(true);
    expect((sortBar.props() as Record<string, unknown>)['compact']).toBe(true);
    expect(sortBar.classes()).toContain('is-compact');

    // In compact mode, text labels in sort bar are hidden
    expect(sortBar.findAll('.label')).toHaveLength(0);
    // Emojis remain visible
    expect(sortBar.findAll('.emoji').length).toBeGreaterThan(0);

    // In compact mode, tag labels in tags bar are hidden
    expect(wrapper.findAll('.ps-tag-label')).toHaveLength(0);
    // Tag emojis remain visible
    expect(wrapper.findAll('.ps-tags-list-horizontal .emoji').length).toBeGreaterThan(0);
  });
});
