/**
 * Módulo de Acciones de Estadísticas (Stats)
 * Gestiona subidas y bajadas de stats en combate.
 */

export const STAT_ACTIONS = {
  // --- SUBIDAS (Self) ---
  'stat_up_self_atk': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    addLogFn(`¡Subió el Ataque de ${src.name}!`, 'log-info');
  },
  'stat_up_self_atk_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 2);
    addLogFn(`¡Subió mucho el Ataque de ${src.name}!`, 'log-info');
  },
  'stat_up_self_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡Subió la Defensa de ${src.name}!`, 'log-info');
  },
  'stat_up_self_def_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 2);
    addLogFn(`¡Subió mucho la Defensa de ${src.name}!`, 'log-info');
  },
  'stat_up_self_spa_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 2);
    addLogFn(`¡Subió mucho el At.Esp de ${src.name}!`, 'log-info');
  },
  'stat_up_self_spe_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 2);
    addLogFn(`¡Subió mucho la Velocidad de ${src.name}!`, 'log-info');
  },
  'stat_up_self_eva': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 1);
    addLogFn(`¡Aumentó la evasión de ${src.name}!`, 'log-info');
  },
  'stat_up_self_eva_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 2);
    addLogFn(`¡Aumentó mucho la evasión de ${src.name}!`, 'log-info');
  },
  'stat_up_self_atk_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡Subió el Ataque y la Defensa de ${src.name}!`, 'log-info');
  },
  'stat_up_self_spa_spd': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡Subió el At. Esp y la Def. Esp de ${src.name}!`, 'log-info');
  },

  // --- BAJADAS (Enemy) ---
  'stat_down_enemy_atk': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'atk', addLogFn)) return;
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    addLogFn(`¡Bajó el Ataque de ${tgt.name}!`, 'log-info');
  },
  'stat_down_enemy_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'def', addLogFn)) return;
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
    addLogFn(`¡Bajó la Defensa de ${tgt.name}!`, 'log-info');
  },
  'stat_down_enemy_spe': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'spe', addLogFn)) return;
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1);
    addLogFn(`¡Bajó la Velocidad de ${tgt.name}!`, 'log-info');
  },
  'stat_down_enemy_acc': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'acc', addLogFn)) return;
    tgtStages.acc = Math.max(-6, (tgtStages.acc || 0) - 1);
    addLogFn(`¡Bajó la Precisión de ${tgt.name}!`, 'log-info');
  },
  'stat_down_enemy_eva': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'eva', addLogFn)) return;
    tgtStages.eva = Math.max(-6, (tgtStages.eva || 0) - 1);
    addLogFn(`¡Bajó la Evasión de ${tgt.name}!`, 'log-info');
  },
  'stat_down_enemy_spe_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'spe', addLogFn)) return;
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 2);
    addLogFn(`¡Bajó mucho la Velocidad de ${tgt.name}!`, 'log-info');
  }
};

function checkInmunity(tgt, stat, addLogFn) {
  if (tgt.ability === 'Cuerpo Puro') {
    addLogFn(`¡El Cuerpo Puro de ${tgt.name} evitó las reducciones!`, 'log-info');
    return true;
  }
  if (stat === 'atk' && tgt.ability === 'Corte Fuerte') {
    addLogFn(`¡El Corte Fuerte de ${tgt.name} evitó que bajara su ataque!`, 'log-info');
    return true;
  }
  if (stat === 'acc' && tgt.ability === 'Vista lince') {
    addLogFn(`¡La Vista lince de ${tgt.name} evitó que bajara su precisión!`, 'log-info');
    return true;
  }
  return false;
}
