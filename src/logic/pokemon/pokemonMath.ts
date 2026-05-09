/**
 * src/logic/pokemon/pokemonMath.ts
 *
 * Pure utility functions for Pokémon data interpretation.
 * Zero browser, Vue, Pinia, or Supabase dependencies.
 *
 * Extracted from pokemonUtils.ts for testability
 * with the native Node.js 26+ test runner.
 *
 * @module pokemonMath
 */

import type { MoveBaseData } from '../../types/database.ts';

// ── Type Effectiveness ────────────────────────────────────────────────────────

/**
 * Returns a human-readable message for a type-effectiveness multiplier.
 * Returns null for neutral (1×) effectiveness.
 */
export function getTypeEffectivenessMsg(eff: number): string | null {
  if (eff === 0)    return '¡No afecta!';
  if (eff >= 2)     return '¡Es muy eficaz!';
  if (eff <= 0.5)   return 'No es muy eficaz...';
  return null;
}

// ── Move Description ──────────────────────────────────────────────────────────

const MOVE_EFFECT_DESCRIPTIONS: Record<string, string> = {
  burn_10:              'Puede quemar al objetivo (10%).',
  burn:                 'Quema al objetivo de forma garantizada.',
  paralyze_10:          'Puede paralizar al objetivo (10%).',
  paralyze_20:          'Puede paralizar al objetivo (20%).',
  paralyze_30:          'Puede paralizar al objetivo (30%).',
  paralyze:             'Paraliza al objetivo de forma garantizada.',
  paralyze_100:         'Paraliza de forma garantizada a la víctima si el golpe acierta.',
  poison_20:            'Puede envenenar al objetivo (20%).',
  poison_30:            'Puede envenenar al objetivo (30%).',
  poison:               'Envenena al objetivo de forma garantizada.',
  bad_poison:           'Envenena gravemente al oponente (daño progresivo).',
  freeze_10:            'Puede congelar al objetivo (10%).',
  flinch_10:            'Puede hacer retroceder al objetivo (10%).',
  flinch_20:            'Puede hacer retroceder al objetivo (20%).',
  flinch_30:            'Puede hacer retroceder al objetivo (30%).',
  flinch_100:           'Hace retroceder al oponente de forma garantizada (solo primer turno).',
  confuse_10:           'Puede confundir al objetivo (10%).',
  confuse_20:           'Puede confundir al objetivo (20%).',
  confuse_30:           'Puede confundir al objetivo (30%).',
  confuse:              'Confunde al objetivo de forma garantizada.',
  sleep:                'Duerme al oponente de forma garantizada.',
  stat_down_enemy_atk:  'Reduce el Ataque del oponente.',
  stat_down_enemy_atk_10: 'Puede reducir el Ataque del oponente (10%).',
  stat_down_enemy_atk_2: 'Reduce mucho el Ataque del oponente.',
  stat_down_enemy_def:  'Reduce la Defensa del oponente.',
  stat_down_enemy_def_2: 'Reduce mucho la Defensa del oponente.',
  stat_down_enemy_def_30: 'Puede reducir la Defensa del oponente (30%).',
  stat_down_enemy_spe:  'Reduce la Velocidad del oponente.',
  stat_down_enemy_spe_10: 'Puede reducir la Velocidad del oponente (10%).',
  stat_down_enemy_spe_2: 'Reduce mucho la Velocidad del oponente.',
  stat_down_enemy_acc:  'Reduce la Precisión del oponente.',
  stat_down_enemy_acc_30: 'Puede reducir la Precisión del oponente (30%).',
  stat_down_enemy_spd_10: 'Puede reducir la Def. Especial del oponente (10%).',
  stat_down_enemy_spd_20: 'Puede reducir la Def. Especial del oponente (20%).',
  stat_down_enemy_spd_2: 'Reduce mucho la Defensa Especial del oponente al impactar.',
  stat_down_enemy_eva:  'Reduce la Evasión del oponente.',
  stat_down_enemy_atk_def: 'Reduce el Ataque y la Defensa física de la víctima tras acertar.',
  stat_up_self_atk:     'Aumenta el Ataque del usuario.',
  stat_up_self_atk_2:   'Aumenta mucho el Ataque del usuario.',
  stat_up_self_atk_10:  'Puede incrementar notablemente el Ataque del usuario.',
  stat_up_self_atk_20:  'Aumenta el Ataque del usuario (20% de probabilidad).',
  stat_up_self_def:     'Aumenta la Defensa del usuario.',
  stat_up_self_def_2:   'Aumenta mucho la Defensa del usuario.',
  stat_up_self_def_10:  'Puede aumentar la Defensa del usuario (10%).',
  stat_up_self_spa_2:   'Aumenta mucho el At. Especial del usuario.',
  stat_up_self_spe_2:   'Aumenta mucho la Velocidad del usuario.',
  stat_up_self_eva:     'Aumenta la Evasión del usuario.',
  stat_up_self_eva_2:   'Aumenta mucho la Evasión del usuario.',
  stat_up_self_atk_def: 'Aumenta el Ataque y la Defensa del usuario.',
  stat_up_self_spa_spd: 'Aumenta el At. Especial y la Def. Especial del usuario.',
  stat_up_self_def_spd: 'Aumenta la Defensa y la Def. Especial del usuario.',
  stat_up_self_atk_spe: 'Aumenta el Ataque físico y la Velocidad del usuario tras impactar.',
  stat_up_self_spd:     'Aumenta la Defensa Especial del usuario.',
  stat_up_self_all_10:  'Puede aumentar todas las estadísticas de quien lo usa al acertar.',
  stat_down_self_spa_2: 'Reduce contundentemente su Ataque Especial luego del uso desmedido.',
  heal_50:              'Restaura el 50% de los PS máximos del usuario.',
  heal_weather:         'Restaura PS según el clima o momento del día.',
  leech_seed:           'Planta una semilla que drena PS cada turno.',
  metronome:            'Usa un movimiento aleatorio de entre casi todos los existentes.',
  roar:                 'Ahuyenta al rival o lo fuerza a cambiar por otro aliado.',
  disable:              'Deshabilita el último movimiento usado por el oponente.',
  encore:               'Obliga al oponente a repetir su último movimiento.',
  transform:            'Copia la forma, tipos y movimientos del oponente.',
  focus_energy:         'Aumenta la probabilidad de asestar golpes críticos.',
  bind:                 'Atrapa al oponente y le causa daño durante varios turnos.',
  magnitude:            'Causa un daño aleatorio basado en la intensidad sísmica.',
  recharge:             'El usuario debe descansar el siguiente turno tras atacar.',
  teleport:             'Permite huir de un combate contra un Pokémon salvaje.',
  dream_eater:          'Absorbe PS a un oponente dormido para restaurar salud.',
  rest:                 'El usuario duerme dos turnos para recuperar todos sus PS.',
  curse:                'Si es Fantasma, pierde PS para maldecir al rival cada turno.',
  tri_attack:           'Puede quemar, paralizar o congelar al objetivo.',
  mirror_move:          'Copia y utiliza el último movimiento usado por el oponente.',
  reset_stats:          'Elimina todos los cambios de estadísticas de ambos Pokémon.',
  heal_status_party:    'Cura los estados alterados de todo el equipo.',
  swagger:              'Confunde al oponente y aumenta mucho su Ataque.',
  belly_drum:           'Reduce a la mitad los PS para maximizar el Ataque.',
  psych_up:             'Copia los cambios de estadísticas del oponente.',
  always_hits:          'Ataque veloz e infalible que nunca falla.',
  rage:                 'Aumenta el Ataque cada vez que el usuario recibe daño consecutivo.',
  status_boost:         'Su poder se duplica si el usuario sufre un problema de estado.',
  thrash:               'Ataca violentamente 2-3 turnos, pero confunde al usuario.',
  future_sight_simple:  'Golpea al objetivo después de 2 turnos con energía mental.',
  trick:                'Intercambia el objeto equipado con el del rival.',
  identify:             'Elimina inmunidades oscuras y detecta la evasión.',
  weather_sandstorm:    'Invoca una tormenta de arena por 5 turnos que hiere la salud.',
  sandstorm:            'Invoca una tormenta de arena por 5 turnos que hiere la salud.',
  lock_on:              'Asegura que el próximo ataque nunca fallará.',
  fury_cutter:          'El poder sube radicalmente si se usa repetidas veces y acierta.',
  false_swipe:          'Un ataque precavido que deja al objetivo con al menos 1 PS.',
  trap:                 'Atrapa al rival impidiendo intercambios o huidas.',
  ingrain:              'Restaura PS en cada ciclo, pero impide ser retirado.',
  endure:               'El usuario soporta cualquier ataque letal este turno con al menos 1 PS.',
  rapid_spin:           'Elimina barreras y ataduras colindantes y aliadas.',
  protect:              'Desvía todos los ataques; puede fallar si se usa seguido.',
  hail:                 'Llueve granizo constante por 5 turnos dañando a todos excepto al tipo Hielo.',
  sun:                  'Acentúa la intensidad del sol en el campo asomando lo afín al Fuego.',
  taunt:                'Mofa al rival forzándolo a utilizar solo ataques de agresión directa.',
  light_screen:         'Encapsula al equipo en un escudo que recorta el Ataque Especial rival.',
  rain:                 'Invoca llovizna torrencial sobre el campo debilitando los ataques Fuego.',
  safeguard:            'Santuario que protege al equipo contra alteraciones negativas de estado.',
  break_screens:        'Rompe de cuajo las barreras místicas e invisibles defensivas como el Reflejo.',
  reflect:              'Levanta un muro cristalino mermando ataques Físicos recibidos.',
  torment:              'Prohibe la reutilización del mismo último movimiento de forma consecutiva.',
  attract:              'Enamora al rival si es opuesto, paralizando a veces su capacidad de actuar.',
  steal_item:           'Roba ágilmente la equipación que el agredido cargue sin gastar turno extra.',
  skill_swap:           'Reemplaza entre ambos monstruos sus capacidades y habilidades.',
  snatch:               'Aprovecha robando los efectos positivos emitidos por el oponente.',
};

