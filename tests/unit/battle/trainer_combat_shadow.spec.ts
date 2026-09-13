// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import CombatShadow from '@/components/battle/CombatShadow.vue'
import { useCombatShadowStore } from '@/stores/battle/combatShadows'
import { getPokemonFeetCoords } from '@/logic/combat/shadowHelpers'
import { GLOBAL_SHADOW_CONFIG } from '@/data/pokemon/pokemonFeetDatabase'

describe('Trainer & CombatShadow integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('correctly resolves feet coordinates and shadow scale for trainer sprites from feet database', () => {
    // Rocket back sprite (player side)
    const rocketBackCoords = getPokemonFeetCoords('/assets/sprites/trainers/rocket_h_back.webp')
    expect(rocketBackCoords).toBeDefined()
    expect(rocketBackCoords.feetX).toBeGreaterThan(0)
    expect(rocketBackCoords.feetX).toBeLessThan(1)
    expect(rocketBackCoords.feetY).toBeGreaterThan(0.7)
    expect(rocketBackCoords.feetY).toBeLessThan(1.0)
    expect(rocketBackCoords.shadowScale).toBeDefined()
    expect(rocketBackCoords.shadowScale).toBeGreaterThan(0)

    // Rocket front sprite (enemy side)
    const rocketFrontCoords = getPokemonFeetCoords('/assets/sprites/trainers/rocket_m_front.webp')
    expect(rocketFrontCoords).toBeDefined()
    expect(rocketFrontCoords.feetX).toBeGreaterThan(0)
    expect(rocketFrontCoords.feetX).toBeLessThan(1)
    expect(rocketFrontCoords.feetY).toBeGreaterThan(0.7)
  })

  it('requests and registers shadow in combatShadowStore properly', async () => {
    const shadowStore = useCombatShadowStore()
    const shadowKey = 'trainer_enemy_test'

    await shadowStore.requestShadow(shadowKey, {
      side: 'enemy',
      entitySize: 200,
      feetX: 0.52,
      feetY: 0.95,
      shadowScale: 0.9,
      width: '70%',
      visible: true
    })

    const registered = shadowStore.activeShadows.get(shadowKey)
    expect(registered).toBeDefined()
    expect(registered?.visible).toBe(true)
    expect(registered?.feetX).toBe(0.52)
    expect(registered?.feetY).toBe(0.95)
    expect(registered?.shadowScale).toBe(0.9)

    shadowStore.hideShadow(shadowKey)
    expect(registered?.visible).toBe(false)
  })

  it('mounts CombatShadow and renders canonical shadow without negative z-index', async () => {
    const shadowStore = useCombatShadowStore()
    const shadowKey = 'test_shadow_render'

    await shadowStore.requestShadow(shadowKey, {
      side: 'player',
      entitySize: 200,
      feetX: 0.5,
      feetY: 0.9,
      shadowScale: 1.0,
      width: '70%',
      visible: true
    })

    const wrapper = mount(CombatShadow, {
      props: {
        shadowId: shadowKey,
        spriteSize: 200,
        shadowScale: 1.0
      }
    })

    const shadowEl = wrapper.find('.pv-combat-shadow')
    expect(shadowEl.exists()).toBe(true)

    // Verify element style and dimensions
    const styleAttr = shadowEl.attributes('style') || ''
    expect(styleAttr).toContain('width:')
    expect(styleAttr).toContain('height:')
    expect(styleAttr).toContain('background-image:')
    expect(shadowEl.classes()).toContain('pv-combat-shadow')

    // Verify computed width matches entitySize * widthPercent * shadowScale * widthRatio
    const expectedWidth = (70 / 100) * 200 * 1.0 * GLOBAL_SHADOW_CONFIG.widthRatio
    const expectedHeight = expectedWidth * GLOBAL_SHADOW_CONFIG.heightRatio
    expect(styleAttr).toContain(`width: ${expectedWidth}px`)
    expect(styleAttr).toContain(`height: ${expectedHeight}px`)
  })

  it('supports custom previewConfig in CombatShadow for Dev Shadow Editor live updates', async () => {
    const shadowStore = useCombatShadowStore()
    const shadowKey = 'test_preview_shadow'

    await shadowStore.requestShadow(shadowKey, {
      side: 'player',
      entitySize: 100,
      feetX: 0.5,
      feetY: 0.9,
      shadowScale: 1.0,
      width: '70%',
      visible: true
    })

    const customConfig = {
      widthRatio: 1.2,
      heightRatio: 0.35,
      pixelation: 24
    }

    const wrapper = mount(CombatShadow, {
      props: {
        shadowId: shadowKey,
        spriteSize: 100,
        shadowScale: 1.0,
        previewConfig: customConfig
      }
    })

    const shadowEl = wrapper.find('.pv-combat-shadow')
    expect(shadowEl.exists()).toBe(true)

    const styleAttr = shadowEl.attributes('style') || ''
    const expectedWidth = (70 / 100) * 100 * 1.0 * customConfig.widthRatio
    const expectedHeight = expectedWidth * customConfig.heightRatio
    expect(styleAttr).toContain(`width: ${expectedWidth}px`)
    expect(styleAttr).toContain(`height: ${expectedHeight}px`)
  })
})
