import { gsap } from 'gsap';
import { gameBus } from '@/logic/events/gameBus';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import {
  POKEBALL_SHAKE_DISTANCE_PX,
  BALL_TRANSITION_DURATION_SEC,
  RECOIL_HORIZONTAL_OFFSET_PX,
  RECOIL_VERTICAL_OFFSET_PX,
  RECOIL_PUSH_DURATION_SEC,
  RECOIL_RECOVERY_DURATION_SEC,
  COMBATANT_HEAL_Y_OFFSET_PX,
  COMBATANT_HEAL_PHASE_DURATION_SEC,
  EMERGE_SQUISH_Y_PX,
  EMERGE_SQUISH_SCALE_X,
  EMERGE_SQUISH_SCALE_Y,
  EMERGE_SQUISH_DURATION_SEC,
  EMERGE_JUMP_Y_PX,
  EMERGE_JUMP_SCALE_X,
  EMERGE_JUMP_SCALE_Y,
  EMERGE_JUMP_DURATION_SEC,
  EMERGE_LAND_SCALE_X,
  EMERGE_LAND_SCALE_Y,
  EMERGE_LAND_DURATION_SEC,
  EMERGE_SETTLE_DURATION_SEC,
  ATTACK_SPECIAL_SCALE,
  ATTACK_SPECIAL_DURATION_SEC,
  STATUS_FLASH_SHADOW_PX,
  STATUS_FLASH_DURATION_SEC,
  STATUS_FLASH_REPEAT_COUNT,
  STATUS_FLASH_BRIGHTNESS,
  POKEBALL_WOBBLE_ANGLE_1_DEG,
  POKEBALL_WOBBLE_ANGLE_2_DEG,
  POKEBALL_WOBBLE_ANGLE_3_DEG,
  POKEBALL_WOBBLE_ANGLE_4_DEG,
  POKEBALL_WOBBLE_STEP1_SEC,
  POKEBALL_WOBBLE_STEP2_SEC,
  POKEBALL_WOBBLE_STEP34_SEC,
  POKEBALL_SPRITE_SHAKE_REPEAT,
  POKEBALL_BLINK_BRIGHTNESS,
  POKEBALL_BLINK_HUE_ROTATE_DEG,
  POKEBALL_BLINK_DURATION_SEC,
  SCALE_FULL,
  SCALE_ZERO,
  OPACITY_FULL,
  OPACITY_INVISIBLE,
} from '@/logic/constants/animations';

const RECOIL_EASE_BACK_OVERSHOOT = 1.7;
const POKEBALL_SEPIA_SATURATE = 2;
const HEAL_SATURATION_FULL = 1;
const HEAL_BRIGHTNESS_FULL = 1;
const HEAL_SEPIA_NONE = 0;

export const STATUS_FLASH_COLORS: Record<string, string> = {
  brn: '#ff4500',
  psn: '#9400d3',
  par: '#ffd700',
  frz: '#00ffff',
  slp: '#ffffff',
  tox: '#9400d3'
};

const BLINK_TIMELINE_STEPS = [
  { t: 0.00, op: 0 }, { t: 0.08, op: 1 },
  { t: 0.16, op: 0 }, { t: 0.24, op: 1 },
  { t: 0.32, op: 0 }, { t: 0.40, op: 1 },
  { t: 0.48, op: 1 }
] as const;

export function animateCombatantEmerging(target: HTMLElement): void {
  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set(target, { clearProps: 'transform' });
    }
  });
  tl.to(target, { y: EMERGE_SQUISH_Y_PX, scaleX: EMERGE_SQUISH_SCALE_X, scaleY: EMERGE_SQUISH_SCALE_Y, duration: EMERGE_SQUISH_DURATION_SEC, ease: 'power1.in' })
    .to(target, { y: EMERGE_JUMP_Y_PX, scaleX: EMERGE_JUMP_SCALE_X, scaleY: EMERGE_JUMP_SCALE_Y, duration: EMERGE_JUMP_DURATION_SEC, ease: 'power2.out' })
    .to(target, { y: 0, scaleX: EMERGE_LAND_SCALE_X, scaleY: EMERGE_LAND_SCALE_Y, duration: EMERGE_LAND_DURATION_SEC, ease: 'bounce.out' })
    .to(target, { scaleX: 1, scaleY: 1, duration: EMERGE_SETTLE_DURATION_SEC });
}

