import type { Pokemon } from '@/types/pokemon/pokemon';
import { MAX_PVP_SLOTS, MAX_PVP6_SLOTS, type PvpMatchFormat } from '@/types/battle/pvp';
import type { SeasonalThemeConfig } from '@/data/system/rankedData.ts';
import type { PokemonType } from '@/data/battle/types';
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { Dex } from '@pkmn/sim';

/**
 * Fills a list of PVP slot UIDs up to maxSlots from all available non-illegal Pokémon.
 */
export function fillPvpSlotsFromAvailable(
  currentUids: string[] | undefined,
  allPokemon: (Pokemon | null)[],
  maxSlots: number
): string[] { // no-domain: Non-domain utility collection or data structure
  const validPokes = (allPokemon || []).filter((p): p is Pokemon => p != null && !p.isIllegal && Boolean(p.uid));
  if (validPokes.length === 0) return [];

  const existingUidsSet = new Set(validPokes.map(p => p.uid));
  const result: string[] = (currentUids || []).filter(uid => existingUidsSet.has(uid)); // no-domain: Non-domain utility collection or data structure

  const targetCount = Math.min(maxSlots, validPokes.length);
  if (result.length < targetCount) {
    for (const p of validPokes) {
      if (result.length >= targetCount) break;
      if (!result.includes(p.uid)) {
        result.push(p.uid);
      }
    }
  }

  return result.slice(0, maxSlots);
}

/**
 * Ensures a player's save data has both pvpTeam (3v3) and pvpTeam6 (6v6) auto-filled.
 * The adventure team is strictly untouched (it is the only team permitted to have 1 member).
 */
export function ensurePvpTeamsFilled(saveData: {
  team: (Pokemon | null)[];
  box?: (Pokemon | null)[];
  pvpTeam?: string[]; // no-domain: Non-domain utility collection or data structure
  pvpTeam6?: string[]; // no-domain: Non-domain utility collection or data structure
}): void {
  const allPokes: Pokemon[] = [];
  for (const p of saveData.team || []) {
    if (p != null && !p.isIllegal && Boolean(p.uid)) allPokes.push(p);
  }
  for (const p of saveData.box || []) {
    if (p != null && !p.isIllegal && Boolean(p.uid)) allPokes.push(p);
  }
  saveData.pvpTeam = fillPvpSlotsFromAvailable(saveData.pvpTeam, allPokes, MAX_PVP_SLOTS);
  saveData.pvpTeam6 = fillPvpSlotsFromAvailable(saveData.pvpTeam6, allPokes, MAX_PVP6_SLOTS);
}

/**
 * Resolves a full offline rival Pokémon team from raw save data for Showdown AI combat.
 */
export function resolveOfflineRivalTeam(
  saveData: Record<string, unknown>,
  format: PvpMatchFormat
): Pokemon[] {
  const team = (Array.isArray(saveData.team) ? saveData.team : []) as (Pokemon | null)[];
  const box = (Array.isArray(saveData.box) ? saveData.box : []) as (Pokemon | null)[];
  const allPokes: Pokemon[] = [];
  for (const p of team) {
    if (p != null && !p.isIllegal && Boolean(p.uid)) allPokes.push(p);
  }
  for (const p of box) {
    if (p != null && !p.isIllegal && Boolean(p.uid)) allPokes.push(p);
  }

  const maxSlots = format === '6v6' ? MAX_PVP6_SLOTS : MAX_PVP_SLOTS;
  const rawUids = format === '6v6'
    ? (Array.isArray(saveData.pvpTeam6) ? saveData.pvpTeam6.map(String) : [])
    : (Array.isArray(saveData.pvpTeam) ? saveData.pvpTeam.map(String) : []);

  const filledUids = fillPvpSlotsFromAvailable(rawUids, allPokes, maxSlots);
  const pokesByUid = new Map<string, Pokemon>(allPokes.map(p => [p.uid, p]));

  return filledUids.map(uid => pokesByUid.get(uid)).filter((p): p is Pokemon => p != null);
}

const SCORE_LEVEL_MULTIPLIER = 1000;
const KANTO_MAX_DEX_NUM = 151;
const JOHTO_MAX_DEX_NUM = 251;

/**
 * Validates whether an individual Pokémon meets the constraints of a seasonal theme.
 */
