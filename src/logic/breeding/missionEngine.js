/**
 * missionEngine.js
 * Logic for generating and validating Daycare Daily Missions.
 */

import { POKEMON_DB } from '@/data/pokemonDB';

const POOLS = {
  novice: ['caterpie', 'weedle', 'pidgey', 'rattata', 'spearow', 'zubat', 'geodude', 'sandshrew', 'nidoran_f', 'nidoran_m', 'magikarp', 'ekans', 'paras'],
  apprentice: ['pikachu', 'abra', 'gastly', 'drowzee', 'machop', 'bellsprout', 'oddish', 'venonat', 'psyduck', 'poliwag', 'meowth', 'mankey', 'vulpix', 'clefairy', 'jigglypuff', 'pidgeotto', 'raticate', 'fearow', 'golbat', 'graveler', 'kakuna', 'metapod'],
  veteran: ['growlithe', 'ponyta', 'slowpoke', 'magnemite', 'doduo', 'seel', 'grimer', 'shellder', 'krabby', 'voltorb', 'exeggcute', 'cubone', 'horsea', 'goldeen', 'staryu', 'kadabra', 'machoke', 'haunter', 'weepinbell', 'gloom', 'poliwhirl'],
  master: ['arcanine', 'rapidash', 'slowbro', 'magneton', 'dodrio', 'dewgong', 'muk', 'cloyster', 'onix', 'hypno', 'kingler', 'electrode', 'exeggutor', 'marowak', 'weezing', 'rhydon', 'tangela', 'seadra', 'seaking', 'starmie', 'gyarados', 'vaporeon', 'jolteon', 'flareon', 'aerodactyl', 'snorlax', 'dragonair', 'scyther', 'pinsir', 'tauros', 'kangaskhan', 'lapras']
};

const MISSION_DIALOGUES_BASE = {
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
  'default': [
    "Necesito un ${pokemon} con ${req} con urgencia. ¿Podrás ayudarme?",
    "¿Podrías traerme un ${pokemon} que tenga ${req}?",
    "¡Garantizo una buena recompensa por un ${pokemon} con ${req}!"
  ]
};

const TRAINER_TYPES = {
  'caza_bichos': { name: 'Cazabichos', sprite: 'trainer_bug.webp' },
  'ornitologo': { name: 'Ornitólogo', sprite: 'trainer_bird.webp' },
  'cientifico': { name: 'Científico', sprite: 'trainer_science.webp' },
  'luchador': { name: 'Luchador', sprite: 'trainer_fighter.webp' },
  'pescador': { name: 'Pescador', sprite: 'trainer_fish.webp' },
  'nadador': { name: 'Nadador', sprite: 'trainer_swim.webp' },
  'domador': { name: 'Domador', sprite: 'trainer_tamer.webp' },
  'medium': { name: 'Medium', sprite: 'trainer_psychic.webp' },
  'motorista': { name: 'Motorista', sprite: 'trainer_biker.webp' },
  'montanero': { name: 'Montañero', sprite: 'trainer_hiker.webp' }
};

const NATURES = ['Audaz', 'Firme', 'Pícaro', 'Manso', 'Serio', 'Osado', 'Plácido', 'Agitado', 'Jovial', 'Ingenuo', 'Modesto', 'Moderado', 'Raro', 'Dócil', 'Tímido', 'Activo', 'Alocado', 'Tranquilo', 'Grosero', 'Cauto'];

/**
 * Generates a new mission object.
 */
export function generateMission(trainerLevel, dateStr) {
  let possibleTargets = [...POOLS.novice];
  if (trainerLevel >= 10) possibleTargets = possibleTargets.concat(POOLS.apprentice);
  if (trainerLevel >= 25) possibleTargets = possibleTargets.concat(POOLS.veteran);
  if (trainerLevel >= 40) possibleTargets = possibleTargets.concat(POOLS.master);

  const targetId = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
  const missionTypes = ['level', 'nature', 'iv_total'];
  if (trainerLevel >= 15) missionTypes.push('iv_31');

  const type = missionTypes[Math.floor(Math.random() * missionTypes.length)];
  let requirement = { type };
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
    const targetNature = NATURES[Math.floor(Math.random() * NATURES.length)];
    requirement.nature = targetNature;
    reqText = `naturaleza ${targetNature}`;
  } else if (type === 'iv_31') {
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    const statLabels = { hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'At. Esp', spd: 'Def. Esp', spe: 'Velocidad' };
    const targetStat = stats[Math.floor(Math.random() * stats.length)];
    requirement.stat31 = targetStat;
    reqText = `IV 31 en ${statLabels[targetStat]}`;
  }

  // Rewards
  const rewardQty = trainerLevel >= 40 ? 4 : (trainerLevel >= 20 ? 3 : 2);
  const possibleRewards = [
    { id: 'berry_bronze', name: 'Baya de Bronce', qty: rewardQty + 1, icon: '🥉' },
    { id: 'berry_silver', name: 'Baya de Plata', qty: rewardQty, icon: '🥈' },
    { id: 'berry_gold', name: 'Baya de Oro', qty: Math.max(1, rewardQty - 2), icon: '🥇' },
    { id: 'everstone', name: 'Piedra Eterna', qty: 1, icon: '🪨' }
  ];

  if (trainerLevel >= 15) {
    const powerItems = [
      { id: 'power_weight', name: 'Pesa Recia', qty: 1, icon: '🏋️' },
      { id: 'power_bracer', name: 'Brazal Recio', qty: 1, icon: '🥊' },
      { id: 'power_belt', name: 'Cinto Recio', qty: 1, icon: '🛡️' },
      { id: 'power_lens', name: 'Lente Recia', qty: 1, icon: '🔍' },
      { id: 'power_band', name: 'Banda Recia', qty: 1, icon: '🎗️' },
      { id: 'power_anklet', name: 'Franja Recia', qty: 1, icon: '👢' }
    ];
    possibleRewards.push(...powerItems);
  }

  const reward = possibleRewards[Math.floor(Math.random() * possibleRewards.length)];
  const tKeys = Object.keys(TRAINER_TYPES);
  const tKey = tKeys[Math.floor(Math.random() * tKeys.length)];
  const trainer = TRAINER_TYPES[tKey];

  const targetName = POKEMON_DB[targetId]?.name || targetId;
  const templates = MISSION_DIALOGUES_BASE[tKey] || MISSION_DIALOGUES_BASE['default'];
  const template = templates[Math.floor(Math.random() * templates.length)];
  const dialogue = template.replace('${pokemon}', targetName).replace('${req}', reqText);

  return {
    date: dateStr,
    targetId,
    requirement,
    reqText,
    reward,
    completed: false,
    trainerType: tKey,
    trainerName: trainer.name,
    trainerSprite: trainer.sprite,
    dialogue
  };
}

/**
 * Validates if the selected pokemon meets the mission requirements.
 */
export function validateMissionPokemon(pokemon, mission) {
  const req = mission.requirement;
  if (!pokemon) return false;
  
  // Basic species check (should be handled by picker filtration but safe to keep)
  if (pokemon.id !== mission.targetId) return false;

  if (req.type === 'level') {
    return pokemon.level >= req.minLevel;
  } else if (req.type === 'iv_total') {
    const total = Object.values(pokemon.ivs || {}).reduce((acc, val) => acc + (val || 0), 0);
    return total >= req.minIvTotal;
  } else if (req.type === 'nature') {
    return pokemon.nature === req.nature;
  } else if (req.type === 'iv_31') {
    return pokemon.ivs[req.stat31] === 31;
  }
  
  return false;
}
