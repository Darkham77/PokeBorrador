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
    moves: moves,
    uid: poke.uid
  } as any;
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

export function swapActivePokemon(currentOrder: string[], activeUid: string, activeIndex: number = 0): string[] {
  const nextOrder = [...currentOrder];
  const idx = nextOrder.indexOf(activeUid);
  if (idx !== -1 && idx !== activeIndex) {
    const active = nextOrder[activeIndex];
    const target = nextOrder[idx];
    if (active !== undefined && target !== undefined) {
      nextOrder[activeIndex] = target;
      nextOrder[idx] = active;
    }
  }
  return nextOrder;
}

export function resolveCurrentTeamOrder(
  active: {
    showdownPlayerTeamOrder?: string[] | null;
    initialPlayerTeamOrder?: string[] | null;
    playerTeam?: Array<GamePokemon | null> | null;
    showdownEnemyTeamOrder?: string[] | null;
    initialEnemyTeamOrder?: string[] | null;
    enemyTeam?: Array<GamePokemon | null> | null;
  },
  side: 'player' | 'enemy',
  fallbackTeam: Array<GamePokemon | null> = []
): string[] {
  if (side === 'player') {
    const list = active.showdownPlayerTeamOrder || active.initialPlayerTeamOrder || active.playerTeam || fallbackTeam;
    return list.filter((p): p is string | GamePokemon => !!p).map(p => typeof p === 'string' ? p : p.uid);
  } else {
    const list = active.showdownEnemyTeamOrder || active.initialEnemyTeamOrder || active.enemyTeam || fallbackTeam;
    return list.filter((p): p is string | GamePokemon => !!p).map(p => typeof p === 'string' ? p : p.uid);
  }
}

export function resolveOriginalTeamOrder(
  active: {
    initialPlayerTeamOrder?: string[] | null;
    playerTeam?: Array<GamePokemon | null> | null;
    initialEnemyTeamOrder?: string[] | null;
    enemyTeam?: Array<GamePokemon | null> | null;
  },
  side: 'player' | 'enemy',
  fallbackTeam: Array<GamePokemon | null> = []
): string[] {
  if (side === 'player') {
    const list = active.initialPlayerTeamOrder || active.playerTeam || fallbackTeam;
    return list.filter((p): p is string | GamePokemon => !!p).map(p => typeof p === 'string' ? p : p.uid);
  } else {
    const list = active.initialEnemyTeamOrder || active.enemyTeam || fallbackTeam;
    return list.filter((p): p is string | GamePokemon => !!p).map(p => typeof p === 'string' ? p : p.uid);
  }
}

export function resolveShowdownSlot(
  active: {
    showdownPlayerTeamOrder?: string[] | null;
    initialPlayerTeamOrder?: string[] | null;
    playerTeam?: Array<GamePokemon | null> | null;
    showdownEnemyTeamOrder?: string[] | null;
    initialEnemyTeamOrder?: string[] | null;
    enemyTeam?: Array<GamePokemon | null> | null;
  },
  side: 'player' | 'enemy',
  pokemonUid: string,
  fallbackTeam: Array<GamePokemon | null> = []
): number {
  // Use the CURRENT order (which tracks internal Showdown slot swaps after each switch).
  // resolveOriginalTeamOrder was wrong because Showdown physically reorders slots on switch.
  const order = resolveCurrentTeamOrder(active, side, fallbackTeam);
  return getShowdownSlot(order, pokemonUid);
}



