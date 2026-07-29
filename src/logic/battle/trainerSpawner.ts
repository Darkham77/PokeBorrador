import { TRAINER_TYPES, type TrainerTypeKey } from '@/data/player/trainerTypes';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapLocation } from '@/types/pokemon/encounters';
import type { MapRouteId } from '@/data/world/map-assets';
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex';

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

  const relativeKeys = (Object.keys(TRAINER_TYPES) as TrainerTypeKey[]).filter(
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
  enemyTeam: Pokemon[];
}

export async function buildRivalEncounter(playerTeam: Pokemon[]): Promise<RivalEncounter> {
  const { makePokemon } = await import('@/logic/pokemon/pokemonFactory');
  const { getSpritesForArchetype } = await import('@/logic/utils/npcSpriteRouter');
  const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider');
  const { TeamGenerators } = await import('@pkmn/randoms');
  const { toID } = await import('@pkmn/sim');
  const { ACTIVE_AI_TEAM_GENERATION_GEN } = await import('@/data/system/constants');

  const availableSprites = getSpritesForArchetype('rival');
  const sprite = availableSprites[Math.floor(Math.random() * availableSprites.length)] || 'blue';

  let name = '';
  const base = sprite.split('-')[0] || sprite;
  if (base === 'blue') {
    name = 'Rival Azul';
  } else if (base === 'red') {
    name = 'Rival Rojo';
  } else if (base === 'green') {
    name = 'Rival Verde';
  } else if (base === 'youngster') {
    name = 'Rival Joven';
  } else {
    name = base.charAt(0).toUpperCase() + base.slice(1);
  }

  const teamSize = Math.max(3, playerTeam.length || 1);
  const avgLevel = playerTeam.reduce((sum, p) => sum + p.level, 0) / (playerTeam.length || 1);
  const rivalLevel = Math.floor(avgLevel) + 2;

  // 1. Pick ace from the rival archetype pool (SSoT: TRAINER_TYPES)
  const rivalPool = TRAINER_TYPES['rival'].pool as readonly string[];
  const aceBase = rivalPool[Math.floor(Math.random() * rivalPool.length)] ?? 'charizard';

  // 2. Init randombattle generator based on active generation setting
  const generator = TeamGenerators.getTeamGenerator(`gen${ACTIVE_AI_TEAM_GENERATION_GEN}randombattle`);

  const { applyCompetitiveSet } = await import('./trainerFactory');

  // 3. Build ace: 1 random Pokémon from rival pool + its competitive randomSet
  // Cast needed: TeamGenerator interface is minimal; underlying RandomTeams class exposes randomSet
  const generatorWithRandomSet = generator as unknown as { randomSet: (s: string) => { moves: string[]; ability: string; item: string } };
  const aceSet = generatorWithRandomSet.randomSet(aceBase);

  const acePokemon = makePokemon(aceBase, rivalLevel, { bypassWhitelist: true }) as Pokemon;
  if (!acePokemon) {
    throw new Error(`[buildRivalEncounter] No se pudo crear el Pokémon as: ${aceBase}`);
  }
  await applyCompetitiveSet(acePokemon, aceSet);
  (acePokemon as Pokemon & { _revealed?: boolean })._revealed = true;

  // 4. Fill remaining slots from getTeam() — only species that exist in our DB
  const enemyTeam: Pokemon[] = [acePokemon];
  const usedSpecies: PokemonSpeciesId[] = [requirePokemonSpeciesId(toID(aceBase))];
  const rawTeam = generator.getTeam();

  for (const set of rawTeam) {
    if (enemyTeam.length >= teamSize) break;
    const speciesId = requirePokemonSpeciesId(toID(set.species));
    if (usedSpecies.includes(speciesId)) continue;
    if (!pokemonDataProvider.getPokemonData(speciesId, true)) continue; // especie no en nuestra DB

    const p = makePokemon(speciesId, rivalLevel, { bypassWhitelist: true }) as Pokemon;
    if (!p) continue;

    try {
      await applyCompetitiveSet(p, set);
      (p as Pokemon & { _revealed?: boolean })._revealed = true;
      usedSpecies.push(speciesId);
      enemyTeam.push(p);
    } catch {
      continue; // moves del set no disponibles en nuestra DB → saltear
    }
  }

  // 5. Fill any remaining gaps with pool Pokémon + competitive randomSet (fallback for filtered slots)
  const poolFallback = rivalPool.filter(id => !usedSpecies.includes(requirePokemonSpeciesId(toID(id))));
  for (const poolId of poolFallback) {
    if (enemyTeam.length >= teamSize) break;
    const speciesId = requirePokemonSpeciesId(toID(poolId));
    const p = makePokemon(speciesId, rivalLevel, { bypassWhitelist: true }) as Pokemon;
    if (!p) continue;

    try {
      const fallbackSet = generatorWithRandomSet.randomSet(speciesId);
      await applyCompetitiveSet(p, fallbackSet);
      (p as Pokemon & { _revealed?: boolean })._revealed = true;
      usedSpecies.push(speciesId);
      enemyTeam.push(p);
    } catch {
      continue;
    }
  }

  return { name, sprite, enemyTeam };
}

export interface TrainerEncounter {
  name: string;
  sprite: string;
  quote: string;
  archetype: NpcArchetype;
  enemyTeam: Pokemon[];
}

export async function buildTrainerEncounter(
  gsState: {
    playerClass?: string | null;
    classData?: { criminality?: number; [key: string]: unknown };
    trainerChance?: number;
  },
  locId: MapRouteId
): Promise<TrainerEncounter> {
  gsState.trainerChance = 5;

  const { buildTrainerTeam } = await import('./trainerFactory');
  const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider');
  const { getSpritesForArchetype } = await import('@/logic/utils/npcSpriteRouter');
  const { getRandomQuoteForTrainer } = await import('@/data/player/trainerPhrases');
  const { generateNpcName } = await import('@/logic/utils/npcNameGenerator');

  const mapsList = pokemonDataProvider.getMaps() as MapLocation[];
  const targetMap = mapsList.find(m => m.id === locId);
  const baseLv = targetMap?.lv?.[0] || 5;

  const isMaxCriminality = (gsState.playerClass === 'rocket' && (gsState.classData?.criminality ?? 0) >= 100);

  let tName = 'Entrenador';
  let tSprite: NpcSpriteId = 'youngster';
  let tQuote = '¡Prepárate para combatir! ¡No te lo pondré fácil!';
  let typeKey: keyof typeof TRAINER_TYPES = 'default';
  const enemyTeam: Pokemon[] = [];

  if (isMaxCriminality) {
    const t = TRAINER_TYPES['policeman'];
    const availableSprites = getSpritesForArchetype('policeman');
    const selectedSprite = availableSprites[Math.floor(Math.random() * availableSprites.length)];
    if (!selectedSprite) {
      throw new Error('[trainerSpawner] No NPC sprite registered for policeman archetype');
    }
    tSprite = requireNpcSpriteId(selectedSprite);
    tName = generateNpcName({ spriteId: tSprite, archetype: 'policeman', includeTitle: true });
    tQuote = getRandomQuoteForTrainer('policeman');

    const criminality = gsState.classData?.criminality || 100;
    const excess = Math.max(0, criminality - 100);
    const bonusLv = Math.floor(excess / 50);
    const trainerLv = baseLv + 5 + bonusLv;
    const teamSize = Math.floor(Math.random() * 2) + 3;

    const team = await buildTrainerTeam(t.pool, trainerLv, teamSize);
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

    const team = await buildTrainerTeam(t.pool, trainerLv, teamSize);
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
