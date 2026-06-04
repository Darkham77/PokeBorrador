import { resolveCssColor, parseToRgba, hasVisualBorders } from './hoverHelpers.ts';

export interface HoverContext {
  el: HTMLElement;
  isSubmenuBtn?: boolean;
}

export interface HoverValues {
  scale?: number;
  y?: number;
  x?: number;
  rotation?: number;
  duration?: number;
  ease?: string;
  borderColor?: string | null;
  boxShadow?: string | null;
}

export function getHoverEnterStrategy(el: HTMLElement): HoverValues {
  const isSubmenuBtn = el.closest('.hud-submenu') && el.classList.contains('hud-nav-btn');

  if (isSubmenuBtn) {
    const isWarShop = el.classList.contains('war-shop-nav-btn');
    const colorVar = isWarShop ? 'var(--red)' : 'var(--yellow)';
    const resolvedColor = resolveCssColor(colorVar, el);
    return {
      scale: 1,
      y: 0,
      x: 6,
      duration: 0.15,
      ease: 'power1.out',
      borderColor: resolvedColor,
      boxShadow: `0 0 0 2px ${resolvedColor}, 0 0 15px ${parseToRgba(resolvedColor, 0.3, el)}`
    };
  }

  if (el.classList.contains('hud-nav-btn')) {
    const yellowResolved = resolveCssColor('var(--yellow)', el);
    return {
      scale: 1.03,
      y: -1.5,
      duration: 0.15,
      borderColor: yellowResolved,
      boxShadow: `0 0 0 2px ${yellowResolved}, 0 0 15px ${parseToRgba(yellowResolved, 0.4, el)}`
    };
  }

  if (el.classList.contains('pc-banner')) {
    const hasEventYellow = el.classList.contains('event-banner') && el.classList.contains('active');
    const borderColor = hasEventYellow ? resolveCssColor('var(--yellow)', el) : 'rgba(255, 255, 255, 0.2)';
    return {
      scale: 1,
      x: 4,
      y: 0,
      duration: 0.2,
      ease: 'power2.out',
      borderColor,
      boxShadow: 'none'
    };
  }

  if (el.classList.contains('quick-item-card')) {
    const yellowResolved = resolveCssColor('var(--yellow)', el);
    const glow80 = parseToRgba(yellowResolved, 0.2, el);
    const glow70 = parseToRgba(yellowResolved, 0.3, el);
    return {
      scale: 1.02,
      y: -4,
      duration: 0.2,
      ease: 'power2.out',
      borderColor: yellowResolved,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow80}, 0 0 20px ${glow70}`
    };
  }

  if (el.classList.contains('btn-catch-ball')) {
    return {
      scale: 1.1,
      rotation: 5,
      y: 0,
      duration: 0.25,
      ease: 'back.out(1.7)'
    };
  }

  if (
    el.classList.contains('egg-hud-card') || 
    el.classList.contains('egg-card') ||
    el.classList.contains('pokemon-display-card') || 
    el.classList.contains('box-pokemon-card') || 
    el.classList.contains('team-swap-card') ||
    el.classList.contains('pokemon-summary-card') ||
    el.classList.contains('unified-card') ||
    el.classList.contains('list-item') ||
    el.classList.contains('gym-card') ||
    el.classList.contains('inventory-item-card')
  ) {
    const color = el.classList.contains('gym-card')
      ? 'var(--red)'
      : (el.style.getPropertyValue('--tier-color') || 'var(--blue)');
    const resolvedColor = resolveCssColor(color, el);
    const glow80 = parseToRgba(resolvedColor, 0.2, el);
    const glow70 = parseToRgba(resolvedColor, 0.3, el);
    return {
      scale: 1.02,
      y: -3,
      duration: 0.2,
      ease: 'power2.out',
      borderColor: resolvedColor,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow80}, 0 0 20px ${glow70}`
    };
  }

  if (el.classList.contains('shop-item-card') || el.classList.contains('market-item-wrapper')) {
    const yellowResolved = resolveCssColor('var(--yellow)', el);
    const glow10 = parseToRgba(yellowResolved, 0.1, el);
    const glow15 = parseToRgba(yellowResolved, 0.15, el);
    return {
      scale: 1.02,
      y: -6,
      duration: 0.25,
      ease: 'power2.out',
      borderColor: yellowResolved,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow10}, 0 0 20px ${glow15}`
    };
  }

  if (el.classList.contains('bc-shop-item-card')) {
    const purpleColor = '#c084fc';
    const glow10 = parseToRgba(purpleColor, 0.1, el);
    const glow15 = parseToRgba(purpleColor, 0.15, el);
    return {
      scale: 1.02,
      y: -6,
      duration: 0.25,
      ease: 'power2.out',
      borderColor: purpleColor,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow10}, 0 0 20px ${glow15}`
    };
  }

  if (el.classList.contains('friend-card') || el.classList.contains('map-row')) {
    return { scale: 1, y: 0, x: 4, duration: 0.2, ease: 'power2.out' };
  }

  if (el.classList.contains('hud-pill')) {
    return { scale: 1.03, y: -1.5, duration: 0.15 };
  }

  if (el.classList.contains('trainer-avatar-container')) {
    return { scale: 1.1, y: -2, duration: 0.2, ease: 'power2.out' };
  }

  if (el.classList.contains('badge-icon')) {
    return { scale: 1.3, y: 0, duration: 0.12, ease: 'power1.out' };
  }

  if (el.classList.contains('main-sprite')) {
    return { scale: 1.05, y: -5, duration: 0.2, ease: 'power2.out' };
  }

  if (el.classList.contains('edit-nick-btn')) {
    return { scale: 1.2, y: 0, duration: 0.12, ease: 'power1.out' };
  }

  if (el.classList.contains('upd-tab-btn')) {
    if (el.classList.contains('active')) return {};
    return { scale: 1, y: -1.5, duration: 0.12, ease: 'power1.out' };
  }

  if (el.classList.contains('info-item')) {
    const typeColor = el.style.getPropertyValue('--type-color') || 'var(--type-color)';
    const resolvedColor = resolveCssColor(typeColor, el);
    const glowColor = parseToRgba(resolvedColor, 0.25, el);
    return {
      scale: 1.02,
      y: -2.5,
      duration: 0.15,
      ease: 'power1.out',
      borderColor: resolvedColor,
      boxShadow: `0 10px 20px rgba(0, 0, 0, 0.3), 0 0 12px ${glowColor}`
    };
  }

  return {};
}

