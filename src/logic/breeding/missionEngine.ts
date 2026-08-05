
/**
 * missionEngine.ts
 * Logic for generating and validating Daycare Daily Missions.
 */

import { POKEMON_DB, isPokemonDbSpeciesId } from '@/data/pokemon/pokemonDB';
import { TRAINER_TYPES, requireNpcArchetype } from '@/data/player/trainerTypes';
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog';
import { getSpritesForArchetype, type NpcArchetype } from '@/logic/utils/npcSpriteRouter';
import { generateNpcName } from '@/logic/utils/npcNameGenerator';
import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon';
import { NATURE_DATA, NATURES } from '@/data/battle/natures';

export interface MissionRequirement {
  type: string;
  minLevel?: number;
  minIvTotal?: number;
  nature?: string;
  stat31?: keyof PokemonIVs;
}

export interface MissionReward {
  id: string;
  name: string;
  qty: number;
  icon: string;
}

export interface DaycareMission {
  date: string;
  targetId: string;
  requirement: MissionRequirement;
  reqText: string;
  reward: MissionReward;
  completed: boolean;
  trainerType: string;
  trainerName: string;
  trainerSprite: string;
  dialogue: string;
}

const POOLS: Record<string, string[]> = {
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
  let possibleTargets = [...(POOLS['novice'] || [])];
  if (trainerLevel >= 10) possibleTargets = possibleTargets.concat(POOLS['apprentice'] || []);
  if (trainerLevel >= 25) possibleTargets = possibleTargets.concat(POOLS['veteran'] || []);
  if (trainerLevel >= 40) possibleTargets = possibleTargets.concat(POOLS['master'] || []);

  const targetId = possibleTargets[Math.floor(Math.random() * possibleTargets.length)] || 'magikarp';
  const missionTypes: Array<MissionRequirement['type']> = ['level', 'nature', 'iv_total'];
  if (trainerLevel >= 15) missionTypes.push('iv_31');

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
    const stats: (keyof PokemonIVs)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    const statLabels: Record<string, string> = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp', spd: 'Def. Esp', spe: 'Velocidad' };
    const targetStat = stats[Math.floor(Math.random() * stats.length)] || 'hp';
    requirement.stat31 = targetStat;
    reqText = `IV 31 en ${statLabels[targetStat] || 'PS'}`;
  }

  // Rewards
  const rewardQty = trainerLevel >= 40 ? 4 : (trainerLevel >= 20 ? 3 : 2);
  const possibleRewards: MissionReward[] = [
    { id: 'berrybronze', name: 'Baya de Bronce', qty: rewardQty + 1, icon: '🥉' },
    { id: 'berrysilver', name: 'Baya de Plata', qty: rewardQty, icon: '🥈' },
    { id: 'berrygold', name: 'Baya de Oro', qty: Math.max(1, rewardQty - 2), icon: '🥇' },
    { id: 'everstone', name: 'Piedra Eterna', qty: 1, icon: '🪨' }
  ];

  if (trainerLevel >= 15) {
    const powerItems: MissionReward[] = [
      { id: 'powerweight', name: 'Pesa Recia', qty: 1, icon: '🏋️' },
      { id: 'powerbracer', name: 'Brazal Recio', qty: 1, icon: '🥊' },
      { id: 'powerbelt', name: 'Cinto Recio', qty: 1, icon: '🛡️' },
      { id: 'powerlens', name: 'Lente Recia', qty: 1, icon: '🔍' },
      { id: 'powerband', name: 'Banda Recia', qty: 1, icon: '🎗️' },
      { id: 'poweranklet', name: 'Franja Recia', qty: 1, icon: '👢' }
    ];
    possibleRewards.push(...powerItems);
  }

  const reward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)] || possibleRewards[0] as MissionReward;
  const tKeys = Object.keys(TRAINER_TYPES);
  const tKey = tKeys[Math.floor(Math.random() * tKeys.length)] || 'caza_bichos';

  const archetypeSprites = getSpritesForArchetype(tKey as NpcArchetype);
  const chosenSprite = archetypeSprites[Math.floor(Math.random() * archetypeSprites.length)];
  if (!chosenSprite) {
    throw new Error(`[missionEngine] generateMission failed: no sprites found for archetype ${tKey}`);
  }

  const trainerName = generateNpcName({
    spriteId: requireNpcSpriteId(chosenSprite),
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
    trainerSprite: chosenSprite,
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
    return (Number(pokemon.ivs[req.stat31!]) || 0) === 31;
  }
  
  return false;
}
