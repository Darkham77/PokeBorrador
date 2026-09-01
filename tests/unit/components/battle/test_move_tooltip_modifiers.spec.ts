import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MoveTooltipModifiers from '@/components/battle/MoveTooltipModifiers.vue'
import MoveTooltipFieldEffects from '@/components/battle/MoveTooltipFieldEffects.vue'
import type { ActiveMoveDetails } from '@/composables/battle/useMoveTooltip'

describe('MoveTooltip subcomponents', () => {
  const dummyActiveDetails = {
    isStatus: false,
    power: {
      base: 90,
      final: '135',
      list: [{ label: 'STAB (Fuego)', mult: 1.5 }],
    },
    accuracy: {
      base: 100,
      final: '100',
      list: [],
    },
    effectiveness: {
      value: 2,
      label: 'Súper eficaz',
    },
    recovery: { text: 'Recupera 50% de HP' },
    recoil: { text: '33% de retroceso' },
    fieldConditions: ['Clima Soleado Activo'],
    smogonDesc: '90 BP Flamethrower vs Bulbasaur: 100-120%',
  } as unknown as ActiveMoveDetails

  it('renders MoveTooltipModifiers with formula breakdown and active multipliers', () => {
    const wrapper = mount(MoveTooltipModifiers, {
      props: { activeDetails: dummyActiveDetails },
    })

    expect(wrapper.text()).toContain('MODIFICADORES ACTIVOS')
    expect(wrapper.text()).toContain('STAB (Fuego)')
    expect(wrapper.text()).toContain('FÓRMULA DE POTENCIA')
    expect(wrapper.text()).toContain('BP (90)')
  })

  it('renders MoveTooltipFieldEffects with recovery, recoil, and field conditions', () => {
    const wrapper = mount(MoveTooltipFieldEffects, {
      props: { activeDetails: dummyActiveDetails },
    })

    expect(wrapper.text()).toContain('RECUPERACIÓN')
    expect(wrapper.text()).toContain('Recupera 50% de HP')
    expect(wrapper.text()).toContain('RETROCESO')
    expect(wrapper.text()).toContain('33% de retroceso')
    expect(wrapper.text()).toContain('CONDICIONES DE CAMPO')
    expect(wrapper.text()).toContain('Clima Soleado Activo')
    expect(wrapper.text()).toContain('ANÁLISIS COMPLETO (SMOGON)')
  })
})
