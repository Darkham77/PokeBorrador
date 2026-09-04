import { Dex, Battle, toID } from '@pkmn/sim';
import type { PokemonSet, ID, StatsTable } from '@pkmn/sim';
import type { Pokemon as GamePokemon } from '../../types/pokemon/pokemon.ts';
import { POKEMON_SPRITE_IDS } from '../../data/pokemon/spriteMapping.ts';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { getShowdownNickname } from './showdownUidMapper.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import type { BaseStats } from '../pokemon/statsMath.ts';

export const statsMap = new Map<string, Record<string, number>>();

const SPREAD_MODIFY_PATCH_MARKER = Symbol.for('pokevicio.showdown.spread-modify-patched');

/**
 * Aplica el monkey-patch spreadModify a Battle de Showdown para inyectar estadísticas custom.
 */
export function patchShowdownSpreadModify(_getIsE2eMode: () => boolean) {
  if (Reflect.get(Battle.prototype, SPREAD_MODIFY_PATCH_MARKER) === true) return;
  const originalSpreadModify = Battle.prototype.spreadModify;
  Battle.prototype.spreadModify = function (baseStats, set) {

    if (set && set.name) {
      const stats = statsMap.get(set.name);
      if (stats) {
        const clampStat = (val: number) => Math.max(1, Math.min(Math.floor(val), 9999));
        const mapped = { ...(stats as Record<string, number>) }; // open-record: Generic key-value data dictionary container
        if (mapped.maxHp !== undefined && mapped.hp === undefined) {
          mapped.hp = mapped.maxHp;
        }
        for (const k of Object.keys(mapped)) {
          if (typeof mapped[k] === 'number') mapped[k] = clampStat(mapped[k]);
        }
        return mapped as StatsTable; // domain-ok: Open dynamic text or non-domain string payload
      }
    }
    if (set && Reflect.get(set, 'stats')) {
      const clampStat = (val: number) => Math.max(1, Math.min(Math.floor(val), 9999));
      const setStats = Reflect.get(set, 'stats') as Record<string, number> | undefined; // open-record: Generic key-value data dictionary container
      const stats = { ...(setStats || {}) };
      if (stats.maxHp !== undefined && stats.hp === undefined) {
        stats.hp = stats.maxHp;
      }
      for (const k of Object.keys(stats)) {
        if (typeof stats[k] === 'number') stats[k] = clampStat(stats[k]);
      }
      return stats as StatsTable; // domain-ok: Open dynamic text or non-domain string payload
    }
    return originalSpreadModify.call(this, baseStats, set);
  };
  Reflect.set(Battle.prototype, SPREAD_MODIFY_PATCH_MARKER, true);
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
export function getShowdownFormatId(gen?: number, gameType?: 'singles' | 'doubles'): ID {
  const finalGen = gen !== undefined ? gen : ACTIVE_GENERATION;
  const prefix = gameType === 'doubles' ? 'doubles' : '';
  if (finalGen < 5) {
    return `gen${finalGen}${prefix}customgame` as ID;
  }
  return `gen${finalGen}${prefix}customgame@@@!Team Preview` as ID;
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
    .map(m => toID(m.id as string))
    .filter(id => {
      const mData = Dex.moves.get(id);
      return mData.exists;
    });

  if (moves.length === 0) {
    throw new Error(`[mapToShowdownSet] El Pokémon "${poke.name}" no tiene ningún movimiento válido cargado.`);
  }

  const speciesName = resolveShowdownSpecies(poke.id);
  const showdownName = getShowdownNickname(poke.uid);
  const rawNature = (poke.nature || 'serious').trim();

  const showdownSet: PokemonSet & { uid?: string; stats?: Record<string, number> } = {
    name: showdownName,
    species: speciesName,
    level: poke.level,
    shiny: poke.isShiny || false,
    gender: poke.gender === 'm' ? 'M' : poke.gender === 'f' ? 'F' : 'N',
    item: poke.heldItem ? toID(poke.heldItem) : '',
    ability: poke.ability ? toID(poke.ability) : '',
    nature: rawNature,
    happiness: poke.friendship ?? 255,
    pokeball: 'pokeball',
    hpType: '',
    gigantamax: false,
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
    stats: (poke as { stats?: Record<string, number> }).stats
      ? { ...((poke as { stats?: Record<string, number> }).stats) }
      : {
          hp: poke.maxHp,
          atk: poke.atk,
          def: poke.def,
          spa: poke.spa,
          spd: poke.spd,
          spe: poke.spe
        }
  };

  return showdownSet;
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
