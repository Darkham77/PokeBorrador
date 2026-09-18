// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CombatantSpriteLayer from '@/components/battle/CombatantSpriteLayer.vue'
import CombatantSpriteAnimated from '@/components/battle/CombatantSpriteAnimated.vue'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

describe('Combatant Silhouette Filter Integrity (Tier 1 RED)', () => {
  const mockPokemon = makePokemon('pidgey', 5, { bypassWhitelist: true }) as Pokemon

  it('ensures static CombatantSpriteLayer does NOT set inline filter: none when isSilhouette is true', () => {
    const wrapper = mount(CombatantSpriteLayer, {
      props: {
        pokemon: mockPokemon,
        isAnimated: false,
        isSilhouette: true,
        currentMode: 'idle',
        idleImageUrl: '/assets/sprites/pokemon/16.webp',
        variationImageUrl: '',
        imageUrl: '/assets/sprites/pokemon/16.webp',
        frames: 1,
        variationMeta: null,
        showGuides: false,
        naturalSize: { w: 64, h: 64 },
        displaySize: 64,
        debugShowPokeRadius: false,
        fxRadius: 20
      }
    })

    const img = wrapper.find('img.pokemon-combat-image')
    expect(img.exists()).toBe(true)
    expect(img.classes()).toContain('is-silhouette')

    // An inline style of "filter: none" overrides CSS .is-silhouette { filter: url(#pixel-silhouette-optimized) }
    // When isSilhouette is true, inline filter MUST NOT be "none" (it should be unset or empty so CSS applies)
    const styleAttr = img.attributes('style') || ''
    expect(styleAttr).not.toContain('filter: none')
  })

  it('ensures animated CombatantSpriteAnimated does NOT set inline filter: none when isSilhouette is true', () => {
    const wrapper = mount(CombatantSpriteAnimated, {
      props: {
        pokemon: mockPokemon,
        isSilhouette: true,
        currentMode: 'idle',
        idleImageUrl: '/assets/sprites/pokemon/16.webp',
        variationImageUrl: '',
        frames: 1,
        variationMeta: null
      }
    })

    const img = wrapper.find('img.pokemon-combat-image')
    expect(img.exists()).toBe(true)
    expect(img.classes()).toContain('is-silhouette')

    const styleAttr = img.attributes('style') || ''
    expect(styleAttr).not.toContain('filter: none')
  })

  it('ensures animated CombatantSpriteLayer wraps animated sprite in .pokemon-combat-image-wrapper to clip frames', () => {
    const wrapper = mount(CombatantSpriteLayer, {
      props: {
        pokemon: mockPokemon,
        isAnimated: true,
        isSilhouette: false,
        currentMode: 'idle',
        idleImageUrl: '/assets/sprites/pokemon/16i.webp',
        variationImageUrl: '/assets/sprites/pokemon/16v.webp',
        imageUrl: '/assets/sprites/pokemon/16.webp',
        frames: 7,
        variationMeta: { frames: 4, size: 64, feetY: 0.8, feetX: 0.5, bodyH: 40, bodyW: 40, bodyRadius: 20 },
        showGuides: false,
        naturalSize: { w: 448, h: 64 },
        displaySize: 64,
        debugShowPokeRadius: false,
        fxRadius: 20
      }
    })

    const wrapperDiv = wrapper.find('.pokemon-combat-image-wrapper')
    expect(wrapperDiv.exists()).toBe(true)

    const idleImg = wrapper.find('img.pokemon-image-idle')
    expect(idleImg.exists()).toBe(true)
    expect(idleImg.classes()).toContain('pokemon-combat-image')
    expect(idleImg.attributes('style')).toContain('width: 700%')

    const variationImg = wrapper.find('img.pokemon-image-variation')
    expect(variationImg.exists()).toBe(true)
    expect(variationImg.classes()).toContain('pokemon-combat-image')
    expect(variationImg.attributes('style')).toContain('width: 400%')
  })
})

