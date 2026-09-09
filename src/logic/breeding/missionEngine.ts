
/**
 * missionEngine.ts
 * Logic for generating and validating Daycare Daily Missions.
 */

import { POKEMON_DB, isPokemonDbSpeciesId } from '@/data/pokemon/pokemonDB';
import { TRAINER_TYPES, TRAINER_TYPE_KEYS, requireNpcArchetype, type TrainerTypeKey } from '@/data/player/trainerTypes';
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { getSpritesForArchetype, type NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import { generateNpcName } from '@/logic/utils/npcNameGenerator';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type {
  DaycareMission,
  MissionRequirement,
  MissionReward,
  DaycareMissionDifficulty,
  DaycareMissionRequirementType
} from '@/types/breeding/breeding';
import { NATURE_DATA, NATURES } from '@/data/battle/natures';
import { getItemById, type ItemId } from '@/data/inventory/items';
import { STAT_SHORT_NAMES_ES } from '@/logic/pokemon/statsMath';
import { POKEMON_STAT_KEYS } from '@/types/pokemon/pokemon';

export type { DaycareMission, MissionRequirement, MissionReward };

const TRAINER_LEVEL_APPRENTICE_THRESHOLD = 10;
const TRAINER_LEVEL_VETERAN_THRESHOLD = 25;
const TRAINER_LEVEL_MASTER_THRESHOLD = 40;
const TRAINER_LEVEL_IV31_UNLOCK_THRESHOLD = 15;
const MAX_PERFECT_IV_VAL = 31;

const POOLS: Record<DaycareMissionDifficulty, readonly PokemonSpeciesId[]> = {
  novice: ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'zubat', 'geodude', 'sandshrew', 'nidoranf', 'nidoranm', 'magikarp', 'ekans', 'paras'],
  apprentice: ['pikachu', 'abra', 'gastly', 'drowzee', 'machop', 'bellsprout', 'oddish', 'venonat', 'psyduck', 'poliwag', 'meowth', 'mankey', 'vulpix', 'clefairy', 'jigglypuff', 'pidgeotto', 'raticate', 'fearow', 'golbat', 'graveler', 'kakuna', 'metapod'],
  veteran: ['growlithe', 'ponyta', 'slowpoke', 'magnemite', 'doduo', 'seel', 'grimer', 'shellder', 'krabby', 'voltorb', 'exeggcute', 'cubone', 'horsea', 'goldeen', 'staryu', 'kadabra', 'machoke', 'haunter', 'weepinbell', 'gloom', 'poliwhirl'],
  master: ['arcanine', 'rapidash', 'slowbro', 'magneton', 'dodrio', 'dewgong', 'muk', 'cloyster', 'onix', 'hypno', 'kingler', 'electrode', 'exeggutor', 'marowak', 'weezing', 'rhydon', 'tangela', 'seadra', 'seaking', 'starmie', 'gyarados', 'vaporeon', 'jolteon', 'flareon', 'aerodactyl', 'snorlax', 'dragonair', 'scyther', 'pinsir', 'tauros', 'kangaskhan', 'lapras']
};