export function getHoverLeaveStrategy(el: HTMLElement) {
  const hasBorders = hasVisualBorders(el);

  let targetBorderColor: string | null = null;
  let targetBoxShadow: string | null = null;

  if (hasBorders) {
    targetBorderColor = 'rgba(255, 255, 255, 0.12)';
    targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)';

    if (
      el.classList.contains('pokemon-display-card') ||
      el.classList.contains('box-pokemon-card') ||
      el.classList.contains('team-swap-card') ||
      el.classList.contains('pokemon-summary-card') ||
      el.classList.contains('unified-card')
    ) {
      const tierColor = el.style.getPropertyValue('--tier-color') || 'rgba(255, 255, 255, 0.12)';
      const resolvedTierColor = resolveCssColor(tierColor, el);
      
      if (el.classList.contains('is-active')) {
        targetBorderColor = resolvedTierColor;
        targetBoxShadow = `0 0 20px ${parseToRgba(resolvedTierColor, 0.4, el)}, inset 0 0 10px ${parseToRgba(resolvedTierColor, 0.2, el)}`;
      } else if (el.classList.contains('selected')) {
        const blueResolved = resolveCssColor('var(--blue)', el);
        targetBorderColor = blueResolved;
        targetBoxShadow = `inset 0 0 0 4px ${blueResolved}, 0 0 20px ${parseToRgba(blueResolved, 0.4, el)}`;
      } else {
        targetBorderColor = resolvedTierColor;
        targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)';
      }
    } else if (el.classList.contains('pc-banner')) {
      if (el.classList.contains('event-banner') && el.classList.contains('active')) {
        targetBorderColor = resolveCssColor('rgba(255, 214, 10, 0.8)', el);
        targetBoxShadow = '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 214, 10, 0.25)';
      } else {
        targetBorderColor = 'rgba(255, 255, 255, 0.08)';
        targetBoxShadow = 'none';
      }
    } else if (el.classList.contains('quick-item-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.1)';
      targetBoxShadow = 'none';
    } else if (el.classList.contains('active')) {
      if (el.classList.contains('hud-nav-btn')) {
        const yellowResolved = resolveCssColor('var(--yellow)', el);
        targetBorderColor = yellowResolved;
        targetBoxShadow = `0 0 0 2px ${yellowResolved}, 0 0 30px ${parseToRgba(yellowResolved, 0.45, el)}, inset 0 0 12px ${parseToRgba(yellowResolved, 0.1, el)}`;
      }
    } else if (el.classList.contains('hud-nav-btn')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)';
      targetBoxShadow = '0 6px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)';
    } else if (el.classList.contains('inventory-item-card')) {
      if (el.classList.contains('tier-rare')) targetBorderColor = 'rgba(59, 130, 246, 0.2)';
      else if (el.classList.contains('tier-epic')) targetBorderColor = 'rgba(168, 85, 247, 0.2)';
      else if (el.classList.contains('tier-legend')) targetBorderColor = 'rgba(245, 158, 11, 0.2)';
      else targetBorderColor = 'rgba(255, 255, 255, 0.05)';
      targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)';
    } else if (el.classList.contains('gym-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)';
      targetBoxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else if (el.classList.contains('egg-hud-card')) {
      if (el.classList.contains('is-ready')) {
        targetBorderColor = 'rgba(34, 197, 94, 0.3)';
        targetBoxShadow = '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 12px rgba(34, 197, 94, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.06)';
      } else {
        targetBorderColor = 'rgba(255, 255, 255, 0.08)';
        targetBoxShadow = '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.06)';
      }
    } else if (el.classList.contains('egg-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)';
      targetBoxShadow = '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 1px rgba(255, 255, 255, 0.06)';
    } else if (el.classList.contains('shop-item-card') || el.classList.contains('market-item-wrapper')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)';
      targetBoxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    } else if (el.classList.contains('bc-shop-item-card')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)';
      targetBoxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
    } else if (el.classList.contains('info-item')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.05)';
      targetBoxShadow = 'inset 0 1px 1px rgba(255, 255, 255, 0.05)';
    }
  }

  return { targetBorderColor, targetBoxShadow };
}
