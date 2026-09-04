/**
 * src/logic/auth/saveSanitizer.ts
 *
 * Validation, sanitization, and data integrity checks for SaveData payloads.
 * Protects trust boundaries against corrupted fields and UID duplicates.
 */

import type { Pokemon } from '@/types/pokemon/pokemon';
import type { GameState } from '@/types/system/game';
import { validateSaveData, type SaveDataDto } from '@/logic/validation/schemas';
import { validatePokemon } from '@/logic/pokemon/pokemonFactory';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality';
import { logger } from '@/logic/utils/logger';
import { normalizeRuntimePokemonGender } from '@/logic/auth/saveSerializer';

interface ValidationCache {
  lastBoxHash: string;
  lastValidatedBox: Pokemon[];
}

const boxValidationCache: ValidationCache = {
  lastBoxHash: '',
  lastValidatedBox: [],
};

export type ValidateAndSanitizeResult =
  | { valid: true; data: SaveDataDto; hadDuplicates?: boolean; issues: string[]; error?: undefined }
  | { valid: false; data?: undefined; hadDuplicates?: boolean; issues: string[]; error: string };

function sanitizeNumericFields(sanitizedData: SaveDataDto, issues: string[]): void {
  if (sanitizedData.money < 0) {
    sanitizedData.money = 0;
    issues.push('Dinero negativo corregido');
  }
  if (sanitizedData.battleCoins < 0) {
    sanitizedData.battleCoins = 0;
    issues.push('BattleCoins negativos corregidos');
  }
  if (sanitizedData.trainerLevel < 1) {
    sanitizedData.trainerLevel = 1;
    issues.push('Nivel inválido corregido');
  }
}

function sanitizeInventoryQuantities(inventory: Record<string, number> | undefined, issues: string[]): void {
  if (!inventory) return;
  for (const item of Object.keys(inventory)) {
    const qty = inventory[item];
    if (typeof qty === 'number' && qty < 0) {
      inventory[item] = 0;
      issues.push(`Cantidad negativa de ${item} corregida`);
    }
  }
}

function filterDuplicateUids(sanitizedData: SaveDataDto): void {
  const finalUids = new Set<string>();
  if (Array.isArray(sanitizedData.team)) {
    sanitizedData.team = sanitizedData.team.filter((p) => {
      if (!p || !p.uid) return true;
      if (finalUids.has(p.uid)) return false;
      finalUids.add(p.uid);
      return true;
    });
  }
  if (Array.isArray(sanitizedData.box)) {
    sanitizedData.box = sanitizedData.box.filter((p) => {
      if (!p || !p.uid) return true;
      if (finalUids.has(p.uid)) return false;
      finalUids.add(p.uid);
      return true;
    });
  }
}

export function validateAndSanitize(data: GameState | SaveDataDto | Record<string, unknown>): ValidateAndSanitizeResult {
  if (!data) {
    return { valid: false, issues: [], error: 'No data' };
  }

  const issues: string[] = []; // no-domain: Non-domain utility collection or data structure

  // Calculate box hash to check if it's dirty
  const rawData = typeof data === 'object' && data !== null ? (data as { box?: (Pokemon | null)[] }) : {};
  const rawBox = Array.isArray(rawData.box) ? rawData.box : [];
  const currentBoxHash = rawBox.map(p => p ? `${p.uid}_${p.level}_${p.exp}_${p.hp}` : '').join(',');
  const isBoxDirty = !boxValidationCache.lastBoxHash || currentBoxHash !== boxValidationCache.lastBoxHash || boxValidationCache.lastValidatedBox.length !== rawBox.length;

  let parsedResult;
  if (!isBoxDirty && boxValidationCache.lastValidatedBox.length > 0) {
    const testData = { ...data, box: [] };
    parsedResult = validateSaveData(testData);
    if (parsedResult.success) {
      parsedResult.output.box = rawBox as typeof parsedResult.output.box;
    }
  } else {
    parsedResult = validateSaveData(data);
    if (parsedResult.success) {
      boxValidationCache.lastBoxHash = currentBoxHash;
      boxValidationCache.lastValidatedBox = parsedResult.output.box as Pokemon[];
    }
  }

  if (!parsedResult.success) {
    const errorMsg = parsedResult.issues.map(i => `${i.path?.[0]?.key || 'campo'}: ${i.message}`).join(', ');
    logger.error('SAVE', 'Error de validación estructural crítico:', parsedResult.issues);
    return {
      valid: false,
      issues: parsedResult.issues.map(i => i.message),
      error: 'Error de validación: ' + errorMsg
    };
  }

  const sanitizedData = parsedResult.output as SaveDataDto;
  sanitizedData.team?.forEach(normalizeRuntimePokemonGender);
  sanitizedData.box?.forEach((p) => { if (p) normalizeRuntimePokemonGender(p); });

  sanitizeNumericFields(sanitizedData, issues);
  sanitizeInventoryQuantities(sanitizedData.inventory, issues);

  const uids = new Set<string>();
  const duplicateUids = new Set<string>();

  const checkPoke = (p: SaveDataDto['team'][number] | null, listName: string) => {
    if (!p || !p.uid) return;
    if (uids.has(p.uid)) {
      duplicateUids.add(p.uid);
      issues.push(`Duplicado de UID detectado: ${p.uid} (${p.name}) en ${listName}`);
    }
    uids.add(p.uid);
  };

  const isDebugMode = (typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug'))) ||
                      (typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV));

  const validateSinglePokemon = (p: SaveDataDto['team'][number] | null, listName: string) => {
    if (!p) return;
    checkPoke(p, listName);

    const legality = checkPokemonLegality(p as Pokemon, { allowUnreleased: isDebugMode });
    if (!legality.isLegal) {
      (p as Pokemon).isIllegal = true;
      (p as Pokemon).illegalReasons = legality.issues;
      issues.push(`[SAVE] Pokémon ilegal en ${listName}: ${p.name} (UID: ${p.uid}) - ${legality.issues.join('; ')}`);
      return;
    }

    (p as Pokemon).isIllegal = false;
    (p as Pokemon).illegalReasons = [];
    validatePokemon(p as Pokemon, isDebugMode);
  };

  try {
    if (sanitizedData.team) {
      sanitizedData.team.forEach((p) => validateSinglePokemon(p, 'equipo'));
    }
    if (sanitizedData.box) {
      sanitizedData.box.forEach((p) => validateSinglePokemon(p, 'caja'));
    }
  } catch (err) {
    logger.error('SAVE', 'Error crítico en estructura de Pokémon al sanitizar/validar:', err);
    return {
      valid: false,
      issues,
      error: `Error de estructura de Pokémon: ${(err as Error).message}`
    };
  }

  if (duplicateUids.size > 0) {
    filterDuplicateUids(sanitizedData);
  }

  return {
    valid: true,
    data: sanitizedData,
    hadDuplicates: duplicateUids.size > 0,
    issues
  };
}

export function isValidState(data: SaveDataDto): boolean {
  return validateAndSanitize(data).valid;
}
