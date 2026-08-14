import { ref, computed, watch, onMounted, onUnmounted, toValue } from 'vue';
import type { Pokemon } from '@/types/pokemon/pokemon';
import gsap from 'gsap';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { requirePokemonSpriteValue } from '@/data/pokemon/spriteMapping';
import { COMBATANT_FAINT_Y_OFFSET, DEFAULT_AVATAR_SIZE_PX } from '@/logic/constants/animations';
import {
  MAX_ANIMATED_SPRITE_SIZE_FRONT,
  MAX_ANIMATED_SPRITE_SIZE_BACK,
  hasAnimatedSpriteId,
  hasAnimatedVariationId,
  requireAnimatedSpriteData,
  requireAnimatedVariationFrameCount,
  type AnimatedSpriteId,
  type AnimatedVariationId,
} from '@/data/pokemon/animatedSpriteDatabase';
import { requireFeetPoints } from '@/data/pokemon/pokemonFeetDatabase';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { useCombatShadowStore } from '@/stores/battle/combatShadows';
import { useBattleStore } from '@/stores/battle/battle';
import { gameBus } from '@/logic/events/gameBus';
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator';
import type { BattleCombatantProps, BattleEscapeType } from '@/types/battle/battle';
import {
  COMBATANT_DISPLAY_SIZE_ENEMY_MULT,
  COMBATANT_DISPLAY_SIZE_PLAYER_MULT,
  POKEBALL_SHADOW_CANVAS_WIDTH_PX,
  POKEBALL_SHADOW_CANVAS_HEIGHT_PX,
  SMOKE_PARTICLE_BURST_COUNT,
  SMOKE_PARTICLE_FADE_RATE,
  SMOKE_PARTICLE_EXPANSION_RATE,
  FLEE_SLIDE_DISTANCE_PX
} from '@/logic/constants/animations';

const DEFAULT_FEET_X_RATIO = 0.5;
const DEFAULT_FEET_Y_RATIO = 0.9;
const DEFAULT_FRAME_SIZE_PX = 96;

const SMOKE_BASE_SPEED = 1.5;
const SMOKE_SPEED_VARIANCE = 3;
const SMOKE_INITIAL_Y_OFFSET_PX = -10;
const SMOKE_VY_UPWARD_BIAS = 1.5;
const SMOKE_BASE_SCALE = 1.0;
const SMOKE_SCALE_VARIANCE = 1.5;
const SMOKE_INITIAL_OPACITY = 0.9;
const COMBATANT_SCALE_FACTOR_BASE = 1.0;
const SINGLE_FRAME_FALLBACK = 1;
const PATH_SLICE_OFFSET = 1;
const DEFAULT_FX_RADIUS_PX = 25;
const FX_RADIUS_BOUND_MIN = 10;
const FX_RADIUS_BOUND_MAX = 80;
const FLEE_SLIDE_DURATION_SEC = 0.45;


interface SmokeParticle {
  id: string | number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  opacity: number;
}

// Persistent cache for Pokéball coordinates and raw coordinates
const pokeballCoordsCache = new Map<string, { top: string; left: string }>();
const rawCoordsCache = new Map<string, { x: number; y: number }>();

import { toPokemonType, type PokemonType } from '@/data/battle/types';

function checkPokemonFloating(pokemon: Pokemon | null | undefined): boolean {
  if (!pokemon) return false;
  const data = pokemonDataProvider.getPokemonData(pokemon.id);
  if (!data) return false;
  if (data.isFloating !== undefined) return data.isFloating;
  const types: PokemonType[] = [];
  if (data.type) types.push(toPokemonType(data.type));
  if (data.type2) types.push(toPokemonType(data.type2));
  return types.includes('flying');
}

function resolveSpriteKey(pokemon: Pokemon | null | undefined): string {
  if (!pokemon) return '';
  const formSuffix = pokemon.form && pokemon.form !== 'normal' ? `-${pokemon.form}` : '';
  const id = `${pokemon.id}${formSuffix}`;
  const stringId = String(id).toLowerCase();
  return String(requirePokemonSpriteValue(stringId));
}

