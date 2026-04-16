import { POKEMON_DB } from '@/data/pokemonDB';
import { EVOLUTION_TABLE, STONE_EVOLUTIONS, TRADE_EVOLUTIONS } from '@/data/evolutionData';
import { MOVE_DATA } from '@/data/moves';
import { TYPE_CHART } from '@/data/types';

/**
 * Configuración de Tiers basada en la suma total de IVs.
 * Usada para visualización en Box, Pokedex y Equipo.
 */
export const BOX_TIER_CONFIG = {
  'S+': { min: 186, max: 186, color: '#FFD700', bg: 'rgba(255,215,0,0.18)', label: 'S+' },
  'S': { min: 168, max: 185, color: '#FFB800', bg: 'rgba(255,184,0,0.14)', label: 'S' },
  'A': { min: 140, max: 167, color: '#6BCB77', bg: 'rgba(107,203,119,0.14)', label: 'A' },
  'B': { min: 112, max: 139, color: '#3B8BFF', bg: 'rgba(59,139,255,0.14)', label: 'B' },
  'C': { min: 84, max: 111, color: '#C77DFF', bg: 'rgba(199,125,255,0.14)', label: 'C' },
  'D': { min: 56, max: 83, color: '#FF9632', bg: 'rgba(255,150,50,0.14)', label: 'D' },
  'F': { min: 0, max: 55, color: '#FF3B3B', bg: 'rgba(255,59,59,0.14)', label: 'F' },
}

/**
 * Calcula el Tier de un Pokémon basado en sus IVs.
 * @param {Object} p - Objeto Pokémon
 * @returns {Object} Información del Tier (tier, total, color, bg, label)
 */
export const getPokemonTier = (p) => {
  if (!p) return { tier: 'F', total: 0, ...BOX_TIER_CONFIG['F'] }
  const ivs = p.ivs || {}
  const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  
  for (const [tier, cfg] of Object.entries(BOX_TIER_CONFIG)) {
    if (total >= cfg.min && total <= cfg.max) return { tier, total, ...cfg }
  }
  
  return { tier: 'F', total, ...BOX_TIER_CONFIG['F'] }
}

/**
 * Genera la URL del sprite usando el sistema de PokeAPI o el motor legacy.
 */
