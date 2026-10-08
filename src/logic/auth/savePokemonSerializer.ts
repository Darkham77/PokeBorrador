/**
 * src/logic/auth/savePokemonSerializer.ts
 *
 * Dedicated serialization and deserialization routines for Pokemon teams,
 * box instances, eggs, and persistent gender encodings.
 */

import type { Pokemon, PokemonEgg, PokemonGender } from '@/types/pokemon/pokemon';
import type { SaveDataDto } from '@/logic/validation/schemas';
import type { GenderName } from '@pkmn/sim';
import { cloneReactive } from '@/logic/utils/cloneUtils.ts';
import type { ActiveBattleSerialized } from './battleSerializerHelper.ts';

export type PersistedPokemon = Omit<Pokemon, 'gender'> & { gender: GenderName };
type PersistedPokemonEgg = Omit<PokemonEgg, 'gender'> & { gender: GenderName };

function toPersistedPokemonGender(gender: PokemonGender | undefined): GenderName {
  if (gender === 'm') return 'M';
  if (gender === 'f') return 'F';
  return 'N';
}

export function withPersistedPokemonGender(pokemon: Pokemon): PersistedPokemon {
  return {
    ...pokemon,
    gender: toPersistedPokemonGender(pokemon.gender),
  };
}

/**
 * Serializes a team of Pokemon 1:1 into persistent format,
 * identical to how teams are serialized in game_saves.
 * Restores full HP, empty status, and cleans volatile in-combat fields.
 */
export function serializePokemonTeam(team: (Pokemon | null)[]): PersistedPokemon[] {
  const cloned = cloneReactive(team);
  const result: PersistedPokemon[] = [];
  for (const mon of cloned) {
    if (!mon) continue;
    const maxHp = Number(mon.maxHp ?? mon.hp ?? 100);
    const sanitized: Pokemon = {
      ...mon,
      hp: maxHp,
      maxHp,
      status: '',
      statusTurns: 0,
      sleepTurns: 0,
      fainted: false,
      cursed: false,
      confused: 0,
      flinched: false,
      substitute: 0,
      seeded: false,
      attracted: false,
      isGuardian: false,
      volatileCounters: {}
    };
    result.push(withPersistedPokemonGender(sanitized));
  }
  return result;
}

/**
 * Deserializes a persistent Pokemon team (from string or array) 1:1 into canonical runtime Pokemon[],
 * normalizing genders and ensuring healthy combat readiness.
 */
function parseRawTeamArray(rawTeam: unknown): unknown[] {
  if (!rawTeam) return [];
  if (Array.isArray(rawTeam)) return rawTeam;
  if (typeof rawTeam === 'string') {
    try {
      const decoded = JSON.parse(rawTeam);
      return Array.isArray(decoded) ? decoded : [];
    } catch (_e) { // catch-ok: Return empty list on corrupted serialized team payload
      return [];
    }
  }
  return [];
}

function ensurePokemonUid(rawUid: string | undefined): string {
  if (rawUid) return rawUid;
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mon_${Math.random()}`;
}

function sanitizeDeserializedPokemon(rawMon: Pokemon): Pokemon {
  normalizeRuntimePokemonGender(rawMon);
  const maxHp = Number(rawMon.maxHp ?? rawMon.hp ?? 100);
  return {
    ...rawMon,
    hp: maxHp,
    maxHp,
    status: '',
    statusTurns: 0,
    sleepTurns: 0,
    fainted: false,
    cursed: false,
    confused: 0,
    flinched: false,
    substitute: 0,
    seeded: false,
    attracted: false,
    isGuardian: false,
    volatileCounters: {},
    friendshipSteps: Number(rawMon.friendshipSteps ?? 0),
    uid: ensurePokemonUid(rawMon.uid)
  };
}

export function deserializePokemonTeam(rawTeam: unknown): Pokemon[] {
  const parsed = parseRawTeamArray(rawTeam);
  const result: Pokemon[] = [];
  for (const item of parsed) {
    if (item && typeof item === 'object' && 'id' in item && 'name' in item && 'level' in item) {
      result.push(sanitizeDeserializedPokemon(item as Pokemon));
    }
  }
  return result;
}

function withPersistedEggGender(egg: PokemonEgg): PersistedPokemonEgg {
  return {
    ...egg,
    gender: toPersistedPokemonGender(egg.gender),
  };
}

function serializeActiveBattleGenderCodes(activeBattle: unknown): unknown {
  if (!activeBattle || typeof activeBattle !== 'object') return activeBattle;
  const battle = activeBattle as ActiveBattleSerialized;
  if (!battle.enemyTeam) return activeBattle;
  return {
    ...battle,
    enemyTeam: battle.enemyTeam.map(enemy => (enemy ? withPersistedPokemonGender(enemy as Pokemon) : null)),
  };
}

export function serializeSaveGenderCodes(data: SaveDataDto): unknown {
  return {
    ...data,
    team: data.team.map((p) => withPersistedPokemonGender(p as Pokemon)),
    box: data.box.map((p) => (p ? withPersistedPokemonGender(p as Pokemon) : null)),
    eggs: (data.eggs || []).map(egg => {
      if (!egg || typeof egg !== 'object' || !('gender' in egg)) return egg;
      return withPersistedEggGender(egg as PokemonEgg);
    }),
    activeBattle: serializeActiveBattleGenderCodes(data.activeBattle),
  };
}

export function normalizeRuntimePokemonGender(pokemon: { gender?: string | null }): void {
  if (Object.is(pokemon.gender, 'M')) pokemon.gender = 'm';
  if (Object.is(pokemon.gender, 'F')) pokemon.gender = 'f';
  if (Object.is(pokemon.gender, 'N')) pokemon.gender = null;
}
