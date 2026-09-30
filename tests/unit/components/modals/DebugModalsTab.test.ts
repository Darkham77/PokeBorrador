// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DebugModalsTab from '@/components/admin/debug/DebugModalsTab.vue'
import * as debugSim from '@/logic/debug/rewardsDebugSimulation'

describe('DebugModalsTab.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders testing headers and action buttons', () => {
    const wrapper = mount(DebugModalsTab, {
      global: {
        stubs: {
          PVTooltip: {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    expect(wrapper.text()).toContain('TESTING RECOMPENSAS & BADGES')
    expect(wrapper.text()).toContain('SIMULAR RECOMPENSAS COMPLETAS')
    expect(wrapper.text()).toContain('LIMPIAR PREMIOS')
    wrapper.unmount()
  })

  it('triggers simulatePastEventAndMissionsReward on button click and shows feedback', async () => {
    vi.spyOn(debugSim, 'simulatePastEventAndMissionsReward').mockResolvedValue('Simulado con éxito: Gran Concurso')

    const wrapper = mount(DebugModalsTab, {
      global: {
        stubs: {
          PVTooltip: {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    const simulateBtn = wrapper.findAll('button').find(b => b.text().includes('SIMULAR RECOMPENSAS COMPLETAS'))
    expect(simulateBtn).toBeDefined()
    await simulateBtn!.trigger('click')

    expect(debugSim.simulatePastEventAndMissionsReward).toHaveBeenCalled()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Simulado con éxito: Gran Concurso')
    wrapper.unmount()
  })

  it('triggers clearDebugSimulatedRewards on button click and resets feedback message', async () => {
    vi.spyOn(debugSim, 'clearDebugSimulatedRewards').mockResolvedValue(undefined)

    const wrapper = mount(DebugModalsTab, {
      global: {
        stubs: {
          PVTooltip: {
            template: '<div><slot /></div>'
          }
        }
      }
    })

    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('LIMPIAR PREMIOS'))
    expect(clearBtn).toBeDefined()
    await clearBtn!.trigger('click')

    expect(debugSim.clearDebugSimulatedRewards).toHaveBeenCalled()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('Simulado con éxito: Gran Concurso')
    wrapper.unmount()
  })
})

