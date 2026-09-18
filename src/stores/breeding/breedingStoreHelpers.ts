/**
 * src/stores/breeding/breedingStoreHelpers.ts
 *
 * Modular helper functions and calculations for the Daycare / Breeding store.
 */

import {
  BASE_SHINY_DENOMINATOR,
  EGG_SCANNER_MIN_CLASS_LEVEL
} from '@/logic/constants/gameplay.ts';
import { EGG_SPAWN_INTERVAL_MS } from '@/logic/breeding/breedingData.ts';
import { eggFactory } from '@/logic/breeding/eggFactory.ts';
import {
  calculateInheritance,
  inheritNature,
  inheritMoves,
  inheritAbility,
  calculateShinyChance
} from '@/logic/breeding/breedingEngine.ts';
import { NATURES, isNatureId } from '@/data/battle/natures.ts';
import type { NatureId } from '@/data/battle/natures.ts';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality.ts';
import {
  isBabyPokemonSpeciesId,
  isFossilPokemonSpeciesId,
  isLegendaryPokemonSpeciesId,
  requirePokemonSpeciesId
} from '@/data/pokemon/pokedex.ts';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex.ts';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB.ts';
import { isEnabledPokemonId } from '@/data/system/constants.ts';
import { calculateBreedingCost } from '@/stores/breedingActions.ts';
import type { DaycareSlot, DaycareEgg, DaycareWarehouseItem } from '@/types/breeding/breeding.ts';
import type { BreedingCompatibility, Pokemon } from '@/types/pokemon/pokemon.ts';
import type { PlayerClassState } from '@/types/system/game.ts';

// ─── Egg Timer Helpers ────────────────────────────────────────────────────────

function hasValidBreedingVigor(pokemon: Pokemon | null): boolean {
  return pokemon !== null && (pokemon.vigor || 0) > 0;
}

function resolveDepositTimestamp(slot: DaycareSlot | undefined): number | null {
  if (!slot?.deposited_at) return null;
  return Temporal.Instant.from(slot.deposited_at).epochMilliseconds;
}

export function calculateNextEggTime(
  compatibilityLevel: number,
  slotA: DaycareSlot | undefined,
  slotB: DaycareSlot | undefined
): number | null {
  if (compatibilityLevel === 0) return null;
  const interval = (EGG_SPAWN_INTERVAL_MS as Record<number, number>)[compatibilityLevel];
  if (!interval) return null;

  if (!hasValidBreedingVigor(slotA?.pokemon ?? null) || !hasValidBreedingVigor(slotB?.pokemon ?? null)) {
    return null;
  }

  const depA = resolveDepositTimestamp(slotA);
  const depB = resolveDepositTimestamp(slotB);
  if (depA === null || depB === null) return null;

  return Math.max(depA, depB) + interval;
}

// ─── Daycare Load Helpers ─────────────────────────────────────────────────────

function loadWarehouseEggsFromLocalStorage(userId: string): DaycareEgg[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem(`daycare_warehouse_eggs_${userId}`);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as DaycareEgg[];
  } catch {
    return [];
  }
}

export function restoreWarehouseEggs(
  persistedWarehouse: DaycareWarehouseItem[] | undefined,
  userId: string
): DaycareEgg[] {
  if (Array.isArray(persistedWarehouse) && persistedWarehouse.length > 0) {
    const validEggs = persistedWarehouse.filter((e): e is DaycareEgg => 'isEgg' in e && Boolean(e.isEgg));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`daycare_warehouse_eggs_${userId}`, JSON.stringify(validEggs));
    }
    return validEggs;
  }

  return loadWarehouseEggsFromLocalStorage(userId);
}

function resolveSlotIndex(p: Pokemon, slots: DaycareSlot[]): { slotIndex: number; modified: boolean } {
  if (typeof p.daycareSlot === 'number' && p.daycareSlot >= 0) {
    return { slotIndex: p.daycareSlot, modified: false };
  }
  const emptyIdx = slots.findIndex(s => s.pokemon === null);
  const slotIndex = emptyIdx !== -1 ? emptyIdx : 0;
  p.daycareSlot = slotIndex;
  return { slotIndex, modified: true };
}

function ensureDepositTimestamp(p: Pokemon): boolean {
  if (!p.daycareDepositedAt) {
    p.daycareDepositedAt = Temporal.Now.instant().toString();
    return true;
  }
  return false;
}

