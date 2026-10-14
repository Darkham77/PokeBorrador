/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ArenaMilestoneTrack from '@/components/modals/ArenaMilestoneTrack.vue'
import { usePvPStore } from '@/stores/pvp'
import { useGameStore } from '@/stores/game'

describe('ArenaMilestoneTrack.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders milestone cards and displays RECLAMAR button for unlocked and unclaimed milestones', async () => {
    const pvpStore = usePvPStore()
    const gameStore = useGameStore()

    // Simulate player with 1058 ELO (so 1000 ELO is unlocked)
    pvpStore.maxElo = 1058
    pvpStore.rewardsClaimed = []
    gameStore.state.rankedMaxElo = 1058
    gameStore.state.rankedRewardsClaimed = []

    const wrapper = mount(ArenaMilestoneTrack, {
      global: {
        stubs: {
          PVTooltip: {
            template: '<div class="stubbed-tooltip"><slot /></div>'
          }
        }
      }
    })

    await flushPromises()

    // Header check
    expect(wrapper.text()).toContain('RECOMPENSAS DE TEMPORADA')

    // Find the claim button for 1000 ELO
    const claimBtn = wrapper.find('#arena-milestone-track-btn-claim-bronce_1000')
    expect(claimBtn.exists()).toBe(true)
    expect(claimBtn.text()).toBe('RECLAMAR')
    // Make sure it does NOT say "RECLAMAR EN INICIO"
    expect(wrapper.text()).not.toContain('RECLAMAR EN INICIO')
  })

  it('claims reward directly when clicking RECLAMAR without closing or navigating away', async () => {
    const pvpStore = usePvPStore()
    const gameStore = useGameStore()

    pvpStore.maxElo = 1058
    pvpStore.rewardsClaimed = []
    gameStore.state.rankedMaxElo = 1058
    gameStore.state.rankedRewardsClaimed = []

    const claimSpy = vi.spyOn(pvpStore, 'claimReward').mockImplementation(async (id: string) => {
      pvpStore.rewardsClaimed.push(id)
      gameStore.state.rankedRewardsClaimed = [...pvpStore.rewardsClaimed]
    })

    const wrapper = mount(ArenaMilestoneTrack, {
      global: {
        stubs: {
          PVTooltip: {
            template: '<div class="stubbed-tooltip"><slot /></div>'
          }
        }
      }
    })

    await flushPromises()

    const claimBtn = wrapper.find('#arena-milestone-track-btn-claim-bronce_1000')
    expect(claimBtn.exists()).toBe(true)

    await claimBtn.trigger('click')
    await flushPromises()

    expect(claimSpy).toHaveBeenCalledWith('bronce_1000')
    // Button transitions to RECLAMADO pill
    expect(wrapper.text()).toContain('RECLAMADO')
  })

  it('displays BLOQUEADO for milestones above current max ELO', async () => {
    const pvpStore = usePvPStore()
    pvpStore.maxElo = 1000
    pvpStore.rewardsClaimed = ['bronce_1000']

    const wrapper = mount(ArenaMilestoneTrack, {
      global: {
        stubs: {
          PVTooltip: {
            template: '<div class="stubbed-tooltip"><slot /></div>'
          }
        }
      }
    })

    await flushPromises()

    // 1100 ELO card should be locked
    expect(wrapper.text()).toContain('BLOQUEADO')
    // No claim button should exist for 1100
    expect(wrapper.find('#arena-milestone-track-btn-claim-bronce_1100').exists()).toBe(false)
  })
})
