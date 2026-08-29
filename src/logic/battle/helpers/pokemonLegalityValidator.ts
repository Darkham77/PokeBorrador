// src/logic/battle/helpers/pokemonLegalityValidator.ts
import { Dex, toID, type PokemonSet } from '@pkmn/sim';
import { ACTIVE_GENERATION } from '@/data/system/constants';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { Pokemon } from '@/types/pokemon/pokemon';

export interface LegalityCheckResult {
  valid: boolean;
  errors: string[];
}

export class PokemonLegalityValidator {
  private static readonly dex = Dex.forGen(ACTIVE_GENERATION);

  /**
   * Validates that the species exists in the active generation and is standard.
   */
  public static validateSpecies(speciesId: string): LegalityCheckResult {
    const cleanId = toID(speciesId);
    if (!cleanId) {
      return { valid: false, errors: ['Species ID is empty or undefined.'] };
    }
    const species = this.dex.species.get(cleanId);
    if (!species || !species.exists) {
      return { valid: false, errors: [`Species "${speciesId}" does not exist in Dex gen ${ACTIVE_GENERATION}.`] };
    }
    if (species.isNonstandard && species.isNonstandard !== 'Unobtainable' && species.isNonstandard !== 'Past') {
      return { valid: false, errors: [`Species "${speciesId}" is non-standard (${species.isNonstandard}).`] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Validates that the ability is natively available for the species.
   */
  public static validateAbility(speciesId: string, abilityId: string): LegalityCheckResult {
    const cleanSpecies = toID(speciesId);
    const cleanAbility = toID(abilityId);
    if (!cleanAbility) {
      return { valid: false, errors: [`Ability is empty for species "${speciesId}".`] };
    }
    const legalAbilities = pokemonDataProvider.getSpeciesAbilities(cleanSpecies).map(a => toID(a));
    if (!legalAbilities.includes(cleanAbility)) {
      return {
        valid: false,
        errors: [`Species "${speciesId}" cannot legally have ability "${abilityId}". Legal abilities: [${legalAbilities.join(', ')}]`]
      };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Validates that the gender matches the species' biological gender ratio.
   */
  public static validateGender(speciesId: string, gender: string | null | undefined): LegalityCheckResult {
    const cleanSpecies = toID(speciesId);
    const species = this.dex.species.get(cleanSpecies);
    if (!species || !species.exists) {
      return { valid: false, errors: [`Cannot validate gender: Species "${speciesId}" not found.`] };
    }

    const cleanGender = gender ? toID(gender) : 'n';
    const isGenderless = (species.gender as string) === 'N' || (!species.genderRatio && !species.gender);

    if (isGenderless) {
      if (cleanGender !== 'n' && cleanGender !== '' && cleanGender !== 'genderless') {
        return { valid: false, errors: [`Species "${speciesId}" is strictly genderless, but received gender "${gender}".`] };
      }
    } else if (species.gender === 'F' || species.genderRatio?.F === 1) {
      if (cleanGender !== 'f' && cleanGender !== 'female') {
        return { valid: false, errors: [`Species "${speciesId}" is strictly 100% female, but received gender "${gender}".`] };
      }
    } else if (species.gender === 'M' || species.genderRatio?.M === 1) {
      if (cleanGender !== 'm' && cleanGender !== 'male') {
        return { valid: false, errors: [`Species "${speciesId}" is strictly 100% male, but received gender "${gender}".`] };
      }
    }
    return { valid: true, errors: [] };
  }

  /**
   * Validates that all moves exist in Showdown's database.
   */
  public static validateMoves(speciesId: string, moves: readonly string[]): LegalityCheckResult {
    const errors: string[] = []; // no-domain
    if (!Array.isArray(moves) || moves.length === 0) {
      return { valid: false, errors: [`Species "${speciesId}" has no moves defined.`] };
    }
    if (moves.length > 4) {
      errors.push(`Species "${speciesId}" has ${moves.length} moves (maximum allowed is 4).`);
    }

    for (const rawMove of moves) {
      const cleanMove = toID(rawMove);
      if (!cleanMove) {
        errors.push(`Empty move found on species "${speciesId}".`);
        continue;
      }
      const moveData = this.dex.moves.get(cleanMove);
      if (!moveData || !moveData.exists) {
        errors.push(`Move "${rawMove}" does not exist in Dex gen ${ACTIVE_GENERATION}.`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates a full Pokemon entity or PokemonSet.
   */
  public static validatePokemon(poke: Pokemon | PokemonSet | Record<string, unknown>): LegalityCheckResult {
    const allErrors: string[] = []; // no-domain
    const speciesId = String(Reflect.get(poke, 'species') || Reflect.get(poke, 'id') || '');
    const abilityId = String(Reflect.get(poke, 'ability') || '');
    const gender = (Reflect.get(poke, 'gender') as string | null | undefined) ?? null;
    const rawMoves = Reflect.get(poke, 'moves');
    const moves: readonly string[] = Array.isArray(rawMoves) ? rawMoves : []; // no-domain

    const spRes = this.validateSpecies(speciesId);
    if (!spRes.valid) allErrors.push(...spRes.errors);

    if (spRes.valid && abilityId) {
      const abRes = this.validateAbility(speciesId, abilityId);
      if (!abRes.valid) allErrors.push(...abRes.errors);
    }

    if (spRes.valid) {
      const gdRes = this.validateGender(speciesId, gender);
      if (!gdRes.valid) allErrors.push(...gdRes.errors);
    }

    if (spRes.valid && moves.length > 0) {
      const mvRes = this.validateMoves(speciesId, moves);
      if (!mvRes.valid) allErrors.push(...mvRes.errors);
    }

    return { valid: allErrors.length === 0, errors: allErrors };
  }

  /**
   * Validates an entire team and throws loudly if any constraint is violated.
   */
  public static assertTeamLegality(team: Array<Pokemon | PokemonSet | Record<string, unknown>>, teamLabel = 'Team'): void {
    if (!Array.isArray(team) || team.length === 0) {
      throw new Error(`[PokemonLegality] ${teamLabel} is empty or not an array.`);
    }

    const teamErrors: string[] = []; // no-domain
    team.forEach((poke, idx) => {
      const res = this.validatePokemon(poke);
      if (!res.valid) {
        const name = Reflect.get(poke, 'name') || Reflect.get(poke, 'species') || `Slot ${idx + 1}`;
        teamErrors.push(`[${teamLabel} Slot ${idx + 1}: ${name}] -> ${res.errors.join(' | ')}`);
      }
    });

    if (teamErrors.length > 0) {
      throw new Error(`[PokemonLegality] ❌ ILLEGAL TEAM DETECTED in ${teamLabel}:\n  • ${teamErrors.join('\n  • ')}`);
    }
  }

  /**
   * Assert single Pokemon legality, throwing loudly on any illegality.
   */
  // fallow-ignore-next-line unused-class-member
  public static assertPokemonLegality(poke: Pokemon | PokemonSet | Record<string, unknown>, label = 'Pokemon'): void {
    const res = this.validatePokemon(poke);
    if (!res.valid) {
      throw new Error(`[PokemonLegality] ❌ ILLEGAL POKEMON DETECTED in ${label}:\n  • ${res.errors.join('\n  • ')}`);
    }
  }
}
