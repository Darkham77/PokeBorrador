/**
 * Global registry of trainer archetype definitions, sprites, and spawn pools.
 */
import type { NpcArchetype } from '../../logic/utils/npcSpriteRouter.ts';
import type { NpcSpriteId } from '../pokemon/npcSpriteCatalog.ts';
import type { PokemonSpeciesId } from '../pokemon/pokedex.ts';
import type { PokemonType } from '../battle/types.ts';
import { ENABLED_POKEMON_IDS, ENABLED_POKEMON_IDS_SET } from '../system/constants.ts';
import { POKEMON_DB, isPokemonDbSpeciesId } from '../pokemon/pokemonDB.ts';

export const TRAINER_TYPE_KEYS = [
  'caza_bichos',
  'ornitologo',
  'cientifico',
  'luchador',
  'pescador',
  'nadador',
  'domador',
  'medium',
  'motorista',
  'montanero',
  'rocket',
  'criador',
  'aristocrata',
  'ranger',
  'pokefan',
  'policeman',
  'artista',
  'rival',
  'default'
] as const;

export type TrainerTypeKey = (typeof TRAINER_TYPE_KEYS)[number];
export const TRAINER_TYPE_KEYS_SET: ReadonlySet<string> = new Set(TRAINER_TYPE_KEYS); // runtime-set: Fast O(1) membership lookup set

export function isTrainerTypeKey(raw: string): raw is TrainerTypeKey {
  return TRAINER_TYPE_KEYS_SET.has(raw);
}

import type { AIPresetKey } from '../../logic/battle/ai/heuristic/types.ts';

export const TRAINER_TYPE_MATCH_MODES = ['any_type', 'pure_type', 'primary_type'] as const;
export type TrainerTypeMatchMode = (typeof TRAINER_TYPE_MATCH_MODES)[number];

export interface TrainerTypeDefinition {
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly sprite: NpcSpriteId;
  readonly archetype: NpcArchetype;
  readonly aiPreset: AIPresetKey;
  readonly types?: readonly PokemonType[];
  readonly matchMode?: TrainerTypeMatchMode;
  readonly extraPool?: readonly PokemonSpeciesId[];
  readonly excludedSpecies?: readonly PokemonSpeciesId[];
  readonly pool: readonly PokemonSpeciesId[];
}

export interface TrainerTypeRawConfig {
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly sprite: NpcSpriteId;
  readonly archetype: NpcArchetype;
  readonly aiPreset: AIPresetKey;
  readonly types?: readonly PokemonType[];
  readonly matchMode?: TrainerTypeMatchMode;
  readonly extraPool?: readonly PokemonSpeciesId[];
  readonly excludedSpecies?: readonly PokemonSpeciesId[];
  readonly pool?: readonly PokemonSpeciesId[];
}

export const EXCLUDED_LEGENDARY_IDS = [
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
  'raikou', 'entei', 'suicune', 'lugia', 'hooh', 'celebi'
] as const;
export const EXCLUDED_LEGENDARY_IDS_SET: ReadonlySet<string> = new Set(EXCLUDED_LEGENDARY_IDS); // runtime-set: Fast O(1) membership lookup set

