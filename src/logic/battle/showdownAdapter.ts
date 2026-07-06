import { Dex } from '@pkmn/sim';
import type { PokemonSet, ID } from '@pkmn/sim';
import type { Pokemon as GamePokemon } from '../../types/pokemon/pokemon.ts';
import { POKEMON_SPRITE_IDS } from '../../data/pokemon/spriteMapping.ts';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';

/**
 * Retorna el ID de formato oficial de Pokémon Showdown.
 */
export function getShowdownFormatId(gen: number = ACTIVE_GENERATION): ID {
  if (gen < 5) {
    return `gen${gen}customgame` as ID;
  }
  return `gen${gen}customgame@@@!Team Preview` as ID;
}

/**
 * Mapea un Pokémon de Poké Vicio al formato oficial de Pokémon Showdown (PokemonSet).
 */
export function mapToShowdownSet(poke: GamePokemon): PokemonSet {
  if (!poke.ability) {
    throw new Error(`[mapToShowdownSet] El Pokémon "${poke.name}" no tiene una habilidad definida (ability ID requerida).`);
  }
  if (!poke.nature) {
    throw new Error(`[mapToShowdownSet] El Pokémon "${poke.name}" no tiene una naturaleza definida (nature ID requerida).`);
  }

  // Filtrar movimientos no nulos, mapear IDs y permitir cualquier movimiento existente en el Dex global
  const moves = poke.moves
    .filter((m): m is NonNullable<typeof m> => !!m && !!m.id)
    .map(m => m.id as string)
    .filter(id => {
      const mData = Dex.moves.get(id);
      return mData.exists;
    });

  if (moves.length === 0) {
    throw new Error(`[mapToShowdownSet] El Pokémon "${poke.name}" no tiene ningún movimiento válido cargado.`);
  }

  const speciesName = resolveShowdownSpecies(poke.id);

  return {
    name: poke.nickname || poke.name,
    species: speciesName,
    level: poke.level,
    shiny: poke.isShiny || false,
    gender: (poke.gender === 'M' || poke.gender === 'F') ? poke.gender : '',
    item: poke.heldItem || '',
    ability: poke.ability,
    nature: poke.nature,
    ivs: {
      hp: poke.ivs?.hp ?? 31,
      atk: poke.ivs?.atk ?? 31,
      def: poke.ivs?.def ?? 31,
      spa: poke.ivs?.spa ?? 31,
      spd: poke.ivs?.spd ?? 31,
      spe: poke.ivs?.spe ?? 31
    },
    // No usamos EVs detallados por defecto en el modo aventura, o mapeamos 0 si no se manejan
    evs: {
      hp: poke.evs?.hp ?? 0,
      atk: poke.evs?.atk ?? 0,
      def: poke.evs?.def ?? 0,
      spa: poke.evs?.spa ?? 0,
      spd: poke.evs?.spd ?? 0,
      spe: poke.evs?.spe ?? 0
    },
    moves: moves,
    uid: poke.uid,
    stats: {
      hp: poke.maxHp,
      atk: poke.atk,
      def: poke.def,
      spa: poke.spa,
      spd: poke.spd,
      spe: poke.spe
    }
  } as PokemonSet & { uid?: string; stats?: any };
}

// Mapa inverso: número → nombre Showdown (construido una sola vez)
const _numericToSpecies: Record<string, string> = Object.fromEntries(
  Object.entries(POKEMON_SPRITE_IDS).map(([name, num]) => [String(num), name])
);

/**
 * Resuelve un ID de Pokémon (numérico string "29", string Showdown "nidoran_f", etc.)
 * al nombre de especie que acepta @pkmn/sim.
 */
function resolveShowdownSpecies(raw: string | undefined): string {
  if (!raw) {
    throw new Error("[resolveShowdownSpecies] ID de especie inválido o indefinido.");
  }
  // Si es puramente numérico, buscar en mapa inverso
  if (/^\d+$/.test(raw)) return _numericToSpecies[raw] ?? raw;
  // Si ya es nombre Showdown, devolverlo tal cual
  return raw;
}


/**
 * Returns the Showdown slot number (1-indexed) for a Pokemon UID within a slot order array.
 * The slot order array must be in @pkmn/sim's internal order (active = index 0).
 */
export function getShowdownSlot(slotOrder: string[], uid: string): number {
  const idx = slotOrder.indexOf(uid)
  return idx !== -1 ? idx + 1 : 1
}

import type { ShowdownPlayerRequest } from '../../types/battle/battle.ts'

export interface ResolveActiveBattleState {
  playerRequest?: ShowdownPlayerRequest | null;
  enemyRequest?: ShowdownPlayerRequest | null;
  playerTeam?: { uid: string; name: string; nickname?: string | null }[] | null;
  enemyTeam?: { uid: string; name: string; nickname?: string | null }[] | null;
}

/**
 * Resolves the Showdown slot number for a Pokemon using the canonical slot order
 * provided by the request payload (side.pokemon[].uid).
 */
export function resolveShowdownSlot(
  active: ResolveActiveBattleState,
  side: 'player' | 'enemy',
  pokemonUid: string
): number {
  const req = side === 'player' ? active.playerRequest : active.enemyRequest;
  const list = req?.side?.pokemon;
  if (!list || !Array.isArray(list)) {
    throw new Error(`[resolveShowdownSlot] Missing request Pokemon list for side ${side}. Cannot resolve slot for UID: ${pokemonUid}`);
  }
  
  const idx = list.findIndex((p: any) => p && p.uid === pokemonUid);
  if (idx === -1) {
    const uids = list.map((p: any) => p?.uid || 'null');
    throw new Error(`[resolveShowdownSlot] UID ${pokemonUid} not found in ${side} request Pokemon UIDs: ${JSON.stringify(uids)}`);
  }

  const slot = idx + 1;
  console.log(`[resolveShowdownSlot] side: ${side}, resolved slot via PKMS request for UID ${pokemonUid}: ${slot}`);
  return slot;
}
