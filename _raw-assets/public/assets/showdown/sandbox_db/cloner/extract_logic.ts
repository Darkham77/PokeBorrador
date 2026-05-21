import { Dex } from '@pkmn/sim';

export interface ExtractedPokemon {
  num: number;
  id: string;
  name: string;
  types: string[];
  baseStats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  abilities: string[];
  sprites?: {
    front: string;
    frontAnimated: boolean;
    back: string;
    backAnimated: boolean;
  };
}

export interface ExtractedMove {
  id: string;
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  basePower: number;
  accuracy: number | true;
  pp: number;
  desc?: string;
  shortDesc: string;
}

export interface ExtractedAbility {
  id: string;
  name: string;
  desc?: string;
  shortDesc: string;
}

export interface ShowdownLocalDB {
  pokemon: Record<string, ExtractedPokemon>;
  moves: Record<string, ExtractedMove>;
  abilities: Record<string, ExtractedAbility>;
}

export function extractGen3Logic(): ShowdownLocalDB {
  const db: ShowdownLocalDB = {
    pokemon: {},
    moves: {},
    abilities: {},
  };

  // 1. Extraer Habilidades (Gen <= 3)
  const allAbilities = Dex.abilities.all();
  for (const abi of allAbilities) {
    // En @pkmn/sim, las habilidades tienen un gen asignado
    if (abi.gen && abi.gen <= 3) {
      db.abilities[abi.id] = {
        id: abi.id,
        name: abi.name,
        desc: abi.desc,
        shortDesc: abi.shortDesc,
      };
    }
  }

  // 2. Extraer Movimientos (Gen <= 3)
  const allMoves = Dex.moves.all();
  for (const move of allMoves) {
    if (move.gen && move.gen <= 3) {
      // Ignorar movimientos internos/especiales de simulación
      if (move.isNonstandard) continue;

      db.moves[move.id] = {
        id: move.id,
        name: move.name,
        type: move.type,
        category: move.category,
        basePower: move.basePower,
        accuracy: move.accuracy,
        pp: move.pp,
        desc: move.desc,
        shortDesc: move.shortDesc,
      };
    }
  }

  // 3. Extraer Pokémon (Gen <= 3)
  const allSpecies = Dex.species.all();
  for (const spec of allSpecies) {
    if (spec.gen && spec.gen <= 3) {
      // Filtrar formas alternativas no canon o no existentes en Gen 3 (ej: mega evoluciones, formas Alola, etc.)
      if (spec.isNonstandard) continue;
      
      const pokemonAbilities: string[] = [];
      if (spec.abilities[0]) pokemonAbilities.push(Dex.abilities.get(spec.abilities[0]).id);
      if (spec.abilities[1]) pokemonAbilities.push(Dex.abilities.get(spec.abilities[1]).id);
      if (spec.abilities.H) pokemonAbilities.push(Dex.abilities.get(spec.abilities.H).id);

      db.pokemon[spec.id] = {
        num: spec.num,
        id: spec.id,
        name: spec.name,
        types: spec.types,
        baseStats: {
          hp: spec.baseStats.hp,
          atk: spec.baseStats.atk,
          def: spec.baseStats.def,
          spa: spec.baseStats.spa,
          spd: spec.baseStats.spd,
          spe: spec.baseStats.spe,
        },
        abilities: pokemonAbilities,
      };
    }
  }

  return db;
}
