/**
 * src/components/common/spritePersistentFXHelpers.ts
 *
 * GSAP tweens helper for persistent status, volatile, and guardian sprite effects.
 */

import { gsap } from 'gsap';

const CURSED_FX_DURATION_SEC = 1.25;
const CONFUSED_FX_DURATION_SEC = 0.15;
const TAUNTED_FX_DURATION_SEC = 0.4;
const FLINCHED_FX_DURATION_SEC = 0.05;
const DISABLED_FX_DURATION_SEC = 1;
const ENCORED_FX_DURATION_SEC = 0.8;
const FOCUS_ENERGY_FX_DURATION_SEC = 0.75;
const ENDURING_FX_DURATION_SEC = 1.5;
const BURN_FX_DURATION_SEC = 1;
const POISON_FX_DURATION_SEC = 2;
const PARALYZE_FX_DURATION_SEC = 0.04;
const SLEEP_FX_DURATION_SEC = 2;
const GUARDIAN_FX_DURATION_SEC = 2;

const FLINCHED_FX_REPEATS = 10;
const GUARDIAN_DELAY_MULTIPLIER = -2;
const GSAP_PARALYZE_X_OFFSET_PX = 3;

interface VolatileFXProps {
  isCursed?: boolean;
  isConfused?: boolean;
  isTaunted?: boolean;
  isFlinched?: boolean;
  isDisabled?: boolean;
  isEncored?: boolean;
  isFocusEnergy?: boolean;
  isEnduring?: boolean;
  isSeeded?: boolean;
}

export function applyVolatileFXTweens(
  target: HTMLElement,
  props: VolatileFXProps,
  isImmobilized: boolean,
  activeTweens: gsap.core.Tween[]
): void {
  if (props.isCursed) {
    activeTweens.push(gsap.to(target, {
      filter: 'Drop-Shadow(0 0 15px Rgba(75, 0, 130, 0.8)) Brightness(0.6) contrast(1.2) Saturate(0.5)',
      duration: CURSED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut'
    }));
  }
  if (props.isConfused && !isImmobilized) {
    activeTweens.push(gsap.to(target, { x: 2, rotation: 1, duration: CONFUSED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }
  if (props.isTaunted) {
    activeTweens.push(gsap.to(target, { filter: 'Drop-Shadow(0 0 12px Rgba(255, 0, 0, 0.9)) Brightness(1.2)', duration: TAUNTED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }
  if (props.isFlinched && !isImmobilized) {
    activeTweens.push(gsap.to(target, { x: 4, duration: FLINCHED_FX_DURATION_SEC, yoyo: true, repeat: FLINCHED_FX_REPEATS, ease: 'none' }));
  }
  if (props.isDisabled) {
    activeTweens.push(gsap.to(target, { filter: 'Grayscale(0.8) Brightness(0.7) Drop-Shadow(0 0 8px Rgba(100, 100, 100, 0.8))', duration: DISABLED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }
  if (props.isEncored) {
    activeTweens.push(gsap.to(target, { filter: 'Hue-Rotate(90deg) Drop-Shadow(0 0 10px Rgba(0, 255, 255, 0.8))', duration: ENCORED_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }
  if (props.isFocusEnergy) {
    activeTweens.push(gsap.to(target, { filter: 'Drop-Shadow(0 0 10px Rgba(255, 0, 0, 0.7)) Brightness(1.3)', duration: FOCUS_ENERGY_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }
  if (props.isEnduring || props.isSeeded) {
    activeTweens.push(gsap.to(target, { y: -3, duration: ENDURING_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
  }
}

export function applyStatusFXTweens(
  target: HTMLElement,
  status: string | null | undefined,
  isImmobilized: boolean,
  activeTweens: gsap.core.Tween[]
): void {
  if (status === 'brn') {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Drop-Shadow(0 0 25px #ff4500) Brightness(1) Saturate(1.2)' },
      { filter: 'Drop-Shadow(0 0 40px #ff8c00) Brightness(1.4) Saturate(2.2)', duration: BURN_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    ));
  }
  if (status === 'psn' || status === 'tox') {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Drop-Shadow(0 0 2px #9400d3) Brightness(1) Saturate(1)' },
      { filter: 'Drop-Shadow(0 0 12px #9400d3) Brightness(0.8) Saturate(1.4) hue-rotate(10deg)', duration: POISON_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    ));
  }
  if (status === 'par' && !isImmobilized) {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Drop-Shadow(0 0 2px #ffd700) Brightness(1.2)', x: -GSAP_PARALYZE_X_OFFSET_PX }, 
      { filter: 'Drop-Shadow(0 0 10px #ffd700) Brightness(1.5) contrast(1.3)', x: GSAP_PARALYZE_X_OFFSET_PX, duration: PARALYZE_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'none' }
    ));
  }
  if (status === 'frz') {
    activeTweens.push(gsap.set(target, { 
      filter: 'Brightness(1.6) contrast(0.7) Saturate(0.3) url(#pixel-outline-ice) Drop-Shadow(0 0 20px #00ffff)' 
    }));
  }
  if (status === 'sleep') {
    activeTweens.push(gsap.fromTo(target, 
      { filter: 'Brightness(1) Saturate(1)' }, 
      { filter: 'Brightness(0.5) contrast(0.8) Saturate(0.5)', duration: SLEEP_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut' }
    ));
  }
}

export function applyGuardianFXTween(
  container: HTMLElement,
  isVibrant: boolean,
  animSeed: number,
  activeTweens: gsap.core.Tween[]
): void {
  const baseFilter = isVibrant ? 'Drop-Shadow(0 0 15px white) Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))' : 'Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.8))';
  const pulseFilter = isVibrant ? 'Drop-Shadow(0 0 40px white) Drop-Shadow(0 0 15px Rgba(255, 255, 255, 0.9))' : 'Drop-Shadow(0 0 12px Rgba(255, 255, 255, 0.8))';
  activeTweens.push(gsap.fromTo(container, 
    { filter: baseFilter }, 
    { filter: pulseFilter, duration: GUARDIAN_FX_DURATION_SEC, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: animSeed * GUARDIAN_DELAY_MULTIPLIER }
  ));
}
