import { PDEX_ORDER, GEN2_PDEX_ORDER, isPokemonSpeciesId, requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex.ts';
import { hasPokemonSpriteId, requirePokemonSpriteValue } from '@/data/pokemon/spriteMapping.ts';
import { hasAnimatedSpriteId } from '@/data/pokemon/animatedSpriteDatabase.ts';
import { requireFeetPoints } from '@/data/pokemon/pokemonFeetDatabase.ts';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService.ts';
import type { useBattleStore } from '@/stores/battle/battle.ts';

export const ALL_PDEX: readonly PokemonSpeciesId[] = [...PDEX_ORDER, ...GEN2_PDEX_ORDER];
const PARSE_INT_DECIMAL_RADIX = 10;

const resolveToSpriteNumber = (fullId: string): { numId: string; rest: string[] } => { // domain-ok: Debug panel raw identifier parser input
  const parts = fullId.split('_');

  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('_').toLowerCase();
    if (hasPokemonSpriteId(candidate)) {
      return { numId: String(requirePokemonSpriteValue(candidate)), rest: parts.slice(i) };
    }
  }

  if (parts[0] !== undefined && /^\d+$/.test(parts[0])) {
    return { numId: parts[0], rest: parts.slice(1) };
  }

  throw new Error(`[DebugActionPanel] Unknown pokemon id: ${fullId}`);
};

export const deconstructPokemonId = (fullId: string) => { // domain-ok: Debug panel raw identifier parser input
  const { numId, rest } = resolveToSpriteNumber(fullId);
  let variant = '';
  let gender = '';

  if (rest.length === 2) {
    variant = rest[0] || '';
    gender = rest[1] || '';
  } else if (rest.length === 1) {
    const lastPart = (rest[0] || '').toLowerCase();
    if (lastPart === 'm' || lastPart === 'f') {
      gender = lastPart;
    } else {
      variant = rest[0] || '';
    }
  }

  return { baseId: numId, variant, gender };
};

function requireSpeciesFromDebugBase(baseId: string): PokemonSpeciesId { // domain-ok: Debug panel raw base numeric or name string
  const cleanBase = baseId.trim().toLowerCase();
  if (/^\d+$/.test(cleanBase)) {
    const species = ALL_PDEX[Number(cleanBase) - 1];
    if (species) return species;
    throw new Error(`[DebugActionPanel] Unknown pokedex number: ${baseId}`);
  }
  return requirePokemonSpeciesId(cleanBase);
}

export const constructPokemonId = (baseId: string, variant: string, gender: string): PokemonSpeciesId => { // domain-ok: Debug panel raw base numeric or name string
  let id = requireSpeciesFromDebugBase(baseId);
  const cleanVariant = variant.trim().toLowerCase();
  const cleanGender = gender.trim().toLowerCase();

  if (cleanVariant) {
    id += `_${cleanVariant}`;
  }
  if (cleanGender) {
    id += `_${cleanGender}`;
  }
  return requirePokemonSpeciesId(id);
};

export function resolveBaseNumber(current: string, pdexOrder: readonly PokemonSpeciesId[] = ALL_PDEX): number {
  const num = parseInt(current, PARSE_INT_DECIMAL_RADIX);
  if (!isNaN(num)) return num;
  const speciesId = current.toLowerCase();
  const idx = isPokemonSpeciesId(speciesId) ? pdexOrder.indexOf(speciesId) : -1;
  return idx !== -1 ? idx + 1 : 1;
}

export function resolveAnimatedSpriteKey(
  candIdle: string,
  candSimple: string,
  isBack: boolean,
  isFemale: boolean
): string {
  const suffix = isBack ? '_back' : '';
  if (isFemale && hasAnimatedSpriteId(`${candIdle}_f${suffix}`)) return `${candIdle}_f${suffix}`;
  if (hasAnimatedSpriteId(`${candIdle}${suffix}`)) return `${candIdle}${suffix}`;
  if (isFemale && hasAnimatedSpriteId(`${candSimple}_f${suffix}`)) return `${candSimple}_f${suffix}`;
  if (hasAnimatedSpriteId(`${candSimple}${suffix}`)) return `${candSimple}${suffix}`;
  return '';
}

