
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getPokemonTier, BOX_TIER_CONFIG } from '@/logic/pokemon/tierEngine';
import { getStatMultiplier, getAccuracyMultiplier } from '@/logic/pokemon/statEngine';
import { getTypeEffectiveness } from '@/logic/pokemon/typeEngine';
import { getSpeciesHistory } from '@/logic/pokemon/evolutionEngine';
import type { Pokemon, PokemonMove } from '@/types/pokemon';

export { getPokemonTier, BOX_TIER_CONFIG, getSpeciesHistory };

/**
 * Calculates the total power of a pokemon (BST + total IVs).
 */
export function calculateTotalPower(p: Pokemon): number {
  if (!p) return 0;
  const species = pokemonDataProvider.getPokemonData(p.id);
  const bst = species ? ((species.hp || 0) + (species.atk || 0) + (species.def || 0) + (species.spa || 0) + (species.spd || 0) + (species.spe || 0)) : 0;
  const ivs = p.ivs;
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
  return bst + totalIvs;
}

/**
 * Calculates the price for selling a pokemon to the Black Market (Team Rocket).
 */
export function calculateRocketSellPrice(p: Pokemon): number {
  if (!p) return 0;
  const ivs = p.ivs;
  const totalIvs = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
  // Formula: (Level * 50 + (Total IVs / 186) * 500) * 0.8 (Rocket Cut)
  return Math.floor((p.level * 50 + (totalIvs / 186) * 500) * 0.8);
}
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import type { LearnsetMove, MoveBaseData } from '@/types/database';

export function getSpriteUrl(id: string, isShiny: boolean = false): string {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny });
}

export function getBackSpriteUrl(id: string, isShiny: boolean = false): string {
  return getAssetUrl(ASSET_TYPES.POKEMON, id, { isShiny, isBack: true });
}

/**
 * Get moves a pokemon knows at a given level (up to 4, most recent)
 */
export function getMovesAtLevel(id: string, level: number): PokemonMove[] {
  const history = getSpeciesHistory(id);
  const allPotentialMoves: LearnsetMove[] = [];
  const seenNames = new Set<string>();

  history.forEach(spId => {
    const db = pokemonDataProvider.getPokemonData(spId);
    if (db && db.learnset) {
      (db.learnset as LearnsetMove[]).forEach(m => {
        if (m.lv <= level) {
          allPotentialMoves.push(m);
        }
      });
    }
  });

  allPotentialMoves.sort((a, b) => a.lv - b.lv);

  const uniqueMoves: LearnsetMove[] = [];
  for (let i = allPotentialMoves.length - 1; i >= 0; i--) {
    const m = allPotentialMoves[i];
    if (m && !seenNames.has(m.name)) {
      uniqueMoves.unshift(m);
      seenNames.add(m.name);
    }
  }

  const last4 = uniqueMoves.slice(-4);
  return last4.map(m => {
    const moveData = pokemonDataProvider.getMoveData(m.name)
    return { 
      name: m.name || '???', 
      pp: m.pp || moveData?.pp || 35, 
      maxPP: m.pp || moveData?.pp || 35,
      type: moveData?.type || 'normal',
      power: moveData?.power || 0,
      acc: moveData?.acc || 100,
      cat: moveData?.cat || 'physical'
    };
  });
}

/**
 * Get type effectiveness multiplier
 */
export { getTypeEffectiveness };

/**
 * Get type effectiveness message
 */
export function getTypeEffectivenessMsg(eff: number): string | null {
  if (eff === 0) return '¡No afecta!';
  if (eff >= 2) return '¡Es muy eficaz!';
  if (eff <= 0.5) return 'No es muy eficaz...';
  return null;
}

/**
 * Get display description for a move based on its effect
 */
export function getMoveDescription(name: string, md?: MoveBaseData | null): string {
  if (!md) md = pokemonDataProvider.getMoveData(name);
  if (!md) return "Causa daño al oponente sin efectos secundarios adicionales.";
  
  if (md.ohko) return "Fulmina al enemigo de un solo golpe si acierta.";
  if (md.halfHP) return "Reduce a la mitad los PS actuales del oponente.";
  if (md.endeavor) return "Iguala los PS actuales del objetivo con los del usuario. Falla si tiene menos.";
  if (md.recoil) return "El usuario recibe daño por retroceso al golpear.";
  if (md.drain && md.cat !== 'status') return "Restaura PS al usuario según el daño causado.";
  if (md.selfKO) return "El usuario se debilita para causar un daño masivo.";
  if (md.priority && md.priority > 0) return "Ataque rápido que siempre golpea primero.";
  if (md.levelDmg) return "Causa un daño igual al nivel del usuario.";
  if (md.counter) return "Devuelve al rival el doble del daño físico recibido este turno.";
  
  const effects: Record<string, string> = {
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
  
  const desc = effects[md.effect || ''];
  if (desc) return desc;
  if (md.cat === 'status') return "Un movimiento que causa un efecto de estado o alteración.";
  return "Causa daño al oponente sin efectos secundarios adicionales.";
}

/**
 * Get the multiplier for a stat stage (-6 to +6).
 */
export function getStageMultiplier(stage: number): number {
  return getStatMultiplier(stage);
}

/**
 * Get the multiplier for an accuracy/evasion stage (-6 to +6).
 */
export function getAccStageMultiplier(stage: number): number {
  return getAccuracyMultiplier(stage);
}
