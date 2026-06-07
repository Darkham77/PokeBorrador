import { ref, computed, type Ref } from 'vue'
import { gsap } from 'gsap'

interface CameraOptions {
  viewportRef: Ref<HTMLElement | null>
  canvasRef: Ref<HTMLElement | null>
  canvasWidth: number
  canvasHeight: number
}

/**
 * Composable that manages a GSAP-powered 2D camera for the adventure map canvas.
 * Provides smooth panning via `centerOnNode()` and manual drag-to-pan.
 */
export function useAdventureCamera(options: CameraOptions) {
  const { viewportRef, canvasWidth, canvasHeight } = options

  const cameraX = ref(0)
  const cameraY = ref(0)
  const cameraScale = ref(1)
  let cameraTween: gsap.core.Tween | null = null

  // Drag state
  const isDragging = ref(false)
  let dragStartX = 0
  let dragStartY = 0
  let dragCamStartX = 0
  let dragCamStartY = 0

  const canvasTransform = computed(() => ({
    x: cameraX.value,
    y: cameraY.value,
    scale: cameraScale.value,
  }))

  /**
   * Center the camera on a specific pixel coordinate in canvas space.
   * Uses GSAP for smooth animation.
   */
  function centerOnPoint(targetX: number, targetY: number, duration = 0.8) {
    const vp = viewportRef.value
    if (!vp) return

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight

    const scale = cameraScale.value
    const scaledW = canvasWidth * scale
    const scaledH = canvasHeight * scale

    // Target camera position: center the scaled point in the viewport
    const newX = -(targetX * scale - vpW / 2)
    const newY = -(targetY * scale - vpH / 2)

    // Clamp to canvas bounds. If canvas is smaller than viewport, center it.
    let clampedX, clampedY
    if (scaledW <= vpW) {
      clampedX = (vpW - scaledW) / 2
    } else {
      const minX = -(scaledW - vpW)
      clampedX = Math.max(minX, Math.min(0, newX))
    }

    if (scaledH <= vpH) {
      clampedY = (vpH - scaledH) / 2
    } else {
      const minY = -(scaledH - vpH)
      clampedY = Math.max(minY, Math.min(0, newY))
    }

    if (cameraTween) {
      cameraTween.kill()
    }

    const state = { x: cameraX.value, y: cameraY.value }

    cameraTween = gsap.to(state, {
      x: clampedX,
      y: clampedY,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        cameraX.value = state.x
        cameraY.value = state.y
      },
    })
  }

  /**
   * Instantly set camera position without animation.
   */
  function jumpToPoint(targetX: number, targetY: number) {
    const vp = viewportRef.value
    if (!vp) return

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight

    const scale = cameraScale.value
    const scaledW = canvasWidth * scale
    const scaledH = canvasHeight * scale

    const newX = -(targetX * scale - vpW / 2)
    const newY = -(targetY * scale - vpH / 2)

    let clampedX, clampedY
    if (scaledW <= vpW) {
      clampedX = (vpW - scaledW) / 2
    } else {
      const minX = -(scaledW - vpW)
      clampedX = Math.max(minX, Math.min(0, newX))
    }

    if (scaledH <= vpH) {
      clampedY = (vpH - scaledH) / 2
    } else {
      const minY = -(scaledH - vpH)
      clampedY = Math.max(minY, Math.min(0, newY))
    }

    cameraX.value = clampedX
    cameraY.value = clampedY
  }

  // ─── Drag-to-Pan ───
  function onPointerDown(e: PointerEvent) {
    isDragging.value = true
    dragStartX = e.clientX
    dragStartY = e.clientY
    dragCamStartX = cameraX.value
    dragCamStartY = cameraY.value

    if (cameraTween) {
      cameraTween.kill()
      cameraTween = null
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return
    const vp = viewportRef.value
    if (!vp) return

    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY

    const vpW = vp.clientWidth
    const vpH = vp.clientHeight
    const scale = cameraScale.value
    const scaledW = canvasWidth * scale
    const scaledH = canvasHeight * scale
    
    let clampedX, clampedY
    if (scaledW <= vpW) {
      clampedX = (vpW - scaledW) / 2
    } else {
      const minX = -(scaledW - vpW)
      clampedX = Math.max(minX, Math.min(0, dragCamStartX + dx))
    }

    if (scaledH <= vpH) {
      clampedY = (vpH - scaledH) / 2
    } else {
      const minY = -(scaledH - vpH)
      clampedY = Math.max(minY, Math.min(0, dragCamStartY + dy))
    }

    cameraX.value = clampedX
    cameraY.value = clampedY
  }

  function onPointerUp() {
    isDragging.value = false
  }  function zoomIn(getTarget?: () => { x: number, y: number } | undefined) {
    const targetScale = Math.min(cameraScale.value + 0.25, 2)
    if (cameraScale.value === targetScale) return
    const target = getTarget ? getTarget() : null
    gsap.to(cameraScale, {
      value: targetScale,
      duration: 0.3,
      onUpdate: () => {
        if (target) jumpToPoint(target.x, target.y)
      }
    })
  }

  function zoomOut(getTarget?: () => { x: number, y: number } | undefined) {
    const targetScale = Math.max(cameraScale.value - 0.25, 0.25)
    if (cameraScale.value === targetScale) return
    const target = getTarget ? getTarget() : null
    gsap.to(cameraScale, {
      value: targetScale,
      duration: 0.3,
      onUpdate: () => {
        if (target) jumpToPoint(target.x, target.y)
      }
    })
  }

  return {
    cameraX,
    cameraY,
    cameraScale,
    canvasTransform,
    isDragging,
    centerOnPoint,
    jumpToPoint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    zoomIn,
    zoomOut
  }
}
