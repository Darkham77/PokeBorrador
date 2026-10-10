/**
 * test_aventura/logic/utils/svgCoordinateUtils.ts
 *
 * SVG SCREEN-TO-VIEWBOX COORDINATE TRANSFORMATION UTILITY
 * Decouples matrix inversion and bounding client rect projections from Vue components.
 */

export interface SvgCoordinateBounds {
  readonly width: number;
  readonly height: number;
}

/**
 * Transforms screen client coordinates into SVG viewBox pixel coordinates.
 */
export function screenToSvgCoords(
  e: PointerEvent,
  svg: SVGSVGElement | null,
  bounds: SvgCoordinateBounds
): { x: number; y: number } {
  if (!svg) return { x: 0, y: 0 };
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const inverted = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.max(0, Math.min(bounds.width, inverted.x)),
      y: Math.max(0, Math.min(bounds.height, inverted.y))
    };
  }
  const rect = svg.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(bounds.width, ((e.clientX - rect.left) / rect.width) * bounds.width)),
    y: Math.max(0, Math.min(bounds.height, ((e.clientY - rect.top) / rect.height) * bounds.height))
  };
}

export interface ViewportWheelZoomParams {
  readonly event: WheelEvent;
  readonly viewportElement: HTMLElement;
  readonly currentZoom: number;
  readonly currentPanX: number;
  readonly currentPanY: number;
  readonly zoomInStep: number;
  readonly zoomOutStep: number;
  readonly minZoom: number;
  readonly maxZoom: number;
}

/**
 * Computes updated zoom and cursor-anchored pan offsets for scroll-wheel viewport zooming.
 */
export function computeViewportWheelZoom(params: ViewportWheelZoomParams): {
  readonly nextZoom: number;
  readonly newPanX: number;
  readonly newPanY: number;
} {
  const rect = params.viewportElement.getBoundingClientRect();
  const cursorX = params.event.clientX - rect.left;
  const cursorY = params.event.clientY - rect.top;

  const zoomFactor = params.event.deltaY < 0 ? params.zoomInStep : params.zoomOutStep;
  const nextZoom = Math.max(params.minZoom, Math.min(params.maxZoom, params.currentZoom * zoomFactor));

  const newPanX = cursorX - (cursorX - params.currentPanX) * (nextZoom / params.currentZoom);
  const newPanY = cursorY - (cursorY - params.currentPanY) * (nextZoom / params.currentZoom);

  return { nextZoom, newPanX, newPanY };
}

