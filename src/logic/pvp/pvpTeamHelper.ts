import type { Pokemon } from '@/types/pokemon/pokemon';
import { MAX_PVP_SLOTS, MAX_PVP6_SLOTS, type PvpMatchFormat } from '@/types/battle/pvp';
import type { SeasonalThemeConfig, SeasonalThemeId } from '@/data/system/rankedData.ts';
import type { PokemonType } from '@/data/battle/types';
import { isPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { calculatePokemonStrengthScore } from '@/logic/pokemon/pokemonUtils';
import { serializePokemonTeam } from '@/logic/auth/saveSerializer.ts';
import { isLittleCupEligible, getPokemonDexNumber } from '@/logic/pokemon/pokemonSpeciesHelper.ts';

/**
 * Resolves the 6 defending Pokémon for passive defense from saved team data.
 * Prioritizes pvpTeam6 UIDs, falling back to active adventure team.
 */
export function resolveDefendingTeam(saveData: {
  team: (Pokemon | null)[];
  box?: (Pokemon | null)[];
  pvpTeam6?: string[];
}): Pokemon[] {
  const pvp6Uids = saveData.pvpTeam6 || [];
  const allPokes = [
    ...(saveData.team || []),
    ...(saveData.box || [])
  ].filter((p): p is Pokemon => p !== null);

  if (pvp6Uids.length > 0) {
    const pokesByUid = new Map<string, Pokemon>();
    for (const p of allPokes) {
      if (p.uid) {
        pokesByUid.set(p.uid, p);
      }
    }
    const resolved: Pokemon[] = [];
    for (const uid of pvp6Uids) {
      const mon = pokesByUid.get(uid);
      if (mon) resolved.push(mon);
    }
    if (resolved.length > 0) return resolved;
  }
  return (saveData.team || []).filter((p): p is Pokemon => p !== null);
}

/**
 * Serializes a team into a standardized JSON snapshot string for the passive_teams database table,
 * reusing the canonical 1:1 save serialization format.
 */
export function createPassiveTeamSnapshot(team: Pokemon[]): string {
  return JSON.stringify(serializePokemonTeam(team));
}


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

function collectValidPokemon(team?: (Pokemon | null)[], box?: (Pokemon | null)[]): Pokemon[] {
  const result: Pokemon[] = [];
  for (const p of team || []) {
    if (p != null && !p.isIllegal && Boolean(p.uid)) result.push(p);
  }
  for (const p of box || []) {
    if (p != null && !p.isIllegal && Boolean(p.uid)) result.push(p);
  }
  return result;
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
  const allPokes = collectValidPokemon(saveData.team, saveData.box);
  saveData.pvpTeam = fillPvpSlotsFromAvailable(saveData.pvpTeam, allPokes, MAX_PVP_SLOTS);
  saveData.pvpTeam6 = fillPvpSlotsFromAvailable(saveData.pvpTeam6, allPokes, MAX_PVP6_SLOTS);
}

/**
 * Resolves a full offline rival Pokémon team from raw save data for Showdown AI combat.
 */
export function resolveOfflineRivalTeam(
  saveData: Record<string, unknown>,
  format: PvpMatchFormat,
): Pokemon[] {
  const team = (Array.isArray(saveData.team) ? saveData.team : []) as (Pokemon | null)[];
  const box = (Array.isArray(saveData.box) ? saveData.box : []) as (Pokemon | null)[];
  const allPokes = collectValidPokemon(team, box);

  const is6v6 = format === '6v6';
  const maxSlots = is6v6 ? MAX_PVP6_SLOTS : MAX_PVP_SLOTS;
  const rawData = is6v6 ? saveData.pvpTeam6 : saveData.pvpTeam;
  const rawUids = Array.isArray(rawData) ? rawData.map(String) : [];

  const filledUids = fillPvpSlotsFromAvailable(rawUids, allPokes, maxSlots);
  const pokesByUid = new Map<string, Pokemon>(allPokes.map(p => [p.uid, p]));

  return filledUids.map(uid => pokesByUid.get(uid)).filter((p): p is Pokemon => p != null);
}

const KANTO_MAX_DEX_NUM = 151;
const JOHTO_MAX_DEX_NUM = 251;

function checkAllowedTypes(pokemon: Pokemon, allowedTypes: readonly PokemonType[]): boolean {
  const pokeTypes: PokemonType[] = [];
  if (pokemon.type) pokeTypes.push(pokemon.type as PokemonType);
  if (pokemon.type2 && pokemon.type2 !== pokemon.type) pokeTypes.push(pokemon.type2 as PokemonType);
  return pokeTypes.some(t => allowedTypes.includes(t));
}

function checkRegionThemeRule(themeId: SeasonalThemeId, dexNum: number): boolean {
  if (themeId === 'kanto_classic') {
    return dexNum > 0 && dexNum <= KANTO_MAX_DEX_NUM;
  }
  if (themeId === 'johto_kanto_frontier') {
    return dexNum > 0 && dexNum <= JOHTO_MAX_DEX_NUM;
  }
  return true;
}

/**
 * Validates whether an individual Pokémon meets the constraints of a seasonal theme.
 */
export function isPokemonLegalForTheme(pokemon: Pokemon | null | undefined, theme: SeasonalThemeConfig): boolean {
  if (!pokemon || pokemon.isIllegal) return false;
  if (!isPokemonSpeciesId(pokemon.id)) return false;

  const speciesId = pokemon.id;
  const dexNum = getPokemonDexNumber(speciesId);

  if (theme.bannedPokemonIds?.includes(speciesId)) {
    return false;
  }
  if (theme.allowedTypes && theme.allowedTypes.length > 0 && !checkAllowedTypes(pokemon, theme.allowedTypes)) {
    return false;
  }
  if (theme.requiresDualType && (!pokemon.type2 || pokemon.type2 === pokemon.type)) {
    return false;
  }
  if (theme.isLittleCup && !isLittleCupEligible(speciesId)) {
    return false;
  }
  if (!checkRegionThemeRule(theme.id, dexNum)) {
    return false;
  }

  return true;
}

function findBestMonotypeTeam(sortedCandidates: Pokemon[], targetCount: number): Pokemon[] {
  const allTypesInPool = new Set<PokemonType>();
  for (const p of sortedCandidates) {
    if (p.type) allTypesInPool.add(p.type as PokemonType);
    if (p.type2) allTypesInPool.add(p.type2 as PokemonType);
  }

  let bestTeam: Pokemon[] = [];
  let bestScore = -1;

  for (const commonType of allTypesInPool) {
    const matchingPokes = sortedCandidates.filter(p => p.type === commonType || p.type2 === commonType);
    const candidateTeam = matchingPokes.slice(0, targetCount);
    const teamScore = candidateTeam.reduce((acc, p) => acc + calculatePokemonStrengthScore(p), 0);

    if (candidateTeam.length > bestTeam.length || (candidateTeam.length === bestTeam.length && teamScore > bestScore)) {
      bestTeam = candidateTeam;
      bestScore = teamScore;
    }
  }

  return bestTeam;
}

/**
 * Automatically assembles the best legal team from available Pokémon according to seasonal theme rules.
 * Prioritizes highest level and best total IVs, while satisfying all constraints (including team-wide monotype).
 */
export function autoFillLegalTeamForTheme(
  availablePokemon: (Pokemon | null | undefined)[],
  theme: SeasonalThemeConfig,
  targetCount: number = MAX_PVP_SLOTS,
): Pokemon[] {
  const validCandidates = (availablePokemon || [])
    .filter((p): p is Pokemon => p != null && !p.isIllegal && Boolean(p.uid))
    .filter(p => isPokemonLegalForTheme(p, theme));

  if (validCandidates.length === 0) return [];

  const sorted = validCandidates.toSorted((a, b) => calculatePokemonStrengthScore(b) - calculatePokemonStrengthScore(a));
  if (theme.requiresMonotype) {
    return findBestMonotypeTeam(sorted, targetCount);
  }

  return sorted.slice(0, targetCount);
}
