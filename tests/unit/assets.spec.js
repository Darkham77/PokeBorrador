/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import * as resolver from '@/logic/utils/assetResolver'

describe('AssetService & Resolver', () => {
  beforeEach(() => {
    // Reset window width to Desktop default
    vi.stubGlobal('innerWidth', 1200)
    vi.clearAllMocks()
  })

  describe('AssetService: Pokemon Routing', () => {
    it('debe resolver sprites base desde PokeAPI usando el mapeo interno', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'bulbasaur'))
        .toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png')
    })

    it('debe soportar variantes Shiny', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'pikachu', { isShiny: true }))
        .toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png')
    })

    it('debe soportar variantes de espalda (Back)', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'mew', { isBack: true }))
        .toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/151.png')
    })

    it('debe combinar Shiny + Back correctamente', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'charizard', { isShiny: true, isBack: true }))
        .toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/shiny/6.png')
    })

    it('debe manejar huevos como ítems especiales', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'egg_water'))
        .toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/egg.png')
    })
  })

  describe('AssetService: Item Routing', () => {
    it('debe mapear nombres internos a IDs de PokeAPI', () => {
      expect(getAssetUrl(ASSET_TYPES.ITEM, 'super_pocion'))
        .toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/super-potion.png')
    })

    it('debe usar fallback local para ítems no mapeados o custom', () => {
      expect(getAssetUrl(ASSET_TYPES.ITEM, 'medalla_roca'))
        .toBe('/assets/items/medalla_roca.webp')
    })
  })

  describe('AssetService: Trainer Routing', () => {
    it('debe usar Showdown para líderes de gimnasio reconocidos', () => {
      expect(getAssetUrl(ASSET_TYPES.TRAINER, 'brock'))
        .toBe('https://play.pokemonshowdown.com/sprites/trainers/brock.png')
    })

    it('debe usar activos locales para otros entrenadores (sin LOD)', () => {
      vi.stubGlobal('innerWidth', 400)
      expect(getAssetUrl(ASSET_TYPES.TRAINER, 'hero'))
        .toBe('/assets/sprites/trainers/hero.webp')
    })
  })

  describe('AssetResolver', () => {
    it('no debe devolver sufijo independientemente del ancho', () => {
      vi.stubGlobal('innerWidth', 400)
      expect(resolver.getResolutionSuffix()).toBe('')
      
      vi.stubGlobal('innerWidth', 1200)
      expect(resolver.getResolutionSuffix()).toBe('')
    })

    it('debe devolver la URL original codificada', () => {
      const url = '/assets/maps/ruta 1.webp'
      expect(resolver.resolveAsset(url)).toBe('/assets/maps/ruta%201.webp')
    })
  })
})
