/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getProcessedSprite, getProcessedAura } from '@/logic/utils/spriteOutliner'

describe('SpriteOutliner Utility', () => {
  let originalImage: typeof globalThis.Image
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    originalImage = globalThis.Image
    originalCreateElement = document.createElement

    // Mock Image class to trigger onload immediately
    class MockImage {
      onload: () => void = () => {}
      onerror: (err: unknown) => void = () => {}
      _src: string = ''
      naturalWidth: number = 64
      naturalHeight: number = 64

      set src(val: string) {
        this._src = val
        if (val.includes('error')) {
          setTimeout(() => this.onerror(new Error('Mock Image Error')), 0)
        } else {
          setTimeout(() => this.onload(), 0)
        }
      }

      get src() {
        return this._src
      }
    }

    vi.stubGlobal('Image', MockImage)

    // Mock document.createElement('canvas')
    const mockCtx = {
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      filter: 'none',
      globalCompositeOperation: 'source-over',
      fillStyle: '',
    }

    const mockCanvas = {
      getContext: () => mockCtx,
      toDataURL: (format: string) => `data:image/png;base64,mocked_${format}_url`,
      width: 0,
      height: 0,
    }

    document.createElement = vi.fn().mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement
      }
      return originalCreateElement.call(document, tagName)
    })
  })

  afterEach(() => {
    globalThis.Image = originalImage
    document.createElement = originalCreateElement
    vi.restoreAllMocks()
  })

  describe('Sprite Outline/Silhouette Processing', () => {
    it('debe generar y retornar un sprite pre-renderizado', async () => {
      const url = await getProcessedSprite('/assets/sprites/pokemon/25.webp', 'outline')
      expect(url).toBe('data:image/png;base64,mocked_image/png_url')
    })

    it('debe devolver la URL original como fallback en caso de error de carga de imagen', async () => {
      const originalUrl = '/assets/sprites/pokemon/error.webp'
      const url = await getProcessedSprite(originalUrl, 'outline')
      expect(url).toBe(originalUrl)
    })

    it('debe usar el cache para retornar la misma data URL en subsecuentes llamadas', async () => {
      const url1 = await getProcessedSprite('/assets/sprites/pokemon/1.webp', 'silhouette')
      const url2 = await getProcessedSprite('/assets/sprites/pokemon/1.webp', 'silhouette')
      expect(url1).toBe(url2)
    })
  })

  describe('Aura Processing', () => {
    it('debe generar y retornar un aura coloreada y difuminada', async () => {
      const url = await getProcessedAura('/assets/fx/flare_1.webp', 'rgba(255, 0, 0, 0.9)', 1.5)
      expect(url).toBe('data:image/png;base64,mocked_image/png_url')
    })

    it('debe usar el cache para auras idénticas', async () => {
      const url1 = await getProcessedAura('/assets/fx/flare_2.webp', 'rgba(0, 255, 255, 0.85)', 1.5)
      const url2 = await getProcessedAura('/assets/fx/flare_2.webp', 'rgba(0, 255, 255, 0.85)', 1.5)
      expect(url1).toBe(url2)
    })

    it('debe devolver la URL original como fallback ante errores', async () => {
      const originalUrl = '/assets/fx/error_flare.webp'
      const url = await getProcessedAura(originalUrl, 'rgba(0, 255, 255, 0.85)', 1.5)
      expect(url).toBe(originalUrl)
    })
  })
})
