import { TRAINER_TYPES, TRAINER_TYPE_KEYS, getArchetypePool, type TrainerTypeKey } from '@/data/player/trainerTypes';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { MapRouteId } from '@/data/world/map-assets';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

import { buildTrainerTeam } from './trainerFactory.ts';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getSpritesForArchetype } from '@/logic/utils/npcSpriteRouter';
import { getRandomQuoteForTrainer } from '@/data/player/trainerPhrases';
import { generateNpcName } from '@/logic/utils/npcNameGenerator';

// Configuración genérica por defecto de probabilidades y pesos
const DEFAULT_ARCHETYPE_WEIGHTS: Record<TrainerTypeKey, number> = {
  rival: 0.001,      // 0.1% de probabilidad absoluta
  policeman: 0.0,    // 0% (solo policía con criminalidad, o vía customChances/overrides)
  caza_bichos: 1.0,
  ornitologo: 1.0,
  cientifico: 1.0,
  luchador: 1.0,
  pescador: 1.0,
  nadador: 1.0,
  domador: 1.0,
  medium: 1.0,
  motorista: 1.0,
  montanero: 1.0,
  rocket: 1.0,
  criador: 1.0,
  aristocrata: 1.0,
  ranger: 1.0,
  pokefan: 1.0,
  artista: 1.0,
  default: 1.0,
};

/**
 * Selecciona un arquetipo de entrenador usando probabilidades.
 * Los chances absolutos (valores muy pequeños o específicos como rival y policeman) se evalúan primero.
 * El resto de la probabilidad se distribuye proporcionalmente según sus pesos relativos.
 */
function selectTrainerArchetype(
  customChances?: Partial<Record<TrainerTypeKey, number>>,
  isMaxCriminality = false
): TrainerTypeKey {
  if (isMaxCriminality) {
    return 'policeman';
  }

  const weights = {
    ...DEFAULT_ARCHETYPE_WEIGHTS,
    ...customChances
  };

  const rivalChance = weights.rival ?? 0.001;
  const policemanChance = weights.policeman ?? 0.0;

  const r = Math.random();

  // 1. Evaluar probabilidades absolutas
  if (r < rivalChance) {
    return 'rival';
  }
  if (r < rivalChance + policemanChance) {
    return 'policeman';
  }

  // 2. Si no cayó en los absolutos, distribuir el resto (1 - absoluteSum)
  // proporcionalmente entre todos los demás arquetipos relativos
  const absoluteSum = rivalChance + policemanChance;
  if (absoluteSum >= 1.0) {
    return rivalChance > 0 ? 'rival' : 'policeman';
  }

  const relativeKeys = TRAINER_TYPE_KEYS.filter(
    k => k !== 'rival' && k !== 'policeman'
  );

  const totalRelativeWeight = relativeKeys.reduce((sum, k) => sum + (weights[k] ?? 1.0), 0);
  if (totalRelativeWeight <= 0) {
    return 'default';
  }

  // Escalamos la tirada restante dentro del rango total de pesos relativos
  const remainingRoll = Math.random() * totalRelativeWeight;
  let currentSum = 0;
  for (const key of relativeKeys) {
    currentSum += weights[key] ?? 1.0;
    if (remainingRoll <= currentSum) {
      return key;
    }
  }

  return 'default';
}

export interface RivalEncounter {
  name: string;
  sprite: string;
  quote?: string;
  archetype?: string;
  enemyTeam: Pokemon[];
}

