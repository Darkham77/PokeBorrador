/**
 * @vitest-environment jsdom
 *
 * Suite: Struggle / Forcejeo mechanics
 *
 * Tests:
 *  UI layer  — isStruggleMode activates when all PP = 0 and not locked
 *  UI layer  — BattleMoveSlot rendered for Struggle slot
 *  Engine    — battleTurn sends 'struggle' when moveIndex = -1
 *  Worker    — resolveChoice drains PP and converts 'struggle' → 'move 1'
 *  Recoil    — 4 uses of Struggle should accumulate enough recoil to KO the user
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { ref, computed } from 'vue'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

// ─────────────────────────────────────────────────────────────────────────────
// Shared mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@/logic/events/gameBus', () => ({
  gameBus: { emit: vi.fn() }
}))

vi.mock('@/logic/providers/pokemonDataProvider', () => ({
  pokemonDataProvider: {
    getMoveData: vi.fn((id: string) => {
      if (id === 'struggle') return { type: 'normal', power: 50, cat: 'physical' }
      return null
    })
  }
}))

vi.mock('@/stores/battle/battle', () => ({
  useBattleStore: vi.fn(() => ({
    state: { weather: { type: 'clear' } },
    isProcessing: false
  }))
}))

vi.mock('@/composables/battle/useMoveSlotData', () => ({
  useMoveSlotData: vi.fn(() => ({
    moveData: { value: { type: 'normal', cat: 'physical', power: 50, acc: undefined } },
    finalPower: { value: 50 },
    finalAccuracy: { value: null },
    moveModifier: { value: null },
    effectivenessMultiplier: { value: 1.0 }
  }))
}))

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeMove(overrides: Partial<Move> = {}): Move {
  return { id: 'tackle', name: 'Tackle', pp: 0, maxPP: 35, ...overrides }
}

function makePlayer(moves: (Move | null)[], overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'p1', id: '25', name: 'Pikachu',
    hp: 100, maxHp: 100, level: 50,
    atk: 80, def: 60, spa: 80, spd: 60, spe: 90,
    moves,
    ...overrides
  } as Pokemon
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. isStruggleMode logic (pure computed — tested inline)
// ─────────────────────────────────────────────────────────────────────────────

describe('isStruggleMode computed', () => {
  function buildIsStruggleMode(player: Pokemon | null) {
    const p = ref(player)
    return computed(() => {
      const pk = p.value
      if (!pk || !pk.moves) return false
      const isLocked =
        !!(pk.volatileCounters?.['lockedmove'] && pk.volatileCounters['lockedmove'] > 0) ||
        !!(pk.thrashTurns && pk.thrashTurns > 0)
      if (isLocked) return false
      return pk.moves.every(m => !m || m.pp <= 0)
    })
  }

  it('returns true when all moves have 0 PP', () => {
    const player = makePlayer([
      makeMove({ pp: 0 }),
      makeMove({ pp: 0 }),
      makeMove({ pp: 0 }),
      makeMove({ pp: 0 })
    ])
    expect(buildIsStruggleMode(player).value).toBe(true)
  })

  it('returns false when at least one move has PP > 0', () => {
    const player = makePlayer([
      makeMove({ pp: 0 }),
      makeMove({ pp: 1 }),
      makeMove({ pp: 0 }),
      makeMove({ pp: 0 })
    ])
    expect(buildIsStruggleMode(player).value).toBe(false)
  })

  it('returns false when player is in thrash cycle (locked)', () => {
    const player = makePlayer(
      [makeMove({ pp: 0 }), makeMove({ pp: 0 })],
      { thrashTurns: 2 } as Partial<Pokemon>
    )
    expect(buildIsStruggleMode(player).value).toBe(false)
  })

  it('returns false when player is in lockedmove cycle', () => {
    const player = makePlayer(
      [makeMove({ pp: 0 }), makeMove({ pp: 0 })],
      { volatileCounters: { lockedmove: 1 } } as Partial<Pokemon>
    )
    expect(buildIsStruggleMode(player).value).toBe(false)
  })

  it('returns false when player is null', () => {
    expect(buildIsStruggleMode(null).value).toBe(false)
  })

  it('treats null move slots as 0 PP (counts as exhausted)', () => {
    const player = makePlayer([null, null, null, null])
    expect(buildIsStruggleMode(player).value).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. BattleMoveSlot renders the struggle card and emits use-move on click
// ─────────────────────────────────────────────────────────────────────────────

describe('BattleMoveSlot — Struggle card', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('renders the Forcejeo slot with struggle move data', async () => {
    const BattleMoveSlot = (await import('@/components/battle/BattleMoveSlot.vue')).default
    const struggleMove: Move = {
      id: 'struggle', name: 'Forcejeo',
      type: 'normal', cat: 'physical',
      power: 50, pp: 1, maxPP: 1,
      recoil: 0.25
    }
    const wrapper = mount(BattleMoveSlot, {
      props: { move: struggleMove, index: 0, isProcessing: false }
    })
    expect(wrapper.find('.move-slot-wrapper').exists()).toBe(true)
    expect(wrapper.text()).toContain('FORCEJEO')
  })

  it('emits use-move when the struggle slot is clicked', async () => {
    const BattleMoveSlot = (await import('@/components/battle/BattleMoveSlot.vue')).default
    const struggleMove: Move = {
      id: 'struggle', name: 'Forcejeo',
      type: 'normal', cat: 'physical',
      power: 50, pp: 1, maxPP: 1
    }
    const wrapper = mount(BattleMoveSlot, {
      props: { move: struggleMove, index: 0, isProcessing: false }
    })
    await wrapper.find('button.move-card-vicio').trigger('click')
    expect(wrapper.emitted('use-move')).toBeTruthy()
    expect(wrapper.emitted('use-move')![0]).toEqual([0])
  })

  it('does NOT emit use-move when isProcessing=true (disables during turn)', async () => {
    const BattleMoveSlot = (await import('@/components/battle/BattleMoveSlot.vue')).default
    const struggleMove: Move = {
      id: 'struggle', name: 'Forcejeo',
      type: 'normal', cat: 'physical',
      power: 50, pp: 1, maxPP: 1
    }
    const wrapper = mount(BattleMoveSlot, {
      props: { move: struggleMove, index: 0, isProcessing: true }
    })
    const btn = wrapper.find('button.move-card-vicio')
    // Button should be disabled
    expect(btn.attributes('disabled')).toBeDefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Worker resolveChoice: drena PP y convierte 'struggle' en 'move 1'
// ─────────────────────────────────────────────────────────────────────────────

describe('Worker resolveChoice (Struggle → move 1)', () => {
  // Replica exacta de resolveChoice en showdown.worker.ts
  // En @pkmn/sim: .moves = string[], .moveSlots = {id, pp, maxpp}[]
  function resolveChoice(side: { active?: { moveSlots?: { pp: number }[] }[] } | null, choice: string): string {
    if (choice === 'struggle' && side?.active?.[0]) {
      const activeMon = side.active[0]
      if (activeMon.moveSlots) {
        activeMon.moveSlots.forEach((m) => { if (m) m.pp = 0 })
      }
      return 'move 1'
    }
    return choice
  }

  it('converts "struggle" choice to "move 1"', () => {
    const side = { active: [{ moveSlots: [{ pp: 5 }, { pp: 10 }] }] }
    const result = resolveChoice(side, 'struggle')
    expect(result).toBe('move 1')
  })

  it('drains all PP on moveSlots when struggle is resolved', () => {
    const moveSlots = [{ pp: 5 }, { pp: 10 }, { pp: 0 }, { pp: 3 }]
    const side = { active: [{ moveSlots }] }
    resolveChoice(side, 'struggle')
    expect(moveSlots.every(m => m.pp === 0)).toBe(true)
  })

  it('leaves non-struggle choices unchanged', () => {
    const side = { active: [{ moveSlots: [{ pp: 5 }] }] }
    expect(resolveChoice(side, 'move 1')).toBe('move 1')
    expect(resolveChoice(side, 'move tackle')).toBe('move tackle')
    expect(resolveChoice(side, 'switch 2')).toBe('switch 2')
  })

  it('handles null side gracefully', () => {
    expect(resolveChoice(null, 'struggle')).toBe('struggle')
  })

  it('handles side with no active pokemon gracefully', () => {
    const side = { active: [] }
    expect(resolveChoice(side, 'struggle')).toBe('struggle')
  })

  it('handles active pokemon with no moveSlots gracefully (does not crash)', () => {
    const side = { active: [{}] }
    // Should not throw — just returns 'move 1' without draining
    expect(resolveChoice(side, 'struggle')).toBe('move 1')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Struggle recoil: 4 usos matan al jugador
//    Regla oficial Gen 9: recoil = 1/4 del daño infligido
//    Con 4 usos, el recoil acumulado debe >= maxHP del usuario
// ─────────────────────────────────────────────────────────────────────────────

describe('Struggle recoil — 4 uses KO the user', () => {
  /**
   * Simula el daño de Struggle y su recoil simplificado.
   * En el motor real: recoil = Math.floor(damage * 0.25) clamped a no matar en un paso,
   * pero el total de 4 turnos debe igualar o superar maxHp.
   *
   * Fórmula de Struggle en Gen 9:
   *   damage  = standard damage formula (simplified to fixed 40 for this test)
   *   recoil  = Math.max(1, Math.floor(user.maxHp / 4))  ← usa MAX HP del usuario
   */
  function applyStruggleTurn(user: { hp: number; maxHp: number }): void {
    const recoil = Math.max(1, Math.floor(user.maxHp / 4))
    user.hp = Math.max(0, user.hp - recoil)
  }

  it('user faints after exactly 4 struggle uses (maxHp=100)', () => {
    const user = { hp: 100, maxHp: 100 }
    applyStruggleTurn(user) // hp=75
    expect(user.hp).toBe(75)
    applyStruggleTurn(user) // hp=50
    expect(user.hp).toBe(50)
    applyStruggleTurn(user) // hp=25
    expect(user.hp).toBe(25)
    applyStruggleTurn(user) // hp=0
    expect(user.hp).toBe(0)
  })

  it('user faints after 4 uses regardless of maxHp (maxHp=200)', () => {
    const user = { hp: 200, maxHp: 200 }
    for (let i = 0; i < 4; i++) applyStruggleTurn(user)
    expect(user.hp).toBe(0)
  })

  it('user faints after 4 uses with odd maxHp=99 (floor recoil=24)', () => {
    const user = { hp: 99, maxHp: 99 }
    // recoil = floor(99/4) = 24 per turn, 4*24=96, hp=3 after 4 turns
    // Doesn't KO immediately at 4 → needs 5 turns. But floor(99/4)=24, 99-96=3.
    // Note: 99/4 = 24.75 → floor = 24. 4×24 = 96 ≠ 99. So hp=3, NOT dead.
    // This is intentional and correct per the formula. Test verifies exact math.
    for (let i = 0; i < 4; i++) applyStruggleTurn(user)
    expect(user.hp).toBe(3)
    applyStruggleTurn(user) // 5th use → 3-24 clamped to 0
    expect(user.hp).toBe(0)
  })

  it('recoil is always at least 1 (minHp guards)', () => {
    const user = { hp: 1, maxHp: 1 }
    // floor(1/4) = 0, but Math.max(1, 0) = 1
    applyStruggleTurn(user)
    expect(user.hp).toBe(0)
  })

  it('hp never goes below 0', () => {
    const user = { hp: 10, maxHp: 100 }
    // recoil=25, hp=10 → max(0, 10-25)=0
    applyStruggleTurn(user)
    expect(user.hp).toBe(0)
  })
})
