import type { PokemonSet, ID } from '@pkmn/sim';
import { toID } from '@/logic/utils/strings.ts';
import type { Pokemon as GamePokemon } from '../../types/pokemon/pokemon.ts';
import { POKEMON_SPRITE_IDS } from '../../data/pokemon/spriteMapping.ts';
import { ACTIVE_GENERATION } from '../../data/system/constants.ts';
import { getShowdownNickname } from './showdownUidMapper.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import type { BaseStats } from '../pokemon/statsMath.ts';
import { hasMoveData } from '../../data/battle/movesData.ts';

/**
 * Resuelve las estadísticas base de una especie desde la base de datos del juego.
 */
export function resolveBaseStats(speciesId: string): BaseStats {
  const data = pokemonDataProvider.getPokemonData(speciesId, true);
  return {
    hp: data.hp,
    atk: data.atk,
    def: data.def,
    spa: data.spa ?? data.atk,
    spd: data.spd ?? data.def,
    spe: data.spe ?? 45
  };
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

const DEFAULT_HAPPINESS = 255 as const;
const DEFAULT_PERFECT_IV = 31 as const;
const DEFAULT_ZERO_EV = 0 as const;

function resolveValidShowdownMoves(poke: GamePokemon): string[] {
  const moves = poke.moves
    .filter((m): m is NonNullable<typeof m> => !!m && !!m.id)
    .map(m => toID(m.id as string))
    .filter(id => hasMoveData(id));

  if (moves.length === 0) {
    throw new Error(`[mapToShowdownSet] El Pokémon "${poke.name}" no tiene ningún movimiento válido cargado.`);
  }
  return moves;
}

function mapShowdownIvs(poke: GamePokemon) {
  return {
    hp: poke.ivs?.hp ?? DEFAULT_PERFECT_IV,
    atk: poke.ivs?.atk ?? DEFAULT_PERFECT_IV,
    def: poke.ivs?.def ?? DEFAULT_PERFECT_IV,
    spa: poke.ivs?.spa ?? DEFAULT_PERFECT_IV,
    spd: poke.ivs?.spd ?? DEFAULT_PERFECT_IV,
    spe: poke.ivs?.spe ?? DEFAULT_PERFECT_IV
  };
}

function mapShowdownEvs(poke: GamePokemon) {
  return {
    hp: poke.evs?.hp ?? DEFAULT_ZERO_EV,
    atk: poke.evs?.atk ?? DEFAULT_ZERO_EV,
    def: poke.evs?.def ?? DEFAULT_ZERO_EV,
    spa: poke.evs?.spa ?? DEFAULT_ZERO_EV,
    spd: poke.evs?.spd ?? DEFAULT_ZERO_EV,
    spe: poke.evs?.spe ?? DEFAULT_ZERO_EV
  };
}

function mapShowdownStats(poke: GamePokemon): Record<string, number> {
  const customStats = (poke as { stats?: Record<string, number> }).stats;
  if (customStats) {
    return { ...customStats };
  }
  return {
    hp: poke.maxHp,
    atk: poke.atk,
    def: poke.def,
    spa: poke.spa,
    spd: poke.spd,
    spe: poke.spe
  };
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

  const moves = resolveValidShowdownMoves(poke);
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
    happiness: poke.friendship ?? DEFAULT_HAPPINESS,
    pokeball: 'pokeball',
    hpType: '',
    gigantamax: false,
    ivs: mapShowdownIvs(poke),
    evs: mapShowdownEvs(poke),
    moves,
    uid: poke.uid,
    stats: mapShowdownStats(poke)
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
