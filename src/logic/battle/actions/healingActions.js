/**
 * Módulo de Acciones de Curación (Healing)
 */

export const HEALING_ACTIONS = {
  'heal_50': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (src.hp >= src.maxHp) {
      addLogFn('¡Pero falló!', 'log-info');
      return;
    }
    const healAmt = Math.floor(src.maxHp / 2);
    src.hp = Math.min(src.maxHp, src.hp + healAmt);
    addLogFn(`¡${src.name} recuperó salud! (+${healAmt} HP)`, 'log-info');
  },

  'heal_weather': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (src.hp >= src.maxHp) return;
    
    // El ciclo horario afecta la curación (Sintesis, Sol matinal, Luz lunar)
    const cycle = (typeof window.getDayCycle === 'function') ? window.getDayCycle() : 'day';
    let healPct = 0.5;
    if (cycle === 'day' || cycle === 'morning') healPct = 0.66;
    if (cycle === 'dusk') healPct = 0.33;
    if (cycle === 'night') healPct = 0.25;
    
    const hwAmt = Math.floor(src.maxHp * healPct);
    src.hp = Math.min(src.maxHp, src.hp + hwAmt);
    addLogFn(`¡${src.name} recuperó salud con el clima! (+${hwAmt} HP)`, 'log-info');
  },

  'rest': (src, tgt, srcStages, tgtStages, addLogFn) => {
    src.hp = src.maxHp;
    src.status = 'sleep';
    src.sleepTurns = 2;
    addLogFn(`¡${src.name} se recuperó completamente y se quedó dormido!`, 'log-info');
  },

  'leech_seed': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.type === 'grass' || tgt.type2 === 'grass') {
      addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info');
      return;
    }
    if (!tgt.seeded) {
      tgt.seeded = true;
      addLogFn(`¡${tgt.name} fue infectado por drenadoras!`, 'log-info');
    } else {
      addLogFn(`¡${tgt.name} ya está infectado!`, 'log-info');
    }
  }
};