const RAW_TRAINER_CONFIGS: Record<TrainerTypeKey, TrainerTypeRawConfig> = {
  'caza_bichos': {
    name: 'Caza Bichos',
    sprite: 'bugcatcher',
    archetype: 'caza_bichos' as NpcArchetype,
    aiPreset: 'novice',
    types: ['bug'],
    matchMode: 'any_type'
  },
  'ornitologo': {
    name: 'Ornitólogo',
    sprite: 'birdkeeper',
    archetype: 'ornitologo' as NpcArchetype,
    aiPreset: 'intermediate',
    types: ['flying'],
    matchMode: 'any_type'
  },
  'cientifico': {
    name: 'Científico',
    sprite: 'scientist',
    archetype: 'cientifico' as NpcArchetype,
    aiPreset: 'tactical',
    types: ['electric', 'poison', 'steel'],
    extraPool: ['porygon', 'ditto', 'voltorb', 'electrode']
  },
  'luchador': {
    name: 'Luchador',
    sprite: 'blackbelt',
    archetype: 'luchador' as NpcArchetype,
    aiPreset: 'tactical',
    types: ['fighting'],
    matchMode: 'any_type'
  },
  'pescador': {
    name: 'Pescador',
    sprite: 'fisherman',
    archetype: 'pescador' as NpcArchetype,
    aiPreset: 'novice',
    types: ['water'],
    matchMode: 'any_type'
  },
  'nadador': {
    name: 'Nadador',
    sprite: 'swimmer',
    archetype: 'nadador' as NpcArchetype,
    aiPreset: 'intermediate',
    types: ['water'],
    matchMode: 'any_type'
  },
  'domador': {
    name: 'Domador',
    sprite: 'tamer-gen3',
    archetype: 'domador' as NpcArchetype,
    aiPreset: 'tactical',
    types: ['fire', 'dragon'],
    extraPool: ['tauros', 'kangaskhan', 'dodrio', 'persian', 'primeape', 'growlithe', 'arcanine', 'ponyta', 'rapidash']
  },
  'medium': {
    name: 'Médium',
    sprite: 'psychic',
    archetype: 'medium' as NpcArchetype,
    aiPreset: 'tactical',
    types: ['psychic', 'ghost'],
    matchMode: 'any_type'
  },
  'motorista': {
    name: 'Motorista',
    sprite: 'biker',
    archetype: 'motorista' as NpcArchetype,
    aiPreset: 'intermediate',
    types: ['poison', 'fire'],
    extraPool: ['electabuzz', 'magmar', 'koffing', 'weezing', 'grimer', 'muk', 'ekans', 'arbok']
  },
  'montanero': {
    name: 'Montañero',
    sprite: 'hiker',
    archetype: 'montanero' as NpcArchetype,
    aiPreset: 'intermediate',
    types: ['rock', 'ground'],
    matchMode: 'any_type'
  },
  'rocket': {
    name: 'Recluta Rocket',
    sprite: 'rocketgrunt',
    archetype: 'rocket' as NpcArchetype,
    aiPreset: 'elite',
    types: ['poison', 'dark'],
    extraPool: ['rattata', 'raticate', 'meowth', 'persian', 'drowzee', 'hypno', 'machop', 'machoke', 'zubat', 'golbat', 'koffing', 'weezing', 'grimer', 'muk', 'ekans', 'arbok']
  },
  'criador': {
    name: 'Criador Pokémon',
    sprite: 'pokemonbreeder',
    archetype: 'criador' as NpcArchetype,
    aiPreset: 'intermediate',
    types: ['normal', 'fairy', 'grass'],
    extraPool: ['pichu', 'cleffa', 'igglybuff', 'togepi', 'tyrogue', 'smoochum', 'elekid', 'magby', 'eevee', 'chansey', 'oddish', 'bellsprout', 'growlithe', 'poliwag', 'caterpie', 'weedle']
  },
  'aristocrata': {
    name: 'Aristócrata',
    sprite: 'gentleman',
    archetype: 'aristocrata' as NpcArchetype,
    aiPreset: 'elite',
    extraPool: ['meowth', 'persian', 'growlithe', 'arcanine', 'eevee', 'vaporeon', 'jolteon', 'flareon', 'clefairy', 'clefable', 'ninetales', 'rapidash', 'dragonair', 'lapras', 'chansey']
  },
  'ranger': {
    name: 'Ranger Pokémon',
    sprite: 'pokemonranger',
    archetype: 'ranger' as NpcArchetype,
    aiPreset: 'tactical',
    types: ['grass', 'ground', 'bug'],
    matchMode: 'any_type'
  },
  'pokefan': {
    name: 'Pokéfan',
    sprite: 'pokefan',
    archetype: 'pokefan' as NpcArchetype,
    aiPreset: 'novice',
    extraPool: ['pikachu', 'raichu', 'jigglypuff', 'wigglytuff', 'clefairy', 'clefable', 'meowth', 'eevee', 'psyduck', 'togepi', 'pichu', 'snorlax']
  },
  'policeman': {
    name: 'Oficial de Policía',
    sprite: 'policeman',
    archetype: 'policeman' as NpcArchetype,
    aiPreset: 'elite',
    extraPool: ['growlithe', 'arcanine', 'machop', 'machoke', 'machamp', 'magnemite', 'magneton', 'pidgeot']
  },
  'artista': {
    name: 'Artista',
    sprite: 'artist',
    archetype: 'artista' as NpcArchetype,
    aiPreset: 'intermediate',
    types: ['grass', 'fairy'],
    extraPool: ['bellsprout', 'weepinbell', 'victreebel', 'oddish', 'gloom', 'vileplume', 'tangela', 'vulpix', 'ninetales', 'clefairy', 'jigglypuff', 'ditto']
  },
  'rival': {
    name: 'Entrenador Élite',
    sprite: 'youngster-masters',
    archetype: 'rival' as NpcArchetype,
    aiPreset: 'rival',
    pool: ['dragonite', 'charizard', 'alakazam', 'machamp', 'gengar', 'lapras']
  },
  'default': {
    name: 'Joven',
    sprite: 'youngster',
    archetype: 'default' as NpcArchetype,
    aiPreset: 'novice',
    types: ['normal', 'flying', 'bug'],
    extraPool: ['rattata', 'pidgey', 'spearow', 'ekans', 'sandshrew', 'zubat']
  }
};

