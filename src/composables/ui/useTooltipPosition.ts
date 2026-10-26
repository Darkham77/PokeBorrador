import { ref, type Ref } from 'vue';

const MIN_TOOLTIP_CONTENT_HEIGHT_PX = 40;
const TOOLTIP_CHROME_VERTICAL_PX = 24;
const GAP_PX = 12;
const PADDING_PX = 15;
const DOUBLE_FACTOR = 2;
const DEFAULT_FALLBACK_VIEWPORT_WIDTH_PX = 1000 as const;
const DEFAULT_FALLBACK_VIEWPORT_HEIGHT_PX = 800 as const;

function getEffectiveZoom(tooltipEl?: HTMLElement | null): number {
  if (typeof globalThis.window === 'undefined') return 1;

  if (typeof document !== 'undefined') {
    const rawZoom =
      document.documentElement.style.getPropertyValue('--app-zoom') ||
      globalThis.getComputedStyle(document.documentElement).getPropertyValue('--app-zoom');
    const appZoom = parseFloat(rawZoom);
    if (!Number.isNaN(appZoom) && appZoom > 0) {
      return appZoom;
    }
  }

  if (tooltipEl) {
    const wrapper = tooltipEl.querySelector('.tooltip-animate-wrapper');
    const target = wrapper ?? tooltipEl;
    const computedZoom = parseFloat(globalThis.getComputedStyle(target).zoom);
    if (!Number.isNaN(computedZoom) && computedZoom > 0) {
      return computedZoom;
    }
  }

  return 1;
}

function calculateTooltipMaxHeight(
  pos: string,
  rect: DOMRect,
  viewportHeight: number,
  zoom = 1
): number {
  let availableScreenHeight: number;
  if (pos === 'top') {
    availableScreenHeight = Math.max(0, rect.top - PADDING_PX - GAP_PX);
  } else if (pos === 'bottom') {
    availableScreenHeight = Math.max(0, viewportHeight - rect.bottom - PADDING_PX - GAP_PX);
  } else {
    // 'left' or 'right'
    availableScreenHeight = Math.max(0, viewportHeight - DOUBLE_FACTOR * PADDING_PX);
  }

  const effectiveZoom = zoom > 0 ? zoom : 1;
  const maxWrapperHeight = availableScreenHeight / effectiveZoom;
  const maxContentHeight = Math.floor(maxWrapperHeight - TOOLTIP_CHROME_VERTICAL_PX);

  return Math.max(MIN_TOOLTIP_CONTENT_HEIGHT_PX, maxContentHeight);
}

function resolveFlippedPosition(
  pos: string,
  rect: DOMRect,
  tipRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number
): string {
  const spaceTop = rect.top - PADDING_PX;
  const spaceBottom = viewportHeight - rect.bottom - PADDING_PX;
  const spaceLeft = rect.left - PADDING_PX;
  const spaceRight = viewportWidth - rect.right - PADDING_PX;

  if (pos === 'top' && rect.top - tipRect.height - GAP_PX < PADDING_PX) {
    if (spaceBottom > spaceTop) return 'bottom';
  } else if (
    pos === 'bottom' &&
    rect.bottom + tipRect.height + GAP_PX > viewportHeight - PADDING_PX
  ) {
    if (spaceTop > spaceBottom) return 'top';
  } else if (pos === 'left' && rect.left - tipRect.width - GAP_PX < PADDING_PX) {
    if (spaceRight > spaceLeft) return 'right';
  } else if (pos === 'right' && rect.right + tipRect.width + GAP_PX > viewportWidth - PADDING_PX) {
    if (spaceLeft > spaceRight) return 'left';
  }
  return pos;
}

interface BaseCoordinates {
  readonly top: number;
  readonly left: number;
}

interface NudgeAndArrowResult {
  readonly top: number;
  readonly left: number;
  readonly arrowOffset: { readonly x: number; readonly y: number };
}

export interface UseTooltipPositionReturn {
  readonly coords: Ref<{ top: number; left: number; right: string }>;
  readonly activePosition: Ref<string>;
  readonly arrowOffset: Ref<{ x: number; y: number }>;
  readonly isRightSide: Ref<boolean>;
  readonly maxHeight: Ref<number | null>;
  readonly updatePosition: () => void;
}

