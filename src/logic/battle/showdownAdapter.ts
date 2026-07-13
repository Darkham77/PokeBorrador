import { Dex, Battle } from '@pkmn/sim';
import type { PokemonSet, ID, StatsTable } from '@pkmn/sim';
import type { Pokemon as GamePokemon } from '../../types/pokemon/pokemon.ts';
import { POKEMON_SPRITE_IDS } from '../../data/pokemon/spriteMapping.ts';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { getShowdownNickname } from './showdownUidMapper.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import type { BaseStats } from '../pokemon/statsMath.ts';

export const statsMap = new Map<string, Record<string, number>>();

/**
 * Aplica el monkey-patch spreadModify a Battle de Showdown para inyectar estadísticas custom.
 */
export function patchShowdownSpreadModify(getIsE2eMode: () => boolean) {
  const originalSpreadModify = Battle.prototype.spreadModify;
  Battle.prototype.spreadModify = function (baseStats, set) {
    if (getIsE2eMode()) {
      return originalSpreadModify.call(this, baseStats, set);
    }
    if (set && set.name) {
      const stats = statsMap.get(set.name);
      if (stats) {
        return { ...(stats as Record<string, number>) } as StatsTable;
      }
    }
    if (set && (set as unknown as { stats?: unknown }).stats) {
      return { ...(set as unknown as { stats: Record<string, number> }).stats } as StatsTable;
    }
    return originalSpreadModify.call(this, baseStats, set);
  };
}

/**
 * Resuelve las estadísticas base de una especie unificando la base de datos del juego y Showdown.
 */
export function resolveBaseStats(speciesId: string): BaseStats {
  try {
    const data = pokemonDataProvider.getPokemonData(speciesId, true);
    return {
      hp: data.hp,
      atk: data.atk,
      def: data.def,
      spa: data.spa ?? data.atk,
      spd: data.spd ?? data.def,
      spe: data.spe ?? 45
    };
  } catch (_e) {
    const species = Dex.species.get(speciesId);
    return {
      hp: species.baseStats.hp,
      atk: species.baseStats.atk,
      def: species.baseStats.def,
      spa: species.baseStats.spa,
      spd: species.baseStats.spd,
      spe: species.baseStats.spe
    };
  }
}

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
  const showdownName = getShowdownNickname(poke.uid);

  return {
    name: showdownName,
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
  } as PokemonSet & { uid?: string };
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

export function resolveShowdownSlot(
  active: ResolveActiveBattleState,
  side: 'player' | 'enemy',
  uid: string
): number {
  const request = side === 'player' ? active.playerRequest : active.enemyRequest;
  if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
    throw new Error('Missing request');
  }
  const idx = request.side.pokemon.findIndex((p: { uid?: string } | null) => p && p.uid === uid);
  return idx !== -1 ? idx + 1 : 1;
}