/**
 * Precomputes an O(1) immutable dictionary of valid Pokémon species for each trainer archetype
 * based on elemental types, match criteria, and extra thematic pools filtered by enabled species.
 */
function computeTrainerTypes(): Record<TrainerTypeKey, TrainerTypeDefinition> {
  const result: Partial<Record<TrainerTypeKey, TrainerTypeDefinition>> = {};

  const enabledList: readonly PokemonSpeciesId[] = (typeof ENABLED_POKEMON_IDS !== 'undefined' && Array.isArray(ENABLED_POKEMON_IDS))
    ? ENABLED_POKEMON_IDS
    : ['rattata', 'pidgey', 'caterpie', 'weedle'];
  const enabledSet: ReadonlySet<string> = (typeof ENABLED_POKEMON_IDS_SET !== 'undefined' && ENABLED_POKEMON_IDS_SET instanceof Set)
    ? ENABLED_POKEMON_IDS_SET
    : new Set(enabledList);

  for (const key of TRAINER_TYPE_KEYS) {
    const def = RAW_TRAINER_CONFIGS[key];
    if (def.pool && def.pool.length > 0) {
      result[key] = {
        ...def,
        pool: Object.freeze(def.pool.filter(id => enabledSet.has(id)))
      };
      continue;
    }

    const matched = new Set<PokemonSpeciesId>();
    const allowedTypes = new Set<PokemonType>(def.types ? def.types : []); // runtime-set: Fast O(1) membership lookup set
    const excluded = new Set<PokemonSpeciesId>(def.excludedSpecies ? def.excludedSpecies : []); // runtime-set: Fast O(1) membership lookup set
    const mode = def.matchMode ?? 'any_type';

    if (allowedTypes.size > 0) {
      for (const speciesId of enabledList) {
        if (excluded.has(speciesId)) continue;
        if (EXCLUDED_LEGENDARY_IDS_SET.has(speciesId)) continue;

        if (!isPokemonDbSpeciesId(speciesId)) continue;
        const baseData = POKEMON_DB[speciesId];
        if (!baseData) continue;

        const specTypes: readonly PokemonType[] = baseData.type2 ? [baseData.type, baseData.type2] : [baseData.type];

        if (mode === 'pure_type') {
          if (specTypes.length === 1 && allowedTypes.has(specTypes[0]!)) {
            matched.add(speciesId);
          }
        } else if (mode === 'primary_type') {
          if (specTypes[0] && allowedTypes.has(specTypes[0])) {
            matched.add(speciesId);
          }
        } else {
          if (specTypes.some(t => allowedTypes.has(t))) {
            matched.add(speciesId);
          }
        }
      }
    }

    if (def.extraPool) {
      for (const extraId of def.extraPool) {
        if (enabledSet.has(extraId) && !excluded.has(extraId) && !EXCLUDED_LEGENDARY_IDS_SET.has(extraId)) {
          matched.add(extraId);
        }
      }
    }

    // Fallback if matched set is empty
    if (matched.size === 0) {
      matched.add('rattata');
    }

    result[key] = {
      ...def,
      pool: Object.freeze([...matched])
    };
  }

  return Object.freeze(result as Record<TrainerTypeKey, TrainerTypeDefinition>);
}

export const TRAINER_TYPES: Record<TrainerTypeKey, TrainerTypeDefinition> = computeTrainerTypes();

export function requireNpcArchetype(raw: string): NpcArchetype {
  if (isTrainerTypeKey(raw)) {
    return TRAINER_TYPES[raw].archetype;
  }
  throw new Error(`[trainerTypes] Invalid NPC archetype: ${raw}`);
}

/**
 * Returns the precomputed O(1) list of enabled Pokémon species for a trainer archetype.
 */
export function getArchetypePool(archetype: TrainerTypeKey): readonly PokemonSpeciesId[] {
  return TRAINER_TYPES[archetype]?.pool ?? TRAINER_TYPES['default'].pool;
}

/**
 * Returns the configured AI preset for a trainer archetype.
 */
export function getTrainerAIPreset(raw: string): AIPresetKey {
  if (isTrainerTypeKey(raw)) {
    return TRAINER_TYPES[raw].aiPreset;
  }
  return 'intermediate';
}

