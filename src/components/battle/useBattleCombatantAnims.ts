import { watch, type Ref, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { gameBus } from '@/logic/events/gameBus';
import type { BattleCombatantProps } from '@/types/battle/battle';
import { isFlying } from '@/composables/battle/useBattleShadows';
import { buildFaintTimeline, buildAttackTimeline } from './helpers/combatantActionAnims.ts';
import {
  POKEBALL_BLINK_BRIGHTNESS,
  POKEBALL_BLINK_HUE_ROTATE_DEG,
  POKEBALL_BLINK_DURATION_SEC,
  SCALE_ZERO,
  OPACITY_FULL,
} from '@/logic/constants/animations';
import {
  animateCombatantEmerging,
  animateCombatantHeal,
  animateCombatantRecoil,
  animatePokeballWobble,
  animatePokeballBlink,
  animateSpriteShake,
  animateSpriteBlink,
  animateStatusFlash,
  executeCatchingTween,
  executeReleasingTween
} from './helpers/combatantFeedbackAnims.ts';

import {
  isIdleSuppressed,
  getIdleFloatingConfig,
  getIdleGroundedConfig
} from './helpers/combatantIdleAnims.ts';

import {
  onSparkleEnter,
  onBallEnter,
  onBallLeave
} from './helpers/combatantSparkleBallHooks.ts';

export { onSparkleEnter, onBallEnter, onBallLeave };

const POKEBALL_SEPIA_RATIO = 0.5;

export function useBattleCombatantAnims(
  props: BattleCombatantProps,
  spriteRef: Ref<HTMLElement | null>,
  spriteRotationRef: Ref<HTMLElement | null>,
  shadowWrapperRef: Ref<HTMLElement | null>,
  pokeballImgRef: Ref<HTMLImageElement | null>,
  idleWrapperRef: Ref<HTMLElement | null>,
  getSpriteFeetOrigin: () => string,
  getBallTargetCoords: () => { x: number; y: number },
  wasCaptured: Ref<boolean>
) {
  let successBlinkTween: gsap.core.Tween | null = null;
  let idleTween: gsap.core.Tween | null = null;

  const isFloating = computed(() => {
    if (!props.pokemon) return false;
    return isFlying(props.pokemon);
  });

  const initIdleAnim = () => {
    if (!idleWrapperRef.value || !props.pokemon) return;
    if (idleTween) {
      idleTween.kill();
      idleTween = null;
    }

    gsap.killTweensOf(idleWrapperRef.value);

    if (isIdleSuppressed(props.pokemon.status, props.pokemon.confused, props.animState)) {
      gsap.set(idleWrapperRef.value, { y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
      return;
    }

    if (isFloating.value) {
      gsap.set(idleWrapperRef.value, { scaleX: 1, scaleY: 1 });
      idleTween = gsap.to(idleWrapperRef.value, getIdleFloatingConfig());
    } else {
      gsap.set(idleWrapperRef.value, { y: 0 });
      idleTween = gsap.to(idleWrapperRef.value, getIdleGroundedConfig());
    }
  };

  watch(() => [props.pokemon?.status, props.pokemon?.confused, props.animState, isFloating.value], () => {
    if (idleWrapperRef.value) initIdleAnim();
  }, { deep: true });

  watch(idleWrapperRef, (el) => {
    if (el) initIdleAnim();
  });

  let activeBallAnim: string | null = null;

  const triggerBallAnimation = (val: string | null) => {
    if (!spriteRef.value || !val) {
      activeBallAnim = null;
      return;
    }
    if (activeBallAnim === val) return;
    activeBallAnim = val;

    const origin = getSpriteFeetOrigin();
    const coords = getBallTargetCoords();
    const animKey = `${props.side}-${props.pokemon?.uid || 'active'}`;

    if (val === 'catching') {
      const tween = executeCatchingTween(
        spriteRef.value,
        shadowWrapperRef.value,
        spriteRotationRef.value,
        origin,
        coords,
        () => { activeBallAnim = null; }
      );
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween });
    } else if (val === 'releasing') {
      const pokeName = props.pokemon ? (props.pokemon.id || props.pokemon.name) : undefined;
      const tween = executeReleasingTween(
        spriteRef.value,
        shadowWrapperRef.value,
        spriteRotationRef.value,
        origin,
        coords,
        pokeName,
        () => { activeBallAnim = null; }
      );
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween });
    }
  };

  watch(() => props.animState, (val) => {
    if ((val === 'releasing' || val === 'catching') && spriteRef.value) {
      const origin = getSpriteFeetOrigin();
      const coords = getBallTargetCoords();
      gsap.killTweensOf(spriteRef.value);
      if (spriteRotationRef.value) {
        gsap.set(spriteRotationRef.value, { rotation: 0, clearProps: 'transform,rotation' });
      }
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { display: 'none' });
      }
      if (val === 'releasing') {
        gsap.set(spriteRef.value, {
          transformOrigin: origin,
          x: coords.x,
          y: coords.y,
          scale: SCALE_ZERO,
          opacity: OPACITY_FULL,
          filter: 'url(#pixel-energy-optimized)'
        });
      } else if (val === 'catching') {
        gsap.set(spriteRef.value, {
          transformOrigin: origin,
          x: 0,
          y: 0,
          scale: 1,
          opacity: OPACITY_FULL,
          filter: 'url(#pixel-energy-optimized)'
        });
      }
    }
    nextTick(() => triggerBallAnimation(val || null));
  }, { immediate: true });

  watch(spriteRef, (newEl) => {
    if (newEl && props.animState) {
      nextTick(() => triggerBallAnimation(props.animState || null));
    }
  });

  watch(() => props.isEmerging, (val) => {
    const target = idleWrapperRef.value || spriteRef.value;
    if (val && target) {
      animateCombatantEmerging(target);
    }
  });

  watch(() => props.isFainting, (val) => {
    if (val && spriteRef.value) {
      buildFaintTimeline(spriteRef.value, props.pokemon, shadowWrapperRef.value);
    } else if (!val && spriteRef.value) {
      gsap.set(spriteRef.value, { clearProps: 'opacity,y,transition' });
      if (shadowWrapperRef.value) {
        gsap.set(shadowWrapperRef.value, { clearProps: 'display' });
      }
    }
  });

  watch(() => {
    if (!props.isAttacking || !props.activeMove) return null;
    return `${props.isAttacking}-${props.activeMove.name}-${props.activeMove.cat}`;
  }, (newVal) => {
    if (newVal && spriteRef.value) {
      const tl = buildAttackTimeline(spriteRef.value, spriteRotationRef.value, props);
      if (tl) {
        const animKey = `attack-${props.side}`;
        gameBus.emit('REGISTER_TWEEN', { key: animKey, tween: tl });
      }
    }
  });

  watch(() => props.pokemon?.status, (newS, oldS) => {
    if (!spriteRotationRef.value) return;

    if (newS && newS !== oldS) {
      animateStatusFlash(spriteRotationRef.value, newS);
    } else if (!newS && oldS) {
      gsap.killTweensOf(spriteRotationRef.value, 'filter');
      gsap.set(spriteRotationRef.value, { clearProps: 'filter' });
    }
  });

  watch(() => props.isShaking, (shaking) => {
    if (pokeballImgRef.value) {
      if (shaking) animatePokeballWobble(pokeballImgRef.value);
    } else if (!props.isCaptureSuccess) {
      if (shaking && spriteRef.value) {
        animateSpriteShake(spriteRef.value, props.side === 'player');
      }
    }
  });

  watch(() => props.isBlinking, (blinking) => {
    if (pokeballImgRef.value) {
      if (blinking) animatePokeballBlink(pokeballImgRef.value);
    } else if (!props.isCaptureSuccess) {
      if (blinking && spriteRef.value) {
        animateSpriteBlink(spriteRef.value, props.side === 'player');
      }
    }
  });

  watch(() => props.isHealing, (val) => {
    if (val && spriteRotationRef.value) {
      animateCombatantHeal(spriteRotationRef.value);
    }
  });

  watch(() => props.isCaptureSuccess, (success) => {
    if (success) {
      wasCaptured.value = true;
    }
    if (!pokeballImgRef.value) return;
    if (success) {
      successBlinkTween = gsap.fromTo(pokeballImgRef.value,
        { filter: 'Brightness(1)' },
        { filter: `Brightness(${POKEBALL_BLINK_BRIGHTNESS}) Sepia(${POKEBALL_SEPIA_RATIO}) Hue-Rotate(${POKEBALL_BLINK_HUE_ROTATE_DEG}deg)`, duration: POKEBALL_BLINK_DURATION_SEC, yoyo: true, repeat: -1, ease: 'power1.inOut' }
      );
    } else {
      if (successBlinkTween) {
        successBlinkTween.kill();
        successBlinkTween = null;
      }
      gsap.set(pokeballImgRef.value, { clearProps: 'filter' });
    }
  });

  const onRecoilEvent = (e: Event) => {
    const data = (e as CustomEvent).detail as { side?: string } | undefined;
    if (data?.side === props.side && spriteRef.value) {
      animateCombatantRecoil(spriteRef.value, props.side === 'player');
    }
  };

  onMounted(() => {
    gameBus.on('PLAY_RECOIL', onRecoilEvent);
  });

  onUnmounted(() => {
    gameBus.off('PLAY_RECOIL', onRecoilEvent);
  });
}


