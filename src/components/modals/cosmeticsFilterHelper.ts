export const UNLOCK_MIN_CLASS_LEVEL = 25 as const;

const _SHAPE_FILTER_OPTIONS = ['all', 'circular', 'square'] as const;
export type ShapeFilterOption = (typeof _SHAPE_FILTER_OPTIONS)[number];

export interface LockableCosmeticStyle {
  id: string;
  name?: string;
  class?: string;
  requiredRole?: string;
  requiredClass?: string;
  requiredFaction?: string;
}

export interface CosmeticPlayerContext {
  playerClass?: string | null;
  classLevel?: number | null;
  trainerLevel?: number | null;
  faction?: string | null;
  isAdmin: boolean;
}

export function isCosmeticStyleLocked(
  style: LockableCosmeticStyle,
  ctx: CosmeticPlayerContext
): boolean {
  if (style.requiredRole === 'admin' && !ctx.isAdmin) {
    return true;
  }
  if (style.requiredClass) {
    if (ctx.playerClass !== style.requiredClass) {
      return true;
    }
    const currentLevel = Math.max(ctx.classLevel || 1, ctx.trainerLevel || 1);
    if (currentLevel < UNLOCK_MIN_CLASS_LEVEL) {
      return true;
    }
  }
  if (style.requiredFaction && ctx.faction !== style.requiredFaction) {
    return true;
  }
  return false;
}

export function resolveCosmeticLockNotification(
  style: LockableCosmeticStyle,
  itemType: 'marco' | 'estilo',
  ctx: CosmeticPlayerContext
): string | null {
  if (!isCosmeticStyleLocked(style, ctx)) return null;

  if (style.requiredRole) {
    return `Este ${itemType} es exclusivo para Administradores`;
  }
  if (style.requiredClass) {
    const className = style.requiredClass.toUpperCase();
    if (ctx.playerClass !== style.requiredClass) {
      return `Este ${itemType} es exclusivo para la profesión ${className}`;
    }
    return `Este ${itemType} requiere profesión ${className} Nivel ${UNLOCK_MIN_CLASS_LEVEL}`;
  }
  if (style.requiredFaction) {
    const factionName = style.requiredFaction === 'union' ? 'UNIÓN' : 'PODER';
    return `Este ${itemType} es exclusivo para miembros del Team ${factionName}`;
  }
  return null;
}

export function filterAvatarStylesByShape<T extends { class: string }>(
  styles: readonly T[],
  shape: ShapeFilterOption
): readonly T[] {
  if (shape === 'circular') {
    return styles.filter(s => !s.class.includes('sq'));
  }
  if (shape === 'square') {
    return styles.filter(s => s.class.includes('sq'));
  }
  return styles;
}

export function checkIsLocalEnvironment(isDev: boolean, hostname?: string): boolean {
  if (isDev) return true;
  if (!hostname) return false;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local');
}

export function formatCosmeticRequirement(style: LockableCosmeticStyle): string {
  if (style.requiredRole) return 'ADMIN';
  if (style.requiredClass) return `${style.requiredClass.toUpperCase()} (NIVEL ${UNLOCK_MIN_CLASS_LEVEL})`;
  if (style.requiredFaction) return `TEAM ${style.requiredFaction.toUpperCase()}`;
  return '';
}