function determineIdleSpriteKey(spriteKeyVal: string, isPlayerSide: boolean, gender?: string | null): AnimatedSpriteId | null {
  if (!spriteKeyVal) return null;
  const match = spriteKeyVal.match(/^(\d+)(.*)$/);
  if (!match) return null;
  const numId = match[1]!;
  const suffix = match[2]!;
  const isFemale = gender === 'f';

  const candidates = [`${numId}i${suffix}`, `${numId}${suffix}`]; // no-domain
  for (const cand of candidates) {
    if (isPlayerSide) {
      const femaleBack = `${cand}_f_back`;
      const back = `${cand}_back`;
      if (isFemale && hasAnimatedSpriteId(femaleBack)) return femaleBack;
      if (hasAnimatedSpriteId(back)) return back;
    } else {
      const femaleFront = `${cand}_f`;
      if (isFemale && hasAnimatedSpriteId(femaleFront)) return femaleFront;
      if (hasAnimatedSpriteId(cand)) return cand;
    }
  }
  return null;
}

export function useBattleCombatantState(
  props: BattleCombatantProps,
  emit: (e: 'load', size: { w: number; h: number }) => void,
  spriteRef: { value: HTMLElement | null }
) {
  const naturalSize = ref({ w: 0, h: 0 });
  const seatKey = computed(() => `${props.side}-${props.position.x}-${props.position.y}`);
  const cacheKey = computed(() => {
    if (props.pokemon) {
      return props.pokemon.uid || `${props.side}-${props.pokemon.id}`;
    }
    return seatKey.value;
  });

  const isFloating = computed(() => checkPokemonFloating(props.pokemon));
  const isPlayer = computed(() => props.side === 'player');
  const isEnemy = computed(() => props.side === 'enemy');
  const spriteKey = computed(() => resolveSpriteKey(props.pokemon));
  const idleKey = computed(() => determineIdleSpriteKey(spriteKey.value, isPlayer.value, props.pokemon?.gender));

  const variationKey = computed<AnimatedVariationId | null>(() => {
    if (!spriteKey.value) return null;
    const match = spriteKey.value.match(/^(\d+)(.*)$/);
    if (!match) return null;
    const numId = match[1]!;
    const suffix = match[2]!;
    const isFemale = props.pokemon?.gender === 'f';

    const cand = `${numId}v${suffix}`;
    if (isPlayer.value) {
      const femaleBack = `${cand}_f_back`;
      const back = `${cand}_back`;
      if (isFemale && hasAnimatedVariationId(femaleBack)) {
        return femaleBack;
      }
      if (hasAnimatedVariationId(back)) {
        return back;
      }
    } else {
      const femaleFront = `${cand}_f`;
      if (isFemale && hasAnimatedVariationId(femaleFront)) {
        return femaleFront;
      }
      if (hasAnimatedVariationId(cand)) {
        return cand;
      }
    }
    return null;
  });

  const isAnimated = computed(() => !!idleKey.value);

  const animatedMeta = computed(() => {
    if (!idleKey.value) return null;
    return requireAnimatedSpriteData(idleKey.value);
  });

  const variationMeta = computed(() => {
    if (!variationKey.value) return null;
    if (hasAnimatedSpriteId(variationKey.value)) {
      return requireAnimatedSpriteData(variationKey.value);
    }

    if (!animatedMeta.value) return null;
    const frames = requireAnimatedVariationFrameCount(variationKey.value);
    return {
      frames,
      size: animatedMeta.value.size,
      feetY: animatedMeta.value.feetY,
      feetX: animatedMeta.value.feetX,
      bodyH: animatedMeta.value.bodyH,
      bodyW: animatedMeta.value.bodyW,
      bodyRadius: animatedMeta.value.bodyRadius
    };
  });

  const frames = computed(() => animatedMeta.value?.frames ?? SINGLE_FRAME_FALLBACK);
  const frameSize = computed(() => animatedMeta.value?.size ?? DEFAULT_FRAME_SIZE_PX);
  const scaleFactor = computed(() => {
    if (!animatedMeta.value) return COMBATANT_SCALE_FACTOR_BASE;
    const maxSize = isPlayer.value ? MAX_ANIMATED_SPRITE_SIZE_BACK : MAX_ANIMATED_SPRITE_SIZE_FRONT;
    return animatedMeta.value.size / maxSize;
  });

  const displaySize = computed(() => {
    const sideMultiplier = props.side === 'enemy' ? COMBATANT_DISPLAY_SIZE_ENEMY_MULT : COMBATANT_DISPLAY_SIZE_PLAYER_MULT;
    return Math.round(props.baseSize * scaleFactor.value * sideMultiplier);
  });

  const imageUrl = computed(() => {
    if (!props.pokemon) return '';
    const spriteId = props.pokemon.form && props.pokemon.form !== 'normal' ? `${props.pokemon.id}-${props.pokemon.form}` : props.pokemon.id
    return getAssetUrl(ASSET_TYPES.POKEMON, spriteId, {
      isShiny: !!props.pokemon.isShiny,
      isBack: isPlayer.value,
      isAnimated: isAnimated.value,
    });
  });

  const feetPoints = computed(() => {
    if (isFloating.value) {
      return { feetX: DEFAULT_FEET_X_RATIO, feetY: DEFAULT_FEET_Y_RATIO };
    }
    if (isAnimated.value && animatedMeta.value) {
      return {
        feetX: animatedMeta.value.feetX ?? DEFAULT_FEET_X_RATIO,
        feetY: animatedMeta.value.feetY ?? DEFAULT_FEET_Y_RATIO
      };
    }
    const url = imageUrl.value;
    if (!url) return { feetX: DEFAULT_FEET_X_RATIO, feetY: DEFAULT_FEET_Y_RATIO };
    
    let key = url;
    const base = import.meta.env.BASE_URL || '/';
    if (base !== '/' && url.startsWith(base)) {
      key = url.slice(base.length - PATH_SLICE_OFFSET);
    }
    try {
      key = decodeURIComponent(key);
    } catch (e) {
      throw new Error(`[useBattleCombatantState] Error decoding sprite URL '${key}': ${String(e)}`);
    }
    
    const dbPoints = requireFeetPoints(key);
    return {
      feetX: dbPoints.feetX,
      feetY: dbPoints.feetY
    };
  });

  const getAttackAnimClass = computed(() => {
    if (!props.isAttacking || !props.activeMove) return '';
    const move = props.activeMove;
    if (move.side !== props.side) return '';
    if (move.cat === 'physical') return 'atk-physical';
    if (move.cat === 'special') return 'atk-special';
    if (move.cat === 'status') return 'atk-status';
    return 'atk-default';
  });

  const pokeballShadowUrl = computed(() => {
    if (typeof document === 'undefined') return '';
    const w = POKEBALL_SHADOW_CANVAS_WIDTH_PX,
      h = POKEBALL_SHADOW_CANVAS_HEIGHT_PX;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return `url(${canvas.toDataURL('image/png')})`;
  });

  const shadowStore = useCombatShadowStore();
  const battleStore = useBattleStore();
  const currentShadow = computed(() => (props.shadowKey ? shadowStore.activeShadows.get(props.shadowKey) : null));

  const localGroundY = computed(() => {
    // Ground line is fixed at 75% from top (= 25% from bottom of the entity box).
    // feetY from the DB is only used to ALIGN the sprite vertically (offset in the top calc).
    // It must NOT define where the ground line itself lives inside the entity box.
const DEFAULT_GROUND_LINE_FALLBACK_PERCENT = '75%';

    const cached = pokeballCoordsCache.get(cacheKey.value);
    if (cached) return cached.top;
    return props.groundY || DEFAULT_GROUND_LINE_FALLBACK_PERCENT;
  });

  const fxScale = computed(() => props.baseSize / 100);

  const fxRadius = computed(() => {
    if (!animatedMeta.value) {
      return DEFAULT_FX_RADIUS_PX;
    }
    if (animatedMeta.value.bodyRadius === undefined) {
      throw new Error(`[useBattleCombatantState] bodyRadius is not defined in animated database for: ${props.pokemon?.id}`);
    }
    // bodyRadius [0-1] = half the body occupancy relative to the sprite frame.
    // The pokemon-atmosphere-wrapper has size displaySize * 2 px.
    // Radius as % of the wrapper = bodyRadius * 100 (so diameter = bodyRadius * 200%).
    return Math.max(FX_RADIUS_BOUND_MIN, Math.min(FX_RADIUS_BOUND_MAX, animatedMeta.value.bodyRadius * 100));
  });

  // Exposed so the BattleCombatant template can show/hide the inline poke-radius debug guide
  // without importing battleStore directly in the component.
  const debugShowPokeRadius = computed(() => battleStore.debugShowPokeRadius);

  const stickyCoords = computed(() => {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2;
    const entitySize = props.baseSize * scale;
    const offsetX = (feetPoints.value.feetX - DEFAULT_FEET_X_RATIO) * entitySize;
    const left = `calc(50% + ${offsetX}px)`;
    const top = localGroundY.value;
    return { top, left };
  });

  const isBallVisible = computed(() => {
    return (
      props.animState === 'trapped' ||
      props.animState === 'catching' ||
      props.animState === 'releasing' ||
      !!props.isCaptureSuccess
    );
  });

  const wasCaptured = ref(false);
  const internalBallId = ref('pokeball');
  const memorizedBallCoords = ref({ top: '90%', left: '50%' });

  const getSpriteFeetOrigin = () => {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2;
    const entitySize = props.baseSize * scale;
    const feetX = feetPoints.value.feetX;
    const offsetX = (feetX - DEFAULT_FEET_X_RATIO) * entitySize;

    let floatOffset = 0;
    if (isFloating.value) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 690;
      floatOffset = isMobile ? COMBATANT_FAINT_Y_OFFSET / 3 : DEFAULT_AVATAR_SIZE_PX;
    }

const FEET_ORIGIN_CENTER_X_PERCENT = 50;

    return `calc(${FEET_ORIGIN_CENTER_X_PERCENT}% + ${offsetX}px) calc(${localGroundY.value} - ${floatOffset}px)`;
  };

