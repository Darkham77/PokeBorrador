/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

describe('AtmosphereLayer Weather Textures Repro', () => {
  it('should verify that weather noise textures exist in public/ and are correctly resolved via assetService', () => {
    const url1 = getAssetUrl(ASSET_TYPES.FX, 'pattern-noise-1')
    const url2 = getAssetUrl(ASSET_TYPES.FX, 'pattern-noise-2')

    expect(url1).toBe('/assets/fx/pattern-noise-1.webp')
    expect(url2).toBe('/assets/fx/pattern-noise-2.webp')

    // Verify physical files exist
    const publicPath1 = path.resolve(process.cwd(), 'public', url1.replace(/^\//, ''))
    const publicPath2 = path.resolve(process.cwd(), 'public', url2.replace(/^\//, ''))

    expect(fs.existsSync(publicPath1)).toBe(true)
    expect(fs.existsSync(publicPath2)).toBe(true)
  })

  it('AtmosphereLayer component source should not reference nonexistent noise_texture_1.png', () => {
    const componentPath = path.resolve(process.cwd(), 'src/components/common/AtmosphereLayer.vue')
    const source = fs.readFileSync(componentPath, 'utf-8')

    // This assertion must FAIL in RED because the component currently references noise_texture_1.png
    expect(source.includes('noise_texture_1.png')).toBe(false)
    expect(source.includes('noise_texture_2.png')).toBe(false)
    expect(source.includes('pattern-noise-1')).toBe(true)
    expect(source.includes('pattern-noise-2')).toBe(true)
  })
})