export function animateCombatantHeal(spriteRotationEl: HTMLElement): void {
  gsap.set(spriteRotationEl, { transition: 'none' });
  const tl = gsap.timeline();
  tl.to(spriteRotationEl, {
    y: COMBATANT_HEAL_Y_OFFSET_PX,
    scale: ATTACK_SPECIAL_SCALE,
    filter: `brightness(1.4) sepia(0.8) hue-rotate(300deg) saturate(${POKEBALL_SEPIA_SATURATE})`,
    duration: COMBATANT_HEAL_PHASE_DURATION_SEC,
    ease: 'power1.out'
  })
  .to(spriteRotationEl, {
    y: 0,
    scale: 1,
    filter: `brightness(${HEAL_BRIGHTNESS_FULL}) sepia(${HEAL_SEPIA_NONE}) hue-rotate(0deg) saturate(${HEAL_SATURATION_FULL})`,
    duration: COMBATANT_HEAL_PHASE_DURATION_SEC,
    ease: 'power1.in',
    onComplete: () => {
      gsap.set(spriteRotationEl, { clearProps: 'y,scale,filter,transition' });
    }
  });
}

export function animateCombatantRecoil(spriteEl: HTMLElement, isPlayerSide: boolean): void {
  const backX = isPlayerSide ? -RECOIL_HORIZONTAL_OFFSET_PX : RECOIL_HORIZONTAL_OFFSET_PX;
  const backY = isPlayerSide ? RECOIL_VERTICAL_OFFSET_PX : -RECOIL_VERTICAL_OFFSET_PX;
  gsap.timeline()
    .to(spriteEl, { x: backX, y: backY, duration: RECOIL_PUSH_DURATION_SEC, ease: 'power2.out' })
    .to(spriteEl, { x: 0, y: 0, duration: RECOIL_RECOVERY_DURATION_SEC, ease: `back.out(${RECOIL_EASE_BACK_OVERSHOOT})` });
}

export function animatePokeballWobble(pokeballEl: HTMLElement): void {
  gameBus.emit('PLAY_SOUND', 'wobble');
  gsap.to(pokeballEl, {
    keyframes: [
      { rotation: POKEBALL_WOBBLE_ANGLE_1_DEG, duration: POKEBALL_WOBBLE_STEP1_SEC, ease: 'power1.out' },
      { rotation: POKEBALL_WOBBLE_ANGLE_2_DEG, duration: POKEBALL_WOBBLE_STEP2_SEC, ease: 'power1.inOut' },
      { rotation: POKEBALL_WOBBLE_ANGLE_3_DEG, duration: POKEBALL_WOBBLE_STEP34_SEC, ease: 'power1.inOut' },
      { rotation: POKEBALL_WOBBLE_ANGLE_4_DEG, duration: POKEBALL_WOBBLE_STEP34_SEC, ease: 'power1.inOut' },
      { rotation: 0, duration: POKEBALL_WOBBLE_STEP1_SEC, ease: 'power1.in' }
    ]
  });
}

export function animatePokeballBlink(pokeballEl: HTMLElement): void {
  gsap.fromTo(pokeballEl,
    { filter: 'Brightness(1)' },
    { filter: `Brightness(${STATUS_FLASH_BRIGHTNESS}) Hue-Rotate(10deg)`, duration: ATTACK_SPECIAL_DURATION_SEC, yoyo: true, repeat: 1, ease: 'power1.inOut' }
  );
}

export function animateSpriteShake(spriteEl: HTMLElement, isPlayer: boolean): void {
  const shakeDist = isPlayer ? -POKEBALL_SHAKE_DISTANCE_PX : POKEBALL_SHAKE_DISTANCE_PX;
  gsap.set(spriteEl, { transition: 'none' });
  gsap.fromTo(spriteEl,
    { x: 0 },
    {
      x: shakeDist,
      duration: POKEBALL_WOBBLE_STEP1_SEC,
      yoyo: true,
      repeat: POKEBALL_SPRITE_SHAKE_REPEAT,
      ease: 'power1.inOut',
      onComplete: () => { gsap.set(spriteEl, { clearProps: 'x,opacity,transition' }); }
    }
  );

  const tl = gsap.timeline();
  BLINK_TIMELINE_STEPS.forEach(b => {
    tl.set(spriteEl, { opacity: b.op }, b.t);
  });
}

export function animateSpriteBlink(spriteEl: HTMLElement, isPlayer: boolean): void {
  const shakeDist = isPlayer ? -POKEBALL_SHAKE_DISTANCE_PX : POKEBALL_SHAKE_DISTANCE_PX;
  gsap.set(spriteEl, { transition: 'none' });
  gsap.fromTo(spriteEl,
    { x: 0, filter: 'Brightness(1)' },
    {
      x: shakeDist,
      filter: `Brightness(${STATUS_FLASH_BRIGHTNESS})`,
      duration: POKEBALL_WOBBLE_STEP1_SEC,
      yoyo: true,
      repeat: POKEBALL_SPRITE_SHAKE_REPEAT,
      ease: 'power1.inOut',
      onComplete: () => { gsap.set(spriteEl, { clearProps: 'x,filter,transition' }); }
    }
  );
}

