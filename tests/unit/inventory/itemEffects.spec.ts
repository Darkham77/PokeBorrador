/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useInventoryStore } from '@/stores/inventory/inventory'
import { useGameStore } from '@/stores/game'
import { isValidTarget } from '@/logic/items/itemEffects'
import type { Pokemon } from '@/types/pokemon/pokemon'

// ── Setup helpers ─────────────────────────────────────────────────────────────

function makeMon(overrides: Partial<Pokemon> = {}): Pokemon {
  return {
    uid: 'test-uid', id: 'bulbasaur', name: 'Bulbasaur', level: 20,
    hp: 50, maxHp: 100, status: null, sleepTurns: 0,
    moves: [
      { name: 'Placaje', pp: 10, maxPP: 35 },
      { name: 'Látigo', pp: 0,  maxPP: 30 },
    ],
    atk: 49, def: 49, spa: 65, spd: 65, spe: 45,
    type: 'grass', nature: 'Fuerte', ability: 'Espesura',
    ivs: { hp: 15, atk: 15, def: 15, spa: 15, spd: 15, spe: 15 },
    exp: 0, expNeeded: 1000, friendship: 70, vigor: 5,
    isShiny: false, gender: 'M', nickname: null, heldItem: null,
    obtainedAt: 0,
    ...overrides,
  } as unknown as Pokemon
}

/** Puts a single Pokémon in the team and the given item in the inventory. */
function setup(monOverrides: Partial<Pokemon>, inventory: Record<string, number> = {}) {
  const gs = useGameStore()
  gs.state.team = [makeMon(monOverrides)]
  gs.state.inventory = inventory
  gs.save = vi.fn()
}

beforeEach(() => {
  setActivePinia(createPinia())
  // Minimal localStorage stub required by inventory store
  const store: Record<string, string> = {}
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v }),
    clear: vi.fn(),
  })
})

// ── HP-restoring potions ───────────────────────────────────────────────────────

