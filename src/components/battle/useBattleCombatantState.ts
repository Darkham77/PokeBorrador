import { ref, computed, watch, onMounted, onUnmounted, toValue } from 'vue';
import gsap from 'gsap';
import { getAssetUrl, ASSET_TYPES, POKEMON_SPRITE_IDS } from '@/logic/services/assetService';
import {
  ANIMATED_SPRITE_DATABASE,
  MAX_ANIMATED_SPRITE_SIZE_FRONT,
  MAX_ANIMATED_SPRITE_SIZE_BACK,
  ANIMATED_VARIATION_FRAMES,
} from '@/data/animatedSpriteDatabase';
import { POKEMON_FEET_DATABASE } from '@/data/pokemonFeetDatabase';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { useCombatShadowStore } from '@/stores/combatShadows';
import { useBattleStore } from '@/stores/battle';
import { gameBus } from '@/logic/gameBus';
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator';
import type { Pokemon } from '@/types/pokemon';
import type { BattleStages } from '@/types/battle';

export interface SparkleData {
  id: string | number;
  tx: number;
  ty: number;
  tf: number;
  scale: number;
  delay: string;
}

export interface BattleCombatantProps {
  side: 'player' | 'enemy';
  pokemon?: Pokemon | null;
  position: { x: number; y: number };
  targetPosition?: { x: number; y: number } | null;
  baseSize: number;
  groundY?: string;
  shadowKey?: string | null;
  animState?: 'catching' | 'trapped' | 'releasing' | null;
  ballId?: string;
  isShaking?: boolean;
  isBlinking?: boolean;
  isHealing?: boolean;
  isSilhouette?: boolean;
  isAttacking?: boolean;
  activeMove?: {
    side: string;
    cat: 'physical' | 'special' | 'status' | 'selfKO';
    name: string;
    selfKO?: boolean;
  } | null;
  showGuides?: boolean;
  isCaptureSuccess?: boolean;
  sparkles?: SparkleData[];
  isFainting?: boolean;
  isEmerging?: boolean;
  suppressFX?: boolean;
  hidden?: boolean;
  hasSeat?: boolean;
  stages?: Partial<BattleStages>;
}

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

  const isFloating = computed(() => {
    if (!props.pokemon) return false;
    const data = pokemonDataProvider.getPokemonData(props.pokemon.id);
    if (!data) return false;
    if (data.isFloating !== undefined) return data.isFloating;
    const types: string[] = [];
    if (data.type) types.push(data.type.toLowerCase());
    if (data.type2) types.push(data.type2.toLowerCase());
    return types.includes('flying');
  });

  const isPlayer = computed(() => props.side === 'player');
  const isEnemy = computed(() => props.side === 'enemy');

  const spriteKey = computed(() => {
    if (!props.pokemon) return '';
    const id = props.pokemon.id;
    const stringId = String(id).toLowerCase();
    const num = (POKEMON_SPRITE_IDS as Record<string, number>)[stringId] || id;
    return String(num);
  });

  const idleKey = computed(() => {
    if (!spriteKey.value) return null;
    const match = spriteKey.value.match(/^(\d+)(.*)$/);
    if (!match) return null;
    const numId = match[1]!;
    const suffix = match[2]!;
    const isFemale = props.pokemon?.gender === 'F';

    const candidates = [`${numId}i${suffix}`, `${numId}${suffix}`];
    for (const cand of candidates) {
      if (isPlayer.value) {
        if (isFemale && ANIMATED_SPRITE_DATABASE[`${cand}_f_back`]) {
          return `${cand}_f_back`;
        }
        if (ANIMATED_SPRITE_DATABASE[`${cand}_back`]) {
          return `${cand}_back`;
        }
      } else {
        if (isFemale && ANIMATED_SPRITE_DATABASE[`${cand}_f`]) {
          return `${cand}_f`;
        }
        if (ANIMATED_SPRITE_DATABASE[cand]) {
          return cand;
        }
      }
    }
    return null;
  });

  const variationKey = computed(() => {
    if (!spriteKey.value) return null;
    const match = spriteKey.value.match(/^(\d+)(.*)$/);
    if (!match) return null;
    const numId = match[1]!;
    const suffix = match[2]!;
    const isFemale = props.pokemon?.gender === 'F';

    const cand = `${numId}v${suffix}`;
    if (isPlayer.value) {
      if (isFemale && ANIMATED_VARIATION_FRAMES[`${cand}_f_back`] !== undefined) {
        return `${cand}_f_back`;
      }
      if (ANIMATED_VARIATION_FRAMES[`${cand}_back`] !== undefined) {
        return `${cand}_back`;
      }
    } else {
      if (isFemale && ANIMATED_VARIATION_FRAMES[`${cand}_f`] !== undefined) {
        return `${cand}_f`;
      }
      if (ANIMATED_VARIATION_FRAMES[cand] !== undefined) {
        return cand;
      }
    }
    return null;
  });

  const isAnimated = computed(() => !!idleKey.value);

  const animatedMeta = computed(() => {
    if (!idleKey.value) return null;
    return ANIMATED_SPRITE_DATABASE[idleKey.value] || null;
  });

  const variationMeta = computed(() => {
    if (!variationKey.value) return null;
    const directMeta = ANIMATED_SPRITE_DATABASE[variationKey.value];
    if (directMeta) return directMeta;

    if (!animatedMeta.value) return null;
    const frames = ANIMATED_VARIATION_FRAMES[variationKey.value] || 0;
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

  const frames = computed(() => animatedMeta.value?.frames ?? 1);
  const frameSize = computed(() => animatedMeta.value?.size ?? 96);
  const scaleFactor = computed(() => {
    if (!animatedMeta.value) return 1.0;
    const maxSize = isPlayer.value ? MAX_ANIMATED_SPRITE_SIZE_BACK : MAX_ANIMATED_SPRITE_SIZE_FRONT;
    return animatedMeta.value.size / maxSize;
  });

  const displaySize = computed(() => {
    const sideMultiplier = props.side === 'enemy' ? 2 : 1.5;
    return Math.round(props.baseSize * scaleFactor.value * sideMultiplier);
  });

  const imageUrl = computed(() => {
    if (!props.pokemon) return '';
    return getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id, {
      isShiny: !!props.pokemon.isShiny,
      isBack: isPlayer.value,
      isAnimated: isAnimated.value,
    });
  });

  const feetPoints = computed(() => {
    if (isFloating.value) {
      return { feetX: 0.5, feetY: 0.9 };
    }
    if (isAnimated.value && animatedMeta.value) {
      return {
        feetX: animatedMeta.value.feetX ?? 0.5,
        feetY: animatedMeta.value.feetY ?? 0.9
      };
    }
    const url = imageUrl.value;
    if (!url) return { feetX: 0.5, feetY: 0.9 };
    
    let key = url;
    const base = import.meta.env.BASE_URL || '/';
    if (base !== '/' && url.startsWith(base)) {
      key = url.slice(base.length - 1);
    }
    try {
      key = decodeURIComponent(key);
    } catch (_e) {
      // ignore
    }
    
    const dbPoints = POKEMON_FEET_DATABASE[key];
    if (!dbPoints) {
      throw new Error(`[PokemonFeetDatabase] Sprite key "${key}" not found in POKEMON_FEET_DATABASE. Did you forget to compile assets? Run "npm run assets:convert".`);
    }
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
    const w = 10,
      h = 7;
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
    const cached = pokeballCoordsCache.get(cacheKey.value);
    if (cached) return cached.top;
    return props.groundY || '75%';
  });

  const fxScale = computed(() => props.baseSize / 100);

  const fxRadius = computed(() => {
    if (!animatedMeta.value) {
      return 25;
    }
    if (animatedMeta.value.bodyRadius === undefined) {
      throw new Error(`[useBattleCombatantState] bodyRadius is not defined in animated database for: ${props.pokemon?.id}`);
    }
    // bodyRadius [0-1] = half the body occupancy relative to the sprite frame.
    // The pokemon-atmosphere-wrapper has size displaySize * 2 px.
    // Radius as % of the wrapper = bodyRadius * 100 (so diameter = bodyRadius * 200%).
    return Math.max(10, Math.min(80, animatedMeta.value.bodyRadius * 100));
  });

  // Exposed so the BattleCombatant template can show/hide the inline poke-radius debug guide
  // without importing battleStore directly in the component.
  const debugShowPokeRadius = computed(() => battleStore.debugShowPokeRadius);

  const stickyCoords = computed(() => {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2;
    const entitySize = props.baseSize * scale;
    const offsetX = (feetPoints.value.feetX - 0.5) * entitySize;
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
    const offsetX = (feetX - 0.5) * entitySize;

    let floatOffset = 0;
    if (isFloating.value) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 690;
      floatOffset = isMobile ? 18 : 40;
    }

    return `calc(50% + ${offsetX}px) calc(${localGroundY.value} - ${floatOffset}px)`;
  };

  const getBallTargetCoords = () => {
    const scale = (WORLD_CONSTANTS as { OBJECT_SCALE: number }).OBJECT_SCALE || 2;
    const containerHeight = props.baseSize * scale;

    let floatOffset = 0;
    if (isFloating.value) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 690;
      floatOffset = isMobile ? 18 : 40;
    }

    const ballHeight = 40 * scale;
    const groundPct = parseFloat(localGroundY.value) / 100;
    const groundOffsetFromBottom = containerHeight * (groundPct - 1);

    const targetX = (feetPoints.value.feetX - 0.5) * (props.baseSize * scale);
    const targetY = groundOffsetFromBottom - ballHeight * 0.35 + floatOffset;

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

  const runEscapeAnimation = (type: 'teleport' | 'flee') => {
    if (!spriteRef.value) return;

    if (type === 'teleport') {
      gameBus.emit('PLAY_SOUND', 'flee');

      const tl = gsap.timeline();
      const tween = tl.to(spriteRef.value, {
        scaleY: 2.0,
        scaleX: 0.1,
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

      const count = 15;
      const list: SmokeParticle[] = [];
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        list.push({
          id: `smoke-${Temporal.Now.instant().epochMilliseconds}-${i}-${Math.random()}`,
          x: 0,
          y: -10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          scale: 1.0 + Math.random() * 1.5,
          opacity: 0.9,
        });
      }
      smokeParticles.value = list;

      const updateTicker = () => {
        let active = false;
        smokeParticles.value.forEach((p) => {
          p.x += p.vx;
          p.y += p.vy;
          p.opacity -= 0.03;
          p.scale += 0.02;
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
        x: 400,
        opacity: 0,
        scale: 0.7,
        duration: 0.45,
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
    const data = (e as CustomEvent).detail;
    if (data.side === props.side && (!data.pokemon || data.pokemon.uid === props.pokemon?.uid)) {
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
