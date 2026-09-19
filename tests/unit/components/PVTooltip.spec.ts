// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PVTooltip from '@/components/common/PVTooltip.vue'

const SHORT_DESC = 'Linea 1\nLinea 2\nLinea 3'
const LONG_DESC = Array.from({ length: 30 }, (_, i) => `• Item ${i + 1}: 10`).join('\n')
const MOCK_VIEWPORT_WIDTH_PX = 1000
const MOCK_VIEWPORT_HEIGHT_PX = 800
const MOCK_LINE_HEIGHT_PX = 20
const MOCK_OVERFLOW_SCROLL_HEIGHT_PX = 1000
const MOCK_FIT_SCROLL_HEIGHT_PX = 60
const TRIGGER_TOP_PX = 20
const TRIGGER_BOTTOM_PX = 50
const TRIGGER_LEFT_PX = 600
const TRIGGER_RIGHT_PX = 680
const TRIGGER_WIDTH_PX = 80
const TRIGGER_HEIGHT_PX = 30
const MACRO_TASK_DELAY_MS = 20

const flushDelay = () => new Promise<void>(resolve => {
  setTimeout(resolve, MACRO_TASK_DELAY_MS)
})

describe('PVTooltip.vue - Viewport Overflow & Ellipsis Truncation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: MOCK_VIEWPORT_WIDTH_PX, writable: true })
    Object.defineProperty(window, 'innerHeight', { value: MOCK_VIEWPORT_HEIGHT_PX, writable: true })
    Object.defineProperty(window, 'scrollX', { value: 0, writable: true })
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  const mockTriggerRect = () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
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
  }

  it('renders all description lines without ellipsis when content fits', async () => {
    mockTriggerRect()
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(MOCK_FIT_SCROLL_HEIGHT_PX)

    const wrapper = mount(PVTooltip, {
      props: {
        title: 'TEST_MOCHILA',
        description: SHORT_DESC,
        touchInstant: true,
        position: 'bottom'
      },
      slots: {
        default: '<button class="trigger-btn">Trigger</button>'
      },
      attachTo: document.body
    })

    await wrapper.find('.trigger-btn').trigger('touchstart')
    await flushDelay()
    await nextTick()

    const teleported = document.querySelector('.pv-tooltip-teleported')
    expect(teleported).not.toBeNull()

    const lines = document.querySelectorAll('.tooltip-line')
    const EXPECTED_SHORT_LINES_COUNT = 3
    expect(lines.length).toBe(EXPECTED_SHORT_LINES_COUNT)

    const ellipsis = document.querySelector('.pv-tooltip-ellipsis')
    expect(ellipsis).toBeNull()

    wrapper.unmount()
  })

  it('truncates description lines and renders ellipsis indicator when content overflows maxHeight', async () => {
    mockTriggerRect()
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(MOCK_LINE_HEIGHT_PX)
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(MOCK_OVERFLOW_SCROLL_HEIGHT_PX)

    const wrapper = mount(PVTooltip, {
      props: {
        title: 'GRAN_MOCHILA',
        description: LONG_DESC,
        touchInstant: true,
        position: 'bottom'
      },
      slots: {
        default: '<button class="trigger-btn">Trigger</button>'
      },
      attachTo: document.body
    })

    await wrapper.find('.trigger-btn').trigger('touchstart')
    await flushDelay()
    await nextTick()

    const teleported = document.querySelector('.pv-tooltip-teleported')
    expect(teleported).not.toBeNull()

    const ellipsis = document.querySelector('.pv-tooltip-ellipsis')
    expect(ellipsis).not.toBeNull()
    expect(ellipsis?.textContent?.trim()).toBe('...')

    const renderedLines = document.querySelectorAll('.tooltip-line')
    const ORIGINAL_LINES_COUNT = 30
    expect(renderedLines.length).toBeLessThan(ORIGINAL_LINES_COUNT)
    expect(renderedLines.length).toBeGreaterThan(0)

    wrapper.unmount()
  })

  it('renders ellipsis for slot-only content when it overflows maxHeight', async () => {
    mockTriggerRect()
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(MOCK_OVERFLOW_SCROLL_HEIGHT_PX)

    const wrapper = mount(PVTooltip, {
      props: {
        title: 'SLOT_TOOLTIP',
        touchInstant: true,
        position: 'bottom'
      },
      slots: {
        default: '<button class="trigger-btn">Trigger</button>',
        content: '<div class="huge-slot">Huge Content</div>'
      },
      attachTo: document.body
    })

    await wrapper.find('.trigger-btn').trigger('touchstart')
    await flushDelay()
    await nextTick()

    const ellipsis = document.querySelector('.pv-tooltip-ellipsis')
    expect(ellipsis).not.toBeNull()
    expect(ellipsis?.textContent?.trim()).toBe('...')

    wrapper.unmount()
  })
})
