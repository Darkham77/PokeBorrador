/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import * as resolver from '@/logic/utils/assetResolver'

describe('AssetService & Resolver (LOD System)', () => {
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

    it('debe usar activos locales con LOD para otros entrenadores', () => {
      // Forzamos resolución móvil para ver el LOD en acción
      vi.stubGlobal('innerWidth', 400)
      window.dispatchEvent(new Event('resize'))
      expect(getAssetUrl(ASSET_TYPES.TRAINER, 'hero'))
        .toBe('/assets/sprites/trainers/hero@0.25x.webp')
    })
  })

  describe('AssetResolver: LOD Logic', () => {
    it('debe devolver sufijo @0.25x en móviles (< 600px)', () => {
      vi.stubGlobal('innerWidth', 599)
      window.dispatchEvent(new Event('resize'))
      expect(resolver.getResolutionSuffix()).toBe('@0.25x')
    })

    it('debe devolver sufijo @0.5x en tablets (600px - 1023px)', () => {
      vi.stubGlobal('innerWidth', 800)
      window.dispatchEvent(new Event('resize'))
      expect(resolver.getResolutionSuffix()).toBe('@0.5x')
    })

    it('no debe devolver sufijo en pantallas grandes (>= 1024px)', () => {
      vi.stubGlobal('innerWidth', 1024)
      window.dispatchEvent(new Event('resize'))
      expect(resolver.getResolutionSuffix()).toBe('')
    })

    it('no debe duplicar el sufijo si ya existe en la URL', () => {
      vi.stubGlobal('innerWidth', 400)
      window.dispatchEvent(new Event('resize'))
      const url = '/assets/maps/city@0.5x.webp'
      expect(resolver.resolveAsset(url)).toBe(url)
    })

    it('no debe procesar archivos que no sean WebP', () => {
      vi.stubGlobal('innerWidth', 400)
      window.dispatchEvent(new Event('resize'))
      const url = '/assets/items/potion.png'
      expect(resolver.resolveAsset(url)).toBe(url)
    })
  })
})