function calculateBaseCoordinates(
  pos: string,
  rect: DOMRect,
  triggerCenter: number,
  scrollX: number,
  scrollY: number
): BaseCoordinates {
  if (pos === 'top' || pos === 'bottom') {
    return {
      top: pos === 'top' ? rect.top + scrollY - GAP_PX : rect.bottom + scrollY + GAP_PX,
      left: triggerCenter + scrollX
    };
  }
  if (pos === 'left') {
    return {
      top: rect.top + scrollY + rect.height / 2,
      left: rect.left + scrollX - GAP_PX
    };
  }
  return {
    top: rect.top + scrollY + rect.height / 2,
    left: rect.right + scrollX + GAP_PX
  };
}

function calculateNudgeAndArrow(
  pos: string,
  baseTop: number,
  baseLeft: number,
  tipRect: DOMRect,
  triggerCenter: number,
  scrollX: number,
  scrollY: number,
  viewportWidth: number,
  viewportHeight: number
): NudgeAndArrowResult {
  const anchorX = triggerCenter + scrollX;
  const anchorY = baseTop;

  if (pos === 'top' || pos === 'bottom') {
    const halfWidth = tipRect.width / 2;
    let left = baseLeft;
    if (left - halfWidth < PADDING_PX + scrollX) {
      left = PADDING_PX + scrollX + halfWidth;
    } else if (left + halfWidth > viewportWidth + scrollX - PADDING_PX) {
      left = viewportWidth + scrollX - PADDING_PX - halfWidth;
    }
    return {
      top: baseTop,
      left,
      arrowOffset: { x: anchorX - left, y: 0 }
    };
  }

  const halfHeight = tipRect.height / 2;
  let top = baseTop;
  if (top - halfHeight < PADDING_PX + scrollY) {
    top = PADDING_PX + scrollY + halfHeight;
  } else if (top + halfHeight > viewportHeight + scrollY - PADDING_PX) {
    top = viewportHeight + scrollY - PADDING_PX - halfHeight;
  }
  return {
    top,
    left: baseLeft,
    arrowOffset: { x: 0, y: anchorY - top }
  };
}

export function useTooltipPosition(
  trigger: Ref<HTMLElement | null>,
  tooltip: Ref<HTMLElement | null>,
  position: string
): UseTooltipPositionReturn {
  const coords = ref({ top: 0, left: 0, right: 'auto' });
  const activePosition = ref(position);
  const arrowOffset = ref({ x: 0, y: 0 });
  const isRightSide = ref(false);
  const maxHeight = ref<number | null>(null);

  const updatePosition = (): void => {
    if (!trigger.value || !tooltip.value) return;

    const rect = trigger.value.getBoundingClientRect();
    const tipRect = tooltip.value.getBoundingClientRect();
    const scrollY = typeof globalThis.window !== 'undefined' ? globalThis.scrollY : 0;
    const scrollX = typeof globalThis.window !== 'undefined' ? globalThis.scrollX : 0;
    const viewportWidth =
      typeof globalThis.window !== 'undefined'
        ? globalThis.innerWidth
        : DEFAULT_FALLBACK_VIEWPORT_WIDTH_PX;
    const viewportHeight =
      typeof globalThis.window !== 'undefined'
        ? globalThis.innerHeight
        : DEFAULT_FALLBACK_VIEWPORT_HEIGHT_PX;

    const triggerCenter = rect.left + rect.width / 2;
    isRightSide.value = triggerCenter > viewportWidth / 2;

    const pos = resolveFlippedPosition(position, rect, tipRect, viewportWidth, viewportHeight);
    activePosition.value = pos;

    const base = calculateBaseCoordinates(pos, rect, triggerCenter, scrollX, scrollY);
    const nudged = calculateNudgeAndArrow(
      pos,
      base.top,
      base.left,
      tipRect,
      triggerCenter,
      scrollX,
      scrollY,
      viewportWidth,
      viewportHeight
    );

    const zoom = getEffectiveZoom(tooltip.value);
    arrowOffset.value = nudged.arrowOffset;
    maxHeight.value = calculateTooltipMaxHeight(pos, rect, viewportHeight, zoom);

    coords.value = {
      top: Math.round(nudged.top),
      left: Math.round(nudged.left),
      right: 'auto'
    };
  };

  return {
    coords,
    activePosition,
    arrowOffset,
    isRightSide,
    maxHeight,
    updatePosition
  };
}
