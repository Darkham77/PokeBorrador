// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref } from 'vue'
import { useTooltipPosition } from '@/composables/ui/useTooltipPosition'

describe('useTooltipPosition', () => {
  let triggerEl: HTMLElement
  let tooltipEl: HTMLElement

  beforeEach(() => {
    triggerEl = document.createElement('div')
    tooltipEl = document.createElement('div')
    document.body.appendChild(triggerEl)
    document.body.appendChild(tooltipEl)

    Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true })
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true })
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })
  })

  afterEach(() => {
    triggerEl.remove()
    tooltipEl.remove()
  })

  it('positions tooltip centered above trigger when position is "top"', () => {
    // Trigger at (600, 500), size 80x30
    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: 500,
      bottom: 530,
      left: 600,
      right: 680,
      width: 80,
      height: 30,
      x: 600,
      y: 500,
      toJSON: () => {}
    })

    // Tooltip size 200x100
    vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
      left: 0,
      right: 200,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    const trigger = ref(triggerEl)
    const tooltip = ref(tooltipEl)
    const { coords, activePosition, updatePosition } = useTooltipPosition(trigger, tooltip, 'top')

    updatePosition()

    expect(activePosition.value).toBe('top')
    // Coords for pos-top must anchor to (triggerCenter, trigger.top - gap)
    // so CSS translate(-50%, -100%) places the tooltip centered right above trigger
    expect(coords.value.left).toBe(640) // 600 + 40
    expect(coords.value.top).toBe(488) // 500 - 12 (gap)
  })

  it('flips to bottom when not enough space on top', () => {
    // Trigger near the top edge at (600, 20), size 80x30
    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      bottom: 50,
      left: 600,
      right: 680,
      width: 80,
      height: 30,
      x: 600,
      y: 20,
      toJSON: () => {}
    })

    vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
      left: 0,
      right: 200,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    const trigger = ref(triggerEl)
    const tooltip = ref(tooltipEl)
    const { coords, activePosition, updatePosition } = useTooltipPosition(trigger, tooltip, 'top')

    updatePosition()

    expect(activePosition.value).toBe('bottom')
    expect(coords.value.left).toBe(640)
    expect(coords.value.top).toBe(62) // 50 + 12 (gap)
  })

  it('nudges horizontally away from left viewport edge', () => {
    // Trigger near the left edge at (5, 500), size 30x30
    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: 500,
      bottom: 530,
      left: 5,
      right: 35,
      width: 30,
      height: 30,
      x: 5,
      y: 500,
      toJSON: () => {}
    })

    // Tooltip size 200x100
    vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: 100,
      left: 0,
      right: 200,
      width: 200,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    const trigger = ref(triggerEl)
    const tooltip = ref(tooltipEl)
    const { coords, arrowOffset, updatePosition } = useTooltipPosition(trigger, tooltip, 'top')

    updatePosition()

    // Trigger center is 20. Half-width is 100.
    // If unnudged, left would be 20, which would place tooltip left edge at -80 (outside viewport).
    // With padding 15, left is nudged to padding (15) + halfWidth (100) = 115.
    expect(coords.value.left).toBe(115)
    // Arrow should compensate to point back to the trigger center (20 - 115 = -95)
    expect(arrowOffset.value.x).toBe(-95)
  })

  it('calculates maxHeight for position "bottom" correctly deducting GAP, PADDING and chrome', () => {
    const TRIGGER_TOP_PX = 20
    const TRIGGER_BOTTOM_PX = 50
    const TRIGGER_LEFT_PX = 600
    const TRIGGER_RIGHT_PX = 680
    const TRIGGER_WIDTH_PX = 80
    const TRIGGER_HEIGHT_PX = 30
    const TOOLTIP_WIDTH_PX = 200
    const TOOLTIP_HEIGHT_PX = 100
    const EXPECTED_MAX_HEIGHT_BOTTOM_PX = 699

    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: TRIGGER_TOP_PX,
      bottom: TRIGGER_BOTTOM_PX,
      left: TRIGGER_LEFT_PX,
      right: TRIGGER_RIGHT_PX,
      width: TRIGGER_WIDTH_PX,
      height: TRIGGER_HEIGHT_PX,
      x: TRIGGER_LEFT_PX,
      y: TRIGGER_TOP_PX,
      toJSON: () => {}
    })

    vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: TOOLTIP_HEIGHT_PX,
      left: 0,
      right: TOOLTIP_WIDTH_PX,
      width: TOOLTIP_WIDTH_PX,
      height: TOOLTIP_HEIGHT_PX,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    const trigger = ref(triggerEl)
    const tooltip = ref(tooltipEl)
    const { maxHeight, activePosition, updatePosition } = useTooltipPosition(trigger, tooltip, 'top')

    updatePosition()

    expect(activePosition.value).toBe('bottom')
    expect(maxHeight.value).toBe(EXPECTED_MAX_HEIGHT_BOTTOM_PX)
  })

  it('calculates maxHeight for position "top" correctly deducting GAP, PADDING and chrome', () => {
    const TRIGGER_TOP_PX = 600
    const TRIGGER_BOTTOM_PX = 630
    const TRIGGER_LEFT_PX = 600
    const TRIGGER_RIGHT_PX = 680
    const TRIGGER_WIDTH_PX = 80
    const TRIGGER_HEIGHT_PX = 30
    const TOOLTIP_WIDTH_PX = 200
    const TOOLTIP_HEIGHT_PX = 100
    const EXPECTED_MAX_HEIGHT_TOP_PX = 549

    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: TRIGGER_TOP_PX,
      bottom: TRIGGER_BOTTOM_PX,
      left: TRIGGER_LEFT_PX,
      right: TRIGGER_RIGHT_PX,
      width: TRIGGER_WIDTH_PX,
      height: TRIGGER_HEIGHT_PX,
      x: TRIGGER_LEFT_PX,
      y: TRIGGER_TOP_PX,
      toJSON: () => {}
    })

    vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: TOOLTIP_HEIGHT_PX,
      left: 0,
      right: TOOLTIP_WIDTH_PX,
      width: TOOLTIP_WIDTH_PX,
      height: TOOLTIP_HEIGHT_PX,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    const trigger = ref(triggerEl)
    const tooltip = ref(tooltipEl)
    const { maxHeight, activePosition, updatePosition } = useTooltipPosition(trigger, tooltip, 'top')

    updatePosition()

    expect(activePosition.value).toBe('top')
    expect(maxHeight.value).toBe(EXPECTED_MAX_HEIGHT_TOP_PX)
  })

  it('calculates maxHeight for position "left" bounded by viewport height and chrome', () => {
    const TRIGGER_TOP_PX = 400
    const TRIGGER_BOTTOM_PX = 430
    const TRIGGER_LEFT_PX = 600
    const TRIGGER_RIGHT_PX = 680
    const TRIGGER_WIDTH_PX = 80
    const TRIGGER_HEIGHT_PX = 30
    const TOOLTIP_WIDTH_PX = 200
    const TOOLTIP_HEIGHT_PX = 100
    const EXPECTED_MAX_HEIGHT_SIDE_PX = 746

    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: TRIGGER_TOP_PX,
      bottom: TRIGGER_BOTTOM_PX,
      left: TRIGGER_LEFT_PX,
      right: TRIGGER_RIGHT_PX,
      width: TRIGGER_WIDTH_PX,
      height: TRIGGER_HEIGHT_PX,
      x: TRIGGER_LEFT_PX,
      y: TRIGGER_TOP_PX,
      toJSON: () => {}
    })

    vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: TOOLTIP_HEIGHT_PX,
      left: 0,
      right: TOOLTIP_WIDTH_PX,
      width: TOOLTIP_WIDTH_PX,
      height: TOOLTIP_HEIGHT_PX,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    const trigger = ref(triggerEl)
    const tooltip = ref(tooltipEl)
    const { maxHeight, activePosition, updatePosition } = useTooltipPosition(trigger, tooltip, 'left')

    updatePosition()

    expect(activePosition.value).toBe('left')
    expect(maxHeight.value).toBe(EXPECTED_MAX_HEIGHT_SIDE_PX)
  })

  it('scales maxHeight correctly when --app-zoom is applied', () => {
    const TRIGGER_TOP_PX = 20
    const TRIGGER_BOTTOM_PX = 50
    const TRIGGER_LEFT_PX = 600
    const TRIGGER_RIGHT_PX = 680
    const TRIGGER_WIDTH_PX = 80
    const TRIGGER_HEIGHT_PX = 30
    const TOOLTIP_WIDTH_PX = 200
    const TOOLTIP_HEIGHT_PX = 100
    const APP_ZOOM_VALUE = '1.25'
    const EXPECTED_ZOOM_MAX_HEIGHT_PX = 554

    document.documentElement.style.setProperty('--app-zoom', APP_ZOOM_VALUE)

    vi.spyOn(triggerEl, 'getBoundingClientRect').mockReturnValue({
      top: TRIGGER_TOP_PX,
      bottom: TRIGGER_BOTTOM_PX,
      left: TRIGGER_LEFT_PX,
      right: TRIGGER_RIGHT_PX,
      width: TRIGGER_WIDTH_PX,
      height: TRIGGER_HEIGHT_PX,
      x: TRIGGER_LEFT_PX,
      y: TRIGGER_TOP_PX,
      toJSON: () => {}
    })

    vi.spyOn(tooltipEl, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      bottom: TOOLTIP_HEIGHT_PX,
      left: 0,
      right: TOOLTIP_WIDTH_PX,
      width: TOOLTIP_WIDTH_PX,
      height: TOOLTIP_HEIGHT_PX,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    const trigger = ref(triggerEl)
    const tooltip = ref(tooltipEl)
    const { maxHeight, updatePosition } = useTooltipPosition(trigger, tooltip, 'top')

    updatePosition()

    expect(maxHeight.value).toBe(EXPECTED_ZOOM_MAX_HEIGHT_PX)

    document.documentElement.style.removeProperty('--app-zoom')
  })
})
