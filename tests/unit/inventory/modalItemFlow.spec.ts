/** @vitest-environment jsdom */
/**
 * Integration tests for PPUpModal, NaturePatchModal, AbilityPillModal.
 *
 * KEY INVARIANTS UNDER TEST:
 *   1. The modal mutates the Pokémon in gameStore directly (context+index lookup).
 *      NOT through a cross-store reference (that Pinia copies internally).
 *   2. The exact value of maxPP after using an item is correct.
 *   3. Current PP is NEVER modified — only the ceiling (maxPP).
 *   4. Item is consumed ONLY after confirming — not on modal open.
 *
 * basePP is mocked to 20 for all "Carga" moves:
 *   pp_up  → maxPP += floor(20 × 0.2) = +4  → 20 → 24
 *   pp_max → maxPP  = floor(20 × 1.6) = 32   → 20 → 32
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

// ── Mock provider ─────────────────────────────────────────────────────────────
// Control basePP so assertions use exact deterministic values.
// Carga → basePP 20  →  pp_up +4  →  pp_max ceiling 32
const BASE_PP = 20
const PP_UP_INCREASE  = Math.floor(BASE_PP * 0.2)  // 4
const PP_MAX_CEILING  = Math.floor(BASE_PP * 1.6)  // 32

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMoveData:         () => ({ pp: BASE_PP, type: 'normal', power: null, accuracy: null }),
    getNatureData:       () => null,
    getAbilityData:      (name: string) => ({ name, desc: 'Efecto de la habilidad' }),
    getSpeciesAbilities: () => ['Presión', 'Estática'],
    getPokemonData:      () => ({
      baseStats: { hp: 90, atk: 90, def: 85, spa: 125, spd: 90, spe: 100 },
      types: ['electric'], abilities: ['Presión', 'Estática'],
    }),
  }
}))

// recalcPokemonStats runs a full sanitize cycle that requires a complete Pokemon
// object — mock it to a no-op since we only test nature persistence here.
vi.mock('@/logic/pokemon/pokemonFactory', () => ({
  recalcPokemonStats: vi.fn(),
}))

// ── Stubs ─────────────────────────────────────────────────────────────────────
// BattleMoveSlot is a heavy battle component — stub it.
// The stub emits 'use-move' with the numeric :index prop on click.
const BattleMoveSlotStub = {
  name: 'BattleMoveSlot',
  props: ['move', 'index', 'playerInfo', 'canReorder'],
  emits: ['use-move'],
  template: `<button class="move-stub" @click="$emit('use-move', index)">{{ move?.name }}</button>`
}

const BaseModalStub = {
  name: 'BaseModal',
  props: ['show', 'title'],
  emits: ['close'],
  template: `<div v-if="show" class="base-modal"><slot /><slot name="footer" /></div>`
}

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
      { id: 'charge', name: 'Carga',        pp: 16, maxPP: 20 },
      { id: 'drillrun', name: 'Pico Taladro', pp: 13, maxPP: 20 },
      { id: 'detect', name: 'Detección',    pp: 5,  maxPP: 5  },
      { id: 'agility', name: 'Agilidad',     pp: 29, maxPP: 30 },
    ],
    atk: 90, def: 85, spa: 125, spd: 90, spe: 100,
    type: 'electric', nature: 'Fuerte', ability: 'Presión',
    isShiny: false, gender: 'none',
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
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
  gameStore.state.team[0] = makePokemon()
  ;(gameStore.state.inventory as Record<string, number>) = { ...inventoryOverrides }
  return { gameStore, inventoryStore }
}

function openPPUpModal(itemId: 'pp_up' | 'ppmax') {
  const uiStore = useUIStore()
  uiStore.activePokemonForPPUp = { context: 'team', index: 0 }
  uiStore.activeItemForPPUp = itemId
  uiStore.isPPUpOpen = true
  return uiStore
}

async function mountPPUpModal() {
  const wrapper = mount(PPUpModal, { global: { stubs: globalStubs } })
  await flushPromises()
  return wrapper
}

async function selectPPUpMove(slotIndex: number) {
  const wrapper = await mountPPUpModal()
  const moveButton = wrapper.findAll('.move-stub').at(slotIndex)
  expect(moveButton).toBeDefined()
  await moveButton!.trigger('click')
  await flushPromises()
  return wrapper
}

// ── PPUpModal — pp_max ────────────────────────────────────────────────────────

describe('PPUpModal (pp_max) — integración', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })

  it('sube maxPP al techo exacto (32) en gameStore al elegir movimiento', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    openPPUpModal('ppmax')

    // Click slot 0 (Carga, pp=16, maxPP=20)
    await selectPPUpMove(0)

    // Exact value assertion — maxPP must be the 160% ceiling
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(PP_MAX_CEILING)  // 32

    // Current PP must NOT change
    expect(gameStore.state.team[0]!.moves[0]!.pp).toBe(16)

    // Item consumed exactly once
    expect((gameStore.state.inventory as Record<string, number>)['ppmax']).toBeUndefined()

    // Modal closed and refs cleared
    const uiStore = useUIStore()
    expect(uiStore.isPPUpOpen).toBe(false)
    expect(uiStore.activePokemonForPPUp).toBeNull()
  })

  it('funciona igual en slot 1 (Pico Taladro, pp=13, maxPP=20 → 32)', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    openPPUpModal('ppmax')

    await selectPPUpMove(1)

    expect(gameStore.state.team[0]!.moves[1]!.maxPP).toBe(PP_MAX_CEILING)  // 32
    expect(gameStore.state.team[0]!.moves[1]!.pp).toBe(13)                  // unchanged
    expect((gameStore.state.inventory as Record<string, number>)['ppmax']).toBeUndefined()
  })

  it('NO consume si cierra sin elegir movimiento', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    const uiStore = openPPUpModal('ppmax')
    const originalMaxPP = gameStore.state.team[0]!.moves[0]!.maxPP  // 20

    await mountPPUpModal()

    const cancelBtn = document.querySelector('.btn-vicio-secondary') as HTMLElement | null
    if (cancelBtn) cancelBtn.click()
    else uiStore.isPPUpOpen = false
    await flushPromises()

    expect((gameStore.state.inventory as Record<string, number>)['ppmax']).toBe(1)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(originalMaxPP)
  })

  it('NO aplica ni consume si maxPP ya es el techo (32)', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    gameStore.state.team[0]!.moves[0]!.maxPP = PP_MAX_CEILING  // ya en 32
    openPPUpModal('ppmax')

    // El slot 0 tiene clase 'maxed' → pointer-events:none en CSS real.
    // En JSDOM no hay CSS, así que el click pasa pero el guard lo rechaza.
    await selectPPUpMove(0)

    expect((gameStore.state.inventory as Record<string, number>)['ppmax']).toBe(1)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(PP_MAX_CEILING)
  })

  it('regresión: muta el objeto en gameStore, NO una copia interna del UIStore', async () => {
    const { gameStore } = setupStores({ pp_max: 1 })
    openPPUpModal('ppmax')

    // Capture direct reference BEFORE mounting
    const moveRef = gameStore.state.team[0]!.moves[0]!

    await selectPPUpMove(0)

    // The exact same JS object was mutated
    expect(moveRef.maxPP).toBe(PP_MAX_CEILING)
    // And the store path agrees (they're the same object)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(moveRef.maxPP)
  })
})

// ── PPUpModal — pp_up ─────────────────────────────────────────────────────────

describe('PPUpModal (pp_up) — integración', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })

  it('sube maxPP exactamente +4 (20% de basePP=20) sin tocar pp actual', async () => {
    const { gameStore } = setupStores({ pp_up: 1 })
    openPPUpModal('pp_up')

    await selectPPUpMove(0)

    // Exact: 20 + floor(20 × 0.2) = 24
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(20 + PP_UP_INCREASE)  // 24
    expect(gameStore.state.team[0]!.moves[0]!.pp).toBe(16)                        // unchanged
    expect((gameStore.state.inventory as Record<string, number>)['pp_up']).toBeUndefined()
  })

  it('acumula correctamente en el 2do y 3er uso hasta el techo (32)', async () => {
    const { gameStore } = setupStores({ pp_up: 3 })

    // 1st use: 20 → 24
    openPPUpModal('pp_up')
    let wrapper = await selectPPUpMove(0)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(24)
    wrapper.unmount()

    // 2nd use: 24 → 28
    openPPUpModal('pp_up')
    wrapper = await selectPPUpMove(0)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(28)
    wrapper.unmount()

    // 3rd use: 28 → 32 (capped at ceiling)
    openPPUpModal('pp_up')
    wrapper = await selectPPUpMove(0)
    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(PP_MAX_CEILING)  // 32
    wrapper.unmount()

    // Item count decremented 3 times
    expect((gameStore.state.inventory as Record<string, number>)['pp_up']).toBeUndefined()
  })

  it('NO pasa del techo — 4to intento rechazado por el guard', async () => {
    const { gameStore } = setupStores({ pp_up: 1 })
    gameStore.state.team[0]!.moves[0]!.maxPP = PP_MAX_CEILING  // already at 32
    openPPUpModal('pp_up')

    await selectPPUpMove(0)

    expect(gameStore.state.team[0]!.moves[0]!.maxPP).toBe(PP_MAX_CEILING)
    expect((gameStore.state.inventory as Record<string, number>)['pp_up']).toBe(1)
  })
})

// ── NaturePatchModal ──────────────────────────────────────────────────────────

describe('NaturePatchModal — integración', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })

  it('cambia naturaleza exacta en gameStore y consume el ítem', async () => {
    const { gameStore } = setupStores({ nature_patch: 1 })
    const uiStore = useUIStore()
    gameStore.state.team[0]!.nature = 'Fuerte'
    uiStore.activePokemonForNature = { context: 'team', index: 0 }
    uiStore.isNaturePatchOpen = true

    const wrapper = mount(NaturePatchModal, { global: { stubs: globalStubs } })
    await flushPromises()

    const allBtns = wrapper.findAll('.nature-btn')
    const targetBtn = allBtns.find(b => !b.text().includes('Fuerte'))
    expect(targetBtn).toBeDefined()
    const chosenNatureName = targetBtn!.find('.n-name').text()

    await targetBtn!.trigger('click')
    await flushPromises()

    const { NATURE_DATA } = await import('@/data/battle/natures')
    const chosenNatureKey = Object.keys(NATURE_DATA).find(k => (NATURE_DATA as unknown as Record<string, { name: string }>)[k]?.name === chosenNatureName) || chosenNatureName
    expect(gameStore.state.team[0]!.nature).toBe(chosenNatureKey)
    expect((gameStore.state.inventory as Record<string, number>)['nature_patch']).toBeUndefined()
    expect(uiStore.isNaturePatchOpen).toBe(false)
  })

  it('NO consume si cierra sin elegir', async () => {
    const { gameStore } = setupStores({ nature_patch: 1 })
    const uiStore = useUIStore()
    const original = gameStore.state.team[0]!.nature
    uiStore.activePokemonForNature = { context: 'team', index: 0 }
    uiStore.isNaturePatchOpen = true

    mount(NaturePatchModal, { global: { stubs: globalStubs } })
    await flushPromises()

    uiStore.isNaturePatchOpen = false
    await flushPromises()

    expect((gameStore.state.inventory as Record<string, number>)['nature_patch']).toBe(1)
    expect(gameStore.state.team[0]!.nature).toBe(original)
  })
})

// ── AbilityPillModal ──────────────────────────────────────────────────────────

describe('AbilityPillModal — integración', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}) })

  it('cambia habilidad exacta en gameStore y consume el ítem', async () => {
    const { gameStore } = setupStores({ ability_pill: 1 })
    const uiStore = useUIStore()
    // The mock returns ['Presión', 'Estática'] so both are available
    gameStore.state.team[0]!.ability = 'Presión'
    uiStore.activePokemonForAbility = { context: 'team', index: 0 }
    uiStore.isAbilityPillOpen = true

    const wrapper = mount(AbilityPillModal, { global: { stubs: globalStubs } })
    await flushPromises()

    // Click "Estática" (not active)
    const targetBtn = wrapper.findAll('.ability-btn').find(b => !b.classes('active'))
    expect(targetBtn).toBeDefined()
    const chosenAbility = targetBtn!.find('.a-name').text()

    await targetBtn!.trigger('click')
    await flushPromises()

    expect(gameStore.state.team[0]!.ability).toBe(chosenAbility)  // exact match
    expect((gameStore.state.inventory as Record<string, number>)['ability_pill']).toBeUndefined()
    expect(uiStore.isAbilityPillOpen).toBe(false)
  })

  it('NO consume si cierra sin elegir', async () => {
    const { gameStore } = setupStores({ ability_pill: 1 })
    const uiStore = useUIStore()
    const original = gameStore.state.team[0]!.ability
    uiStore.activePokemonForAbility = { context: 'team', index: 0 }
    uiStore.isAbilityPillOpen = true

    mount(AbilityPillModal, { global: { stubs: globalStubs } })
    await flushPromises()

    uiStore.isAbilityPillOpen = false
    await flushPromises()

    expect((gameStore.state.inventory as Record<string, number>)['ability_pill']).toBe(1)
    expect(gameStore.state.team[0]!.ability).toBe(original)
  })
})
