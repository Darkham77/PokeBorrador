
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
    it('debe resolver sprites base desde PokeAPI usando el mapeo interno (localizado)', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'bulbasaur'))
        .toBe('/assets/sprites/pokemon/static/1.webp')
    })

    it('debe soportar variantes Shiny (localizado)', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'pikachu', { isShiny: true }))
        .toBe('/assets/sprites/pokemon/static/shiny/25.webp')
    })

    it('debe soportar variantes de espalda (Back) (localizado)', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'mew', { isBack: true }))
        .toBe('/assets/sprites/pokemon/static/back/151.webp')
    })

    it('debe combinar Shiny + Back correctamente (localizado)', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'charizard', { isShiny: true, isBack: true }))
        .toBe('/assets/sprites/pokemon/static/back/shiny/6.webp')
    })

    it('debe manejar huevos como ítems especiales (localizado)', () => {
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'egg_water'))
        .toBe('/assets/sprites/egg.webp')
    })
  })

  describe('AssetService: Map Routing', () => {
    it('debe resolver mapas normales', () => {
      expect(getAssetUrl(ASSET_TYPES.MAP, 'ruta1', { cycle: 'day' }))
        .toBe('/assets/maps/ruta1_dia.webp')
    })

    it('debe agregar el sufijo _mobile si isLowPower está activo', () => {
      expect(getAssetUrl(ASSET_TYPES.MAP, 'ruta1', { cycle: 'day', isLowPower: true }))
        .toBe('/assets/maps/ruta1_dia_mobile.webp')
    })
  })

  describe('AssetService: Item Routing', () => {
    it('debe resolver la URL del sprite a partir de su ID de ítem en inglés o ruta relativa', () => {
      expect(getAssetUrl(ASSET_TYPES.ITEM, 'superpotion'))
        .toBe('/assets/sprites/crafting/tier3/superpotion.webp')
      expect(getAssetUrl(ASSET_TYPES.ITEM, 'healthmochi'))
        .toBe('/assets/sprites/crafting/tier3/healthmochi.webp')
      expect(getAssetUrl(ASSET_TYPES.ITEM, 'crafting/tier0/coalore'))
        .toBe('/assets/sprites/crafting/tier0/coalore.webp')
    })

    it('debe devolver la ruta estándar en tier3 si no está en SHOP_ITEMS', () => {
      expect(getAssetUrl(ASSET_TYPES.ITEM, 'custom_item'))
        .toBe('/assets/sprites/crafting/tier3/custom_item.webp')
    })
  })

  describe('AssetService: Trainer Routing', () => {
    it('debe usar activos locales para líderes de gimnasio (anteriormente externos)', () => {
      expect(getAssetUrl(ASSET_TYPES.TRAINER, 'brock'))
        .toBe('/assets/sprites/npc/brock.webp')
    })

    it('debe usar activos locales para otros entrenadores (sin LOD)', () => {
      vi.stubGlobal('innerWidth', 400)
      expect(getAssetUrl(ASSET_TYPES.TRAINER, 'hero'))
        .toBe('/assets/sprites/npc/hero.webp')
    })
  })

  describe('AssetService: Raw URLs and Test Paths', () => {
    it('debe devolver la URL o ruta intacta si empieza con http, data:, o /test aventura/', () => {
      expect(getAssetUrl(ASSET_TYPES.MAP, 'https://example.com/image.png')).toBe('https://example.com/image.png')
      expect(getAssetUrl(ASSET_TYPES.POKEMON, 'data:image/png;base64,123')).toBe('data:image/png;base64,123')
      expect(getAssetUrl(ASSET_TYPES.MAP, '/test aventura/imagenes/Pallet_Town_FRLG.png')).toBe('/test aventura/imagenes/Pallet_Town_FRLG.png')
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
