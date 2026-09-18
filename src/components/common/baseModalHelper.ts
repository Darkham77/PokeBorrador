import {
  MODAL_ANIM_INITIAL_SCALE_MIN,
  MODAL_ANIM_INITIAL_Y_OFFSET
} from '@/logic/constants/animations';

const LARGE_SCREEN_HEIGHT_MIN_PX = 900 as const;
const LARGE_MODAL_HEIGHT_PCT = 80 as const;
const LARGE_MODAL_MAX_HEIGHT_PCT = 90 as const;
const VIEWPORT_CLAMP_MAX_PCT = 95 as const;
const MODAL_FULL_SCREEN_PERCENT = 100 as const;

const LARGE_MODAL_IDS = ['inventory', 'shop', 'bc-shop', 'war-shop', 'market', 'box'] as const;
const LARGE_MODAL_ID_SET: ReadonlySet<string> = new Set(LARGE_MODAL_IDS);

const LARGE_MODAL_MAX_WIDTHS = ['900px', '850px', '800px'] as const;
const LARGE_MODAL_WIDTH_SET: ReadonlySet<string> = new Set(LARGE_MODAL_MAX_WIDTHS);

const SIDE_POSITION_TYPES = ['left', 'right', 'side', 'side-left', 'side-right'] as const;
const SIDE_POSITION_SET: ReadonlySet<string> = new Set(SIDE_POSITION_TYPES);

const STUCK_POSITION_TYPES = ['left', 'right', 'side', 'side-left', 'side-right', 'fullscreen'] as const;
const STUCK_POSITION_SET: ReadonlySet<string> = new Set(STUCK_POSITION_TYPES);

const TYPE_CORNERS_MAP: Record<string, string> = {
  center: 'all',
  top: 'bottom',
  down: 'top',
  left: 'right',
  'side-left': 'right',
  right: 'left',
  'side-right': 'left',
  side: 'left',
  fullscreen: 'none'
};

export interface ModalCardStyleOptions {
  type: string;
  id: string;
  maxWidth: string;
  height: string;
  maxHeight: string;
  accentColor: string;
  disableZoom: boolean;
  disableAutoGrow: boolean;
  appZoom: number;
  positionMode: string;
  windowInnerHeight?: number;
}

export function isLargeModalEligible(id: string, maxWidth: string, disableAutoGrow: boolean): boolean {
  if (disableAutoGrow) return false;
  if (id === 'inventory' && maxWidth === '480px') return false;
  if (LARGE_MODAL_ID_SET.has(id)) return true;
  return LARGE_MODAL_WIDTH_SET.has(maxWidth);
}

export function resolveModalPositionMode(positionMode: string | null, type: string): string {
  if (positionMode) return positionMode;
  return STUCK_POSITION_SET.has(type) ? 'stuck' : 'floating';
}

export function resolveModalCorners(corners: string | null, positionMode: string, type: string): string {
  if (corners) return corners;
  if (positionMode === 'floating') return 'all';
  return TYPE_CORNERS_MAP[type] || 'none';
}

export function resolveModalCardStyles(options: ModalCardStyleOptions): Record<string, string> {
  if (options.type === 'fullscreen') return {};

  const zoomFactor = options.disableZoom ? 1 : (options.appZoom || 1);
  const winHeight = options.windowInnerHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 0);
  const isLargeModal = isLargeModalEligible(options.id, options.maxWidth, options.disableAutoGrow);
  const useLargeScreenRules = isLargeModal && winHeight >= LARGE_SCREEN_HEIGHT_MIN_PX;

  const resolvedHeight = useLargeScreenRules
    ? `${LARGE_MODAL_HEIGHT_PCT / zoomFactor}dvh`
    : options.height;
  const resolvedMaxHeight = useLargeScreenRules
    ? `${LARGE_MODAL_MAX_HEIGHT_PCT / zoomFactor}dvh`
    : options.maxHeight;
  const resolvedMaxWidth = useLargeScreenRules ? '1100px' : options.maxWidth;

  const styles: Record<string, string> = {
    width: '100%',
    maxWidth: `min(${resolvedMaxWidth}, ${VIEWPORT_CLAMP_MAX_PCT / zoomFactor}dvw)`,
    height: resolvedHeight,
    maxHeight: `min(${resolvedMaxHeight}, ${VIEWPORT_CLAMP_MAX_PCT / zoomFactor}dvh)`,
    '--modal-accent': options.accentColor
  };

  if (SIDE_POSITION_SET.has(options.type)) {
    styles.width = `min(${resolvedMaxWidth}, ${VIEWPORT_CLAMP_MAX_PCT / zoomFactor}dvw)`;
    if (options.positionMode === 'stuck') {
      styles.height = `${MODAL_FULL_SCREEN_PERCENT / zoomFactor}dvh`;
      styles.maxHeight = `${MODAL_FULL_SCREEN_PERCENT / zoomFactor}dvh`;
    }
  }

  return styles;
}

export function getModalTweenPosition(type: string, _isEnter: boolean): { x?: string | number; y?: string | number; scale?: number } {
  if (type === 'down') return { y: '100%' };
  if (type === 'top') return { y: '-100%' };
  if (type === 'left' || type === 'side-left') return { x: '-100%' };
  if (type === 'right' || type === 'side-right' || type === 'side') return { x: '100%' };

  return {
    scale: MODAL_ANIM_INITIAL_SCALE_MIN,
    y: MODAL_ANIM_INITIAL_Y_OFFSET
  };
}
