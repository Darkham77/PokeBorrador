import { gsap } from 'gsap';
import { gameBus } from '@/logic/events/gameBus';
import { WORLD_CONSTANTS, getCombatantPosition } from '@/logic/combat/spatialCoordinator';
import type { BattleCombatantProps } from '@/types/battle/battle';
import {
  COMBATANT_FAINT_Y_OFFSET,
  COMBATANT_FAINT_DURATION_SEC,
  ATTACK_DASH_DISTANCE_PX,
  ATTACK_PREP_DISTANCE_PX,
  ATTACK_PHYSICAL_PREP_DURATION_SEC,
  ATTACK_PHYSICAL_DASH_DURATION_SEC,
  ATTACK_PHYSICAL_RETURN_DURATION_SEC,
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

const FAINT_BLINK_STEPS: readonly { t: number; op: number }[] = [
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
const VOICE_MOVE_IDS_SET: ReadonlySet<string> = new Set(VOICE_MOVE_IDS);

const SELFKO_MOVE_IDS = [
  'selfdestruct', 'explosion', 'mindblown', 'mistyexplosion'
] as const;
const SELFKO_MOVE_IDS_SET: ReadonlySet<string> = new Set(SELFKO_MOVE_IDS);

export function buildFaintTimeline(
  spriteEl: HTMLElement,
  pokemon: BattleCombatantProps['pokemon'],
  shadowEl?: HTMLElement | null
): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.add(() => {
    if (pokemon) {
      gameBus.emit('PLAY_CRY', { name: pokemon.id, isFaint: true });
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

const SHADOW_HORIZONTAL_CENTER_FACTOR = 0.5;
const DEFAULT_SHADOW_GROUND_Y_RATIO = 0.75;
const PERCENT_TO_RATIO_DIVISOR = 100;

function computeAttackTrajectory(props: BattleCombatantProps): { nx: number; ny: number } {
  const isPlayerSide = props.side === 'player';

  const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2;
  const p1Base = (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_PLAYER: number }).BASE_ENTITY_SIZE_PLAYER;
  const p2Base = (WORLD_CONSTANTS as { BASE_ENTITY_SIZE_ENEMY: number }).BASE_ENTITY_SIZE_ENEMY;

  const groundRatio = props.groundY
    ? (parseFloat(props.groundY) / PERCENT_TO_RATIO_DIVISOR)
    : DEFAULT_SHADOW_GROUND_Y_RATIO;

  if (props.position && props.targetPosition) {
    const myBase = isPlayerSide ? p1Base : p2Base;
    const targetBase = isPlayerSide ? p2Base : p1Base;
    const mySize = myBase * scale;
    const targetSize = targetBase * scale;

    const myShadowX = props.position.x + (mySize * SHADOW_HORIZONTAL_CENTER_FACTOR);
    const myShadowY = props.position.y + (mySize * groundRatio);
    const targetShadowX = props.targetPosition.x + (targetSize * SHADOW_HORIZONTAL_CENTER_FACTOR);
    const targetShadowY = props.targetPosition.y + (targetSize * DEFAULT_SHADOW_GROUND_Y_RATIO);

    const dx = targetShadowX - myShadowX;
    const dy = targetShadowY - myShadowY;
    const length = Math.hypot(dx, dy);

    if (length > 0) {
      return {
        nx: dx / length,
        ny: dy / length
      };
    }
  }

  // Canonical standard virtual positions between player and enemy shadows
  const p1Pos = getCombatantPosition('player');
  const p2Pos = getCombatantPosition('enemy');
  const p1Size = p1Base * scale;
  const p2Size = p2Base * scale;

  const p1ShadowX = p1Pos.x + (p1Size * SHADOW_HORIZONTAL_CENTER_FACTOR);
  const p1ShadowY = p1Pos.y + (p1Size * (isPlayerSide ? groundRatio : DEFAULT_SHADOW_GROUND_Y_RATIO));
  const p2ShadowX = p2Pos.x + (p2Size * SHADOW_HORIZONTAL_CENTER_FACTOR);
  const p2ShadowY = p2Pos.y + (p2Size * (!isPlayerSide ? groundRatio : DEFAULT_SHADOW_GROUND_Y_RATIO));

  const dx = p2ShadowX - p1ShadowX;
  const dy = p2ShadowY - p1ShadowY;
  const length = Math.hypot(dx, dy);

  if (length > 0) {
    const ux = dx / length;
    const uy = dy / length;
    return isPlayerSide
      ? { nx: ux, ny: uy }
      : { nx: -ux, ny: -uy };
  }

  return {
    nx: isPlayerSide ? 1 : -1,
    ny: isPlayerSide ? ATTACK_DEFAULT_NY_PLAYER : ATTACK_DEFAULT_NY_ENEMY
  };
}

function appendSelfKoAnimation(tl: gsap.core.Timeline, spriteEl: HTMLElement): void {
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
}

function appendPhysicalAttackAnimation(tl: gsap.core.Timeline, spriteEl: HTMLElement, nx: number, ny: number): void {
  const dashDist = Math.abs(ATTACK_DASH_DISTANCE_PX);
  const prepDist = -Math.abs(ATTACK_PREP_DISTANCE_PX);

  tl.to(spriteEl, { x: nx * prepDist, y: ny * prepDist, duration: ATTACK_PHYSICAL_PREP_DURATION_SEC, ease: 'power1.out' })
    .to(spriteEl, { x: nx * dashDist, y: ny * dashDist, scale: ATTACK_SPECIAL_SCALE, duration: ATTACK_PHYSICAL_DASH_DURATION_SEC, ease: 'power2.out' })
    .to(spriteEl, { x: 0, y: 0, scale: 1, duration: ATTACK_PHYSICAL_RETURN_DURATION_SEC, ease: 'power1.inOut' });
}

function appendSpecialAttackAnimation(tl: gsap.core.Timeline, spriteEl: HTMLElement, nx: number, ny: number): void {
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
}

function appendStatusAttackAnimation(tl: gsap.core.Timeline, spriteRotationEl: HTMLElement, isPlayerSide: boolean): void {
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

  const cleanMoveId = move.id ?? '';
  if (VOICE_MOVE_IDS_SET.has(cleanMoveId) && props.pokemon) {
    tl.add(() => {
      gameBus.emit('PLAY_CRY', { name: props.pokemon!.id });
    });
  }

  const { nx, ny } = computeAttackTrajectory(props);

  const isSelfKo = Boolean(move.selfKO || SELFKO_MOVE_IDS_SET.has(cleanMoveId));
  if (isSelfKo) {
    appendSelfKoAnimation(tl, spriteEl);
  } else if (cat === 'physical' || !cat) {
    appendPhysicalAttackAnimation(tl, spriteEl, nx, ny);
  } else if (cat === 'special') {
    appendSpecialAttackAnimation(tl, spriteEl, nx, ny);
  } else if (cat === 'status' && spriteRotationEl) {
    appendStatusAttackAnimation(tl, spriteRotationEl, isPlayerSide);
  }

  return tl;
}
