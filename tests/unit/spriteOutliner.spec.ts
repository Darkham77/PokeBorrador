/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getProcessedSprite } from '@/logic/utils/spriteOutliner'

describe('SpriteOutliner Utility', () => {
  let originalImage: any
  let originalCreateElement: any

  beforeEach(() => {
    originalImage = globalThis.Image
    originalCreateElement = document.createElement

    // Mock Image class to trigger onload immediately
    class MockImage {
      onload: () => void = () => {}
      onerror: (err: any) => void = () => {}
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
        return mockCanvas as any
      }
      return originalCreateElement.call(document, tagName)
    })
  })

  afterEach(() => {
    globalThis.Image = originalImage
    document.createElement = originalCreateElement
    vi.restoreAllMocks()
  })

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
