/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  useHomeWidgetsCollapse,
  HOME_WIDGET_IDS,
  isHomeWidgetId
} from '@/composables/home/useHomeWidgetsCollapse'
import { safeStorage } from '@/logic/utils/storage'

describe('useHomeWidgetsCollapse', () => {
  const STORAGE_KEY = 'pokevicio_home_collapsed_widgets'

  beforeEach(() => {
    safeStorage.removeItem(STORAGE_KEY)
    const { resetCollapseState } = useHomeWidgetsCollapse()
    resetCollapseState()
  })

  it('validates widget IDs with isHomeWidgetId guard', () => {
    expect(HOME_WIDGET_IDS.length).toBeGreaterThan(0)
    for (const id of HOME_WIDGET_IDS) {
      expect(isHomeWidgetId(id)).toBe(true)
    }
    expect(isHomeWidgetId('gyms')).toBe(true)
    expect(isHomeWidgetId('ranked')).toBe(true)
    expect(isHomeWidgetId('events_schedule')).toBe(true)
    expect(isHomeWidgetId('invalid_widget_id')).toBe(false)
    expect(isHomeWidgetId(null)).toBe(false)
    expect(isHomeWidgetId(undefined)).toBe(false)
  })

  it('provides expected default collapsed states', () => {
    const { isCollapsed } = useHomeWidgetsCollapse()

    // Accordions within events start collapsed by default
    expect(isCollapsed('events_schedule')).toBe(true)
    expect(isCollapsed('events_history')).toBe(true)

    // Main widgets start expanded by default
    expect(isCollapsed('gyms')).toBe(false)
    expect(isCollapsed('ranked')).toBe(false)
    expect(isCollapsed('defense')).toBe(false)
    expect(isCollapsed('missions')).toBe(false)
    expect(isCollapsed('class')).toBe(false)
    expect(isCollapsed('economy')).toBe(false)
    expect(isCollapsed('black_market')).toBe(false)
    expect(isCollapsed('buffs')).toBe(false)
  })

  it('toggles collapse state and persists to storage', () => {
    const { isCollapsed, toggleCollapse } = useHomeWidgetsCollapse()

    expect(isCollapsed('gyms')).toBe(false)

    // Toggle gyms to collapsed
    toggleCollapse('gyms')
    expect(isCollapsed('gyms')).toBe(true)

    // Check storage persistence
    const saved = JSON.parse(safeStorage.getItem(STORAGE_KEY) || '{}')
    expect(saved.gyms).toBe(true)

    // Toggle back to expanded
    toggleCollapse('gyms')
    expect(isCollapsed('gyms')).toBe(false)

    const savedAfter = JSON.parse(safeStorage.getItem(STORAGE_KEY) || '{}')
    expect(savedAfter.gyms).toBe(false)
  })

  it('allows explicit setCollapsed calls', () => {
    const { isCollapsed, setCollapsed } = useHomeWidgetsCollapse()

    setCollapsed('ranked', true)
    expect(isCollapsed('ranked')).toBe(true)

    setCollapsed('ranked', false)
    expect(isCollapsed('ranked')).toBe(false)
  })

  it('resets collapse state to defaults', () => {
    const { isCollapsed, setCollapsed, resetCollapseState } = useHomeWidgetsCollapse()

    setCollapsed('gyms', true)
    setCollapsed('events_schedule', false)
    expect(isCollapsed('gyms')).toBe(true)
    expect(isCollapsed('events_schedule')).toBe(false)

    resetCollapseState()
    expect(isCollapsed('gyms')).toBe(false)
    expect(isCollapsed('events_schedule')).toBe(true)
  })
})