export function isPokemonLegalForTheme(pokemon: Pokemon | null | undefined, theme: SeasonalThemeConfig): boolean {
  if (!pokemon || pokemon.isIllegal) return false;

  const speciesId = String(pokemon.id || '');
  const spec = Dex.species.get(speciesId);

  // 1. Banned species list
  if (isPokemonSpeciesId(speciesId) && theme.bannedPokemonIds && theme.bannedPokemonIds.includes(speciesId)) {
    return false;
  }

  // 2. Allowed types restriction
  if (theme.allowedTypes && theme.allowedTypes.length > 0) {
    const pokeTypes: PokemonType[] = [];
    if (pokemon.type) pokeTypes.push(pokemon.type as PokemonType);
    if (pokemon.type2 && pokemon.type2 !== pokemon.type) pokeTypes.push(pokemon.type2 as PokemonType);

    const hasAllowed = pokeTypes.some(t => theme.allowedTypes!.includes(t));
    if (!hasAllowed) return false;
  }

  // 3. Dual-type requirement
  if (theme.requiresDualType) {
    if (!pokemon.type2 || pokemon.type2 === pokemon.type) {
      return false;
    }
  }

  // 4. Little Cup rule: must be first stage in evolution line and capable of evolving
  if (theme.isLittleCup) {
    const hasPrevo = Boolean(spec.prevo);
    const hasEvos = Boolean(spec.evos && spec.evos.length > 0);
    if (hasPrevo || !hasEvos) {
      return false;
    }
  }

  // 5. Region specific themes
  if (theme.id === 'kanto_classic') {
    if (spec.num > KANTO_MAX_DEX_NUM || spec.num <= 0) return false;
  } else if (theme.id === 'johto_kanto_frontier') {
    if (spec.num > JOHTO_MAX_DEX_NUM || spec.num <= 0) return false;
  }

  return true;
}

/**
 * Calculates competitive ranking score for auto-fill prioritization (level desc, IVs total desc).
 */
function calculatePokemonScore(p: Pokemon): number {
  const ivs = p.ivs;
  const totalIvs = ivs
    ? (Number(ivs.hp) || 0) +
      (Number(ivs.atk) || 0) +
      (Number(ivs.def) || 0) +
      (Number(ivs.spa) || 0) +
      (Number(ivs.spd) || 0) +
      (Number(ivs.spe) || 0)
    : 0;

  return (p.level || 1) * SCORE_LEVEL_MULTIPLIER + totalIvs;
}

/**
 * Automatically assembles the best legal team from available Pokémon according to seasonal theme rules.
 * Prioritizes highest level and best total IVs, while satisfying all constraints (including team-wide monotype).
 */
export function autoFillLegalTeamForTheme(
  availablePokemon: (Pokemon | null | undefined)[],
  theme: SeasonalThemeConfig,
  targetCount: number = MAX_PVP_SLOTS
): Pokemon[] {
  const validCandidates = (availablePokemon || [])
    .filter((p): p is Pokemon => p != null && !p.isIllegal && Boolean(p.uid))
    .filter(p => isPokemonLegalForTheme(p, theme));

  if (validCandidates.length === 0) return [];

  // Sort candidates by score descending
  const sorted = [...validCandidates].sort((a, b) => calculatePokemonScore(b) - calculatePokemonScore(a));

  // If theme requires monotype, find the common element that maximizes team score
  if (theme.requiresMonotype) {
    const allTypesInPool = new Set<PokemonType>();
    for (const p of sorted) {
      if (p.type) allTypesInPool.add(p.type as PokemonType);
      if (p.type2) allTypesInPool.add(p.type2 as PokemonType);
    }

    let bestTeam: Pokemon[] = [];
    let bestScore = -1;

    for (const commonType of allTypesInPool) {
      const matchingPokes = sorted.filter(p => p.type === commonType || p.type2 === commonType);
      const candidateTeam = matchingPokes.slice(0, targetCount);
      const teamScore = candidateTeam.reduce((acc, p) => acc + calculatePokemonScore(p), 0);

      // Prefer larger legal teams, then higher score
      if (candidateTeam.length > bestTeam.length || (candidateTeam.length === bestTeam.length && teamScore > bestScore)) {
        bestTeam = candidateTeam;
        bestScore = teamScore;
      }
    }

    return bestTeam;
  }

  return sorted.slice(0, targetCount);
}

