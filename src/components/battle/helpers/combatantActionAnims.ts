import { gsap } from 'gsap';
import { gameBus } from '@/logic/events/gameBus';
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator';
import type { BattleCombatantProps } from '@/types/battle/battle';
import {
  GSAP_FAST_DURATION_SEC,
  GSAP_STANDARD_DURATION_SEC,
  COMBATANT_FAINT_Y_OFFSET,
  COMBATANT_FAINT_DURATION_SEC,
  ATTACK_DASH_DISTANCE_PX,
  ATTACK_PREP_DISTANCE_PX,
  SELFKO_SHAKE_COUNT,
  SELFKO_SHAKE_RANGE_PX,
  SELFKO_SHAKE_DURATION_SEC,
  SELFKO_EXPLODE_SCALE,
  SELFKO_EXPLODE_BRIGHTNESS,
  SELFKO_EXPLODE_SHADOW_PX,
  SELFKO_EXPLODE_PRIMARY_COLOR,
  SELFKO_EXPLODE_UP_DURATION_SEC,
  SELFKO_EXPLODE_FLASH_BRIGHTNESS,
  SELFKO_EXPLODE_FLASH_SHADOW_PX,
  SELFKO_EXPLODE_FLASH_COLOR,
  SELFKO_EXPLODE_DOWN_DURATION_SEC,
  SELFKO_SETTLE_DURATION_SEC,
  ATTACK_SPECIAL_PULSE_DISTANCE_PX,
  ATTACK_SPECIAL_SCALE,
  ATTACK_SPECIAL_BRIGHTNESS,
  ATTACK_SPECIAL_DURATION_SEC,
  ATTACK_STATUS_ROTATION_DEG,
  ATTACK_STATUS_SCALE,
  ATTACK_STATUS_BRIGHTNESS,
  ATTACK_STATUS_DURATION_SEC,
  ATTACK_DEFAULT_NY_PLAYER,
  ATTACK_DEFAULT_NY_ENEMY,
} from '@/logic/constants/animations';

const FAINT_BLINK_STEPS: readonly { t: number; op: number }[] = [ // no-magic
  { t: 0.05, op: 0 }, { t: 0.13, op: 1 },
  { t: 0.21, op: 0 }, { t: 0.29, op: 1 },
  { t: 0.37, op: 0 }, { t: 0.45, op: 1 },
  { t: 0.53, op: 0 }, { t: 0.61, op: 1 },
  { t: 0.69, op: 0 }, { t: 0.77, op: 1 },
  { t: 0.85, op: 0 }, { t: 0.93, op: 1 },
  { t: 0.98, op: 0 }
] as const;

const VOICE_MOVE_IDS = [
  'growl', 'roar', 'sing', 'hypervoice', 'metalsound', 'perishsong', 'uproar',
  'screech', 'supersonic', 'grasswhistle', 'chatter', 'snarl', 'round',
  'disarmingvoice', 'boomburst', 'confide'
] as const;

export function buildFaintTimeline(
  spriteEl: HTMLElement,
  pokemon: BattleCombatantProps['pokemon'],
  shadowEl?: HTMLElement | null
): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.add(() => {
    if (pokemon) {
      gameBus.emit('PLAY_CRY', { name: pokemon.id || pokemon.name, isFaint: true });
    }
  });

  gsap.set(spriteEl, { transition: 'none' });

  if (shadowEl) {
    gsap.set(shadowEl, { display: 'none' });
  }

  tl.addLabel('fallStart');

  tl.to(spriteEl, {
    y: COMBATANT_FAINT_Y_OFFSET,
    duration: COMBATANT_FAINT_DURATION_SEC,
    ease: 'power2.in'
  }, 'fallStart');

  FAINT_BLINK_STEPS.forEach(b => {
    tl.set(spriteEl, { opacity: b.op }, `fallStart+=${b.t}`);
  });

  return tl;
}

