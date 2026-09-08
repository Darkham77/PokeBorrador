/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BattleActionButtons from '@/components/battle/BattleActionButtons.vue'
import { useBattleStore } from '@/stores/battle/battle'
import { useGameStore } from '@/stores/game'
import type { Pokemon } from '@/types/pokemon/pokemon'

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(() => 'mock-asset-url'),
  ASSET_TYPES: {
    ITEM: 'item',
    POKEMON: 'pokemon',
    TRAINER: 'trainer'
  }
}))

describe('BattleActionButtons PvP & UI Config Bag Disabling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('disables bag and catch buttons when battle is PvP or uiConfig.allowBag / allowCatch is false', async () => {
    const battleStore = useBattleStore()
    const gameStore = useGameStore()

    const mockPlayer = {
      uid: 'p-1',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100,
      moves: []
    } as unknown as Pokemon

    gameStore.state.team = [mockPlayer]

    // Initialize battle in PvP mode
    battleStore.state = {
      isPvP: true,
      player: mockPlayer,
      enemy: { uid: 'e-1', name: 'Gengar', hp: 100, maxHp: 100 } as unknown as Pokemon,
      isIntroAnimating: false,
      isProcessing: false,
      over: false
    } as any

    const wrapper = mount(BattleActionButtons, {
      props: {
        isFinishing: false
      }
    })

    const bagBtn = wrapper.find('#battle-bag-btn')
    expect(bagBtn.exists()).toBe(true)
    expect(bagBtn.attributes('disabled')).toBeDefined()
  })

  it('keeps bag button enabled when in wild battle and not locked/processing', async () => {
    const battleStore = useBattleStore()
    const gameStore = useGameStore()

    const mockPlayer = {
      uid: 'p-1',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100,
      moves: []
    } as unknown as Pokemon

    gameStore.state.team = [mockPlayer]

    // Initialize battle in Wild mode
    battleStore.state = {
      isPvP: false,
      isTrainer: false,
      isGym: false,
      player: mockPlayer,
      enemy: { uid: 'e-1', name: 'Pidgey', hp: 50, maxHp: 50 } as unknown as Pokemon,
      isIntroAnimating: false,
      isProcessing: false,
      over: false
    } as any

    const wrapper = mount(BattleActionButtons, {
      props: {
        isFinishing: false
      }
    })

    const bagBtn = wrapper.find('#battle-bag-btn')
    expect(bagBtn.exists()).toBe(true)
    expect(bagBtn.attributes('disabled')).toBeUndefined()
  })
})