const MISSION_DIALOGUES_BASE: Record<string, string[]> = {
  'caza_bichos': [
    "¡Busco un ${pokemon} para mi colección! ¿Tienes uno con ${req}?",
    "¡Dicen que los ${pokemon} con ${req} son increíbles! ¿Me consigues uno?",
    "¡Mi red de caza no es suficiente para este ${pokemon}! ¡Dámelo si tiene ${req}!"
  ],
  'ornitologo': [
    "¡Urgente! Necesito un ${pokemon} para mis mensajerías. Debe tener ${req}.",
    "¡Ese ${pokemon} volaría alto en mi equipo! ¿Tienes uno con ${req}?",
    "¡Necesito un ${pokemon} con ${req} para una competencia pronto!"
  ],
  'cientifico': [
    "¡Mi investigación requiere un ejemplar de ${pokemon}! ¿Me consigues uno con ${req}?",
    "¡La energía de un ${pokemon} con ${req} es fascinante! ¡Tráeme uno!",
    "¡Para mis experimentos necesito un ${pokemon}! Que tenga ${req}."
  ],
  'luchador': [
    "¡Busco un ${pokemon} para entrenar mis puños! ¡Tráeme uno con ${req}!",
    "¡Ese ${pokemon} tiene un espíritu increíble! ¿Tienes uno con ${req}?",
    "¡Entrenemos juntos! Pero primero consígueme un ${pokemon} con ${req}."
  ],
  'pescador': [
    "¡Lancé el anzuelo pero no pica nada! ¿Podrías darme un ${pokemon} con ${req}?",
    "¡Este ${pokemon} se me escapó por poco! ¿Tienes uno con ${req} para mí?",
    "¡Qué buena pesca sería un ${pokemon}! Tráeme uno con ${req}."
  ],
  'nadador': [
    "¡Las olas son fuertes hoy! Un ${pokemon} con ${req} me ayudaría mucho.",
    "¡Nadando encontré un ${pokemon}, pero era débil! Tráeme uno con ${req}.",
    "¡El agua está genial! Y más si tuviera un ${pokemon} con ${req} conmigo."
  ],
  'domador': [
    "¡Mi hermano quiere hacer competencia y mis Pokemon son lentos! ¡Necesito un ${pokemon} con ${req}!",
    "¡Mi equipo necesita más fieras! Un ${pokemon} con ${req} sería ideal.",
    "¡Ese ${pokemon} se ve salvaje! ¿Tienes uno con ${req} para mi colección?"
  ],
  'medium': [
    "He tenido una visión... ¡Necesito un ${pokemon} con ${req} ahora mismo!",
    "El cosmos dice que un ${pokemon} con ${req} traerá suerte. ¿Me das uno?",
    "Puedo leer tu mente... sabes dónde hallar un ${pokemon} con ${req}."
  ],
  'motorista': [
    "¡Mi banda necesita potencia! Tráeme un ${pokemon} con ${req} para rugir.",
    "¡Ese ${pokemon} tiene estilo! ¿Me das uno con ${req} para mi moto?",
    "¡Hacéte a un lado! A menos que tengas un ${pokemon} con ${req} para mí."
  ],
  'montanero': [
    "¡Las montañas son duras! Un ${pokemon} con ${req} me vendría de perlas.",
    "¡Escalando perdí a mi ${pokemon}! ¿Me das uno con ${req}?",
    "¡Rocas y más rocas! Necesito un ${pokemon} con ${req} para avanzar."
  ],
  'rocket': [
    "¡Eh, tú! Pásame ese ${pokemon} con ${req} o atente a las consecuencias...",
    "El Team Rocket necesita un ${pokemon} que tenga ${req}. ¡Entrégamelo!",
    "¡Silencio! ¿Tienes un ${pokemon} con ${req}? Lo confiscaremos por el bien de la organización."
  ],
  'criador': [
    "¡Hola! Estoy buscando un ${pokemon} con ${req} para cuidarlo en la guardería.",
    "¿Podrías dejarme un ${pokemon} con ${req}? Quiero estudiar su crecimiento.",
    "Un ${pokemon} con ${req} sería perfecto para criar con mis otros compañeros."
  ],
  'aristocrata': [
    "Disculpe las molestias, pero busco un distinguido ${pokemon} con ${req}.",
    "Mi linaje exige solo lo mejor. Tráigame un ${pokemon} con ${req}, por favor.",
    "Deseo adquirir un ejemplar de ${pokemon} que posea ${req}. ¿Tiene uno a la mano?"
  ],
  'ranger': [
    "Patrullando la zona me vendría excelente un ${pokemon} con ${req}.",
    "Protegemos la naturaleza. ¿Tienes un ${pokemon} con ${req} para ayudar en la ruta?",
    "¡Alerta de conservación! Buscamos un ${pokemon} con ${req} para monitoreo."
  ],
  'pokefan': [
    "¡Ayyy! ¡Quiero ver un ${pokemon} súper adorable con ${req}!",
    "¡Mi colección de peluches no basta, necesito un ${pokemon} real con ${req}!",
    "¡El ${pokemon} con ${req} es el más lindo de todos! ¿Me dejas verlo?"
  ],
  'artista': [
    "¡La belleza de un ${pokemon} con ${req} inspirará mi próxima obra!",
    "Busco plasmar en mi lienzo a un ${pokemon} que tenga ${req}.",
    "¡Qué elegancia! Necesito un ${pokemon} con ${req} para completar mi coreografía."
  ],
  'rival': [
    "Busco poner a prueba mi estrategia. ¿Tienes un ${pokemon} con ${req}?",
    "Un verdadero maestro busca la perfección. Tráeme un ${pokemon} con ${req}.",
    "Demuestra tu valía. Consígueme un ${pokemon} con ${req} para nuestro duelo teórico."
  ],
  'default': [
    "Necesito un ${pokemon} con ${req} con urgencia. ¿Podrás ayudarme?",
    "¿Podrías traerme un ${pokemon} que tenga ${req}?",
    "¡Garantizo una buena recompensa por un ${pokemon} con ${req}!"
  ]
};


