import { STAT_ACTIONS } from './statActions';
import { STATUS_ACTIONS } from './statusActions';
import { HEALING_ACTIONS } from './healingActions';
import { WEATHER_ACTIONS } from './weatherActions';
import { FIELD_ACTIONS } from './fieldActions';
import { SPECIAL_ACTIONS } from './specialActions';

/**
 * Registro Central de Acciones y Efectos
 * Despacha efectos de movimientos de forma modular.
 */

const ALL_ACTIONS = {
  ...STAT_ACTIONS,
  ...STATUS_ACTIONS,
  ...HEALING_ACTIONS,
  ...WEATHER_ACTIONS,
  ...FIELD_ACTIONS,
  ...SPECIAL_ACTIONS
};

/**
 * Despacha un efecto de movimiento a la función correspondiente.
 * Maneja la probabilidad de activación (ej: burn_10).
 */
export function dispatchMoveEffect(effect, src, tgt, srcStages, tgtStages, addLogFn, battleCtx) {
  if (!effect) return;

  // 1. Parshear probabilidad (ej: burn_10 -> 10% de chance, efecto base 'burn')
  let chance = 100;
  let effectBase = effect;

  if (/_(\d+)$/.test(effect) && !effect.startsWith('heal_') && !effect.includes('self_atk_2')) {
    const match = effect.match(/_(\d+)$/);
    const val = parseInt(match[1]);
    // Evitar parshear niveles de stat (_2) como probabilidad
    if (val > 2) {
      chance = val;
      effectBase = effect.replace(/_\d+$/, '');
    }
  }

  const roll = Math.random() * 100;
  if (roll > chance) return; // No se activó el efecto secundario

  // 2. Comprobar inmunidades generales (Shield Dust / Polvo Escudo)
  if (tgt.ability === 'Polvo escudo' && chance < 100) {
    if (effectBase !== 'leech_seed' && effectBase !== 'metronome') {
      addLogFn(`¡El Polvo escudo de ${tgt.name} evitó los efectos secundarios!`, 'log-info');
      return;
    }
  }

  // 3. Buscar y ejecutar la acción
  // Prioridad al efecto completo (ej: stat_up_self_atk_2)
  let actionFn = ALL_ACTIONS[effect] || ALL_ACTIONS[effectBase];

  if (actionFn) {
    actionFn(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  } else {
    // Casos especiales no modulares aún o logs de depuración
    console.warn(`[ActionRegistry] No se encontró acción para el efecto: ${effect} (${effectBase})`);
  }
}
