/**
 * tests/unit/battle/battle_weather_sandwich_architecture.spec.ts
 * Tier 1 Unit Test: Atmosphere Sandwich Architecture (RED -> GREEN)
 * Validates:
 * 1. AtmosphereLayer layer="all" maintains full backward compatibility (renders overlay & particles).
 * 2. AtmosphereLayer layer="ambient" renders ambient layer without precipitation or lightning particles.
 * 3. AtmosphereLayer layer="particles" renders precipitation & lightning with .is-particles-layer flag.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AtmosphereLayer from '@/components/common/AtmosphereLayer.vue'
import PVSpriteFX from '@/components/common/PVSpriteFX.vue'
import BattleCombatantStatusOverlay from '@/components/battle/BattleCombatantStatusOverlay.vue'
import BattleCombatant from '@/components/battle/BattleCombatant.vue'
import BattleArenaEnemyCombatant from '@/components/battle/BattleArenaEnemyCombatant.vue'
import BattleArenaPlayerCombatant from '@/components/battle/BattleArenaPlayerCombatant.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Atmosphere Sandwich Architecture Contract (RED -> GREEN)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('AtmosphereLayer default layer="all" renders all elements for backward compatibility', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'storm',
        isVisible: true,
        isFastMode: false,
        isLowPower: false,
        animSeed: 0.5
      }
    })

    await nextTick()
    await nextTick()

    const overlay = wrapper.find('.weather-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.isVisible()).toBe(true)

    // Should render precipitation in 'all' mode
    const rainLayers = wrapper.findAll('.rain-layer')
    expect(rainLayers.length).toBe(2)

    // Should render lightning in 'all' mode
    expect(wrapper.find('.lightning-bolt').exists()).toBe(true)
  })

  it('AtmosphereLayer layer="ambient" renders only ambient elements without precipitation or lightning', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'storm',
        layer: 'ambient',
        isVisible: true,
        isFastMode: false,
        isLowPower: false,
        animSeed: 0.5
      }
    })

    await nextTick()
    await nextTick()

    // Container should have .is-ambient-layer class
    const container = wrapper.find('.atmosphere-container')
    expect(container.classes()).toContain('is-ambient-layer')

    // Overlay must exist for ambient tint
    const overlay = wrapper.find('.weather-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.isVisible()).toBe(true)

    // Must NOT render precipitation layers (raindrops, snowflakes) in ambient mode
    const rainLayers = wrapper.findAll('.rain-layer')
    expect(rainLayers.length).toBe(0)

    // Must NOT render lightning bolt or flash in ambient mode
    expect(wrapper.find('.lightning-bolt').exists()).toBe(false)
    expect(wrapper.find('.lightning-flash-overlay').exists()).toBe(false)

    // Must NOT render leaves in ambient mode
    const leaves = wrapper.findAll('.leaf-element')
    expect(leaves.length).toBe(0)
  })

  it('AtmosphereLayer layer="particles" renders precipitation, lightning, and leaves with .is-particles-layer flag', async () => {
    const wrapper = mount(AtmosphereLayer, {
      props: {
        weather: 'storm',
        layer: 'particles',
        isVisible: true,
        isFastMode: false,
        isLowPower: false,
        animSeed: 0.5
      }
    })

    await nextTick()
    await nextTick()

    // Container should have .is-particles-layer class
    const container = wrapper.find('.atmosphere-container')
    expect(container.classes()).toContain('is-particles-layer')

    // Overlay must exist with is-particles-layer
    const overlay = wrapper.find('.weather-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.classes()).toContain('is-particles-layer')

    // Must render precipitation layers (raindrops)
    const rainLayers = wrapper.findAll('.rain-layer')
    expect(rainLayers.length).toBe(2)

    // Must render lightning elements
    expect(wrapper.find('.lightning-bolt').exists()).toBe(true)
    expect(wrapper.find('.lightning-flash-overlay').exists()).toBe(true)

    // Must render leaves for storm weather
    const leaves = wrapper.findAll('.leaf-element')
    expect(leaves.length).toBeGreaterThan(0)
  })

  it('isLeafWeatherId correctly filters weather types requiring leaf animation', async () => {
    const { isLeafWeatherId } = await import('@/components/common/useAtmosphereLeafAnim')
    expect(isLeafWeatherId('wind')).toBe(true)
    expect(isLeafWeatherId('strong_winds')).toBe(true)
    expect(isLeafWeatherId('storm')).toBe(true)
    expect(isLeafWeatherId('rain')).toBe(false)
    expect(isLeafWeatherId('clear')).toBe(false)
    expect(isLeafWeatherId('snow')).toBe(false)
    expect(isLeafWeatherId('sandstorm')).toBe(false)
  })

  it('useAtmosphereLeafAnim initializes all leaf nodes offscreen and with opacity 0', async () => {
    const { useAtmosphereLeafAnim } = await import('@/components/common/useAtmosphereLeafAnim')
    const container = document.createElement('div')
    const leaf1 = document.createElement('div')
    leaf1.className = 'leaf-element'
    const leaf2 = document.createElement('div')
    leaf2.className = 'leaf-element'
    container.appendChild(leaf1)
    container.appendChild(leaf2)

    const containerRef = { value: container }
    const { initLeafAnim } = useAtmosphereLeafAnim(containerRef as never, {
      weather: 'storm',
      isFastMode: false,
      isPerformanceMode: false,
      isLowPower: false,
      animSeed: 0.5,
      isVisible: true
    })

    const { gsap } = await import('gsap')
    const ctx = gsap.context(() => {})
    initLeafAnim(ctx)

    expect(gsap.set).toHaveBeenCalledWith(leaf1, expect.objectContaining({
      opacity: 0,
      top: '-100px',
      left: '-100px'
    }))
    expect(gsap.set).toHaveBeenCalledWith(leaf2, expect.objectContaining({
      opacity: 0,
      top: '-100px',
      left: '-100px'
    }))
    ctx.revert()
  })

  describe('6-Tier Combat Sandwich Decoupling Tests', () => {
    const mockPokemon = {
      id: 'pikachu',
      name: 'Pikachu',
      level: 50,
      hp: 100,
      maxHp: 100,
      types: ['electric'],
      status: 'brn',
      moves: [],
      stats: { hp: 100, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90 },
      baseStats: { hp: 35, attack: 55, defense: 40, spAttack: 50, spDefense: 50, speed: 90 },
      ivs: { hp: 31, attack: 31, defense: 31, spAttack: 31, spDefense: 31, speed: 31 },
      evs: { hp: 0, attack: 0, defense: 0, spAttack: 0, spDefense: 0, speed: 0 },
      nature: 'hardy',
      ability: 'static',
      exp: 1000,
      isShiny: false
    } as unknown as Pokemon

    it('PVSpriteFX with hideStatusOverlay: true omits PVAuraFX and PVStatusFX', async () => {
      const wrapper = mount(PVSpriteFX, {
        props: {
          status: 'brn',
          hideStatusOverlay: true
        }
      })
      await nextTick()

      expect(wrapper.findComponent({ name: 'PVStatusFX' }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'PVAuraFX' }).exists()).toBe(false)
      expect(wrapper.find('.pv-fx-sprite-layer').exists()).toBe(true)
    })

    it('PVSpriteFX with overlayOnly: true omits .pv-fx-sprite-layer and renders PVStatusFX', async () => {
      const wrapper = mount(PVSpriteFX, {
        props: {
          status: 'brn',
          overlayOnly: true
        }
      })
      await nextTick()

      expect(wrapper.find('.pv-fx-sprite-layer').exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'PVStatusFX' }).exists()).toBe(true)
    })

    it('BattleCombatantStatusOverlay renders at Layer 4 z-index (z-base + 25) with PVSpriteFX overlayOnly', async () => {
      const wrapper = mount(BattleCombatantStatusOverlay, {
        props: {
          pokemon: mockPokemon,
          side: 'enemy',
          position: { x: 500, y: 500 },
          baseSize: 120
        }
      })
      await nextTick()

      const entity = wrapper.find('.combatant-status-overlay')
      expect(entity.exists()).toBe(true)
      expect(entity.attributes('style')).toContain('calc(var(--z-base) + 25)')

      const spriteFx = wrapper.findComponent(PVSpriteFX)
      expect(spriteFx.exists()).toBe(true)
      expect(spriteFx.props('overlayOnly')).toBe(true)
    })

    it('BattleCombatant with hideStatusOverlay: true forwards prop to PVSpriteFX', async () => {
      const wrapper = mount(BattleCombatant, {
        props: {
          pokemon: mockPokemon,
          side: 'enemy',
          position: { x: 500, y: 500 },
          baseSize: 120,
          hideStatusOverlay: true,
          hasSeat: true
        }
      })
      await nextTick()

      const spriteFx = wrapper.findComponent(PVSpriteFX)
      expect(spriteFx.exists()).toBe(true)
      expect(spriteFx.props('hideStatusOverlay')).toBe(true)
    })

    it('BattleArenaEnemyCombatant and BattleArenaPlayerCombatant forward hideStatusOverlay', async () => {
      const enemyWrapper = mount(BattleArenaEnemyCombatant, {
        props: {
          pokemon: mockPokemon,
          p2Pos: { x: 500, y: 500 },
          p1Pos: { x: 100, y: 100 },
          baseSize: 120,
          groundY: '75%',
          hideStatusOverlay: true
        }
      })
      await nextTick()

      const enemyCombatant = enemyWrapper.findComponent(BattleCombatant)
      expect(enemyCombatant.exists()).toBe(true)
      expect(enemyCombatant.props('hideStatusOverlay')).toBe(true)

      const playerWrapper = mount(BattleArenaPlayerCombatant, {
        props: {
          pokemon: mockPokemon,
          p1Pos: { x: 100, y: 100 },
          p2Pos: { x: 500, y: 500 },
          baseSize: 120,
          groundY: '75%',
          hideStatusOverlay: true
        }
      })
      await nextTick()

      const playerCombatant = playerWrapper.findComponent(BattleCombatant)
      expect(playerCombatant.exists()).toBe(true)
      expect(playerCombatant.props('hideStatusOverlay')).toBe(true)
    })
  })
})
