import { describe, expect, it } from 'vitest'
import { DEBUG_PANEL_CATEGORIES } from '@/components/admin/debug/debugPanelCategories.ts'

describe('Debug panel categories', () => {
  it('exposes essential map debug categories without audio tab', () => {
    const categoryIds = DEBUG_PANEL_CATEGORIES.map(c => c.id)
    expect(categoryIds).not.toContain('audio')
    expect(categoryIds).toEqual([
      'stats',
      'class',
      'items',
      'pokes',
      'trainers',
      'map',
      'missions',
      'time',
      'modals'
    ])
  })
})
