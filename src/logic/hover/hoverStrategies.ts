import { resolveCssColor, parseToRgba, hasVisualBorders } from './hoverHelpers.ts';
import { HOVER_STRATEGIES } from '@/logic/constants/animations';

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
      x: HOVER_STRATEGIES.SUBMENU_X_OFFSET,
      duration: HOVER_STRATEGIES.SUBMENU_DURATION_SEC,
      ease: 'power1.out',
      borderColor: resolvedColor,
      boxShadow: `0 0 0 2px ${resolvedColor}, 0 0 15px ${parseToRgba(resolvedColor, 0.3, el)}`
    };
  }

  if (el.classList.contains('hud-nav-btn')) {
    const yellowResolved = resolveCssColor('var(--yellow)', el);
    return {
      scale: HOVER_STRATEGIES.HUD_NAV_SCALE,
      y: HOVER_STRATEGIES.HUD_NAV_Y_OFFSET,
      duration: HOVER_STRATEGIES.HUD_NAV_DURATION_SEC,
      borderColor: yellowResolved,
      boxShadow: `0 0 0 2px ${yellowResolved}, 0 0 15px ${parseToRgba(yellowResolved, 0.4, el)}`
    };
  }

  if (el.classList.contains('hud-sq-btn')) {
    const yellowResolved = resolveCssColor('var(--yellow)', el);
    const glow20 = parseToRgba(yellowResolved, 0.2, el);
    const glow30 = parseToRgba(yellowResolved, 0.3, el);
    return {
      scale: HOVER_STRATEGIES.HUD_SQ_SCALE,
      y: HOVER_STRATEGIES.HUD_SQ_Y_OFFSET,
      duration: HOVER_STRATEGIES.HUD_SQ_DURATION_SEC,
      ease: 'power1.out',
      borderColor: yellowResolved,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow20}, 0 0 20px ${glow30}`
    };
  }

  if (el.classList.contains('pokecenter-banner')) {
    if (el.classList.contains('on-cooldown')) return { scale: 1, y: 0, duration: HOVER_STRATEGIES.HUD_NAV_DURATION_SEC };
    const yellowResolved = resolveCssColor('var(--yellow)', el);
    const glow20 = parseToRgba(yellowResolved, 0.2, el);
    const glow30 = parseToRgba(yellowResolved, 0.3, el);
    return {
      scale: HOVER_STRATEGIES.POKECENTER_BANNER_SCALE,
      y: HOVER_STRATEGIES.POKECENTER_BANNER_Y_OFFSET,
      duration: HOVER_STRATEGIES.POKECENTER_BANNER_DURATION_SEC,
      ease: 'power2.out',
      borderColor: yellowResolved,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow20}, 0 0 20px ${glow30}`
    };
  }

  if (el.classList.contains('pc-banner')) {
    const yellowResolved = resolveCssColor('var(--yellow)', el);
    const glow20 = parseToRgba(yellowResolved, 0.2, el);
    const glow30 = parseToRgba(yellowResolved, 0.3, el);
    return {
      scale: HOVER_STRATEGIES.PC_BANNER_SCALE,
      y: HOVER_STRATEGIES.PC_BANNER_Y_OFFSET,
      duration: HOVER_STRATEGIES.PC_BANNER_DURATION_SEC,
      ease: 'power2.out',
      borderColor: yellowResolved,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow20}, 0 0 20px ${glow30}`
    };
  }

  if (el.classList.contains('quick-item-card')) {
    const color = el.style.getPropertyValue('--tier-color') || 
                  (el.classList.contains('tier-rare') ? 'rgba(59, 130, 246, 0.85)' :
                   el.classList.contains('tier-epic') ? 'rgba(168, 85, 247, 0.85)' :
                   el.classList.contains('tier-legend') ? 'rgba(245, 158, 11, 0.95)' :
                   'rgba(255, 255, 255, 0.35)');
    const resolvedColor = resolveCssColor(color, el);
    const glow80 = parseToRgba(resolvedColor, 0.2, el);
    const glow70 = parseToRgba(resolvedColor, 0.3, el);
    return {
      scale: HOVER_STRATEGIES.PC_BANNER_SCALE,
      y: HOVER_STRATEGIES.PC_BANNER_Y_OFFSET,
      duration: HOVER_STRATEGIES.PC_BANNER_DURATION_SEC,
      ease: 'power2.out',
      borderColor: resolvedColor,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow80}, 0 0 20px ${glow70}`
    };
  }

  if (el.classList.contains('btn-catch-ball')) {
    return {
      scale: HOVER_STRATEGIES.CATCH_BALL_SCALE,
      rotation: HOVER_STRATEGIES.CATCH_BALL_ROTATION_DEG,
      y: 0,
      duration: HOVER_STRATEGIES.CATCH_BALL_DURATION_SEC,
      ease: 'back.out(1.7)'
    };
  }

  if (el.classList.contains('inventory-item-card')) {
    const color = el.style.getPropertyValue('--tier-color') || 'rgba(148, 163, 184, 0.45)';
    const resolvedColor = resolveCssColor(color, el);
    const glow80 = parseToRgba(resolvedColor, 0.2, el);
    const glow70 = parseToRgba(resolvedColor, 0.35, el);
    return {
      scale: HOVER_STRATEGIES.INVENTORY_ITEM_SCALE,
      y: HOVER_STRATEGIES.INVENTORY_ITEM_Y_OFFSET,
      duration: HOVER_STRATEGIES.INVENTORY_ITEM_DURATION_SEC,
      ease: 'power2.out',
      borderColor: resolvedColor,
      boxShadow: `0 0 16px ${glow70}, inset 0 0 0 1px ${resolvedColor}, inset 0 0 10px ${glow80}`
    };
  }

  if (
    el.classList.contains('box-pokemon-card') ||
    el.classList.contains('pokemon-display-card') ||
    el.classList.contains('team-swap-card') ||
    el.classList.contains('pokemon-summary-card') ||
    el.classList.contains('unified-card') ||
    el.classList.contains('list-item') ||
    el.classList.contains('gym-card')
  ) {
    const color = el.classList.contains('gym-card')
      ? 'var(--red)'
      : (el.style.getPropertyValue('--tier-color') || 'var(--blue)');
    const resolvedColor = resolveCssColor(color, el);
    const glow80 = parseToRgba(resolvedColor, 0.2, el);
    const glow70 = parseToRgba(resolvedColor, 0.3, el);
    return {
      scale: HOVER_STRATEGIES.CARD_SCALE,
      y: HOVER_STRATEGIES.CARD_Y_OFFSET,
      duration: HOVER_STRATEGIES.CARD_DURATION_SEC,
      ease: 'power2.out',
      borderColor: resolvedColor,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow80}, 0 0 20px ${glow70}`
    };
  }

  if (
    el.classList.contains('shop-item-card') || 
    el.classList.contains('bc-shop-item-card') || 
    el.classList.contains('war-shop-item-card') || 
    el.classList.contains('market-item-wrapper')
  ) {
    const color = el.style.getPropertyValue('--tier-color') || 
                  (el.classList.contains('tier-rare') ? 'rgba(59, 130, 246, 0.85)' :
                   el.classList.contains('tier-epic') ? 'rgba(168, 85, 247, 0.85)' :
                   el.classList.contains('tier-legend') ? 'rgba(245, 158, 11, 0.95)' :
                   'rgba(148, 163, 184, 0.45)');
    const resolvedColor = resolveCssColor(color, el);
    const glow80 = parseToRgba(resolvedColor, 0.2, el);
    const glow70 = parseToRgba(resolvedColor, 0.3, el);
    return {
      scale: HOVER_STRATEGIES.SHOP_CARD_SCALE,
      y: HOVER_STRATEGIES.SHOP_CARD_Y_OFFSET,
      duration: HOVER_STRATEGIES.SHOP_CARD_DURATION_SEC,
      ease: 'power2.out',
      borderColor: resolvedColor,
      boxShadow: `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow80}, 0 0 20px ${glow70}`
    };
  }

  if (el.classList.contains('trainer-card') || el.classList.contains('friend-card') || el.classList.contains('map-row')) {
    const isPending = el.classList.contains('pending');
    const border = isPending ? 'rgba(157, 78, 221, 0.45)' : 'rgba(255, 255, 255, 0.3)';
    return { scale: 1, y: 0, x: HOVER_STRATEGIES.ROW_X_OFFSET, duration: HOVER_STRATEGIES.ROW_DURATION_SEC, ease: 'power2.out', borderColor: border };
  }

  if (el.classList.contains('hud-pill')) {
    return { scale: HOVER_STRATEGIES.HUD_PILL_SCALE, y: HOVER_STRATEGIES.HUD_PILL_Y_OFFSET, duration: HOVER_STRATEGIES.HUD_PILL_DURATION_SEC };
  }

  if (el.classList.contains('trainer-avatar-container')) {
    return { scale: HOVER_STRATEGIES.AVATAR_CONTAINER_SCALE, y: HOVER_STRATEGIES.AVATAR_CONTAINER_Y_OFFSET, duration: HOVER_STRATEGIES.AVATAR_CONTAINER_DURATION_SEC, ease: 'power2.out' };
  }

  if (el.classList.contains('badge-icon')) {
    return { scale: HOVER_STRATEGIES.BADGE_ICON_SCALE, y: 0, duration: HOVER_STRATEGIES.BADGE_ICON_DURATION_SEC, ease: 'power1.out' };
  }

  if (el.classList.contains('main-sprite')) {
    return { scale: HOVER_STRATEGIES.MAIN_SPRITE_SCALE, y: HOVER_STRATEGIES.MAIN_SPRITE_Y_OFFSET, duration: HOVER_STRATEGIES.MAIN_SPRITE_DURATION_SEC, ease: 'power2.out' };
  }

  if (el.classList.contains('edit-nick-btn')) {
    return { scale: HOVER_STRATEGIES.EDIT_NICK_SCALE, y: 0, duration: HOVER_STRATEGIES.EDIT_NICK_DURATION_SEC, ease: 'power1.out' };
  }

  if (el.classList.contains('upd-tab-btn')) {
    if (el.classList.contains('active')) return {};
    return { scale: 1, y: HOVER_STRATEGIES.HUD_NAV_Y_OFFSET, duration: HOVER_STRATEGIES.EDIT_NICK_DURATION_SEC, ease: 'power1.out' };
  }

  if (el.classList.contains('info-item')) {
    const typeColor = el.style.getPropertyValue('--type-color') || 'var(--type-color)';
    const resolvedColor = resolveCssColor(typeColor, el);
    const glowColor = parseToRgba(resolvedColor, 0.25, el);
    return {
      scale: HOVER_STRATEGIES.INFO_ITEM_SCALE,
      y: HOVER_STRATEGIES.INFO_ITEM_Y_OFFSET,
      duration: HOVER_STRATEGIES.INFO_ITEM_DURATION_SEC,
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
    if (el.classList.contains('trainer-card')) {
      const isPending = el.classList.contains('pending');
      targetBorderColor = isPending ? 'rgba(157, 78, 221, 0.25)' : 'rgba(255, 255, 255, 0.1)';
      targetBoxShadow = null;
      return { targetBorderColor, targetBoxShadow };
    }

    targetBorderColor = 'rgba(255, 255, 255, 0.12)';
    targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.8)';

    // Restore exact tier colors for inventory-item-card
    if (el.classList.contains('inventory-item-card')) {
      if (el.classList.contains('selected')) {
        const blueResolved = resolveCssColor('var(--blue)', el);
        targetBorderColor = blueResolved;
        targetBoxShadow = `inset 0 0 0 4px ${blueResolved}, 0 0 20px ${parseToRgba(blueResolved, 0.4, el)}`;
      } else {
        const color = el.style.getPropertyValue('--tier-color') || 'rgba(148, 163, 184, 0.45)';
        const resolvedColor = resolveCssColor(color, el);
        const glow15 = parseToRgba(resolvedColor, 0.15, el);
        const glow05 = parseToRgba(resolvedColor, 0.05, el);
        targetBorderColor = resolvedColor;
        targetBoxShadow = `0 0 10px ${glow15}, inset 0 0 6px ${glow05}`;
      }
      return { targetBorderColor, targetBoxShadow };
    }

    // Restore exact tier colors for quick-item-card
    if (el.classList.contains('quick-item-card')) {
      if (el.classList.contains('tier-rare')) {
        targetBorderColor = 'rgba(59, 130, 246, 0.55)';
        targetBoxShadow = '0 0 10px rgba(59, 130, 246, 0.2), inset 0 0 6px rgba(59, 130, 246, 0.08)';
      } else if (el.classList.contains('tier-epic')) {
        targetBorderColor = 'rgba(168, 85, 247, 0.55)';
        targetBoxShadow = '0 0 10px rgba(168, 85, 247, 0.2), inset 0 0 6px rgba(168, 85, 247, 0.08)';
      } else if (el.classList.contains('tier-legend')) {
        targetBorderColor = 'rgba(245, 158, 11, 0.65)';
        targetBoxShadow = '0 0 12px rgba(245, 158, 11, 0.25), inset 0 0 8px rgba(245, 158, 11, 0.1)';
      } else {
        // tier-common: back to default border
        targetBorderColor = 'rgba(255, 255, 255, 0.1)';
        targetBoxShadow = null;
      }
      return { targetBorderColor, targetBoxShadow };
    }

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
        const yellowResolved = resolveCssColor('var(--yellow)', el);
        targetBorderColor = yellowResolved;
        targetBoxShadow = `0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px ${parseToRgba(yellowResolved, 0.25, el)}`;
      } else {
        targetBorderColor = 'rgba(255, 255, 255, 0.1)';
        targetBoxShadow = '0 8px 30px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.12), inset 0 -1px 2px rgba(0, 0, 0, 0.3)';
      }
    } else if (el.classList.contains('active')) {
      if (el.classList.contains('hud-nav-btn')) {
        const yellowResolved = resolveCssColor('var(--yellow)', el);
        targetBorderColor = yellowResolved;
        targetBoxShadow = `0 0 0 2px ${yellowResolved}, 0 0 30px ${parseToRgba(yellowResolved, 0.45, el)}, inset 0 0 12px ${parseToRgba(yellowResolved, 0.1, el)}`;
      }
    } else if (el.classList.contains('hud-nav-btn')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.08)';
      targetBoxShadow = '0 6px 16px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.12)';
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
    } else if (el.classList.contains('pokecenter-banner')) {
      targetBorderColor = 'rgba(255, 0, 127, 1)';
      targetBoxShadow = '0 10px 40px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(0, 0, 0, 0.5)';
    } else if (el.classList.contains('hud-sq-btn')) {
      if (el.classList.contains('active')) {
        const yellowResolved = resolveCssColor('var(--yellow)', el);
        const glow20 = parseToRgba(yellowResolved, 0.2, el);
        const glow30 = parseToRgba(yellowResolved, 0.3, el);
        targetBorderColor = yellowResolved;
        targetBoxShadow = `0 20px 40px rgba(0, 0, 0, 0.6), inset 0 30px 60px -20px ${glow20}, 0 0 20px ${glow30}`;
      } else {
        targetBorderColor = 'rgba(255, 255, 255, 0.1)';
        targetBoxShadow = 'none';
      }
    } else if (el.classList.contains('info-item')) {
      targetBorderColor = 'rgba(255, 255, 255, 0.05)';
      targetBoxShadow = 'inset 0 1px 1px rgba(255, 255, 255, 0.05)';
    }
  }

  return { targetBorderColor, targetBoxShadow };
}