export function animateStatusFlash(spriteRotationEl: HTMLElement, status: string): void {
  const color = STATUS_FLASH_COLORS[status] || '#ffffff';
  gsap.killTweensOf(spriteRotationEl, 'filter');
  gsap.fromTo(spriteRotationEl,
    { filter: `Drop-Shadow(0 0 0px ${color}) Brightness(1)` },
    {
      filter: `Drop-Shadow(0 0 ${STATUS_FLASH_SHADOW_PX}px ${color}) Brightness(${STATUS_FLASH_BRIGHTNESS})`,
      duration: STATUS_FLASH_DURATION_SEC,
      yoyo: true,
      repeat: STATUS_FLASH_REPEAT_COUNT,
      ease: 'power1.inOut',
      onComplete: () => {
        gsap.set(spriteRotationEl, { clearProps: 'filter' });
      }
    }
  );
}

export function executeCatchingTween(
  spriteEl: HTMLElement,
  shadowEl: HTMLElement | null,
  rotationEl: HTMLElement | null,
  origin: string,
  coords: { x: number; y: number },
  onDone: () => void
): gsap.core.Tween {
  if (shadowEl) gsap.set(shadowEl, { display: 'none' });
  if (rotationEl) gsap.set(rotationEl, { rotation: 0, clearProps: 'transform,rotation' });

  gsap.killTweensOf(spriteEl);
  gsap.set(spriteEl, {
    transformOrigin: origin,
    x: 0,
    y: 0,
    scale: SCALE_FULL,
    opacity: OPACITY_FULL,
    filter: 'url(#pixel-energy-optimized)'
  });

  return gsap.to(spriteEl, {
    x: coords.x,
    y: coords.y,
    scale: SCALE_ZERO,
    duration: BALL_TRANSITION_DURATION_SEC,
    ease: 'power2.inOut',
    onComplete: () => {
      gsap.set(spriteEl, { x: 0, y: 0, scale: SCALE_ZERO, opacity: OPACITY_INVISIBLE, filter: 'none', clearProps: 'transformOrigin' });
      onDone();
    }
  });
}

export function executeReleasingTween(
  spriteEl: HTMLElement,
  shadowEl: HTMLElement | null,
  rotationEl: HTMLElement | null,
  origin: string,
  coords: { x: number; y: number },
  pokemonName: string | undefined,
  onDone: () => void
): gsap.core.Tween {
  if (shadowEl) gsap.set(shadowEl, { display: 'none' });
  if (rotationEl) gsap.set(rotationEl, { clearProps: 'transform,rotation' });

  gsap.killTweensOf(spriteEl);
  gsap.set(spriteEl, {
    transformOrigin: origin,
    x: coords.x,
    y: coords.y,
    scale: SCALE_ZERO,
    opacity: OPACITY_FULL,
    filter: 'url(#pixel-energy-optimized)'
  });

  return gsap.to(spriteEl, {
    x: 0,
    y: 0,
    scale: SCALE_FULL,
    duration: BALL_TRANSITION_DURATION_SEC,
    ease: 'power2.inOut',
    onComplete: () => {
      gsap.set(spriteEl, { x: 0, y: 0, scale: 1, opacity: 1, clearProps: 'filter,transformOrigin' });
      if (rotationEl) gsap.set(rotationEl, { clearProps: 'transform,rotation,filter' });
      if (shadowEl) gsap.set(shadowEl, { clearProps: 'display' });
      if (pokemonName) {
        gameBus.emit('PLAY_CRY', { name: pokemonName });
      }
      onDone();
    }
  });
}

const TRANSFORM_SQUISH_SCALEX = 1.4;
const TRANSFORM_SQUISH_SCALEY = 0.25;
const TRANSFORM_POP_SCALEX = 1.1;
const TRANSFORM_POP_SCALEY = 1.15;
const TRANSFORM_SQUISH_DURATION_SEC = 0.25;
const TRANSFORM_POP_DURATION_SEC = 0.3;
const TRANSFORM_SETTLE_DURATION_SEC = 0.2;

