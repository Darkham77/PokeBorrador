import { ref, onMounted, onUnmounted, computed, watch, type CSSProperties, type Ref } from 'vue'
import { gameBus } from '@/logic/gameBus'
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator'
import { useBattleStore } from '@/stores/battle'

/**
 * useCombatCamera
 * Implements a dynamic 2D camera system based on docs/architecture/combat_camera.md
 */
export function useCombatCamera(viewportRef: Ref<HTMLElement | null>) {
  const battleStore = useBattleStore()
  // Reactive State
  const vpWidth = ref(0)
  const vpHeight = ref(0)
  const camWidth = ref(0)
  const camHeight = ref(0)
  const tx = ref(0)
  const ty = ref(0)
  const scale = ref(1)

  const showGuides = computed(() => battleStore.debugShowGuides)
  const debugZoom = computed(() => battleStore.debugZoom)

  watch(debugZoom, () => {
    if (viewportRef.value) {
      const rect = viewportRef.value.getBoundingClientRect()
      updateCamera(rect.width, rect.height)
    }
  })

  // Computed Styles
  const cameraStyles = computed<CSSProperties>(() => ({
    width: `${camWidth.value}px`,
    height: `${camHeight.value}px`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
    backgroundColor: '#000',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const
  }))

  const worldStyles = computed<CSSProperties & Record<string, string | number>>(() => ({
    position: 'absolute' as const,
    top: '0',
    left: '0',
    width: `${WORLD_CONSTANTS.MAP_WIDTH}px`,
    height: `${WORLD_CONSTANTS.MAP_HEIGHT}px`,
    transform: `Translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
    transformOrigin: '0 0',
    willChange: 'transform',
    // Inyectamos escalas estandarizadas para uso en CSS
    '--obj-scale': WORLD_CONSTANTS.OBJECT_SCALE,
    '--bush-size': WORLD_CONSTANTS.BUSH_SIZE,
    '--preview-size': WORLD_CONSTANTS.PREVIEW_SIZE
  }))

  const updateCamera = (width: number, height: number) => {
    // Filtro de Estabilidad: Ignoramos dimensiones nulas o valores de inicialización del navegador (0 o window.innerWidth exacto si no es fullscreen)
    if (!width || !height || width < 100 || height < 100) return

    let cw = width
    let ch = height

    // Mantener la proporción dentro de los límites del manual
    const ratio = cw / ch
    if (ratio > WORLD_CONSTANTS.RATIO_MAX) {
      cw = ch * WORLD_CONSTANTS.RATIO_MAX
    } else if (ratio < WORLD_CONSTANTS.RATIO_MIN) {
      ch = cw / WORLD_CONSTANTS.RATIO_MIN
    }

    camWidth.value = cw
    camHeight.value = ch

    // Cálculo de escala basado estrictamente en el manual (VisibleX/Y)
    const scaleX = cw / WORLD_CONSTANTS.VISIBLE_UNITS_X
    const scaleY = ch / WORLD_CONSTANTS.VISIBLE_UNITS_Y
    const currentScale = Math.min(scaleX, scaleY) * debugZoom.value
    scale.value = currentScale

    // Focal Point (Bottom-Alignment Centering)
    // El desplazamiento Tx/Ty centra el TARGET_X/Y del coordinador en el centro del viewport físico
    tx.value = (cw / 2) - (WORLD_CONSTANTS.TARGET_X * currentScale)
    ty.value = (ch / 2) - (WORLD_CONSTANTS.TARGET_Y * currentScale)
  }

  let resizeObserver: ResizeObserver | null = null
  let onToggleGuides: () => void
  let onToggleZoom: () => void

  onMounted(() => {
    resizeObserver = new ResizeObserver((entries) => {
      requestAnimationFrame(() => {
        if (!resizeObserver) return // Safety check if unmounted
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          vpWidth.value = width
          vpHeight.value = height
          updateCamera(width, height)
        }
      })
    })

    if (viewportRef.value) {
      resizeObserver.observe(viewportRef.value)
      const rect = viewportRef.value.getBoundingClientRect()
      updateCamera(rect.width, rect.height)
    }

    onToggleGuides = () => {
      battleStore.debugShowGuides = !battleStore.debugShowGuides
    }

    onToggleZoom = () => {
      battleStore.debugZoom = battleStore.debugZoom === 1 ? 0.4 : 1
      if (viewportRef.value) {
        const rect = viewportRef.value.getBoundingClientRect()
        updateCamera(rect.width, rect.height)
      }
    }

    gameBus.on('TOGGLE_CAMERA_GUIDES', onToggleGuides)
    gameBus.on('TOGGLE_DEBUG_ZOOM', onToggleZoom)
  })

  onUnmounted(() => {
    if (resizeObserver) resizeObserver.disconnect()
    if (onToggleGuides) gameBus.off('TOGGLE_CAMERA_GUIDES', onToggleGuides)
    if (onToggleZoom) gameBus.off('TOGGLE_DEBUG_ZOOM', onToggleZoom)
  })

  return {
    cameraStyles,
    worldStyles,
    showGuides,
    scale,
    objectScale: WORLD_CONSTANTS.OBJECT_SCALE
  }
}
