// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount, config } from '@vue/test-utils'
import PokemonTagBar from '@/components/pokemon/PokemonTagBar.vue'
import type { PokemonFilterTagId } from '@/logic/constants/tags'

config.global.directives = {
  'gsap-hover': {}
}

describe('PokemonTagBar.vue', () => {
  it('renders canonical filter tags with labels by default', () => {
    const wrapper = mount(PokemonTagBar, {
      props: {
        modelValue: [],
        showLabel: true,
        label: 'ETIQUETAS:'
      },
      global: {
        directives: { 'gsap-hover': {} }
      }
    })

    expect(wrapper.find('.mini-label').text()).toBe('ETIQUETAS:')
    const buttons = wrapper.findAll('.tag-pill-btn')
    expect(buttons.length).toBeGreaterThanOrEqual(10)
    
    // Check that text labels exist in non-compact mode
    const textLabels = wrapper.findAll('.tag-text')
    expect(textLabels.length).toBeGreaterThanOrEqual(10)
    const labels = textLabels.map(t => t.text())
    expect(labels).toContain('FAV')
    expect(labels).toContain('GEN')
    expect(labels).toContain('CMP')
    expect(labels).toContain('SHY')
  })

  it('applies is-compact class when compact prop is true', () => {
    const wrapper = mount(PokemonTagBar, {
      props: {
        modelValue: [],
        compact: true
      }
    })

    expect(wrapper.find('.pokemon-tag-bar').classes()).toContain('is-compact')
  })

  it('marks active tag buttons and emits update:modelValue on click', async () => {
    const wrapper = mount(PokemonTagBar, {
      props: {
        modelValue: ['fav'] as PokemonFilterTagId[],
        'onUpdate:modelValue': (val: PokemonFilterTagId[]) => wrapper.setProps({ modelValue: val })
      }
    })

    const favBtn = wrapper.find('.tag-fav')
    expect(favBtn.classes()).toContain('active')

    // Click breed to activate it
    const breedBtn = wrapper.find('.tag-breed')
    expect(breedBtn.classes()).not.toContain('active')
    await breedBtn.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0] as string[]
    expect(emitted).toEqual(['fav', 'breed'])
  })

  it('toggles off an active tag when clicked again', async () => {
    const wrapper = mount(PokemonTagBar, {
      props: {
        modelValue: ['fav', 'breed'] as PokemonFilterTagId[]
      }
    })

    const favBtn = wrapper.find('.tag-fav')
    await favBtn.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    const emitted = wrapper.emitted('update:modelValue')?.[0]?.[0] as string[]
    expect(emitted).toEqual(['breed'])
  })

  it('supports alias mapping for shy/shiny and comp/competitive', () => {
    const wrapper = mount(PokemonTagBar, {
      props: {
        modelValue: ['shy', 'competitive']
      }
    })

    expect(wrapper.find('.tag-shiny').classes()).toContain('active')
    expect(wrapper.find('.tag-comp').classes()).toContain('active')
  })

  it('renders compatible filter button when showCompatible is true', async () => {
    const wrapper = mount(PokemonTagBar, {
      props: {
        modelValue: [],
        showCompatible: true,
        filterCompatibleOnly: false
      }
    })

    const compBtn = wrapper.find('.tag-compatible')
    expect(compBtn.exists()).toBe(true)
    expect(compBtn.classes()).not.toContain('active')

    await compBtn.trigger('click')
    expect(wrapper.emitted('update:filterCompatibleOnly')).toBeTruthy()
    expect(wrapper.emitted('update:filterCompatibleOnly')?.[0]?.[0]).toBe(true)
  })
})