export function buildAttackTimeline(
  spriteEl: HTMLElement,
  spriteRotationEl: HTMLElement | null,
  props: BattleCombatantProps
): gsap.core.Timeline | null {
  const move = props.activeMove;
  if (!move) return null;

  const isPlayerSide = props.side === 'player';
  const cat = move.cat;
  const tl = gsap.timeline();

  const cleanMoveId = move.id || '';
  if ((VOICE_MOVE_IDS as readonly string[]).includes(cleanMoveId) && props.pokemon) { // domain-ok
    tl.add(() => {
      gameBus.emit('PLAY_CRY', { name: props.pokemon!.id || props.pokemon!.name });
    });
  }

  let nx = isPlayerSide ? 1 : -1;
  let ny = isPlayerSide ? ATTACK_DEFAULT_NY_PLAYER : ATTACK_DEFAULT_NY_ENEMY;

  if (props.targetPosition) {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2;
    const mySize = props.baseSize * scale;
    const targetBase = isPlayerSide
      ? (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_ENEMY: number }).BASE_ENTITY_SIZE_ENEMY
      : (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_PLAYER: number }).BASE_ENTITY_SIZE_PLAYER;
    const targetSize = targetBase * scale;
    const ENTITY_CENTER_HALF_FACTOR = 0.5;

    const myCenterX = props.position.x + (mySize * ENTITY_CENTER_HALF_FACTOR);
    const myCenterY = props.position.y + (mySize * ENTITY_CENTER_HALF_FACTOR);
    const targetCenterX = props.targetPosition.x + (targetSize * ENTITY_CENTER_HALF_FACTOR);
    const targetCenterY = props.targetPosition.y + (targetSize * ENTITY_CENTER_HALF_FACTOR);

    const dx = targetCenterX - myCenterX;
    const dy = targetCenterY - myCenterY;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length > 0) {
      nx = dx / length;
      ny = dy / length;
    }
  }

  if (move.selfKO || cat === 'selfKO') {
    const shakeTimeline = gsap.timeline();
    for (let i = 0; i < SELFKO_SHAKE_COUNT; i++) {
      const shakeX = (Math.random() - 0.5) * SELFKO_SHAKE_RANGE_PX;
      const shakeY = (Math.random() - 0.5) * SELFKO_SHAKE_RANGE_PX;
      shakeTimeline.to(spriteEl, {
        x: shakeX,
        y: shakeY,
        duration: SELFKO_SHAKE_DURATION_SEC,
        ease: 'none'
      });
    }
    tl.add(shakeTimeline);

    tl.add(() => {
      if (props.pokemon) {
        gameBus.emit('PLAY_CRY', { name: props.pokemon.id || props.pokemon.name, isFaint: true });
      }
    });

    tl.to(spriteEl, {
      scale: SELFKO_EXPLODE_SCALE,
      filter: `Brightness(${SELFKO_EXPLODE_BRIGHTNESS}) Drop-Shadow(0 0 ${SELFKO_EXPLODE_SHADOW_PX}px ${SELFKO_EXPLODE_PRIMARY_COLOR})`,
      duration: SELFKO_EXPLODE_UP_DURATION_SEC,
      ease: 'power2.out'
    });

    tl.to(spriteEl, {
      scale: 0,
      opacity: 0,
      filter: `Brightness(${SELFKO_EXPLODE_FLASH_BRIGHTNESS}) Drop-Shadow(0 0 ${SELFKO_EXPLODE_FLASH_SHADOW_PX}px ${SELFKO_EXPLODE_FLASH_COLOR})`,
      duration: SELFKO_EXPLODE_DOWN_DURATION_SEC,
      ease: 'power2.in'
    });

    tl.to(spriteEl, {
      x: 0,
      y: 0,
      scale: 1,
      opacity: 1,
      filter: 'Brightness(1)',
      clearProps: 'all',
      duration: SELFKO_SETTLE_DURATION_SEC
    });
  } else if (cat === 'physical' || !cat) {
    const dashDist = ATTACK_DASH_DISTANCE_PX;
    const prepDist = ATTACK_PREP_DISTANCE_PX;

    tl.to(spriteEl, { x: nx * prepDist, y: ny * prepDist, duration: GSAP_FAST_DURATION_SEC })
      .to(spriteEl, { x: nx * dashDist, y: ny * dashDist, scale: ATTACK_SPECIAL_SCALE, duration: GSAP_STANDARD_DURATION_SEC, ease: 'power2.out' })
      .to(spriteEl, { x: 0, y: 0, scale: 1, duration: GSAP_STANDARD_DURATION_SEC, ease: 'power1.inOut' });
  } else if (cat === 'special') {
    tl.fromTo(spriteEl,
      { filter: 'Brightness(1)', x: 0, y: 0, scale: 1 },
      {
        x: nx * ATTACK_SPECIAL_PULSE_DISTANCE_PX,
        y: ny * ATTACK_SPECIAL_PULSE_DISTANCE_PX,
        scale: ATTACK_SPECIAL_SCALE,
        filter: `Brightness(${ATTACK_SPECIAL_BRIGHTNESS})`,
        duration: ATTACK_SPECIAL_DURATION_SEC,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      }
    );
  } else if (cat === 'status' && spriteRotationEl) {
    const rot = isPlayerSide ? ATTACK_STATUS_ROTATION_DEG : -ATTACK_STATUS_ROTATION_DEG;
    tl.fromTo(spriteRotationEl,
      { filter: 'Brightness(1)', rotation: 0, scale: 1 },
      {
        rotation: rot,
        scale: ATTACK_STATUS_SCALE,
        filter: `Brightness(${ATTACK_STATUS_BRIGHTNESS})`,
        duration: ATTACK_STATUS_DURATION_SEC,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      }
    );
  }

  return tl;
}