export async function buildRivalEncounter(playerTeam: Pokemon[]): Promise<RivalEncounter> {
  const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');
  const { getSpritesForArchetype } = await import('@/logic/utils/npcSpriteRouter');
  const { toID } = await import('@pkmn/sim');
  const { isEnabledPokemonId, MAX_POKEMON_LEVEL } = await import('@/data/system/constants');
  const { RivalTeamGenerator } = await import('./rivalTeamGenerator');
  const { applyCompetitiveSet } = await import('./trainerFactory');

  const availableSprites = getSpritesForArchetype('rival');
  const selectedSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)];
  if (!selectedSprite) {
    throw new Error('[trainerSpawner] No NPC sprite registered for rival archetype');
  }
  const tSprite = requireNpcSpriteId(selectedSprite);
  const tName = generateNpcName({ spriteId: tSprite, archetype: 'rival', includeTitle: true });
  const tQuote = getRandomQuoteForTrainer('rival');

  // Nivel del rival: Promedio del equipo del jugador + 5 (tope en MAX_POKEMON_LEVEL)
  const avgLevel = playerTeam.length > 0
    ? playerTeam.reduce((acc, p) => acc + (p.level || 5), 0) / playerTeam.length
    : 5;
  const rivalLevel = Math.min(MAX_POKEMON_LEVEL, Math.floor(avgLevel) + 5);

  // Tamaño del equipo: mínimo 3 o igual al tamaño del equipo del jugador si tiene más de 3
  const targetTeamSize = Math.max(3, playerTeam.length);

  // 1. Pick ace from the rival archetype pool (SSoT: TRAINER_TYPES)
  const rivalPool = getArchetypePool('rival');
  const aceSpeciesId = rivalPool[Math.floor(Math.random() * rivalPool.length)] || 'dragonite';

  // 2. Generate full balanced team using native Showdown engine rules
  const generatedSets = RivalTeamGenerator.generateTeam({
    level: rivalLevel,
    teamSize: targetTeamSize,
    aceSpeciesId
  });

  // 3. Convert generated PokemonSet[] into active Pokemon[] domain instances
  const enemyTeam: Pokemon[] = [];
  for (const set of generatedSets) {
    const speciesId = requirePokemonSpeciesId(toID(set.species));
    if (!isEnabledPokemonId(speciesId)) {
      throw new Error(`[buildRivalEncounter] Non-enabled species returned by generator: ${speciesId}`);
    }

    const p = makePokemon(speciesId, rivalLevel) as Pokemon;
    if (p) {
      await applyCompetitiveSet(p, set);
      (p as Pokemon & { _revealed?: boolean })._revealed = true;
      enemyTeam.push(p);
    }
  }

  return {
    name: tName,
    sprite: tSprite,
    quote: tQuote,
    archetype: 'rival',
    enemyTeam
  };
}

/**
 * Función principal para generar el encuentro completo de un entrenador salvaje / mapa.
 */
export async function buildTrainerEncounter(
  gsState: {
    playerClass?: string | null;
    classData?: { criminality?: number; [key: string]: unknown };
    trainerChance?: number;
  },
  locId: MapRouteId
): Promise<{
  name: string;
  sprite: NpcSpriteId;
  quote: string;
  archetype: NpcArchetype;
  enemyTeam: Pokemon[];
}> {
  gsState.trainerChance = 5;

  const mapsList = pokemonDataProvider.getMaps() as MapLocation[];
  const targetMap = mapsList.find(m => m.id === locId);
  const baseLv = targetMap?.lv?.[0] || 5;

  const isMaxCriminality = (gsState.playerClass === 'rocket' && (gsState.classData?.criminality ?? 0) >= 100);

  let tName = 'Entrenador';
  let tSprite: NpcSpriteId = 'youngster';
  let tQuote = '¡Prepárate para combatir! ¡No te lo pondré fácil!';
  let typeKey: TrainerTypeKey = 'default';
  const enemyTeam: Pokemon[] = [];

  if (isMaxCriminality) {
    const availableSprites = getSpritesForArchetype('policeman');
    const selectedSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)];
    if (!selectedSprite) {
      throw new Error('[trainerSpawner] No NPC sprite registered for policeman archetype');
    }
    tSprite = requireNpcSpriteId(selectedSprite);
    tName = generateNpcName({ spriteId: tSprite, archetype: 'policeman', includeTitle: true });
    tQuote = getRandomQuoteForTrainer('policeman');

    const criminality = (gsState.classData?.criminality as number) || 100;
    const { calculatePoliceEffectiveLevel, calculatePoliceTeamSize } = await import('@/logic/player/classMath');
    const trainerLv = calculatePoliceEffectiveLevel(baseLv, criminality);
    const teamSize = calculatePoliceTeamSize(criminality);

    const team = await buildTrainerTeam(getArchetypePool('policeman'), trainerLv, teamSize);
    enemyTeam.push(...team);
    typeKey = 'policeman';
  } else {
    const mapChances = targetMap?.trainerChances || {};
    typeKey = selectTrainerArchetype(mapChances, false);
    
    const t = TRAINER_TYPES[typeKey];
    const archetypeSprites = getSpritesForArchetype(t.archetype);
    const selectedSprite = archetypeSprites[Math.floor(Math.random() * archetypeSprites.length)];
    if (!selectedSprite) {
      throw new Error(`[trainerSpawner] No NPC sprite registered for trainer archetype: ${t.archetype}`);
    }
    tSprite = requireNpcSpriteId(selectedSprite);
    tName = generateNpcName({ spriteId: tSprite, archetype: typeKey, includeTitle: true });
    tQuote = getRandomQuoteForTrainer(typeKey);
    const trainerLv = baseLv + 2;
    const teamSize = Math.floor(Math.random() * 3) + 1;

    const team = await buildTrainerTeam(getArchetypePool(typeKey), trainerLv, teamSize);
    enemyTeam.push(...team);
  }

  return {
    name: tName,
    sprite: tSprite,
    quote: tQuote,
    archetype: isMaxCriminality ? 'policeman' : TRAINER_TYPES[typeKey].archetype,
    enemyTeam
  };
}