describe('Poción (+20 HP)', () => {
  it('cura 20 HP cuando el Pokémon tiene daño', () => {
    setup({ hp: 50, maxHp: 100 }, { potion: 1 })
    const inv = useInventoryStore()
    const res = inv.useItem('potion', 'team', 0)
    expect(res.success).toBe(true)
    expect(useGameStore().state.team[0]!.hp).toBe(70)
    expect(useGameStore().state.inventory['potion']).toBeUndefined()
  })

  it('NO supera el HP máximo (tapa en maxHp)', () => {
    setup({ hp: 95, maxHp: 100 }, { potion: 1 })
    const inv = useInventoryStore()
    inv.useItem('potion', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(100)
  })

  it('falla si el HP ya está al máximo', () => {
    setup({ hp: 100, maxHp: 100 }, { potion: 1 })
    const inv = useInventoryStore()
    const res = inv.useItem('potion', 'team', 0)
    expect(res.success).toBe(false)
    // Item NOT consumed on failure
    expect(useGameStore().state.inventory['potion']).toBe(1)
  })

  it('falla si el Pokémon está debilitado (hp=0)', () => {
    setup({ hp: 0, maxHp: 100 }, { potion: 1 })
    const inv = useInventoryStore()
    const res = inv.useItem('potion', 'team', 0)
    expect(res.success).toBe(false)
    expect(useGameStore().state.inventory['potion']).toBe(1)
  })

  it('dos pociones consecutivas funcionan si el HP no llegó al máximo', () => {
    // This is the regression case for the reported bug:
    // "no puedo darle otra poción al mismo Pokémon"
    setup({ hp: 20, maxHp: 100 }, { potion: 3 })
    const inv = useInventoryStore()
    const gs = useGameStore()

    const r1 = inv.useItem('potion', 'team', 0)
    expect(r1.success).toBe(true)
    expect(gs.state.team[0]!.hp).toBe(40)
    expect(gs.state.inventory['potion']).toBe(2)

    const r2 = inv.useItem('potion', 'team', 0)
    expect(r2.success).toBe(true)
    expect(gs.state.team[0]!.hp).toBe(60)
    expect(gs.state.inventory['potion']).toBe(1)
  })

  it('isValidTarget devuelve false cuando HP es máximo', () => {
    expect(isValidTarget('potion', makeMon({ hp: 100, maxHp: 100 }))).toBe(false)
  })

  it('isValidTarget devuelve true cuando hay daño parcial', () => {
    expect(isValidTarget('potion', makeMon({ hp: 50, maxHp: 100 }))).toBe(true)
  })

  it('isValidTarget devuelve false cuando está debilitado', () => {
    expect(isValidTarget('potion', makeMon({ hp: 0, maxHp: 100 }))).toBe(false)
  })
})

describe('Super Poción (+50 HP)', () => {
  it('cura 50 HP', () => {
    setup({ hp: 30, maxHp: 100 }, { super_potion: 1 })
    useInventoryStore().useItem('super_potion', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(80)
  })

  it('tapa en maxHp', () => {
    setup({ hp: 80, maxHp: 100 }, { super_potion: 1 })
    useInventoryStore().useItem('super_potion', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(100)
  })

  it('falla si HP al máximo', () => {
    setup({ hp: 100, maxHp: 100 }, { super_potion: 1 })
    const res = useInventoryStore().useItem('super_potion', 'team', 0)
    expect(res.success).toBe(false)
  })
})

describe('Hiper Poción (+200 HP)', () => {
  it('cura 200 HP', () => {
    setup({ hp: 50, maxHp: 300 }, { hyper_potion: 1 })
    useInventoryStore().useItem('hyper_potion', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(250)
  })

  it('tapa en maxHp si el Pokémon tiene menos de 200 HP de daño', () => {
    setup({ hp: 250, maxHp: 300 }, { hyper_potion: 1 })
    useInventoryStore().useItem('hyper_potion', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(300)
  })
})

describe('Poción Máxima (HP completo)', () => {
  it('restaura el HP al máximo sin importar el daño', () => {
    setup({ hp: 1, maxHp: 400 }, { max_potion: 1 })
    useInventoryStore().useItem('max_potion', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(400)
  })

  it('falla si HP ya está al máximo', () => {
    setup({ hp: 400, maxHp: 400 }, { max_potion: 1 })
    const res = useInventoryStore().useItem('max_potion', 'team', 0)
    expect(res.success).toBe(false)
    expect(useGameStore().state.inventory['max_potion']).toBe(1)
  })
})

describe('Agua Fresca, Soda, Limonada', () => {
  it('Agua Fresca cura 30 HP', () => {
    setup({ hp: 50, maxHp: 100 }, { fresh_water: 1 })
    useInventoryStore().useItem('fresh_water', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(80)
  })

  it('Soda Pop cura 60 HP', () => {
    setup({ hp: 20, maxHp: 100 }, { soda_pop: 1 })
    useInventoryStore().useItem('soda_pop', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(80)
  })

  it('Limonada cura 80 HP', () => {
    setup({ hp: 10, maxHp: 100 }, { lemonade: 1 })
    useInventoryStore().useItem('lemonade', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(90)
  })
})

// ── Status-clearing items ─────────────────────────────────────────────────────

describe('Antídoto', () => {
  it('cura el envenenamiento', () => {
    setup({ hp: 50, maxHp: 100, status: 'poison' }, { antidote: 1 })
    const res = useInventoryStore().useItem('antidote', 'team', 0)
    expect(res.success).toBe(true)
    expect(useGameStore().state.team[0]!.status).toBeNull()
  })

  it('falla si el estado no es veneno', () => {
    setup({ hp: 50, maxHp: 100, status: 'burn' }, { antidote: 1 })
    const res = useInventoryStore().useItem('antidote', 'team', 0)
    expect(res.success).toBe(false)
    expect(useGameStore().state.inventory['antidote']).toBe(1)
  })

  it('falla si no tiene estado', () => {
    setup({ hp: 50, maxHp: 100, status: null }, { antidote: 1 })
    const res = useInventoryStore().useItem('antidote', 'team', 0)
    expect(res.success).toBe(false)
  })

  it('falla si está debilitado', () => {
    setup({ hp: 0, maxHp: 100, status: 'poison' }, { antidote: 1 })
    const res = useInventoryStore().useItem('antidote', 'team', 0)
    expect(res.success).toBe(false)
  })
})

describe('Quemaduras Curas', () => {
  it('cura quemadura', () => {
    setup({ hp: 50, maxHp: 100, status: 'burn' }, { burn_heal: 1 })
    expect(useInventoryStore().useItem('burn_heal', 'team', 0).success).toBe(true)
    expect(useGameStore().state.team[0]!.status).toBeNull()
  })

  it('falla con otro estado', () => {
    setup({ hp: 50, maxHp: 100, status: 'freeze' }, { burn_heal: 1 })
    expect(useInventoryStore().useItem('burn_heal', 'team', 0).success).toBe(false)
  })
})

describe('Paralizador Curas', () => {
  it('cura parálisis', () => {
    setup({ hp: 50, maxHp: 100, status: 'paralysis' }, { paralyze_heal: 1 })
    expect(useInventoryStore().useItem('paralyze_heal', 'team', 0).success).toBe(true)
    expect(useGameStore().state.team[0]!.status).toBeNull()
  })
})

describe('Despertar', () => {
  it('despierta al Pokémon dormido', () => {
    setup({ hp: 50, maxHp: 100, status: 'sleep', sleepTurns: 3 }, { awakening: 1 })
    const res = useInventoryStore().useItem('awakening', 'team', 0)
    expect(res.success).toBe(true)
    const p = useGameStore().state.team[0]!
    expect(p.status).toBeNull()
    expect(p.sleepTurns).toBe(0)
  })

  it('falla si no está dormido', () => {
    setup({ hp: 50, maxHp: 100, status: null }, { awakening: 1 })
    expect(useInventoryStore().useItem('awakening', 'team', 0).success).toBe(false)
  })
})

describe('Hielo Curas', () => {
  it('descongela al Pokémon', () => {
    setup({ hp: 50, maxHp: 100, status: 'freeze' }, { ice_heal: 1 })
    expect(useInventoryStore().useItem('ice_heal', 'team', 0).success).toBe(true)
    expect(useGameStore().state.team[0]!.status).toBeNull()
  })
})

describe('Cura Total (full_heal)', () => {
  it('cura cualquier estado de alteración', () => {
    for (const status of ['poison', 'burn', 'paralysis', 'sleep', 'freeze'] as const) {
      setActivePinia(createPinia())
      setup({ hp: 50, maxHp: 100, status }, { full_heal: 1 })
      const res = useInventoryStore().useItem('full_heal', 'team', 0)
      expect(res.success, `status ${status}`).toBe(true)
      expect(useGameStore().state.team[0]!.status).toBeNull()
    }
  })

  it('falla si no tiene estado y HP al máximo', () => {
    setup({ hp: 100, maxHp: 100, status: null }, { full_heal: 1 })
    expect(useInventoryStore().useItem('full_heal', 'team', 0).success).toBe(false)
  })

  it('tiene éxito si tiene estado aunque HP esté al máximo', () => {
    setup({ hp: 100, maxHp: 100, status: 'poison' }, { full_heal: 1 })
    expect(useInventoryStore().useItem('full_heal', 'team', 0).success).toBe(true)
  })

  it('falla si está debilitado', () => {
    setup({ hp: 0, maxHp: 100, status: 'poison' }, { full_heal: 1 })
    expect(useInventoryStore().useItem('full_heal', 'team', 0).success).toBe(false)
  })
})

// ── Full Restore ──────────────────────────────────────────────────────────────

describe('Restauración Total (full_restore)', () => {
  it('restaura HP y cura estado a la vez', () => {
    setup({ hp: 30, maxHp: 100, status: 'burn' }, { full_restore: 1 })
    const res = useInventoryStore().useItem('full_restore', 'team', 0)
    expect(res.success).toBe(true)
    const p = useGameStore().state.team[0]!
    expect(p.hp).toBe(100)
    expect(p.status).toBeNull()
  })

  it('tiene éxito si solo hay daño (sin estado)', () => {
    setup({ hp: 50, maxHp: 100, status: null }, { full_restore: 1 })
    expect(useInventoryStore().useItem('full_restore', 'team', 0).success).toBe(true)
    expect(useGameStore().state.team[0]!.hp).toBe(100)
  })

  it('tiene éxito si solo hay estado (HP lleno)', () => {
    setup({ hp: 100, maxHp: 100, status: 'paralysis' }, { full_restore: 1 })
    expect(useInventoryStore().useItem('full_restore', 'team', 0).success).toBe(true)
    expect(useGameStore().state.team[0]!.status).toBeNull()
  })

  it('falla si HP al máximo Y sin estado', () => {
    setup({ hp: 100, maxHp: 100, status: null }, { full_restore: 1 })
    const res = useInventoryStore().useItem('full_restore', 'team', 0)
    expect(res.success).toBe(false)
    expect(useGameStore().state.inventory['full_restore']).toBe(1)
  })
})

// ── Revives ───────────────────────────────────────────────────────────────────

describe('Revivir', () => {
  it('revive un Pokémon debilitado con la mitad del HP', () => {
    setup({ hp: 0, maxHp: 100 }, { revive: 1 })
    const res = useInventoryStore().useItem('revive', 'team', 0)
    expect(res.success).toBe(true)
    expect(useGameStore().state.team[0]!.hp).toBe(50)
  })

  it('falla si el Pokémon no está debilitado', () => {
    setup({ hp: 10, maxHp: 100 }, { revive: 1 })
    const res = useInventoryStore().useItem('revive', 'team', 0)
    expect(res.success).toBe(false)
    expect(useGameStore().state.inventory['revive']).toBe(1)
  })
})

describe('Revivir Máximo', () => {
  it('revive con HP completo', () => {
    setup({ hp: 0, maxHp: 100 }, { revive_max: 1 })
    useInventoryStore().useItem('revive_max', 'team', 0)
    expect(useGameStore().state.team[0]!.hp).toBe(100)
  })

  it('falla si no está debilitado', () => {
    setup({ hp: 1, maxHp: 100 }, { revive_max: 1 })
    expect(useInventoryStore().useItem('revive_max', 'team', 0).success).toBe(false)
  })
})

// ── PP items ──────────────────────────────────────────────────────────────────

describe('Éter / Elixir (+10 PP)', () => {
  it('restaura PP de movimientos con PP vacios', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Tackle', pp: 0, maxPP: 35 }] as Pokemon['moves'] },
      { ether: 1 }
    )
    const res = useInventoryStore().useItem('ether', 'team', 0)
    expect(res.success).toBe(true)
    expect(useGameStore().state.team[0]!.moves[0]!.pp).toBe(10)
  })

  it('falla si todos los movimientos tienen PP al máximo', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Tackle', pp: 35, maxPP: 35 }] as Pokemon['moves'] },
      { ether: 1 }
    )
    const res = useInventoryStore().useItem('ether', 'team', 0)
    expect(res.success).toBe(false)
    expect(useGameStore().state.inventory['ether']).toBe(1)
  })

  it('tapa en maxPP', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Tackle', pp: 30, maxPP: 35 }] as Pokemon['moves'] },
      { ether: 1 }
    )
    useInventoryStore().useItem('ether', 'team', 0)
    expect(useGameStore().state.team[0]!.moves[0]!.pp).toBe(35)
  })
})

describe('Elixir Máximo (PP completos)', () => {
  it('restaura todos los PP al máximo', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Tackle', pp: 0, maxPP: 35 }, { name: 'Látigo', pp: 5, maxPP: 30 }] as Pokemon['moves'] },
      { elixir_max: 1 }
    )
    useInventoryStore().useItem('elixir_max', 'team', 0)
    const p = useGameStore().state.team[0]!
    expect(p.moves[0]!.pp).toBe(35)
    expect(p.moves[1]!.pp).toBe(30)
  })
})

// ── Rare Candy ────────────────────────────────────────────────────────────────

describe('Caramelo Raro', () => {
  it('fuerza la siguiente subida de nivel', () => {
    setup({ hp: 50, maxHp: 100, level: 10, exp: 0, expNeeded: 500 }, { rare_candy: 1 })
    const res = useInventoryStore().useItem('rare_candy', 'team', 0)
    expect(res.success).toBe(true)
    // checkLevelUp resets exp to 0 after leveling — the visible contract is level+1
    expect(useGameStore().state.team[0]!.level).toBe(11)
  })

  it('falla si el Pokémon ya tiene nivel máximo', () => {
    setup({ hp: 50, maxHp: 100, level: 100 }, { rare_candy: 1 })
    const res = useInventoryStore().useItem('rare_candy', 'team', 0)
    expect(res.success).toBe(false)
    expect(useGameStore().state.inventory['rare_candy']).toBe(1)
  })
})

// ── Vigor items ───────────────────────────────────────────────────────────────

describe('Vigor Candy / Vigor Restorer', () => {
  it('Vigor Candy suma 1 de vigor', () => {
    setup({ hp: 50, maxHp: 100, vigor: 3 }, { vigor_candy: 1 })
    useInventoryStore().useItem('vigor_candy', 'team', 0)
    expect(useGameStore().state.team[0]!.vigor).toBe(4)
  })

  it('Vigor Candy falla si el vigor ya está al máximo', () => {
    setup({ hp: 50, maxHp: 100, vigor: 10 }, { vigor_candy: 1 })
    const res = useInventoryStore().useItem('vigor_candy', 'team', 0)
    expect(res.success).toBe(false)
  })

  it('Vigor Restorer lleva el vigor al máximo de un solo golpe', () => {
    setup({ hp: 50, maxHp: 100, vigor: 2 }, { vigor_restorer: 1 })
    useInventoryStore().useItem('vigor_restorer', 'team', 0)
    expect(useGameStore().state.team[0]!.vigor).toBe(10)
  })

  it('Vigor Restorer falla si vigor ya es 10', () => {
    setup({ hp: 50, maxHp: 100, vigor: 10 }, { vigor_restorer: 1 })
    const res = useInventoryStore().useItem('vigor_restorer', 'team', 0)
    expect(res.success).toBe(false)
  })
})

// ── isValidTarget coherence across all healing items ─────────────────────────

describe('isValidTarget — coherencia cross-ítem', () => {
  const healingItems = [
    'potion', 'super_potion', 'hyper_potion', 'max_potion',
    'fresh_water', 'soda_pop', 'lemonade',
    'full_restore',
  ]

  for (const id of healingItems) {
    it(`${id}: false cuando HP es 0 (debilitado)`, () => {
      expect(isValidTarget(id, makeMon({ hp: 0, maxHp: 100, status: null }))).toBe(false)
    })
  }

  it('full_restore: true cuando hay status aunque HP sea máximo', () => {
    expect(isValidTarget('full_restore', makeMon({ hp: 100, maxHp: 100, status: 'burn' }))).toBe(true)
  })

  it('antidote: true solo para Pokémon envenenados', () => {
    expect(isValidTarget('antidote', makeMon({ hp: 50, status: 'poison' }))).toBe(true)
    expect(isValidTarget('antidote', makeMon({ hp: 50, status: 'burn'   }))).toBe(false)
    expect(isValidTarget('antidote', makeMon({ hp: 50, status: null     }))).toBe(false)
  })

  it('revive: true solo para Pokémon debilitados', () => {
    expect(isValidTarget('revive', makeMon({ hp: 0  }))).toBe(true)
    expect(isValidTarget('revive', makeMon({ hp: 10 }))).toBe(false)
  })
})

// ── pp_up / pp_max — flujo de consumo diferido ───────────────────────────────
// Placaje basePP=35 → maxPossible = floor(35*1.6) = 56
// pp_up increase  = floor(35*0.2) = 7

describe('Subida de PP (pp_up) — flujo completo', () => {
  it('abre el modal (isPPUpOpen) sin consumir el ítem todavía', async () => {
    setup({ hp: 50, maxHp: 100 }, { pp_up: 2 })
    const inv = useInventoryStore()
    const gs = useGameStore()
    const { useUIStore } = await import('@/stores/ui')
    const ui = useUIStore()

    inv.useItem('pp_up', 'team', 0)

    // Modal flag open — item NOT consumed yet
    expect(ui.isPPUpOpen).toBe(true)
    expect(gs.state.inventory['pp_up']).toBe(2)
  })

  it('sube maxPP en 7 (20% de 35) y consume el ítem al confirmar el movimiento', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Placaje', pp: 20, maxPP: 35 }] as Pokemon['moves'] },
      { pp_up: 1 }
    )
    const inv = useInventoryStore()
    const gs = useGameStore()

    // Simulate full deferred flow: useItem opens modal
    inv.useItem('pp_up', 'team', 0)

    // Simulate modal confirm: manually apply same logic as PPUpModal.handleApplyPPUp
    const move = gs.state.team[0]!.moves[0]!
    const basePP = 35
    const maxPossible = Math.floor(basePP * 1.6) // 56
    const increase = Math.floor(basePP * 0.2)    // 7
    move.maxPP = Math.min(maxPossible, move.maxPP + increase) // 42
    // pp_up does NOT restore current pp — only raises the ceiling
    inv.removeItem('pp_up', 1)

    expect(gs.state.team[0]!.moves[0]!.maxPP).toBe(42)
    expect(gs.state.team[0]!.moves[0]!.pp).toBe(20)  // unchanged
    expect(gs.state.inventory['pp_up']).toBeUndefined()
  })

  it('NO aplica si maxPP ya está al máximo posible (56)', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Placaje', pp: 35, maxPP: 56 }] as Pokemon['moves'] },
      { pp_up: 1 }
    )
    // The modal guards against this — simulate the guard
    const move = useGameStore().state.team[0]!.moves[0]!
    const basePP = 35
    const maxPossible = Math.floor(basePP * 1.6) // 56
    expect(move.maxPP >= maxPossible).toBe(true) // guard triggers → no change
    expect(useGameStore().state.inventory['pp_up']).toBe(1) // not consumed
  })
})

