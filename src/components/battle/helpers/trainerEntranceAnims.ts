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
  TRAINER_RETREAT_Y_OFFSET_PX
} from '@/logic/constants/animations';
import { OPACITY_ZERO } from '@/logic/constants/visuals';

const RIVAL_EXCLAMATION_FADE_OUT_SCALE = 0.5;
const RIVAL_TRAINER_SLIDE_DELAY_SEC = 1.2;
const RIVAL_ALERT_INITIAL_POP_DELAY_SEC = 0.1;
const RIVAL_TRAINER_SLIDE_SCALE = 0.8;
const RIVAL_ALERT_OPACITY_PEAK = 0.8;
const RIVAL_SLIDE_INITIAL_X_PERCENT = '150%';

export function playTrainerAnimation(
  newState: string,
  el: HTMLElement,
  isRival: boolean,
  showRivalAlert: Ref<boolean>,
  rivalFlickerRef: Ref<HTMLElement | null>,
  rivalExclamationRef: Ref<HTMLElement | null>,
  audioStore: ReturnType<typeof useAudioStore>
): void {
  gsap.killTweensOf(el);

  if (newState === 'entering') {
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
          { scale: RIVAL_EXCLAMATION_POP_SCALE, opacity: 1, duration: RIVAL_EXCLAMATION_POP_DURATION_SEC, ease: 'back.out(2)' },
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
        { x: RIVAL_SLIDE_INITIAL_X_PERCENT, opacity: 0, scale: RIVAL_TRAINER_SLIDE_SCALE },
        { x: '0%', opacity: 1, scale: 1, duration: TRAINER_ENTER_DURATION_SEC, delay: RIVAL_TRAINER_SLIDE_DELAY_SEC, ease: 'power2.out' }
      );
    } else {
      gsap.fromTo(el,
        { x: '100%', opacity: 0 },
        { x: '0%', opacity: 1, duration: TRAINER_ENTER_DURATION_SEC, ease: 'power2.out' }
      );
    }
  } else if (newState === 'retreating') {
    gsap.to(el, {
      x: `+=${TRAINER_RETREAT_X_OFFSET_PX}`,
      y: `-=${TRAINER_RETREAT_Y_OFFSET_PX}`,
      opacity: 0,
      duration: TRAINER_ENTER_DURATION_SEC,
      ease: 'power2.in'
    });
  }
}