export function restoreDaycareSlots(
  team: Array<Pokemon | null>,
  box: Array<Pokemon | null>,
  slots: DaycareSlot[]
): boolean {
  const all = [...team, ...box];
  const deposited = all.filter((p): p is Pokemon => p != null && Boolean(p.inDaycare));

  let needsSave = false;
  for (const p of deposited) {
    const { slotIndex, modified } = resolveSlotIndex(p, slots);
    if (modified) needsSave = true;
    if (ensureDepositTimestamp(p)) needsSave = true;

    slots[slotIndex] = {
      pokemon: p,
      slotIndex,
      deposited_at: p.daycareDepositedAt ?? null
    };
  }
  return needsSave;
}

// ─── Daycare Deposit Helpers ──────────────────────────────────────────────────

export interface DepositValidationResult {
  canDeposit: boolean;
  reason?: string;
  icon?: string;
}

function isSpeciesEligibleForBreeding(pokemon: Pokemon): boolean {
  const isFossil = isFossilPokemonSpeciesId(pokemon.id);
  const isLegendary = isLegendaryPokemonSpeciesId(pokemon.id);
  const maxVig = pokemon.maxVigor !== undefined ? pokemon.maxVigor : 10;
  return maxVig > 0 && !isFossil && !isLegendary;
}

export function validateDaycareDeposit(pokemon: Pokemon, isDebugMode: boolean): DepositValidationResult {
  if (pokemon.hp <= 0) {
    return { canDeposit: false, reason: 'No puedes depositar un Pokémon debilitado en la Guardería.', icon: '⚠️' };
  }

  if (!isSpeciesEligibleForBreeding(pokemon)) {
    return { canDeposit: false, reason: 'Este Pokémon no tiene vigor y no puede reproducirse en la Guardería.', icon: '⚠️' };
  }

  if (isBabyPokemonSpeciesId(pokemon.id)) {
    return { canDeposit: false, reason: 'Los Pokémon bebé no pueden reproducirse en la Guardería.', icon: '⚠️' };
  }

  if (pokemon.isIllegal || !checkPokemonLegality(pokemon, { allowUnreleased: isDebugMode }).isLegal) {
    pokemon.isIllegal = true;
    return { canDeposit: false, reason: 'No puedes depositar un Pokémon ilegal en la Guardería.', icon: '⚠️' };
  }

  if (pokemon.onMission || pokemon.onDefense) {
    return { canDeposit: false, reason: 'Este Pokémon está ocupado.', icon: '⚠️' };
  }

  return { canDeposit: true };
}

export interface TeamRelocationResult {
  success: boolean;
  errorReason?: string;
}

export function movePokemonFromTeamToBoxIfPresent(
  team: Array<Pokemon | null>,
  box: Array<Pokemon | null>,
  pokemonUid: string
): TeamRelocationResult {
  const teamIdx = team.findIndex((p: Pokemon | null) => p && p.uid === pokemonUid);
  if (teamIdx === -1) return { success: true };

  if (team.length <= 1) {
    return { success: false, errorReason: 'No puedes depositar a tu único Pokémon del equipo.' };
  }

  const p = team.splice(teamIdx, 1)[0];
  if (p) {
    box.push(p);
  }
  return { success: true };
}

// ─── Egg Generation Helpers ───────────────────────────────────────────────────

export function canGenerateEgg(
  isBreedingActive: boolean,
  compatLevel: number,
  slotA: DaycareSlot | undefined,
  slotB: DaycareSlot | undefined,
  nextEggEpoch: number | null,
  nowEpoch: number
): boolean {
  if (!isBreedingActive || compatLevel === 0) return false;
  if (!slotA?.pokemon || !slotB?.pokemon) return false;
  if (!nextEggEpoch || nowEpoch < nextEggEpoch) return false;
  return (slotA.pokemon.vigor || 0) > 0 && (slotB.pokemon.vigor || 0) > 0;
}

export function isEggSpeciesEligible(speciesId: PokemonSpeciesId): boolean {
  if (isEnabledPokemonId(speciesId)) return true;
  if (typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug'))) {
    return true;
  }
  return false;
}

export function checkParentVigorDepleted(pA: Pokemon, pB: Pokemon): boolean {
  const vigorA = pA.vigor ?? 0;
  const vigorB = pB.vigor ?? 0;
  return vigorA <= 0 || vigorB <= 0;
}

