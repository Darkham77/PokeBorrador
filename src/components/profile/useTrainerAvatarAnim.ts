/**
 * src/components/profile/useTrainerAvatarAnim.ts
 * 
 * GSAP animations and IntersectionObserver lifecycle for TrainerAvatar.
 */

import { type Ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import gsap from 'gsap';
import {
  INTERSECTION_OBSERVER_THRESHOLD_PCT,
  resolveShadowConfig,
  applyFrameSpinAnimation,
  applyGhostAnimation,
  applyBlinkRedAnimation,
  applyShadowAnimation,
} from './trainerAvatarAnimHelper.ts';

export interface UseTrainerAvatarAnimParams {
  containerRef: Ref<HTMLElement | null>;
  frameRef: Ref<HTMLElement | null>;
  resolvedAvatarStyle: Ref<string>;
  isSquare: Ref<boolean>;
  hasFrame: Ref<boolean>;
  elementColors: Record<string, { base: string; light: string; frame: string }>;
}

export function useTrainerAvatarAnim(params: UseTrainerAvatarAnimParams): void {
  const { containerRef, frameRef, resolvedAvatarStyle, isSquare, hasFrame, elementColors } = params;
  let activeTimeline: gsap.core.Timeline | null = null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (activeTimeline) {
        if (entry.isIntersecting) {
          activeTimeline.play();
        } else {
          activeTimeline.pause();
        }
      }
    });
  }, { threshold: INTERSECTION_OBSERVER_THRESHOLD_PCT });

  function cleanAnimations() {
    if (containerRef.value) {
      observer.unobserve(containerRef.value);
    }
    if (activeTimeline) {
      activeTimeline.kill();
      activeTimeline = null;
    }
    if (containerRef.value) {
      gsap.set(containerRef.value, { clearProps: 'boxShadow,borderColor,opacity' });
    }
    if (frameRef.value) {
      gsap.set(frameRef.value, { clearProps: 'transform,rotation,opacity,scale' });
    }
  }

  function initAnimations() {
    cleanAnimations();
    
    if (!containerRef.value) return;
    observer.observe(containerRef.value);

    const styleClass = resolvedAvatarStyle.value || '';
    if (!styleClass.trim()) return;

    const cleanStyle = styleClass
      .replace('av-sq-', '')
      .replace('av-', '')
      .trim();

    activeTimeline = gsap.timeline({ repeat: -1 });

    if (frameRef.value && !isSquare.value) {
      applyFrameSpinAnimation(activeTimeline, frameRef.value, cleanStyle);
    }

    let shadowAnim = resolveShadowConfig(cleanStyle, elementColors);

    if (cleanStyle.includes('ghost')) {
      applyGhostAnimation(activeTimeline, containerRef.value);
    }

    if (styleClass.includes('blink-red')) {
      shadowAnim = applyBlinkRedAnimation(activeTimeline, containerRef.value);
    }

    if (shadowAnim) {
      applyShadowAnimation(activeTimeline, containerRef.value, shadowAnim);
    }
  }

  onMounted(() => {
    nextTick(() => {
      initAnimations();
    });
  });

  onUnmounted(() => {
    cleanAnimations();
  });

  watch(() => resolvedAvatarStyle.value, () => {
    nextTick(() => {
      initAnimations();
    });
  });

  watch(() => hasFrame.value, () => {
    nextTick(() => {
      initAnimations();
    });
  });
}