const BALL_TARGET_Y_OFFSET_RATIO = 0.35;
const BALL_TARGET_X_CENTER_OFFSET = 0.5;

  const getBallTargetCoords = () => {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2;
    const containerHeight = props.baseSize * scale;

    let floatOffset = 0;
    if (isFloating.value) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 690;
      floatOffset = isMobile ? COMBATANT_FAINT_Y_OFFSET / 3 : DEFAULT_AVATAR_SIZE_PX;
    }

    const ballHeight = DEFAULT_AVATAR_SIZE_PX * scale;
    const groundPct = parseFloat(localGroundY.value) / 100;
    const groundOffsetFromBottom = containerHeight * (groundPct - 1);

    const targetX = (feetPoints.value.feetX - BALL_TARGET_X_CENTER_OFFSET) * (props.baseSize * scale);
    const targetY = groundOffsetFromBottom - ballHeight * BALL_TARGET_Y_OFFSET_RATIO + floatOffset;

    return { x: targetX, y: targetY };
  };

  watch(
    () => [isBallVisible.value, stickyCoords.value] as const,
    ([visible]) => {
      if (visible) {
        internalBallId.value = props.ballId || 'pokeball';
        const newCoords = { ...stickyCoords.value };
        memorizedBallCoords.value = newCoords;
        pokeballCoordsCache.set(cacheKey.value, newCoords);
        rawCoordsCache.set(cacheKey.value, getBallTargetCoords());
      } else {
        const cached = pokeballCoordsCache.get(cacheKey.value);
        if (cached) {
          memorizedBallCoords.value = { ...cached };
        }
      }
    },
    { immediate: true, deep: true }
  );

  const handleImageError = (e: Event) => {
    (e.target as HTMLImageElement).src = getAssetUrl(ASSET_TYPES.ENVIRONMENT, 'bush-1');
  };

  const handleBallError = () => {
    throw new Error(`[BattleCombatant] Failed to load Pokeball image asset for ID: ${props.ballId}`);
  };

  const handleLoad = (e: Event) => {
    const target = e.target as HTMLImageElement;
    naturalSize.value = { w: target.naturalWidth, h: target.naturalHeight };
    emit('load', naturalSize.value);
  };

  // Escape Smoke Particles
  const smokeParticles = ref<SmokeParticle[]>([]);

  const runEscapeAnimation = (type: BattleEscapeType) => {
    if (!spriteRef.value) return;

const GSAP_TELEPORT_SCALEY_TARGET = 2.0;
const GSAP_TELEPORT_SCALEX_TARGET = 0.1;

    if (type === 'teleport') {
      gameBus.emit('PLAY_SOUND', 'flee');

      const tl = gsap.timeline();
      const tween = tl.to(spriteRef.value, {
        scaleY: GSAP_TELEPORT_SCALEY_TARGET,
        scaleX: GSAP_TELEPORT_SCALEX_TARGET,
        opacity: 0,
        filter: 'brightness(3) contrast(1.5)',
        duration: 0.4,
        ease: 'power3.in',
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { clearProps: 'scale,transform,filter' });
          }
        },
      });
      const animKey = `escape-${props.side}`;
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween });
    } else {
      gameBus.emit('PLAY_SOUND', 'flee');

      const count = SMOKE_PARTICLE_BURST_COUNT;
      const list: SmokeParticle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = SMOKE_BASE_SPEED + Math.random() * SMOKE_SPEED_VARIANCE;
        list.push({
          id: `smoke-${Temporal.Now.instant().epochMilliseconds}-${i}-${Math.random()}`,
          x: 0,
          y: SMOKE_INITIAL_Y_OFFSET_PX,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - SMOKE_VY_UPWARD_BIAS,
          scale: SMOKE_BASE_SCALE + Math.random() * SMOKE_SCALE_VARIANCE,
          opacity: SMOKE_INITIAL_OPACITY,
        });
      }
      smokeParticles.value = list;

      const updateTicker = () => {
        let active = false;
        smokeParticles.value.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.opacity -= SMOKE_PARTICLE_FADE_RATE;
          p.scale += SMOKE_PARTICLE_EXPANSION_RATE;
          if (p.opacity > 0) active = true;
        });

        if (active) {
          requestAnimationFrame(updateTicker);
        } else {
          smokeParticles.value = [];
        }
      };
      requestAnimationFrame(updateTicker);

      const tween = gsap.to(spriteRef.value, {
        x: FLEE_SLIDE_DISTANCE_PX,
        opacity: 0,
        scale: 0.7,
        duration: FLEE_SLIDE_DURATION_SEC,
        ease: 'power2.in',
        onComplete: () => {
          if (spriteRef.value) {
            gsap.set(spriteRef.value, { clearProps: 'scale,transform,x' });
          }
        },
      });
      const animKey = `escape-${props.side}`;
      gameBus.emit('REGISTER_TWEEN', { key: animKey, tween });
    }
  };

  const handleEscapeEvent = (e: Event) => {
    const data = (e as CustomEvent).detail as { side: string; pokemon?: Pokemon | null; type: BattleEscapeType } | undefined;
    if (data && data.side === props.side && (!data.pokemon || data.pokemon.uid === props.pokemon?.uid)) {
      const stateVal = toValue(battleStore.state);
      const isTrainerCombat = !!stateVal?.isTrainer || !!stateVal?.isGym;
      if (isTrainerCombat) return;
      runEscapeAnimation(data.type);
    }
  };

  onMounted(() => {
    gameBus.on('TRIGGER_COMBATANT_ESCAPE', handleEscapeEvent);
  });

  onUnmounted(() => {
    gameBus.off('TRIGGER_COMBATANT_ESCAPE', handleEscapeEvent);
  });

  return {
    naturalSize,
    cacheKey,
    isFloating,
    isPlayer,
    isEnemy,
    imageUrl,
    getAttackAnimClass,
    pokeballShadowUrl,
    localGroundY,
    fxScale,
    fxRadius,
    debugShowPokeRadius,
    isBallVisible,
    wasCaptured,
    internalBallId,
    memorizedBallCoords,
    getSpriteFeetOrigin,
    getBallTargetCoords,
    rawCoordsCache,
    handleImageError,
    handleBallError,
    handleLoad,
    smokeParticles,
    isAnimated,
    frames,
    frameSize,
    scaleFactor,
    displaySize,
    currentShadow,
    feetPoints,
    idleKey,
    variationKey,
    variationMeta
  };
}
