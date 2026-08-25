import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import DebugPokemonCreator from '@/components/admin/debug/DebugPokemonCreator.vue'
import { validatePokemonLegality } from '@/components/admin/debug/useDebugPokemonCreator.ts'

describe('Debug Pokemon Creator Legality Guard & Modal', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('detects illegal moves for a species and returns explicit reasons', () => {
    const illegalConfig = {
      id: 'gengar',
      level: 50,
      isShiny: false,
      isGuardian: false,
      nature: 'timid',
      ability: 'cursedbody',
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route_1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['lastresort', 'copycat'], // Eevee moves, illegal for Gengar
      protocol: 'catch'
    }

    const result = validatePokemonLegality(illegalConfig)
    expect(result.valid).toBe(false)
    expect(result.issues.length).toBeGreaterThanOrEqual(2)
    expect(result.issues.some(i => i.includes('lastresort') || i.includes('Última Baza'))).toBe(true)
  })

  it('detects illegal abilities for a species', () => {
    const illegalAbilityConfig = {
      id: 'pikachu',
      level: 25,
      isShiny: false,
      isGuardian: false,
      nature: 'jolly',
      ability: 'hugepower', // Huge power is Azumarill/Diggersby, illegal for Pikachu
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route_1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['thunderbolt', 'quickattack'],
      protocol: 'catch'
    }

    const result = validatePokemonLegality(illegalAbilityConfig)
    expect(result.valid).toBe(false)
    expect(result.issues.some(i => i.includes('hugepower') && i.includes('ilegal'))).toBe(true)
  })

  it('validates a completely legal Pokemon successfully with zero issues', () => {
    const legalConfig = {
      id: 'gengar',
      level: 50,
      isShiny: false,
      isGuardian: false,
      nature: 'timid',
      ability: 'cursedbody',
      gender: 'm' as const,
      nickname: '',
      friendship: 70,
      heldItem: '',
      mapId: 'route_1',
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      moves: ['shadowball', 'sludgebomb', 'thunderbolt', 'focusblast'],
      protocol: 'catch'
    }

    const result = validatePokemonLegality(legalConfig)
    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('displays the illegal pokemon warning modal in the UI when attempting to create an invalid pokemon', async () => {
    let debugCreated = false
    window.__VITE_DEBUG__ = {
      createPokemon: async () => {
        debugCreated = true
      }
    } as any

    const wrapper = mount(DebugPokemonCreator)

    // Set illegal move directly in component state
    const vm = wrapper.vm as any
    vm.config.id = 'gengar'
    vm.config.ability = 'cursedbody'
    vm.config.moves = ['lastresort']

    // Attempt to click create button
    const catchBtn = wrapper.find('#debug-btn-catch')
    if (catchBtn.exists()) {
      await catchBtn.trigger('click')
    } else {
      // Direct call to executeAction
      await vm.executeAction('catch')
    }

    await wrapper.vm.$nextTick()

    // The creation must be blocked
    expect(debugCreated).toBe(false)

    // The modal must be visible with the reasons
    const modal = wrapper.find('#debug-illegal-pokemon-modal')
    expect(modal.exists()).toBe(true)
    expect(modal.text()).toContain('POKÉMON ILEGAL DETECTADO')
    expect(modal.text()).toContain('lastresort')

    // Click close button
    const closeBtn = wrapper.find('#debug-illegal-modal-close-btn')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')

    await wrapper.vm.$nextTick()
    expect(wrapper.find('#debug-illegal-pokemon-modal').exists()).toBe(false)
  })
})
