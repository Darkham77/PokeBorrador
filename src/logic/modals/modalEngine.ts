import {
  ModalAnimationController,
  ModalDomController,
  createGsapModalDriver,
  createModalStack,
  type ModalMotionInput,
  type ModalStackManager,
  type ModalTimerDriver
} from '@francogp/auditor/modals';
import { gsap } from 'gsap';
import type { Component } from 'vue';

import { getModalTweenPosition } from '@/components/common/baseModalHelper';
import {
  MODAL_CLOSING_FALLBACK_DURATION_SEC,
  MODAL_OPENING_FALLBACK_DURATION_SEC
} from '@/logic/constants/gameplay';
import { MILLISECONDS_PER_SECOND, Z_LAYERS } from '@/logic/constants/visuals';
import { ANIM_EASES, ANIM_TIMINGS } from '@/logic/utils/animationRegistry';
import { logger } from '@/logic/utils/logger';

const POKEVICIO_HISTORY_GUARD_KEY = 'pokevicioGuard';

const MODAL_OPEN_TIMEOUT_MS = MODAL_OPENING_FALLBACK_DURATION_SEC * MILLISECONDS_PER_SECOND;
const MODAL_CLOSE_TIMEOUT_MS = MODAL_CLOSING_FALLBACK_DURATION_SEC * MILLISECONDS_PER_SECOND;

export interface PokeVicioModalMeta {
  readonly props: Record<string, unknown>;
  readonly component?: Component;
  readonly isHosted: boolean;
}

export interface PokeVicioModalRuntime {
  readonly stack: ModalStackManager<string, PokeVicioModalMeta>;
  readonly animations: ModalAnimationController<string, PokeVicioModalMeta>;
  dispose: () => void;
}

const gsapModalTimerDriver: ModalTimerDriver = {
  schedule(delayMs: number, callback: () => void): () => void {
    const delayed = gsap.delayedCall(delayMs / MILLISECONDS_PER_SECOND, callback);
    return () => {
      delayed.kill();
    };
  }
};

export function resolveBaseModalMotion(type: string, preventClose = false): ModalMotionInput {
  const enterPos = getModalTweenPosition(type, true);
  const exitPos = getModalTweenPosition(type, false);

  const panelFrom = {
    opacity: 0,
    x: enterPos.x ?? 0,
    y: enterPos.y ?? 0,
    scale: enterPos.scale ?? 1
  };

  const panelExitTo = {
    opacity: 0,
    x: exitPos.x ?? 0,
    y: exitPos.y ?? 0,
    scale: exitPos.scale ?? 1
  };

  return {
    basePreset: 'scale-fade',
    panelFrom,
    panelTo: { opacity: 1, x: 0, y: 0, scale: 1 },
    panelExitTo,
    backdropFrom: { opacity: 0 },
    backdropTo: { opacity: 1 },
    backdropExitTo: { opacity: 0 },
    enter: {
      durationSec: ANIM_TIMINGS.MODAL_OPEN,
      ease: ANIM_EASES.OUT_SOFT
    },
    exit: {
      durationSec: ANIM_TIMINGS.MODAL_CLOSE,
      ease: 'power2.in'
    },
    prevented: {
      enabled: preventClose
    }
  };
}

export function createPokeVicioModalRuntime(): PokeVicioModalRuntime {
  const stack = createModalStack<string, PokeVicioModalMeta>({
    zLayers: Z_LAYERS,
    defaultMotion: resolveBaseModalMotion('center', false),
    openTimeoutMs: MODAL_OPEN_TIMEOUT_MS,
    closeTimeoutMs: MODAL_CLOSE_TIMEOUT_MS,
    instantOnReducedMotion: false,
    timerDriver: gsapModalTimerDriver,
    onCeilingExceeded(diag) {
      logger.warn(
        'ModalStack',
        `Modal "${diag.kind}" (${diag.zIndex}) reached ceiling ${diag.ceilingZIndex} at slot ${diag.slot}`
      );
    }
  });

  const animations = new ModalAnimationController<string, PokeVicioModalMeta>({
    stack,
    driver: createGsapModalDriver(gsap)
  });

  return {
    stack,
    animations,
    dispose(): void {
      animations.dispose();
      stack.dispose();
    }
  };
}

export function createPokeVicioModalDomController(
  stack: ModalStackManager<string, PokeVicioModalMeta>,
  onUnhandledPopState: () => boolean | void
): ModalDomController<string, PokeVicioModalMeta> {
  return new ModalDomController<string, PokeVicioModalMeta>({
    stack,
    syncReducedMotion: false,
    backNavigation: {
      enabled: true,
      guardStateKey: POKEVICIO_HISTORY_GUARD_KEY,
      blockMouseSideButtons: true,
      blockBrowserShortcuts: true,
      blockBackspaceOutsideInputs: true,
      onUnhandledPopState
    }
  });
}