export const getSpriteUrl = (id, isShiny) => {
  if (typeof window !== 'undefined' && typeof window.getSpriteUrl === 'function') {
    return window.getSpriteUrl(id, isShiny)
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon${isShiny ? '/shiny' : ''}/${id}.png`
}

/**
 * Get species history from base form to the given id
 */
export function getSpeciesHistory(id) {
  const history = [id];
  let current = id;
  
  const findPreEvo = (speciesId) => {
    for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
      if (data.to === speciesId) return from;
    }
    for (const [from, data] of Object.entries(STONE_EVOLUTIONS)) {
      if (data.to === speciesId) return from;
    }
    for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
      if (to === speciesId) return from;
    }
    return null;
  };

  let pre;
  while ((pre = findPreEvo(current))) {
    if (history.includes(pre)) break; // Prevent loops
    history.unshift(pre);
    current = pre;
  }
  return history;
}

/**
 * Get moves a pokemon knows at a given level (up to 4, most recent)
 */
export function getMovesAtLevel(id, level) {
  const history = getSpeciesHistory(id);
  let allPotentialMoves = [];
  const seenNames = new Set();

  history.forEach(spId => {
    const db = POKEMON_DB[spId];
    if (db && db.learnset) {
      db.learnset.forEach(m => {
        if (m.lv <= level) {
          allPotentialMoves.push(m);
        }
      });
    }
  });

  allPotentialMoves.sort((a, b) => a.lv - b.lv);

  const uniqueMoves = [];
  for (let i = allPotentialMoves.length - 1; i >= 0; i--) {
    const m = allPotentialMoves[i];
    if (!seenNames.has(m.name)) {
      uniqueMoves.unshift(m);
      seenNames.add(m.name);
    }
  }

  const last4 = uniqueMoves.slice(-4);
  return last4.map(m => {
    const moveData = MOVE_DATA[m.name] || {};
    return { 
      name: m.name, 
      pp: m.pp || moveData.pp || 35, 
      maxPP: m.pp || moveData.pp || 35,
      type: moveData.type || 'normal',
      power: moveData.power || 0
    };
  });
}

/**
 * Get type effectiveness multiplier
 */
export function getTypeEffectiveness(moveType, defType) {
  const row = TYPE_CHART[moveType] || {};
  return row[defType] ?? 1;
}

/**
 * Get type effectiveness message
 */
export function getTypeEffectivenessMsg(eff) {
  if (eff === 0) return '¡No afecta!';
  if (eff >= 2) return '¡Es muy eficaz!';
  if (eff <= 0.5) return 'No es muy eficaz...';
  return null;
}

/**
 * Get display description for a move based on its effect
 */
export function getMoveDescription(name, md) {
  if (!md) md = MOVE_DATA[name];
  if (!md) return "Causa daño al oponente sin efectos secundarios adicionales.";
  
  if (md.ohko) return "Fulmina al enemigo de un solo golpe si acierta.";
  if (md.halfHP) return "Reduce a la mitad los PS actuales del oponente.";
  if (md.endeavor) return "Iguala los PS actuales del objetivo con los del usuario. Falla si tiene menos.";
  if (md.recoil) return "El usuario recibe daño por retroceso al golpear.";
  if (md.drain && md.cat !== 'status') return "Restaura PS al usuario según el daño causado.";
  if (md.selfKO) return "El usuario se debilita para causar un daño masivo.";
  if (md.priority > 0) return "Ataque rápido que siempre golpea primero.";
  if (md.levelDmg) return "Causa un daño igual al nivel del usuario.";
  if (md.counter) return "Devuelve al rival el doble del daño físico recibido este turno.";
  
  const effects = {
    'burn_10': "Puede quemar al objetivo (10%).",
    'burn': "Quema al objetivo de forma garantizada.",
    'paralyze_10': "Puede paralizar al objetivo (10%).",
    'paralyze_20': "Puede paralizar al objetivo (20%).",
    'paralyze_30': "Puede paralizar al objetivo (30%).",
    'paralyze': "Paraliza al objetivo de forma garantizada.",
    'poison_20': "Puede envenenar al objetivo (20%).",
    'poison_30': "Puede envenenar al objetivo (30%).",
    'poison': "Envenena al objetivo de forma garantizada.",
    'freeze_10': "Puede congelar al objetivo (10%).",
    'flinch_10': "Puede hacer retroceder al objetivo (10%).",
    'flinch_20': "Puede hacer retroceder al objetivo (20%).",
    'flinch_30': "Puede hacer retroceder al objetivo (30%).",
    'confuse_10': "Puede confundir al objetivo (10%).",
    'confuse_20': "Puede confundir al objetivo (20%).",
    'confuse_30': "Puede confundir al objetivo (30%).",
    'confuse': "Confunde al objetivo de forma garantizada.",
    'stat_down_enemy_atk': "Reduce el Ataque del oponente.",
    'stat_down_enemy_atk_10': "Puede reducir el Ataque del oponente (10%).",
    'stat_down_enemy_atk_2': "Reduce mucho el Ataque del oponente.",
    'stat_down_enemy_def': "Reduce la Defensa del oponente.",
    'stat_down_enemy_def_2': "Reduce mucho la Defensa del oponente.",
    'stat_down_enemy_spe': "Reduce la Velocidad del oponente.",
    'stat_down_enemy_spe_10': "Puede reducir la Velocidad del oponente (10%).",
    'stat_down_enemy_acc': "Reduce la Precisión del oponente.",
    'stat_down_enemy_acc_30': "Puede reducir la Precisión del oponente (30%).",
    'stat_down_enemy_spd_10': "Puede reducir la Def. Especial del oponente (10%).",
    'stat_down_enemy_spd_20': "Puede reducir la Def. Especial del oponente (20%).",
    'stat_up_self_atk': "Aumenta el Ataque del usuario.",
    'stat_up_self_atk_2': "Aumenta mucho el Ataque del usuario.",
    'stat_up_self_def': "Aumenta la Defensa del usuario.",
    'stat_up_self_def_2': "Aumenta mucho la Defensa del usuario.",
    'stat_up_self_spa_2': "Aumenta mucho el At. Especial del usuario.",
    'stat_up_self_spe_2': "Aumenta mucho la Velocidad del usuario.",
    'stat_up_self_eva': "Aumenta la Evasión del usuario.",
    'stat_up_self_eva_2': "Aumenta mucho la Evasión del usuario.",
    'stat_up_self_atk_def': "Aumenta el Ataque y la Defensa del usuario.",
    'stat_up_self_spa_spd': "Aumenta el At. Especial y la Def. Especial del usuario.",
    'heal_50': "Restaura el 50% de los PS máximos del usuario.",
    'heal_weather': "Restaura PS según el clima o momento del día.",
    'leech_seed': "Planta una semilla que drena PS cada turno.",
    'metronome': "Usa un movimiento aleatorio de entre casi todos los existentes.",
    'roar': "Ahuyenta al rival o lo fuerza a cambiar por otro aliado.",
    'disable': "Deshabilita el último movimiento usado por el oponente.",
    'encore': "Obliga al oponente a repetir su último movimiento.",
    'sleep': "Duerme al oponente de forma garantizada.",
    'bad_poison': "Envenena gravemente al oponente (daño progresivo).",
    'transform': "Copia la forma, tipos y movimientos del oponente.",
    'focus_energy': "Aumenta la probabilidad de asestar golpes críticos.",
    'bind': "Atrapa al oponente y le causa daño durante varios turnos.",
    'magnitude': "Causa un daño aleatorio basado en la intensidad sísmica.",
    'recharge': "El usuario debe descansar el siguiente turno tras atacar.",
    'teleport': "Permite huir de un combate contra un Pokémon salvaje.",
    'dream_eater': "Absorbe PS a un oponente dormido para restaurar salud.",
    'rest': "El usuario duerme dos turnos para recuperar todos sus PS.",
    'curse': "Si es Fantasma, pierde PS para maldecir al rival cada turno.",
    'tri_attack': "Puede quemar, paralizar o congelar al objetivo.",
    'stat_down_enemy_spe_2': "Reduce mucho la Velocidad del oponente.",
    'stat_down_enemy_eva': "Reduce la Evasión del oponente.",
    'mirror_move': "Copia y utiliza el último movimiento usado por el oponente.",
    'stat_up_self_def_spd': "Aumenta la Defensa y la Def. Especial del usuario.",
    'stat_up_self_atk_20': "Aumenta el Ataque del usuario (20% de probabilidad).",
    'reset_stats': "Elimina todos los cambios de estadísticas de ambos Pokémon.",
    'heal_status_party': "Cura los estados alterados de todo el equipo.",
    'flinch_100': "Hace retroceder al oponente de forma garantizada (solo primer turno).",
    'swagger': "Confunde al oponente y aumenta mucho su Ataque.",
    'belly_drum': "Reduce a la mitad los PS para maximizar el Ataque.",
    'psych_up': "Copia los cambios de estadísticas del oponente.",
    'always_hits': "Ataque veloz e infalible que nunca falla.",
    'stat_down_enemy_def_30': "Puede reducir la Defensa del oponente (30%).",
    'stat_up_self_def_10': "Puede aumentar la Defensa del usuario (10%).",
    'rage': "Aumenta el Ataque cada vez que el usuario recibe daño consecutivo.",
    'status_boost': "Su poder se duplica si el usuario sufre un problema de estado.",
    'thrash': "Ataca violentamente 2-3 turnos, pero confunde al usuario.",
    'future_sight_simple': "Golpea al objetivo después de 2 turnos con energía mental.",
    'trick': "Intercambia el objeto equipado con el del rival.",
    'identify': "Elimina inmunidades oscuras y detecta la evasión.",
    'paralyze_100': "Paraliza de forma garantizada a la víctima si el golpe acierta.",
    'weather_sandstorm': "Invoca una tormenta de arena por 5 turnos que hiere la salud.",
    'sandstorm': "Invoca una tormenta de arena por 5 turnos que hiere la salud.",
    'stat_down_enemy_spd_2': "Reduce mucho la Defensa Especial del oponente al impactar.",
    'lock_on': "Asegura que el próximo ataque nunca fallará.",
    'fury_cutter': "El poder sube radicalmente si se usa repetidas veces y acierta.",
    'false_swipe': "Un ataque precavido que deja al objetivo con al menos 1 PS.",
    'trap': "Atrapa al rival impidiendo intercambios o huidas.",
    'ingrain': "Restaura PS en cada ciclo, pero impide ser retirado.",
    'stat_down_enemy_atk_def': "Reduce el Ataque y la Defensa física de la víctima tras acertar.",
    'endure': "El usuario soporta cualquier ataque letal este turno con al menos 1 PS.",
    'stat_up_self_atk_spe': "Aumenta el Ataque físico y la Velocidad del usuario tras impactar.",
    'rapid_spin': "Elimina barreras y ataduras colindantes y aliadas.",
    'protect': "Desvía todos los ataques; puede fallar si se usa seguido.",
    'stat_up_self_atk_10': "Puede incrementar notablemente el Ataque del usuario.",
    'stat_up_self_spd': "Aumenta la Defensa Especial del usuario.",
    'stat_up_self_all_10': "Puede aumentar todas las estadísticas de quien lo usa al acertar.",
    'hail': "Llueve granizo constante por 5 turnos dañando a todos excepto al tipo Hielo.",
    'sun': "Acentúa la intensidad del sol en el campo asomando lo afín al Fuego.",
    'taunt': "Mofa al rival forzándolo a utilizar solo ataques de agresión directa.",
    'light_screen': "Encapsula al equipo en un escudo que recorta el Ataque Especial rival.",
    'rain': "Invoca llovizna torrencial sobre el campo debilitando los ataques Fuego.",
    'safeguard': "Santuario que protege al equipo contra alteraciones negativas de estado.",
    'break_screens': "Rompe de cuajo las barreras místicas e invisibles defensivas como el Reflejo.",
    'reflect': "Levanta un muro cristalino mermando ataques Físicos recibidos.",
    'torment': "Prohibe la reutilización del mismo último movimiento de forma consecutiva.",
    'attract': "Enamora al rival si es opuesto, paralizando a veces su capacidad de actuar.",
    'steal_item': "Roba ágilmente la equipación que el agredido cargue sin gastar turno extra.",
    'skill_swap': "Reemplaza entre ambos monstruos sus capacidades y habilidades.",
    'snatch': "Aprovecha robando los efectos positivos emitidos por el oponente.",
    'stat_down_self_spa_2': "Reduce contundentemente su Ataque Especial luego del uso desmedido.",
  };
  
  if (effects[md.effect]) return effects[md.effect];
  
  if (md.cat === 'status') return "Un movimiento que causa un efecto de estado o alteración.";
  
  return "Causa daño al oponente sin efectos secundarios adicionales.";
}
