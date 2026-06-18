/** @vitest-environment jsdom */
/**
 * Integration tests for PPUpModal, NaturePatchModal, AbilityPillModal.
 *
 * KEY INVARIANT UNDER TEST:
 *   The modal must mutate the Pokémon directly in gameStore (via context+index lookup),
 *   NOT through a cross-store reference that Pinia may copy.
 *
 * This test suite would have caught the original bug where maxPP stayed at its old
 * value because the modal was mutating UIStore's internal copy of the Pokemon object.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { useInventoryStore } from '@/stores/inventory/inventory'
import PPUpModal from '@/components/modals/PPUpModal.vue'
import NaturePatchModal from '@/components/modals/NaturePatchModal.vue'
import AbilityPillModal from '@/components/modals/AbilityPillModal.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

// ── Stubs ─────────────────────────────────────────────────────────────────────
// BattleMoveSlot is a heavy battle component — stub it so the modal logic
// is the only thing under test.
const BattleMoveSlotStub = {
  name: 'BattleMoveSlot',
  props: ['move', 'index', 'playerInfo', 'canReorder'],
  emits: ['use-move'],
  template: `<button class="move-stub" @click="$emit('use-move', index)">{{ move?.name }}</button>`
}

// BaseModal renders a simple passthrough
const BaseModalStub = {
  name: 'BaseModal',
  props: ['show', 'title'],
  emits: ['close'],
  template: `<div v-if="show" class="base-modal"><slot /><slot name="footer" /></div>`
}

// PokemonTypeTag stub (used inside BattleMoveSlot if not fully stubbed)
const globalStubs = {
  BattleMoveSlot: BattleMoveSlotStub,
  BaseModal: BaseModalStub,
  PVTooltip: true,
  MoveTooltip: true,
  PokemonTypeTag: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePokemon(): Pokemon {
  return {
    uid: 'test-uid',
    id: 'zapdos',
    name: 'Zapdos',
    level: 50,
    hp: 60, maxHp: 100,
    status: null, sleepTurns: 0,
    moves: [
      { name: 'Carga',        pp: 16, maxPP: 20 },  // basePP=20, maxPossible=32
      { name: 'Pico Taladro', pp: 13, maxPP: 20 },
      { name: 'Detección',    pp: 5,  maxPP: 5  },
      { name: 'Agilidad',     pp: 29, maxPP: 30 },
    ],
    atk: 90, def: 85, spa: 125, spd: 90, spe: 100,
    type: 'electric', nature: 'Fuerte', ability: 'Presión',
    isShiny: false, gender: 'none', ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    happiness: 255, exp: 0, expNext: 999,
    heldItem: null, nature_locked: false,
    vigor: 10, bornAt: null,
  } as unknown as Pokemon
}

function setupStores(inventoryOverrides: Record<string, number> = {}) {
  setActivePinia(createPinia())

  const gameStore = useGameStore()
  const inventoryStore = useInventoryStore()

  // Place a Pokémon in team slot 0
  gameStore.state.team[0] = makePokemon()
  ;(gameStore.state.inventory as Record<string, number>) = { ...inventoryOverrides }

  return { gameStore, inventoryStore }
}

// ── PPUpModal ─────────────────────────────────────────────────────────────────

describe('PPUpModal — integración completa', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('pp_max sube maxPP en el gameStore, NO en una copia del UIStore', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    const uiStore = useUIStore()

    // Simulate what inventoryUseAction does
    uiStore.activePokemonForPPUp = { context: 'team', index: 0 }
    uiStore.activeItemForPPUp = 'pp_max'
    uiStore.isPPUpOpen = true

    const wrapper = mount(PPUpModal, {
      global: { stubs: globalStubs }
    })

    await flushPromises()

    // Click move slot 0 (Carga — 16/20 PP, basePP=20 → maxPossible=32)
    const moveButtons = wrapper.findAll('.move-stub')
    expect(moveButtons.length).toBeGreaterThan(0)
    await moveButtons[0]!.trigger('click')
    await flushPromises()

    // ✅ KEY ASSERTION: gameStore was mutated, not a copy
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBeGreaterThan(20)

    // pp_max does NOT restore current PP — only raises ceiling
    expect(gameStore.state.team[0]!.moves[0]!.pp).toBe(16)

    // Item consumed
    expect((gameStore.state.inventory as Record<string, number>)['pp_max']).toBeUndefined()

    // Modal closed
    expect(uiStore.isPPUpOpen).toBe(false)
    expect(uiStore.activePokemonForPPUp).toBeNull()
  })

  it('pp_up sube maxPP un 20% en el gameStore sin tocar pp actual', async () => {
    const { gameStore } = setupStores({ pp_up: 1 })
    const uiStore = useUIStore()

    uiStore.activePokemonForPPUp = { context: 'team', index: 0 }
    uiStore.activeItemForPPUp = 'pp_up'
    uiStore.isPPUpOpen = true

    const wrapper = mount(PPUpModal, {
      global: { stubs: globalStubs }
    })

    await flushPromises()
    const originalMaxPP = gameStore.state.team[0]!.moves[0]!.maxPP  // 20
    const originalPP    = gameStore.state.team[0]!.moves[0]!.pp      // 16

    await wrapper.findAll('.move-stub')[0]!.trigger('click')
    await flushPromises()

    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBeGreaterThan(originalMaxPP)
    expect(gameStore.state.team[0]!.moves[0]!.pp).toBe(originalPP) // unchanged
    expect((gameStore.state.inventory as Record<string, number>)['pp_up']).toBeUndefined()
  })

  it('NO consume el ítem si el modal se cierra sin elegir movimiento', async () => {
    const { gameStore } = setupStores({ pp_max: 2 })
    const uiStore = useUIStore()
    const originalMaxPP = gameStore.state.team[0]!.moves[0]!.maxPP

    uiStore.activePokemonForPPUp = { context: 'team', index: 0 }
    uiStore.activeItemForPPUp = 'pp_max'
    uiStore.isPPUpOpen = true

    const wrapper = mount(PPUpModal, { global: { stubs: globalStubs } })
    await flushPromises()

    // Click cancel button instead of a move
    const cancelBtn = wrapper.find('.btn-vicio-secondary')
    if (cancelBtn.exists()) await cancelBtn.trigger('click')
    else uiStore.isPPUpOpen = false  // simulate close

    await flushPromises()

    expect((gameStore.state.inventory as Record<string, number>)['pp_max']).toBe(2)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(originalMaxPP)
  })

  it('NO aplica ni consume si el movimiento ya tiene maxPP al máximo', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    const uiStore = useUIStore()

    // Set maxPP already at ceiling for Carga (basePP=20 → max=32)
    gameStore.state.team[0]!.moves[0]!.maxPP = 32

    uiStore.activePokemonForPPUp = { context: 'team', index: 0 }
    uiStore.activeItemForPPUp = 'pp_max'
    uiStore.isPPUpOpen = true

    const wrapper = mount(PPUpModal, { global: { stubs: globalStubs } })
    await flushPromises()

    // The slot should be disabled/maxed — clicking it does nothing
    const moveButtons = wrapper.findAll('.move-stub')
    // The row wrapper has class 'maxed' and pointer-events:none, but the stub
    // doesn't apply CSS so we test the guard logic directly via no state change
    await moveButtons[0]!.trigger('click')
    await flushPromises()

    // Item NOT consumed and maxPP unchanged
    expect((gameStore.state.inventory as Record<string, number>)['pp_max']).toBe(1)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(32)
  })

  it('muta equipo slot 0 y NO otra copia — regresión cross-store ref bug', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    const uiStore = useUIStore()

    // Capture a direct reference to the game store's Pokémon BEFORE mounting
    const pokemonInGameStore = gameStore.state.team[0]!
    const moveInGameStore = pokemonInGameStore.moves[0]!

    uiStore.activePokemonForPPUp = { context: 'team', index: 0 }
    uiStore.activeItemForPPUp = 'pp_max'
    uiStore.isPPUpOpen = true

    const wrapper = mount(PPUpModal, { global: { stubs: globalStubs } })
    await flushPromises()

    await wrapper.findAll('.move-stub')[0]!.trigger('click')
    await flushPromises()

    // The exact same object reference in gameStore was mutated
    expect(moveInGameStore.maxPP).toBeGreaterThan(20)
    // And the store's nested path also reflects it (same object)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(moveInGameStore.maxPP)
  })
})

// ── NaturePatchModal ──────────────────────────────────────────────────────────

describe('NaturePatchModal — integración completa', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('cambia la naturaleza en gameStore y consume el ítem al confirmar', async () => {
    const { gameStore } = setupStores({ nature_patch: 1 })
    const uiStore = useUIStore()

    gameStore.state.team[0]!.nature = 'Fuerte'
    uiStore.activePokemonForNature = { context: 'team', index: 0 }
    uiStore.isNaturePatchOpen = true

    const wrapper = mount(NaturePatchModal, { global: { stubs: globalStubs } })
    await flushPromises()

    // Click a different nature button (find any that isn't "Fuerte")
    const natureBtns = wrapper.findAll('.nature-btn')
    const targetBtn = natureBtns.find(b => !b.text().includes('Fuerte'))
    expect(targetBtn).toBeDefined()
    await targetBtn!.trigger('click')
    await flushPromises()

    // Nature changed in gameStore, not in a copy
    expect(gameStore.state.team[0]!.nature).not.toBe('Fuerte')

    // Item consumed
    expect((gameStore.state.inventory as Record<string, number>)['nature_patch']).toBeUndefined()

    // Modal closed
    expect(uiStore.isNaturePatchOpen).toBe(false)
  })

  it('NO consume si el modal cierra sin elegir', async () => {
    const { gameStore } = setupStores({ nature_patch: 1 })
    const uiStore = useUIStore()
    const originalNature = gameStore.state.team[0]!.nature

    uiStore.activePokemonForNature = { context: 'team', index: 0 }
    uiStore.isNaturePatchOpen = true

    mount(NaturePatchModal, { global: { stubs: globalStubs } })
    await flushPromises()

    uiStore.isNaturePatchOpen = false
    await flushPromises()

    expect((gameStore.state.inventory as Record<string, number>)['nature_patch']).toBe(1)
    expect(gameStore.state.team[0]!.nature).toBe(originalNature)
  })
})

// ── AbilityPillModal ──────────────────────────────────────────────────────────

describe('AbilityPillModal — integración completa', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('cambia la habilidad en gameStore y consume el ítem al confirmar', async () => {
    const { gameStore } = setupStores({ ability_pill: 1 })
    const uiStore = useUIStore()

    gameStore.state.team[0]!.ability = 'Presión'
    uiStore.activePokemonForAbility = { context: 'team', index: 0 }
    uiStore.isAbilityPillOpen = true

    const wrapper = mount(AbilityPillModal, { global: { stubs: globalStubs } })
    await flushPromises()

    // Click an ability button that is NOT the current one
    const abilityBtns = wrapper.findAll('.ability-btn')
    const targetBtn = abilityBtns.find(b => !b.classes('active'))

    if (targetBtn?.exists()) {
      await targetBtn.trigger('click')
      await flushPromises()

      expect(gameStore.state.team[0]!.ability).not.toBe('Presión')
      expect((gameStore.state.inventory as Record<string, number>)['ability_pill']).toBeUndefined()
      expect(uiStore.isAbilityPillOpen).toBe(false)
    } else {
      // Pokémon has only one ability — guard should notify but not consume
      expect((gameStore.state.inventory as Record<string, number>)['ability_pill']).toBe(1)
    }
  })

  it('NO consume si el modal cierra sin elegir', async () => {
    const { gameStore } = setupStores({ ability_pill: 1 })
    const uiStore = useUIStore()
    const originalAbility = gameStore.state.team[0]!.ability

    uiStore.activePokemonForAbility = { context: 'team', index: 0 }
    uiStore.isAbilityPillOpen = true

    mount(AbilityPillModal, { global: { stubs: globalStubs } })
    await flushPromises()

    uiStore.isAbilityPillOpen = false
    await flushPromises()

    expect((gameStore.state.inventory as Record<string, number>)['ability_pill']).toBe(1)
    expect(gameStore.state.team[0]!.ability).toBe(originalAbility)
  })
})