function resolveChosenNature(inheritedNature: string | null): NatureId {
  if (inheritedNature && isNatureId(inheritedNature)) return inheritedNature;
  return NATURES[Math.floor(Math.random() * NATURES.length)] || 'serious';
}

export interface GenerateEggParams {
  pA: Pokemon;
  pB: Pokemon;
  compat: BreedingCompatibility;
  playerClass: string;
  shinyMultiplier: number;
}

export function buildDaycareEgg(params: GenerateEggParams): DaycareEgg {
  const { pA, pB, compat, playerClass, shinyMultiplier } = params;
  const eggSpecies = compat.eggSpecies!;
  const itemA = pA.heldItem || '';
  const itemB = pB.heldItem || '';

  const abilityName = inheritAbility(pA, pB);
  const abilityIndex = abilityName ? 1 : 0;
  const breedingCost = calculateBreedingCost(pA, pB);
  const inheritedNature = inheritNature(pA, pB, itemA, itemB);
  const chosenNature = resolveChosenNature(inheritedNature);

  const shinyChance = calculateShinyChance(pA, pB, 1 / BASE_SHINY_DENOMINATOR, shinyMultiplier);
  const isShiny = Math.random() < shinyChance;

  return eggFactory.createDaycareEgg({
    species: eggSpecies,
    motherId: compat.motherId ? requirePokemonSpeciesId(compat.motherId) : eggSpecies,
    ivs: calculateInheritance(pA, pB, itemA, itemB, playerClass),
    nature: chosenNature,
    movesAtBirth: inheritMoves(pA, pB, eggSpecies),
    abilityIndex,
    isShiny,
    cost: breedingCost
  });
}

export function applyEggGenerationSideEffects(
  pA: Pokemon,
  pB: Pokemon,
  slotA: DaycareSlot,
  slotB: DaycareSlot,
  isoNow: string
): void {
  pA.vigor = Math.max(0, (pA.vigor || 0) - 1);
  pB.vigor = Math.max(0, (pB.vigor || 0) - 1);

  slotA.deposited_at = isoNow;
  pA.daycareDepositedAt = isoNow;

  slotB.deposited_at = isoNow;
  pB.daycareDepositedAt = isoNow;
}

// ─── Egg Scanner Helpers ──────────────────────────────────────────────────────

export interface EggScanValidation {
  canScan: boolean;
  reason?: string;
  icon?: string;
}

export function validateEggScanEligibility(
  playerClass: string | null,
  classLevel: number,
  lastEggScanDate?: string | null
): EggScanValidation {
  if (playerClass !== 'criador') {
    return { canScan: false, reason: 'Solo los Criadores pueden escanear huevos.', icon: '🔒' };
  }
  if (classLevel < EGG_SCANNER_MIN_CLASS_LEVEL) {
    return { canScan: false, reason: `Necesitas nivel ${EGG_SCANNER_MIN_CLASS_LEVEL} de Criador para usar el escáner.`, icon: '🔒' };
  }
  const todayStr = Temporal.Now.instant().toString().split('T')[0] || '';
  if (lastEggScanDate && lastEggScanDate.startsWith(todayStr)) {
    return { canScan: false, reason: 'Ya has usado el escáner de IVs hoy.', icon: '⚠️' };
  }
  return { canScan: true };
}

function applyEggScan(egg: DaycareEgg, classData: PlayerClassState): void {
  if (!egg.inherited_ivs) egg.inherited_ivs = {};
  egg.inherited_ivs._scanned = true;
  classData.lastEggScanDate = Temporal.Now.instant().toString();
}

export function executeEggScan(
  egg: DaycareEgg,
  classData: PlayerClassState | undefined
): { speciesName: string; updatedClassData: PlayerClassState } {
  const effectiveClassData = classData ?? createDefaultClassData();
  applyEggScan(egg, effectiveClassData);
  const speciesName = POKEMON_DB[egg.species]?.name ?? 'Huevo';
  return { speciesName, updatedClassData: effectiveClassData };
}

function createDefaultClassData(): PlayerClassState {
  return {
    captureStreak: 0,
    longestStreak: 0,
    reputation: 0,
    blackMarketSales: 0,
    criminality: 0,
    blackMarketDaily: { date: '', items: [], purchased: [] }
  };
}
