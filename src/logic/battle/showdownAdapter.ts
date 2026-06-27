import type { PokemonSet, ID } from '@pkmn/sim';
import type { Pokemon as GamePokemon } from '@/types/pokemon/pokemon';
import { POKEMON_SPRITE_IDS } from '@/data/pokemon/spriteMapping';
import { ACTIVE_GENERATION } from '@/data/system/constants';

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
  // Traducir habilidad y naturaleza (por defecto vacías o neutras si no hay coincidencia)
  const abilityKey = poke.ability ? normalizeKey(poke.ability) : 'overgrow';
  const natureKey = poke.nature ? normalizeKey(poke.nature) : 'serious';

  // Filtrar movimientos no nulos y mapear IDs
  const moves = poke.moves
    .filter((m): m is NonNullable<typeof m> => !!m && !!m.id)
    .map(m => m.id as string);

  const speciesName = resolveShowdownSpecies(poke.id);

  return {
    name: poke.nickname || poke.name,
    species: speciesName,
    level: poke.level,
    shiny: poke.isShiny || false,
    gender: (poke.gender === 'M' || poke.gender === 'F') ? poke.gender : '',
    item: '',
    ability: abilityKey,
    nature: natureKey,
    ivs: {
      hp: poke.ivs?.hp ?? 31,
      atk: poke.ivs?.atk ?? 31,
      def: poke.ivs?.def ?? 31,
      spa: poke.ivs?.spa ?? 31,
      spd: poke.ivs?.spd ?? 31,
      spe: poke.ivs?.spe ?? 31
    },
    // No usamos EVs detallados por defecto en el modo aventura, o mapeamos 0 si no se manejan
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: moves
  };
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
  if (!raw) return 'bulbasaur';
  // Si es puramente numérico, buscar en mapa inverso
  if (/^\d+$/.test(raw)) return _numericToSpecies[raw] ?? raw;
  // Si ya es nombre Showdown, devolverlo tal cual
  return raw;
}

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retorna el slot de Showdown (1-indexed, de 1 a 6) para un Pokémon del equipo
 */
export function getShowdownSlot(
  teamOrOrder: (string | GamePokemon)[],
  activePokeOrTargetUid: string | GamePokemon,
  targetPoke?: GamePokemon
): number {
  if (typeof teamOrOrder[0] === 'string') {
    const currentOrder = teamOrOrder as string[];
    const targetUid = activePokeOrTargetUid as string;
    const idx = currentOrder.indexOf(targetUid);
    return idx !== -1 ? idx + 1 : 1;
  } else {
    const team = teamOrOrder as GamePokemon[];
    const activePoke = activePokeOrTargetUid as GamePokemon;
    const target = targetPoke!;
    if (target.uid === activePoke.uid) return 1;
    const others = team.filter(p => !!p && p.uid !== activePoke.uid);
    const idx = others.findIndex(p => p.uid === target.uid);
    return idx !== -1 ? idx + 2 : 1;
  }
}

export function swapShowdownOrder(currentOrder: string[], targetUid: string): string[] {
  const nextOrder = [...currentOrder];
  const idx = nextOrder.indexOf(targetUid);
  if (idx > 0) {
    const active = nextOrder[0];
    const target = nextOrder[idx];
    if (active !== undefined && target !== undefined) {
      nextOrder[0] = target;
      nextOrder[idx] = active;
    }
  }
  return nextOrder;
}