/**
 * Generates a new mission object.
 */
export function generateMission(trainerLevel: number, dateStr: string): DaycareMission {
  let possibleTargets: PokemonSpeciesId[] = [...(POOLS['novice'] || [])];
  if (trainerLevel >= TRAINER_LEVEL_APPRENTICE_THRESHOLD) possibleTargets = possibleTargets.concat(POOLS['apprentice'] || []);
  if (trainerLevel >= TRAINER_LEVEL_VETERAN_THRESHOLD) possibleTargets = possibleTargets.concat(POOLS['veteran'] || []);
  if (trainerLevel >= TRAINER_LEVEL_MASTER_THRESHOLD) possibleTargets = possibleTargets.concat(POOLS['master'] || []);

  const targetId: PokemonSpeciesId = possibleTargets[Math.floor(Math.random() * possibleTargets.length)] || 'magikarp';
  const missionTypes: readonly DaycareMissionRequirementType[] = trainerLevel >= TRAINER_LEVEL_IV31_UNLOCK_THRESHOLD 
    ? ['level', 'nature', 'iv_total', 'iv_31'] 
    : ['level', 'nature', 'iv_total'];

  const type = missionTypes[Math.floor(Math.random() * missionTypes.length)] || 'level';
  const requirement: MissionRequirement = { type };
  let reqText = '';

  if (type === 'level') {
    const minLvl = Math.max(5, Math.min(100, trainerLevel + Math.floor(Math.random() * 16) - 5));
    requirement.minLevel = minLvl;
    reqText = `Nv. ${minLvl}+`;
  } else if (type === 'iv_total') {
    const baseIv = 90 + Math.min(trainerLevel, 60);
    const minIvTotal = baseIv + Math.floor(Math.random() * 21);
    requirement.minIvTotal = minIvTotal;
    reqText = `${minIvTotal}+ IVs totales`;
  } else if (type === 'nature') {
    const targetNature = NATURES[Math.floor(Math.random() * NATURES.length)] || 'serious';
    requirement.nature = targetNature;
    const espName = NATURE_DATA[targetNature]?.name || targetNature;
    reqText = `naturaleza ${espName}`;
  } else if (type === 'iv_31') {
    const targetStat = POKEMON_STAT_KEYS[Math.floor(Math.random() * POKEMON_STAT_KEYS.length)] || 'hp';
    requirement.stat31 = targetStat;
    reqText = `IV ${MAX_PERFECT_IV_VAL} en ${STAT_SHORT_NAMES_ES[targetStat] || 'PS'}`;
  }

  // Rewards
  const rewardQty = trainerLevel >= TRAINER_LEVEL_MASTER_THRESHOLD ? 4 : (trainerLevel >= 20 ? 3 : 2);

  interface RewardCandidate {
    readonly id: ItemId;
    readonly qty: number;
  }

  const baseRewards: readonly RewardCandidate[] = [
    { id: 'berrybronze', qty: rewardQty + 1 },
    { id: 'berrysilver', qty: rewardQty },
    { id: 'berrygold', qty: Math.max(1, rewardQty - 2) },
    { id: 'everstone', qty: 1 }
  ];

  const powerItemIds: readonly ItemId[] = [
    'powerweight',
    'powerbracer',
    'powerbelt',
    'powerlens',
    'powerband',
    'poweranklet'
  ];

  const activeCandidates: RewardCandidate[] = [...baseRewards];
  if (trainerLevel >= TRAINER_LEVEL_IV31_UNLOCK_THRESHOLD) {
    for (const powerId of powerItemIds) {
      activeCandidates.push({ id: powerId, qty: 1 });
    }
  }

  const chosenReward = activeCandidates[Math.floor(Math.random() * activeCandidates.length)] || activeCandidates[0] as RewardCandidate;
  const itemDef = getItemById(chosenReward.id);

  const reward: MissionReward = {
    id: chosenReward.id,
    name: itemDef.name,
    qty: chosenReward.qty,
    icon: itemDef.icon || '🎁'
  };
  const tKeys: readonly TrainerTypeKey[] = TRAINER_TYPE_KEYS.filter(k => k in TRAINER_TYPES);
  const tKey = tKeys[Math.floor(Math.random() * tKeys.length)] || 'caza_bichos';

  const archetypeSprites = getSpritesForArchetype(tKey as NpcArchetype);
  const chosenSprite = archetypeSprites[Math.floor(Math.random() * archetypeSprites.length)];
  if (!chosenSprite) {
    throw new Error(`[missionEngine] generateMission failed: no sprites found for archetype ${tKey}`);
  }

  const spriteId = requireNpcSpriteId(chosenSprite);
  const trainerName = generateNpcName({
    spriteId,
    archetype: requireNpcArchetype(tKey),
    includeTitle: true
  });

  const targetName = (isPokemonDbSpeciesId(targetId) ? POKEMON_DB[targetId]?.name : undefined) ?? targetId;
  const templates = MISSION_DIALOGUES_BASE[tKey] || MISSION_DIALOGUES_BASE['default'] || [];
  const template = templates[Math.floor(Math.random() * templates.length)] || '...';
  const dialogue = template.replace('${pokemon}', targetName).replace('${req}', reqText);

  return {
    date: dateStr,
    targetId,
    requirement,
    reqText,
    reward,
    completed: false,
    trainerType: tKey,
    trainerName,
    trainerSprite: spriteId,
    dialogue
  };
}

/**
 * Validates if the selected pokemon meets the mission requirements.
 */
export function validateMissionPokemon(pokemon: Pokemon, mission: DaycareMission): boolean {
  const req = mission.requirement;
  if (!pokemon) return false;
  
  // Basic species check (should be handled by picker filtration but safe to keep)
  if (pokemon.id !== mission.targetId) return false;

  if (req.type === 'level') {
    return pokemon.level >= (req.minLevel || 0);
  } else if (req.type === 'iv_total') {
    const total = Object.values(pokemon.ivs || {}).reduce((acc: number, val) => acc + (Number(val) || 0), 0);
    return total >= (req.minIvTotal || 0);
  } else if (req.type === 'nature') {
    return pokemon.nature === req.nature;
  } else if (req.type === 'iv_31') {
    return (Number(pokemon.ivs[req.stat31!]) || 0) === MAX_PERFECT_IV_VAL;
  }
  
  return false;
}