export function animateCombatantTransform(
  spriteEl: HTMLElement,
  onMorph?: () => void
): gsap.core.Timeline {
  gsap.set(spriteEl, { transition: 'none' });
  const tl = gsap.timeline();

  tl.to(spriteEl, {
    scaleX: TRANSFORM_SQUISH_SCALEX,
    scaleY: TRANSFORM_SQUISH_SCALEY,
    filter: 'brightness(2.5) contrast(1.4) drop-shadow(0 0 16px #c084fc)',
    duration: TRANSFORM_SQUISH_DURATION_SEC,
    ease: 'power2.in'
  })
  .add(() => {
    if (onMorph) onMorph();
  })
  .to(spriteEl, {
    scaleX: TRANSFORM_POP_SCALEX,
    scaleY: TRANSFORM_POP_SCALEY,
    filter: 'brightness(1.5) drop-shadow(0 0 8px #e9d5ff)',
    duration: TRANSFORM_POP_DURATION_SEC,
    ease: 'back.out(2)'
  })
  .to(spriteEl, {
    scaleX: SCALE_FULL,
    scaleY: SCALE_FULL,
    filter: 'brightness(1)',
    duration: TRANSFORM_SETTLE_DURATION_SEC,
    ease: 'power1.out',
    onComplete: () => {
      gsap.set(spriteEl, { clearProps: 'transform,scale,scaleX,scaleY,filter,transition' });
    }
  });

  return tl;
}

const POKEBALL_SEPIA_RATIO = 0.5;

export function handleCombatantShake(
  pokeballEl: HTMLElement | null,
  spriteEl: HTMLElement | null,
  isCaptureSuccess: boolean,
  isPlayerSide: boolean,
  shaking: boolean
): void {
  if (!shaking) return;
  if (pokeballEl) {
    animatePokeballWobble(pokeballEl);
    return;
  }
  if (!isCaptureSuccess && spriteEl) {
    animateSpriteShake(spriteEl, isPlayerSide);
  }
}

export function handleCombatantBlink(
  pokeballEl: HTMLElement | null,
  spriteEl: HTMLElement | null,
  isCaptureSuccess: boolean,
  isPlayerSide: boolean,
  blinking: boolean
): void {
  if (!blinking) return;
  if (pokeballEl) {
    animatePokeballBlink(pokeballEl);
    return;
  }
  if (!isCaptureSuccess && spriteEl) {
    animateSpriteBlink(spriteEl, isPlayerSide);
  }
}

export function togglePokeballCaptureSuccess(
  ball: HTMLElement,
  success: boolean,
  currentTween: gsap.core.Tween | null
): gsap.core.Tween | null {
  if (currentTween) {
    currentTween.kill();
  }
  if (success) {
    return gsap.fromTo(
      ball,
      { filter: 'Brightness(1)' },
      {
        filter: `Brightness(${POKEBALL_BLINK_BRIGHTNESS}) Sepia(${POKEBALL_SEPIA_RATIO}) Hue-Rotate(${POKEBALL_BLINK_HUE_ROTATE_DEG}deg)`,
        duration: POKEBALL_BLINK_DURATION_SEC,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut'
      }
    );
  }
  gsap.set(ball, { clearProps: 'filter' });
  return null;
}

export function prepareBallTransition(
  sprite: HTMLElement,
  rotation: HTMLElement | null,
  shadow: HTMLElement | null,
  origin: string,
  coords: { x: number; y: number },
  isReleasing: boolean
): void {
  if (rotation) {
    gsap.set(rotation, { rotation: 0, clearProps: 'transform,rotation' });
  }
  if (shadow) {
    gsap.set(shadow, { display: 'none' });
  }
  if (isReleasing) {
    gsap.set(sprite, {
      transformOrigin: origin,
      x: coords.x,
      y: coords.y,
      scale: SCALE_ZERO,
      opacity: OPACITY_FULL,
      filter: 'url(#pixel-energy-optimized)'
    });
  } else {
    gsap.set(sprite, {
      transformOrigin: origin,
      x: 0,
      y: 0,
      scale: 1,
      opacity: OPACITY_FULL,
      filter: 'url(#pixel-energy-optimized)'
    });
  }
}

export interface DispatchBallTweenParams {
  sprite: HTMLElement;
  shadow: HTMLElement | null;
  rotation: HTMLElement | null;
  origin: string;
  coords: { x: number; y: number };
  onDone: () => void;
}

function resolveCombatantAnimKey(side: string, pokeUid?: string): string {
  if (!pokeUid) return `${side}-active`;
  return `${side}-${pokeUid}`;
}

export function dispatchBallAnimation(
  val: string,
  side: string,
  pokemon: { uid?: string; id?: PokemonSpeciesId } | null | undefined,
  params: DispatchBallTweenParams
): void {
  if (val !== 'catching' && val !== 'releasing') return;
  const animKey = resolveCombatantAnimKey(side, pokemon?.uid);
  const tween = val === 'catching'
    ? executeCatchingTween(params.sprite, params.shadow, params.rotation, params.origin, params.coords, params.onDone)
    : executeReleasingTween(params.sprite, params.shadow, params.rotation, params.origin, params.coords, pokemon?.id, params.onDone);

  gameBus.emit('REGISTER_TWEEN', { key: animKey, tween });
}




