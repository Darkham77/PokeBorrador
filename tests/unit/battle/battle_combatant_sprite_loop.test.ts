// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import {
  POKEMON_SPRITE_IDLE_FPS,
  POKEMON_SPRITE_VARIATION_FPS
} from '@/logic/constants/animations.ts'
import { useBattleCombatantSpriteLoop } from '@/components/battle/useBattleCombatantSpriteLoop.ts'
import type { BattleCombatantProps } from '@/types/battle/battle.ts'

describe('Pokemon Sprite Loop Animation Speed - Unit Tests', () => {
  it('should have 30% accelerated FPS constants for idle and variation modes', () => {
    const BASE_IDLE_FPS = 8
    const BASE_VARIATION_FPS = 10
    const ACCELERATION_FACTOR = 1.3

    expect(POKEMON_SPRITE_IDLE_FPS).toBeCloseTo(BASE_IDLE_FPS * ACCELERATION_FACTOR, 2)
    expect(POKEMON_SPRITE_VARIATION_FPS).toBeCloseTo(BASE_VARIATION_FPS * ACCELERATION_FACTOR, 2)
  })

  it('should initialize useBattleCombatantSpriteLoop with idle mode and cycles target', () => {
    const dummyEl = document.createElement('div')
    const imgIdle = document.createElement('div')
    imgIdle.className = 'pokemon-combat-image pokemon-image-idle'
    dummyEl.appendChild(imgIdle)

    const spriteRef = ref<HTMLElement | null>(dummyEl)
    const isAnimated = ref(true)
    const frames = ref(20)
    const variationMeta = ref<{ frames: number } | null>(null)

    const props: BattleCombatantProps = {
      side: 'player',
      position: { x: 0, y: 0 },
      baseSize: 100,
      pokemon: {
        id: 'p1_0',
        name: 'Pikachu',
        species: 'pikachu',
        hp: 100,
        maxHp: 100,
        level: 50,
        status: null,
        gender: 'M',
        types: ['Electric'],
        isShiny: false
      } as any,
      animState: null
    }

    let hookResult!: ReturnType<typeof useBattleCombatantSpriteLoop>
    const wrapper = mount(defineComponent({
      setup() {
        hookResult = useBattleCombatantSpriteLoop({
          props,
          spriteRef,
          isAnimated,
          frames,
          variationMeta
        })
        return () => null
      }
    }))

    const { currentMode, idleCyclesTarget, animateSpritesheet } = hookResult

    expect(currentMode.value).toBe('idle')
    expect(idleCyclesTarget.value).toBeGreaterThanOrEqual(2)

    // Trigger animation
    animateSpritesheet()
    expect(currentMode.value).toBe('idle')

    wrapper.unmount()
  })
})
