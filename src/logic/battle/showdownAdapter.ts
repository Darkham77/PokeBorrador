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
  // Traducir habilidad y naturaleza (por defecto vacías o neutras si no hay coincidencia)
  const abilityKey = poke.ability || 'overgrow';
  const natureKey = poke.nature || 'serious';

  // Filtrar movimientos no nulos, mapear IDs y permitir cualquier movimiento existente en el Dex global
  const moves = poke.moves
    .filter((m): m is NonNullable<typeof m> => !!m && !!m.id)
    .map(m => m.id as string)
    .filter(id => {
      const mData = Dex.moves.get(id);
      return mData.exists;
    });

  if (moves.length === 0) {
    moves.push('tackle');
  }

  const speciesName = resolveShowdownSpecies(poke.id);

  return {
    name: poke.nickname || poke.name,
    species: speciesName,
    level: poke.level,
    shiny: poke.isShiny || false,
    gender: (poke.gender === 'M' || poke.gender === 'F') ? poke.gender : '',
    item: poke.heldItem || '',
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
    moves: moves,
    uid: poke.uid
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
  if (!raw) return 'bulbasaur';
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

/**
 * Resolves the Showdown slot number for a Pokemon using the canonical slot order
 * provided by the worker (p1SlotOrder / p2SlotOrder).
 */
export function resolveShowdownSlot(
  active: { p1SlotOrder?: string[] | null; p2SlotOrder?: string[] | null },
  side: 'player' | 'enemy',
  pokemonUid: string
): number {
  const order = side === 'player' ? active.p1SlotOrder : active.p2SlotOrder
  if (!order?.length) return 1
  return getShowdownSlot(order, pokemonUid)
}
