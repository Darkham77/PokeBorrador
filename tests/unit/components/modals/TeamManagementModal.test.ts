// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TeamManagementModal from '@/components/modals/TeamManagementModal.vue'
import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('TeamManagementModal.vue', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.clearAllMocks()
    const uiStore = useUIStore()
    uiStore.pvpAutoFillDisabled = true
    const gameStore = useGameStore()
    gameStore.state.starterChosen = true
  })

  function createMockPokemon(id: string, uid: string, name: string): Pokemon {
    return {
      id,
      uid,
      species: id,
      name,
      level: 50,
      hp: 100,
      maxHp: 100,
      stats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
      moves: ['tackle'],
      types: ['normal']
    } as unknown as Pokemon
  }

  it('respects initialTab prop and activates requested tab', () => {
    const wrapper = mount(TeamManagementModal, {
      props: {
        initialTab: 'war'
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseModal: {
            props: ['show'],
            template: '<div class="base-modal-stub"><slot name="header" /><slot /></div>'
          },
          UnifiedTeamSlot: true,
          PVTooltip: {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    const warTabBtn = wrapper.find('#team-management-tab-war-btn')
    expect(warTabBtn.exists()).toBe(true)
    expect(warTabBtn.classes()).toContain('active')
  })

  it('triggers replacement in PvP tab when slot is occupied and updates pvpTeam', async () => {
    const gameStore = useGameStore()
    const uiStore = useUIStore()

    const p1 = createMockPokemon('pikachu', 'pika-1', 'Pikachu')
    const p2 = createMockPokemon('charizard', 'char-1', 'Charizard')
    const p3 = createMockPokemon('blastoise', 'blast-1', 'Blastoise')
    const p4 = createMockPokemon('gengar', 'gengar-1', 'Gengar')

    gameStore.state.team = [p1, p2, p3]
    gameStore.state.box = [p4]
    gameStore.state.pvpTeam = ['pika-1', 'char-1', 'blast-1']

    let capturedSelectionProps: Record<string, unknown> | null = null
    uiStore.open = vi.fn((modalName: string, props: Record<string, unknown> = {}) => {
      if (modalName === 'PokemonSelection') {
        capturedSelectionProps = props
      }
      return 'modal-id'
    })

    const wrapper = mount(TeamManagementModal, {
      props: {
        initialTab: 'pvp'
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseModal: {
            props: ['show'],
            template: '<div class="base-modal-stub"><slot name="header" /><slot /></div>'
          },
          UnifiedTeamSlot: {
            props: ['pokemon', 'index'],
            template: '<div class="slot-stub"><button class="replace-btn" @click="$emit(\'select\', index)">REEMPLAZAR</button></div>'
          },
          PVTooltip: {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    const slotButtons = wrapper.findAll('.replace-btn')
    expect(slotButtons.length).toBe(3)

    // Click replace on slot 0 (currently occupied by Pikachu)
    await slotButtons[0]?.trigger('click')

    expect(uiStore.open).toHaveBeenCalledWith('PokemonSelection', expect.any(Object))
    expect(capturedSelectionProps).not.toBeNull()

    // Confirm replacement with Gengar
    const cb = (capturedSelectionProps as unknown as { callbackConfirm: (p: Pokemon[]) => void }).callbackConfirm
    expect(typeof cb).toBe('function')
    cb([p4])

    // Verify slot 0 in pvpTeam was replaced with Gengar
    expect(gameStore.state.pvpTeam[0]).toBe('gengar-1')
    expect(gameStore.state.pvpTeam[1]).toBe('char-1')
    expect(gameStore.state.pvpTeam[2]).toBe('blast-1')
  })

  it('triggers replacement in War tab when slot is occupied and updates warTeam', async () => {
    const gameStore = useGameStore()
    const uiStore = useUIStore()

    const p1 = createMockPokemon('mewtwo', 'mew-1', 'Mewtwo')
    const p2 = createMockPokemon('snorlax', 'snor-1', 'Snorlax')

    gameStore.state.team = [p1]
    gameStore.state.box = [p2]
    gameStore.state.warSlots = 6
    gameStore.state.warTeam = ['mew-1']

    let capturedSelectionProps: Record<string, unknown> | null = null
    uiStore.open = vi.fn((modalName: string, props: Record<string, unknown> = {}) => {
      if (modalName === 'PokemonSelection') {
        capturedSelectionProps = props
      }
      return 'modal-id'
    })

    const wrapper = mount(TeamManagementModal, {
      props: {
        initialTab: 'war'
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseModal: {
            props: ['show'],
            template: '<div class="base-modal-stub"><slot name="header" /><slot /></div>'
          },
          UnifiedTeamSlot: {
            props: ['pokemon', 'index'],
            template: '<div class="slot-stub"><button class="replace-btn" @click="$emit(\'select\', index)">REEMPLAZAR</button></div>'
          },
          PVTooltip: {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    const slotButtons = wrapper.findAll('.replace-btn')
    await slotButtons[0]?.trigger('click')

    expect(uiStore.open).toHaveBeenCalledWith('PokemonSelection', expect.any(Object))
    expect(capturedSelectionProps).not.toBeNull()

    const cb = (capturedSelectionProps as unknown as { callbackConfirm: (p: Pokemon[]) => void }).callbackConfirm
    expect(typeof cb).toBe('function')
    cb([p2])

    expect(gameStore.state.warTeam[0]).toBe('snor-1')
  })

  it('triggers replacement in PvP 6v6 tab when slot is occupied and updates pvpTeam6', async () => {
    const gameStore = useGameStore()
    const uiStore = useUIStore()

    const p1 = createMockPokemon('dragonite', 'drag-1', 'Dragonite')
    const p2 = createMockPokemon('gyarados', 'gyar-1', 'Gyarados')

    gameStore.state.team = [p1]
    gameStore.state.box = [p2]
    gameStore.state.pvpTeam6 = ['drag-1']

    let capturedSelectionProps: Record<string, unknown> | null = null
    uiStore.open = vi.fn((modalName: string, props: Record<string, unknown> = {}) => {
      if (modalName === 'PokemonSelection') {
        capturedSelectionProps = props
      }
      return 'modal-id'
    })

    const wrapper = mount(TeamManagementModal, {
      props: {
        initialTab: 'pvp6'
      },
      global: {
        plugins: [pinia],
        stubs: {
          BaseModal: {
            props: ['show'],
            template: '<div class="base-modal-stub"><slot name="header" /><slot /></div>'
          },
          UnifiedTeamSlot: {
            props: ['pokemon', 'index'],
            template: '<div class="slot-stub"><button class="replace-btn" @click="$emit(\'select\', index)">REEMPLAZAR</button></div>'
          },
          PVTooltip: {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    const slotButtons = wrapper.findAll('.replace-btn')
    await slotButtons[0]?.trigger('click')

    expect(uiStore.open).toHaveBeenCalledWith('PokemonSelection', expect.any(Object))
    expect(capturedSelectionProps).not.toBeNull()

    const cb = (capturedSelectionProps as unknown as { callbackConfirm: (p: Pokemon[]) => void }).callbackConfirm
    expect(typeof cb).toBe('function')
    cb([p2])

    expect(gameStore.state.pvpTeam6[0]).toBe('gyar-1')
  })
})
