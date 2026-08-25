import { gsap } from 'gsap';
import type { Ref } from 'vue';
import type { useAudioStore } from '@/stores/audio';
import {
  RIVAL_ALERT_FLICKER_DURATION_SEC,
  RIVAL_ALERT_FLICKER_REPEAT_COUNT,
  RIVAL_EXCLAMATION_POP_SCALE,
  RIVAL_EXCLAMATION_POP_DURATION_SEC,
  RIVAL_EXCLAMATION_WOBBLE_Y_OFFSET,
  RIVAL_EXCLAMATION_WOBBLE_DURATION_SEC,
  RIVAL_EXCLAMATION_WOBBLE_REPEAT_COUNT,
  RIVAL_EXCLAMATION_FADE_DURATION_SEC,
  TRAINER_ENTER_DURATION_SEC,
  TRAINER_RETREAT_X_OFFSET_PX,
  TRAINER_RETREAT_Y_OFFSET_PX,
  TRAINER_RETREAT_SCALE,
  TRAINER_EXIT_DURATION_SEC,
  TRAINER_EXIT_X_OFFSET_PX
} from '@/logic/constants/animations';
import { OPACITY_ZERO } from '@/logic/constants/visuals';

const RIVAL_EXCLAMATION_FADE_OUT_SCALE = 0.5;
const RIVAL_TRAINER_SLIDE_DELAY_SEC = 1.2;
const RIVAL_ALERT_INITIAL_POP_DELAY_SEC = 0.1;
const RIVAL_TRAINER_SLIDE_SCALE = 0.8;
const RIVAL_ALERT_OPACITY_PEAK = 0.8;
const RIVAL_SLIDE_INITIAL_X_PERCENT = '150%';
const TRAINER_SOLID_OPACITY = 1;

export function playTrainerAnimation(
  newState: string,
  el: HTMLElement,
  isRival: boolean,
  showRivalAlert: Ref<boolean>,
  rivalFlickerRef: Ref<HTMLElement | null>,
  rivalExclamationRef: Ref<HTMLElement | null>,
  audioStore: ReturnType<typeof useAudioStore>,
  isRocket: boolean = false
): void {
  if (newState === 'entering') {
    gsap.killTweensOf(el);
    if (isRival) {
      if (audioStore && typeof audioStore.play === 'function') {
        audioStore.play('rival');
      }
      showRivalAlert.value = true;

      const tlAlert = gsap.timeline({
        onComplete: () => {
          showRivalAlert.value = false;
        }
      });

      if (rivalFlickerRef.value) {
        tlAlert.fromTo(rivalFlickerRef.value,
          { opacity: OPACITY_ZERO },
          { opacity: RIVAL_ALERT_OPACITY_PEAK, duration: RIVAL_ALERT_FLICKER_DURATION_SEC, repeat: RIVAL_ALERT_FLICKER_REPEAT_COUNT, yoyo: true, ease: 'rough' },
          0
        );
      }

      if (rivalExclamationRef.value) {
        tlAlert.fromTo(rivalExclamationRef.value,
          { scale: 0, opacity: 0 },
          { scale: RIVAL_EXCLAMATION_POP_SCALE, opacity: TRAINER_SOLID_OPACITY, duration: RIVAL_EXCLAMATION_POP_DURATION_SEC, ease: 'back.out(2)' },
          RIVAL_ALERT_INITIAL_POP_DELAY_SEC
        );
        tlAlert.to(rivalExclamationRef.value, {
          y: `-=${RIVAL_EXCLAMATION_WOBBLE_Y_OFFSET}`,
          duration: RIVAL_EXCLAMATION_WOBBLE_DURATION_SEC,
          repeat: RIVAL_EXCLAMATION_WOBBLE_REPEAT_COUNT,
          yoyo: true,
          ease: 'power1.inOut'
        });
        tlAlert.to(rivalExclamationRef.value, {
          scale: RIVAL_EXCLAMATION_FADE_OUT_SCALE,
          opacity: 0,
          duration: RIVAL_EXCLAMATION_FADE_DURATION_SEC,
          ease: 'power2.in'
        });
      }

      gsap.fromTo(el,
        { x: RIVAL_SLIDE_INITIAL_X_PERCENT, y: 0, opacity: TRAINER_SOLID_OPACITY, scale: RIVAL_TRAINER_SLIDE_SCALE, transformOrigin: 'bottom center' },
        { x: '0%', y: 0, opacity: TRAINER_SOLID_OPACITY, scale: 1, transformOrigin: 'bottom center', duration: TRAINER_ENTER_DURATION_SEC, delay: RIVAL_TRAINER_SLIDE_DELAY_SEC, ease: 'back.out(1.2)' }
      );
    } else {
      gsap.fromTo(el,
        { x: '150%', y: 0, opacity: TRAINER_SOLID_OPACITY, scale: 1, transformOrigin: 'bottom center' },
        { x: '0%', y: 0, opacity: TRAINER_SOLID_OPACITY, scale: 1, transformOrigin: 'bottom center', duration: TRAINER_ENTER_DURATION_SEC, ease: 'back.out(1.2)' }
      );
    }
  } else if (newState === 'retreating') {
    gsap.set(el, { transformOrigin: 'bottom center' });
    gsap.to(el, {
      x: TRAINER_RETREAT_X_OFFSET_PX,
      y: TRAINER_RETREAT_Y_OFFSET_PX,
      scale: TRAINER_RETREAT_SCALE,
      opacity: TRAINER_SOLID_OPACITY,
      duration: TRAINER_ENTER_DURATION_SEC,
      ease: 'power2.inOut'
    });
  } else if (newState === 'standing') {
    gsap.set(el, {
      x: 0,
      y: 0,
      opacity: TRAINER_SOLID_OPACITY
    });
  } else if (newState === 'exiting') {
    if (isRocket && audioStore && typeof audioStore.play === 'function') {
      audioStore.play('flee');
    }
    gsap.to(el, {
      x: `+=${TRAINER_EXIT_X_OFFSET_PX}`,
      duration: TRAINER_EXIT_DURATION_SEC,
      ease: 'power2.in'
    });
  }
}
