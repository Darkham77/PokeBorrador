import { ref, onMounted, onUnmounted, computed } from 'vue'
import { gameBus } from '@/logic/gameBus'

/**
 * useCombatCamera
 * Implements a dynamic 2D camera system based on docs/architecture/combat_camera.md
 */
export function useCombatCamera(viewportRef) {
  // Constants
  const MAP_WIDTH = 2000
  const MAP_HEIGHT = 2000
  const VISIBLE_UNITS_X = 1000 // Zona de acción pura (0 padding lateral forzado)
  const VISIBLE_UNITS_Y = 1100 // Zona de acción + padding superior (100u)
  const TARGET_X = 1000
  const TARGET_Y = 950 
  const RATIO_MAX = 2.0 
  const RATIO_MIN = 0.5 

  // --- ESCALADO DE OBJETOS (SOLICITADO POR USUARIO) ---
  // Modificar esta constante para regular el tamaño base de TODO en el mundo virtual
  const OBJECT_SCALE = 2 
  const BASE_ENTITY_SIZE = 200 // Tamaño base original antes de aplicar el multiplicador
  const ENTITY_SIZE = BASE_ENTITY_SIZE * OBJECT_SCALE // 400 por defecto

  // Reactive State
  const vpWidth = ref(0)
  const vpHeight = ref(0)
  const camWidth = ref(0)
  const camHeight = ref(0)
  const tx = ref(0)
  const ty = ref(0)
  const scale = ref(1)
  const showGuides = ref(false)

  // Computed Styles
  const cameraStyles = computed(() => ({
    width: `${camWidth.value}px`,
    height: `${camHeight.value}px`,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }))

  const worldStyles = computed(() => ({
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${MAP_WIDTH}px`,
    height: `${MAP_HEIGHT}px`,
    transform: `Translate(${tx.value}px, ${ty.value}px) Scale(${scale.value})`,
    transformOrigin: '0 0',
    willChange: 'transform',
    // Inyectamos la escala de objetos para uso en CSS
    '--obj-scale': OBJECT_SCALE
  }))

  // Entity Styles
  // Player 1: Bottom-Left (Centrado en zona segura 500-1500)
  // X: 500
  // Y: 1500 - ENTITY_SIZE
  const entity1Styles = computed(() => ({
    position: 'absolute',
    left: '500px',
    top: `${1500 - ENTITY_SIZE}px`,
    width: `${ENTITY_SIZE}px`,
    height: `${ENTITY_SIZE}px`
  }))

  // Player 2: Top-Right
  // X: 1500 - ENTITY_SIZE
  // Y: 500
  const entity2Styles = computed(() => ({
    position: 'absolute',
    left: `${1500 - ENTITY_SIZE}px`,
    top: '500px',
    width: `${ENTITY_SIZE}px`,
    height: `${ENTITY_SIZE}px`
  }))

  const updateCamera = (width, height) => {
    if (width <= 0 || height <= 0) return

    let cw = width
    let ch = height
    const ratio = width / height

    if (ratio > RATIO_MAX) {
      cw = height * RATIO_MAX
    } else if (ratio < RATIO_MIN) {
      ch = width / RATIO_MIN
    }

    camWidth.value = cw
    camHeight.value = ch

    const scaleX = cw / VISIBLE_UNITS_X
    const scaleY = ch / VISIBLE_UNITS_Y
    const currentScale = Math.min(scaleX, scaleY)
    scale.value = currentScale

    tx.value = (cw / 2) - (TARGET_X * currentScale)
    ty.value = (ch / 2) - (TARGET_Y * currentScale)
  }

  let resizeObserver = null

  onMounted(() => {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        vpWidth.value = width
        vpHeight.value = height
        updateCamera(width, height)
      }
    })

    if (viewportRef.value) {
      resizeObserver.observe(viewportRef.value)
      const rect = viewportRef.value.getBoundingClientRect()
      updateCamera(rect.width, rect.height)
    }

    gameBus.on('TOGGLE_CAMERA_GUIDES', () => {
      showGuides.value = !showGuides.value
    })
  })

  onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect()
  })

  return {
    cameraStyles,
    worldStyles,
    entity1Styles,
    entity2Styles,
    showGuides,
    scale,
    objectScale: OBJECT_SCALE
  }
}
