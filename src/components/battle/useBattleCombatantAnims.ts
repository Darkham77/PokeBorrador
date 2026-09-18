import { watch, type Ref, nextTick, computed, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { gameBus } from '@/logic/events/gameBus';
import type { BattleCombatantProps } from '@/types/battle/battle';
import { isFlying } from '@/composables/battle/useBattleShadows';
import { buildFaintTimeline, buildAttackTimeline } from './helpers/combatantActionAnims.ts';
import {
  animateCombatantEmerging,
  animateCombatantHeal,
  animateCombatantRecoil,
  animateStatusFlash,
  dispatchBallAnimation,
  handleCombatantShake,
  handleCombatantBlink,
  togglePokeballCaptureSuccess,
  prepareBallTransition
} from './helpers/combatantFeedbackAnims.ts';

import {
  isIdleSuppressed,
  runCombatantIdleAnimation
} from './helpers/combatantIdleAnims.ts';

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
    const el = idleWrapperRef.value;
    const poke = props.pokemon;
    if (!el || !poke) return;
    if (idleTween) {
      idleTween.kill();
      idleTween = null;
    }
    const suppressed = isIdleSuppressed(poke.status, poke.confused, props.animState);
    idleTween = runCombatantIdleAnimation(el, suppressed, isFloating.value);
  };

  watch(() => [props.pokemon?.status, props.pokemon?.confused, props.animState, isFloating.value], () => {
    if (idleWrapperRef.value) initIdleAnim();
  }, { deep: true });

  watch(idleWrapperRef, (el) => {
    if (el) initIdleAnim();
  });

  let activeBallAnim: string | null = null;
  const resetActiveBall = () => {
    activeBallAnim = null;
  };

  const canAnimateBall = (sprite: HTMLElement | null, val: string): sprite is HTMLElement => {
    if (!sprite) {
      resetActiveBall();
      return false;
    }
    if (activeBallAnim === val) return false;
    activeBallAnim = val;
    return true;
  };

  const triggerBallAnimation = (val: string | null) => {
    const sprite = spriteRef.value;
    if (!val || (val !== 'catching' && val !== 'releasing')) {
      if (val !== 'trapped') {
        resetActiveBall();
      }
      return;
    }
    if (!canAnimateBall(sprite, val)) return;

    dispatchBallAnimation(val, props.side, props.pokemon, {
      sprite,
      shadow: shadowWrapperRef.value,
      rotation: spriteRotationRef.value,
      origin: getSpriteFeetOrigin(),
      coords: getBallTargetCoords(),
      onDone: resetActiveBall
    });
  };

  watch(() => props.animState, (val) => {
    const sprite = spriteRef.value;
    if ((val === 'releasing' || val === 'catching') && sprite) {
      const origin = getSpriteFeetOrigin();
      const coords = getBallTargetCoords();
      prepareBallTransition(sprite, spriteRotationRef.value, shadowWrapperRef.value, origin, coords, val === 'releasing');
      nextTick(() => triggerBallAnimation(val));
    } else {
      if (val !== 'trapped') {
        resetActiveBall();
      }
    }
  }, { immediate: true });

  watch(spriteRef, (newEl) => {
    if (newEl && (props.animState === 'catching' || props.animState === 'releasing')) {
      nextTick(() => triggerBallAnimation(props.animState ?? null));
    }
  });

  watch(() => props.isEmerging, (val) => {
    const target = idleWrapperRef.value || spriteRef.value;
    if (val && target) {
      animateCombatantEmerging(target);
    }
  });

  watch(() => props.isFainting, (val) => {
    const sprite = spriteRef.value;
    if (!sprite) return;
    if (val) {
      buildFaintTimeline(sprite, props.pokemon, shadowWrapperRef.value);
      return;
    }
    gsap.set(sprite, { clearProps: 'opacity,y,transition' });
    if (shadowWrapperRef.value) {
      gsap.set(shadowWrapperRef.value, { clearProps: 'display' });
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
    const rot = spriteRotationRef.value;
    if (!rot || newS === oldS) return;

    if (newS) {
      animateStatusFlash(rot, newS);
    } else {
      gsap.killTweensOf(rot, 'filter');
      gsap.set(rot, { clearProps: 'filter' });
    }
  });

  watch(() => props.isShaking, (shaking) => {
    handleCombatantShake(pokeballImgRef.value, spriteRef.value, Boolean(props.isCaptureSuccess), props.side === 'player', Boolean(shaking));
  });

  watch(() => props.isBlinking, (blinking) => {
    handleCombatantBlink(pokeballImgRef.value, spriteRef.value, Boolean(props.isCaptureSuccess), props.side === 'player', Boolean(blinking));
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
    const ball = pokeballImgRef.value;
    if (!ball) return;
    successBlinkTween = togglePokeballCaptureSuccess(ball, Boolean(success), successBlinkTween);
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


