/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'

describe('PVGenderBadge', () => {
  it('renders female badge correctly for pokemon', () => {
    const wrapper = mount(PVGenderBadge, {
      props: {
        gender: 'f',
        size: 'mini'
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.classes()).toContain('female')
    expect(wrapper.classes()).toContain('mini')
    expect(wrapper.attributes('title')).toBe('Femenino')
    expect(wrapper.text()).toContain('♀')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('renders male badge correctly for pokemon', () => {
    const wrapper = mount(PVGenderBadge, {
      props: {
        gender: 'm',
        size: 'sm'
      }
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.classes()).toContain('male')
    expect(wrapper.classes()).toContain('sm')
    expect(wrapper.attributes('title')).toBe('Masculino')
    expect(wrapper.text()).toContain('♂')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('handles uppercase gender codes for pokemon', () => {
    const wrapperF = mount(PVGenderBadge, { props: { gender: 'F' } })
    expect(wrapperF.classes()).toContain('female')

    const wrapperM = mount(PVGenderBadge, { props: { gender: 'M' } })
    expect(wrapperM.classes()).toContain('male')
  })

  it('handles trainer gender codes (h for male, m for female)', () => {
    const wrapperTrainerM = mount(PVGenderBadge, {
      props: {
        gender: 'h',
        isTrainer: true
      }
    })
    expect(wrapperTrainerM.classes()).toContain('male')

    const wrapperTrainerF = mount(PVGenderBadge, {
      props: {
        gender: 'm',
        isTrainer: true
      }
    })
    expect(wrapperTrainerF.classes()).toContain('female')
  })

  it('renders nothing when gender is null, empty or genderless', () => {
    const wrapperNull = mount(PVGenderBadge, { props: { gender: null } })
    expect(wrapperNull.find('.pv-gender-badge').exists()).toBe(false)

    const wrapperEmpty = mount(PVGenderBadge, { props: { gender: '' } })
    expect(wrapperEmpty.find('.pv-gender-badge').exists()).toBe(false)

    const wrapperNone = mount(PVGenderBadge, { props: { gender: 'none' } })
    expect(wrapperNone.find('.pv-gender-badge').exists()).toBe(false)
  })

  it('supports custom title', () => {
    const wrapper = mount(PVGenderBadge, {
      props: {
        gender: 'f',
        title: 'Hembra'
      }
    })
    expect(wrapper.attributes('title')).toBe('Hembra')
  })
})
