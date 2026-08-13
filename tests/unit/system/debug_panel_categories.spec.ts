import { describe, expect, it } from 'vitest'
import { DEBUG_PANEL_CATEGORIES } from '@/components/admin/debug/debugPanelCategories.ts'

describe('Debug panel categories', () => {
  it('exposes the visible effects tab that renders DebugAudioAnimTab', () => {
    expect(DEBUG_PANEL_CATEGORIES).toContainEqual({
      id: 'audio',
      label: 'EFECTOS',
      desc: 'Efectos de combate, estados, animaciones y sonido.',
    })
  })
})
