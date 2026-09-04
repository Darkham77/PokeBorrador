import { computed } from 'vue';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { requirePokemonSpriteValue } from '@/data/pokemon/spriteMapping';
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
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { BattleCombatantProps } from '@/types/battle/battle';
import {
  COMBATANT_DISPLAY_SIZE_ENEMY_MULT,
  COMBATANT_DISPLAY_SIZE_PLAYER_MULT
} from '@/logic/constants/animations';
import { toPokemonType, type PokemonType } from '@/data/battle/types';

const DEFAULT_FRAME_SIZE_PX = 96;
const COMBATANT_SCALE_FACTOR_BASE = 1.0;
const SINGLE_FRAME_FALLBACK = 1;
const PATH_SLICE_OFFSET = 1;

const MIN_SPECIES_SIZE_SCALE = 0.20;
const MAX_SPECIES_SIZE_SCALE = 1.0;
const MIN_SPECIES_SPRITE_SIZE_PX = 45;
const MAX_SPECIES_SPRITE_SIZE_PX = 95;
const SPECIES_SCALE_RANGE = 0.80;
const SPECIES_SIZE_DELTA = 50;

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

  const candidates = [`${numId}i${suffix}`, `${numId}${suffix}`]; // no-domain: Non-domain utility collection or data structure
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

export function useCombatantVisualSprite(props: BattleCombatantProps) {
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
    const frameCount = requireAnimatedVariationFrameCount(variationKey.value);
    return {
      frames: frameCount,
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

  const speciesSizeScale = computed(() => {
    if (!animatedMeta.value) return MAX_SPECIES_SIZE_SCALE;
    const size = animatedMeta.value.size;
    const clampedSize = Math.max(MIN_SPECIES_SPRITE_SIZE_PX, Math.min(MAX_SPECIES_SPRITE_SIZE_PX, size));
    const normalized = MIN_SPECIES_SIZE_SCALE + (clampedSize - MIN_SPECIES_SPRITE_SIZE_PX) * (SPECIES_SCALE_RANGE / SPECIES_SIZE_DELTA);
    return Math.min(MAX_SPECIES_SIZE_SCALE, Math.max(MIN_SPECIES_SIZE_SCALE, normalized));
  });

  const displaySize = computed(() => {
    const sideMultiplier = props.side === 'enemy' ? COMBATANT_DISPLAY_SIZE_ENEMY_MULT : COMBATANT_DISPLAY_SIZE_PLAYER_MULT;
    return Math.round(props.baseSize * scaleFactor.value * sideMultiplier);
  });

  const imageUrl = computed(() => {
    if (!props.pokemon) return '';
    const spriteId = props.pokemon.form && props.pokemon.form !== 'normal' ? `${props.pokemon.id}-${props.pokemon.form}` : props.pokemon.id;
    return getAssetUrl(ASSET_TYPES.POKEMON, spriteId, {
      isShiny: Boolean(props.pokemon.isShiny),
      isBack: isPlayer.value,
      isAnimated: isAnimated.value,
    });
  });

  const variationUrl = computed(() => {
    if (!variationKey.value || !props.pokemon) return '';
    const spriteId = props.pokemon.form && props.pokemon.form !== 'normal' ? `${props.pokemon.id}-${props.pokemon.form}` : props.pokemon.id;
    return getAssetUrl(ASSET_TYPES.POKEMON, spriteId, {
      isShiny: Boolean(props.pokemon.isShiny),
      isBack: isPlayer.value,
      isAnimated: true,
    });
  });

  const baseSvgPath = computed(() => {
    if (!imageUrl.value) return '';
    const cleanUrl = imageUrl.value.replace(/\.png$/, '.svg');
    const parts = cleanUrl.split('/');
    const filename = parts.pop();
    const folder = parts.slice(PATH_SLICE_OFFSET).join('/');
    return `/public/assets/sprites/${folder}/${filename}`;
  });

  return {
    isFloating,
    isPlayer,
    isEnemy,
    spriteKey,
    idleKey,
    variationKey,
    isAnimated,
    animatedMeta,
    variationMeta,
    frames,
    frameSize,
    scaleFactor,
    speciesSizeScale,
    displaySize,
    imageUrl,
    variationUrl,
    baseSvgPath
  };
}