/**
 * Returns a human-readable description for a move, based on its MoveBaseData.
 *
 * When `md` is provided, the pokemonDataProvider is never called.
 * This makes the function fully pure and testable in Node.js 26+ natively.
 */
export function getMoveDescriptionPure(_name: string, md: MoveBaseData | null): string {
  if (!md) return 'Causa daño al oponente sin efectos secundarios adicionales.';

  if (md.ohko)                          return 'Fulmina al enemigo de un solo golpe si acierta.';
  if (md.halfHP)                        return 'Reduce a la mitad los PS actuales del oponente.';
  if (md.endeavor)                      return 'Iguala los PS actuales del objetivo con los del usuario. Falla si tiene menos.';
  if (md.recoil)                        return 'El usuario recibe daño por retroceso al golpear.';
  if (md.drain && md.cat !== 'status')  return 'Restaura PS al usuario según el daño causado.';
  if (md.selfKO)                        return 'El usuario se debilita para causar un daño masivo.';
  if (md.priority && md.priority > 0)   return 'Ataque rápido que siempre golpea primero.';
  if (md.levelDmg)                      return 'Causa un daño igual al nivel del usuario.';
  if (md.counter)                       return 'Devuelve al rival el doble del daño físico recibido este turno.';

  const desc = MOVE_EFFECT_DESCRIPTIONS[md.effect ?? ''];
  if (desc) return desc;
  if (md.cat === 'status') return 'Un movimiento que causa un efecto de estado o alteración.';
  return 'Causa daño al oponente sin efectos secundarios adicionales.';
}
