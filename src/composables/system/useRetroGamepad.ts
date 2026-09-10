import { computed } from 'vue'
import { useGamepad } from '@vueuse/core'

const BUTTON_A_INDEX = 0
const BUTTON_B_INDEX = 1
const BUTTON_X_INDEX = 2
const BUTTON_Y_INDEX = 3
const BUTTON_SELECT_INDEX = 8
const BUTTON_START_INDEX = 9
const DPAD_UP_INDEX = 12
const DPAD_DOWN_INDEX = 13
const DPAD_LEFT_INDEX = 14
const DPAD_RIGHT_INDEX = 15
const ANALOG_THRESHOLD = 0.5

export interface RetroGamepadState {
  readonly isSupported: boolean
  readonly isConnected: boolean
  readonly dpadUp: boolean
  readonly dpadDown: boolean
  readonly dpadLeft: boolean
  readonly dpadRight: boolean
  readonly buttonA: boolean
  readonly buttonB: boolean
  readonly buttonX: boolean
  readonly buttonY: boolean
  readonly start: boolean
  readonly select: boolean
}

/**
 * useRetroGamepad
 * Reactive composable to interact with retro gamepads and standard controllers.
 * Powered by @vueuse/core useGamepad.
 */
export function useRetroGamepad() {
  const { isSupported, gamepads } = useGamepad()

  const activeGamepad = computed(() => {
    return gamepads.value.find((g) => g.connected) || null
  })

  const isConnected = computed(() => activeGamepad.value !== null)

  const isPressed = (index: number): boolean => {
    const pad = activeGamepad.value
    if (!pad || !pad.buttons || !pad.buttons[index]) return false
    return pad.buttons[index].pressed
  }

  const dpadUp = computed(() => {
    const pad = activeGamepad.value
    const axisUp = pad && pad.axes && pad.axes[1] !== undefined ? pad.axes[1] < -ANALOG_THRESHOLD : false
    return isPressed(DPAD_UP_INDEX) || axisUp
  })

  const dpadDown = computed(() => {
    const pad = activeGamepad.value
    const axisDown = pad && pad.axes && pad.axes[1] !== undefined ? pad.axes[1] > ANALOG_THRESHOLD : false
    return isPressed(DPAD_DOWN_INDEX) || axisDown
  })

  const dpadLeft = computed(() => {
    const pad = activeGamepad.value
    const axisLeft = pad && pad.axes && pad.axes[0] !== undefined ? pad.axes[0] < -ANALOG_THRESHOLD : false
    return isPressed(DPAD_LEFT_INDEX) || axisLeft
  })

  const dpadRight = computed(() => {
    const pad = activeGamepad.value
    const axisRight = pad && pad.axes && pad.axes[0] !== undefined ? pad.axes[0] > ANALOG_THRESHOLD : false
    return isPressed(DPAD_RIGHT_INDEX) || axisRight
  })

  const buttonA = computed(() => isPressed(BUTTON_A_INDEX))
  const buttonB = computed(() => isPressed(BUTTON_B_INDEX))
  const buttonX = computed(() => isPressed(BUTTON_X_INDEX))
  const buttonY = computed(() => isPressed(BUTTON_Y_INDEX))
  const start = computed(() => isPressed(BUTTON_START_INDEX))
  const select = computed(() => isPressed(BUTTON_SELECT_INDEX))

  return {
    isSupported,
    isConnected,
    dpadUp,
    dpadDown,
    dpadLeft,
    dpadRight,
    buttonA,
    buttonB,
    buttonX,
    buttonY,
    start,
    select
  }
}
