import { describe, it, expect } from 'vitest'
import { getMapBiomeAndTags } from '@/logic/battle/biomeHelper'

describe('biomeHelper - getMapBiomeAndTags', () => {
  it('should return default biome and empty tags if location does not exist', () => {
    const res = getMapBiomeAndTags('non-existent-location')
    expect(res.activeBiome).toBe('isPlains')
    expect(res.mapTags).toEqual([])
  })

  it('should resolve correct biome from map data hierarchy', () => {
    // Plains location
    const plainsRes = getMapBiomeAndTags('route1')
    expect(plainsRes.activeBiome).toBeDefined()
    expect(Array.isArray(plainsRes.mapTags)).toBe(true)
  })
})