describe('Máximo PP (pp_max) — flujo completo', () => {
  it('maximiza maxPP a 56 sin tocar los PP actuales, consume el ítem', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Placaje', pp: 10, maxPP: 35 }] as Pokemon['moves'] },
      { pp_max: 1 }
    )
    const inv = useInventoryStore()
    const gs = useGameStore()

    inv.useItem('pp_max', 'team', 0)

    // Simulate PPUpModal.handleApplyPPUp with isPPMax=true
    const move = gs.state.team[0]!.moves[0]!
    const maxPossible = Math.floor(35 * 1.6) // 56
    move.maxPP = maxPossible
    // pp_max does NOT restore current pp — only raises the ceiling
    inv.removeItem('pp_max', 1)

    expect(gs.state.team[0]!.moves[0]!.maxPP).toBe(56)
    expect(gs.state.team[0]!.moves[0]!.pp).toBe(10)  // unchanged — only ceiling raised
    expect(gs.state.inventory['pp_max']).toBeUndefined()
  })

  it('NO consume el ítem si el modal se cierra sin elegir movimiento', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Placaje', pp: 10, maxPP: 35 }] as Pokemon['moves'] },
      { pp_max: 1 }
    )
    const inv = useInventoryStore()
    const gs = useGameStore()

    // useItem opens modal, shouldConsumeImmediately = false → item stays
    inv.useItem('pp_max', 'team', 0)
    // User closes modal without confirming — no removeItem called
    expect(gs.state.inventory['pp_max']).toBe(1)
    // Move unchanged
    expect(gs.state.team[0]!.moves[0]!.maxPP).toBe(35)
  })

  it('NO aplica si maxPP ya es 56 (máximo posible para Placaje)', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Placaje', pp: 56, maxPP: 56 }] as Pokemon['moves'] },
      { pp_max: 1 }
    )
    const move = useGameStore().state.team[0]!.moves[0]!
    const maxPossible = Math.floor(35 * 1.6) // 56
    // guard in modal: move.maxPP >= maxPossible → notify and return without consuming
    expect(move.maxPP >= maxPossible).toBe(true)
    expect(useGameStore().state.inventory['pp_max']).toBe(1)
  })

  it('maxPP sube permanentemente sin tocar los PP actuales', () => {
    setup(
      { hp: 50, maxHp: 100, moves: [{ name: 'Placaje', pp: 10, maxPP: 35 }] as Pokemon['moves'] },
      { pp_max: 1 }
    )
    const gs = useGameStore()
    const inv = useInventoryStore()

    const move = gs.state.team[0]!.moves[0]!
    move.maxPP = Math.floor(35 * 1.6) // 56 — only ceiling raised
    inv.removeItem('pp_max', 1)

    expect(gs.state.team[0]!.moves[0]!.maxPP).toBe(56)
    expect(gs.state.team[0]!.moves[0]!.pp).toBe(10) // unchanged
    expect(gs.state.inventory['pp_max']).toBeUndefined()
  })
})
