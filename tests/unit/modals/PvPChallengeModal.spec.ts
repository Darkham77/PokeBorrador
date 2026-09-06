/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PvPChallengeModal from '@/components/modals/PvPChallengeModal.vue'
import { useGameStore } from '@/stores/game'
import { useLivePvPStore } from '@/stores/livePvP'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('PvPChallengeModal.vue', () => {
  let mockPokemonList: Pokemon[]

  beforeEach(() => {
    setActivePinia(createPinia())

    mockPokemonList = Array.from({ length: 6 }).map((_, i) => ({
      uid: `p_${i}`,
      id: 'pikachu',
      name: `Pikachu ${i}`,
      level: 50,
      hp: 100,
      maxHp: 100,
      isIllegal: false
    })) as unknown as Pokemon[]

    const gameStore = useGameStore()
    gameStore.state.team = mockPokemonList.slice(0, 3)
    gameStore.state.box = mockPokemonList.slice(3)
    gameStore.state.pvpTeam = ['p_0', 'p_1', 'p_2']
    gameStore.state.pvpTeam6 = ['p_0', 'p_1', 'p_2', 'p_3', 'p_4', 'p_5']
  })

  it('renders online opponent details and defaults to ranked 6v6 Flat Level 50', () => {
    const wrapper = mount(PvPChallengeModal, {
      props: {
        show: true,
        opponentId: 'user_123',
        opponentName: 'Red'
      },
      global: {
        directives: { 'gsap-hover': {} },
        stubs: { Teleport: true }
      }
    })

    expect(wrapper.text()).toContain('DESAFIANDO A:')
    expect(wrapper.text()).toContain('Red')
    expect(wrapper.text()).toContain('RANKED')
    expect(wrapper.text()).not.toContain('RIVAL DESCONECTADO')
  })

  it('displays offline rival asynchronous combat banner when friend is offline', () => {
    const wrapper = mount(PvPChallengeModal, {
      props: {
        show: true,
        friend: {
          id: 'user_offline',
          username: 'Blue',
          isOnline: false,
          level: 50,
          badges: 8,
          avatar_style: 'trainer_blue',
          lastSeen: null
        }
      },
      global: {
        directives: { 'gsap-hover': {} },
        stubs: { Teleport: true }
      }
    })

    expect(wrapper.text()).toContain('Blue')
    expect(wrapper.text()).toContain('RIVAL DESCONECTADO (COMBATE ASÍNCRONO)')
    expect(wrapper.text()).toContain('Competirás contra su equipo activo controlado por la IA competitiva')
  })

  it('switches between Ranked and Casual modes', async () => {
    const wrapper = mount(PvPChallengeModal, {
      props: {
        show: true,
        opponentId: 'user_123',
        opponentName: 'Ash'
      },
      global: {
        directives: { 'gsap-hover': {} },
        stubs: { Teleport: true }
      }
    })

    const rankedBtn = wrapper.find('#btn-pvp-mode-ranked')
    const casualBtn = wrapper.find('#btn-pvp-mode-casual')

    expect(rankedBtn.classes()).toContain('active')
    expect(casualBtn.classes()).not.toContain('active')

    await casualBtn.trigger('click')
    expect(casualBtn.classes()).toContain('active')
    expect(rankedBtn.classes()).not.toContain('active')
  })

  it('sends invite with mode and isAsynchronous flags on challenge submission', async () => {
    const livePvPStore = useLivePvPStore()
    const sendInviteSpy = vi.spyOn(livePvPStore, 'sendInvite').mockResolvedValue()

    const wrapper = mount(PvPChallengeModal, {
      props: {
        show: true,
        friend: {
          id: 'user_offline_456',
          username: 'Gary',
          isOnline: false,
          level: 50,
          badges: 8,
          avatar_style: 'trainer_gary',
          lastSeen: null
        }
      },
      global: {
        directives: { 'gsap-hover': {} },
        stubs: { Teleport: true }
      }
    })

    const sendBtn = wrapper.find('#btn-send-pvp-challenge')
    expect(sendBtn.attributes('disabled')).toBeUndefined()

    await sendBtn.trigger('click')

    expect(sendInviteSpy).toHaveBeenCalledTimes(1)
    expect(sendInviteSpy).toHaveBeenCalledWith(
      'user_offline_456',
      'Gary',
      expect.objectContaining({
        format: '6v6',
        levelRule: 'flat50',
        mode: 'ranked',
        isAsynchronous: true
      })
    )
  })
})