function validateSpriteFeetPoints(targetUrl: string, baseUrl: string): void {
  let dbKey = targetUrl;
  if (baseUrl !== '/' && targetUrl.startsWith(baseUrl)) {
    dbKey = targetUrl.slice(baseUrl.length - 1);
  }
  try {
    dbKey = decodeURIComponent(dbKey);
  } catch (e) {
    throw new Error(`[DebugActionPanel] Error al decodificar dbKey '${dbKey}': ${String(e)}`, { cause: e });
  }
  requireFeetPoints(dbKey);
}

export interface CombatantStatusTarget {
  isShiny?: boolean;
  isGuardian?: boolean;
}

export function toggleCombatantStatus(
  pokemon: CombatantStatusTarget,
  type: string
): void {
  if (type === 'shiny') pokemon.isShiny = !pokemon.isShiny;
  if (type === 'guardian') pokemon.isGuardian = !pokemon.isGuardian;
}

interface SwapTargetInfo {
  targetId: PokemonSpeciesId;
  targetBase: string;
  variantVal: string;
  isFemale: boolean;
}

function resolveSwapTarget(
  baseIdVal: string,
  rawVariantVal: string,
  genderVal: string,
  pdexOrder: readonly PokemonSpeciesId[] = ALL_PDEX
): SwapTargetInfo {
  const baseNum = resolveBaseNumber(String(baseIdVal ?? '').trim(), pdexOrder);
  const targetBase = String(baseNum);
  const cleanVar = String(rawVariantVal ?? '').trim().toLowerCase();
  const variantVal = (cleanVar === '0' || cleanVar === '') ? '' : cleanVar;
  const targetId = constructPokemonId(targetBase, variantVal, genderVal);
  const isFemale = genderVal.toLowerCase() === 'f';
  return { targetId, targetBase, variantVal, isFemale };
}

function verifyFallbackFeetPoints(
  targetId: PokemonSpeciesId,
  isShiny: boolean,
  isBack: boolean,
  baseUrl: string
): void {
  const targetUrl = getAssetUrl(ASSET_TYPES.POKEMON, targetId, { isShiny, isBack, isAnimated: false });
  validateSpriteFeetPoints(targetUrl, baseUrl);
}

function applyVisualSwapToStore(
  battleStore: ReturnType<typeof useBattleStore>,
  isPlayer: boolean,
  targetId: PokemonSpeciesId
): void {
  const combatant = isPlayer ? battleStore.state?.player : battleStore.state?.enemy;
  if (!combatant || !battleStore.state) return;
  combatant.id = targetId;
  if (isPlayer) {
    battleStore.state.player = { ...combatant };
  } else {
    battleStore.state.enemy = { ...combatant };
  }
}

export function applyToggledCombatant(
  battleStore: ReturnType<typeof useBattleStore>,
  isPlayer: boolean,
  type: string
): void {
  const target = isPlayer ? battleStore.state?.player : battleStore.state?.enemy;
  if (!target || !battleStore.state) return;
  toggleCombatantStatus(target, type);
  if (isPlayer) {
    battleStore.state.player = { ...target };
  } else {
    battleStore.state.enemy = { ...target };
  }
}

export interface VisualSwapParams {
  battleStore: ReturnType<typeof useBattleStore>;
  isPlayer: boolean;
  baseId: string; // domain-ok: Debug panel raw base numeric or name string
  rawVariant: string;
  gender: string;
  baseUrl: string;
}

export function executeVisualSwap(params: VisualSwapParams): void {
  const { battleStore, isPlayer, baseId, rawVariant, gender, baseUrl } = params;
  const { targetId, targetBase, variantVal, isFemale } = resolveSwapTarget(baseId, rawVariant, gender);
  const suffix = variantVal ? `_${variantVal}` : '';
  const candIdle = `${targetBase}i${suffix}`;
  const candSimple = `${targetBase}${suffix}`;
  const animatedKey = resolveAnimatedSpriteKey(candIdle, candSimple, isPlayer, isFemale);

  if (!animatedKey) {
    const isShiny = Boolean(isPlayer ? battleStore.state?.player?.isShiny : battleStore.state?.enemy?.isShiny);
    verifyFallbackFeetPoints(targetId, isShiny, isPlayer, baseUrl);
  }

  applyVisualSwapToStore(battleStore, isPlayer, targetId);
}
