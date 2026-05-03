/**
 * Módulo de Acciones de Estadísticas (Stats)
 * Gestiona subidas y bajadas de stats en combate.
 */

export const STAT_ACTIONS = {
  // --- SUBIDAS (Self) ---
  'stat_up_self_atk': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    addLogFn(`¡Subió el Ataque de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_atk_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 2);
    addLogFn(`¡Subió mucho el Ataque de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡Subió la Defensa de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_def_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 2);
    addLogFn(`¡Subió mucho la Defensa de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_spa_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 2);
    addLogFn(`¡Subió mucho el At.Esp de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_spe_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 2);
    addLogFn(`¡Subió mucho la Velocidad de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_eva': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 1);
    addLogFn(`¡Aumentó la evasión de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_eva_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 2);
    addLogFn(`¡Aumentó mucho la evasión de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_atk_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡Subió el Ataque y la Defensa de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_spa_spd': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡Subió el At. Esp y la Def. Esp de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_spd': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡Subió la Def. Especial de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_def_spd': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡Subió la Defensa y la Def. Especial de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_atk_spe': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡Subió el Ataque y la Velocidad de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_all_10': (src, tgt, srcStages, tgtStages, addLogFn) => {
    // Probabilidad del 10% ya manejada en ActionRegistry si corresponde, 
    // pero si llega aquí se sube todo
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡Subieron todas las estadísticas de ${src.name}!`, 'log-info', src);
  },

  // --- BAJADAS (Enemy) ---
  'stat_down_enemy_atk': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'atk', addLogFn, tgtStages)) return;
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    addLogFn(`¡Bajó el Ataque de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'def', addLogFn, tgtStages)) return;
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
    addLogFn(`¡Bajó la Defensa de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_spe': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'spe', addLogFn, tgtStages)) return;
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1);
    addLogFn(`¡Bajó la Velocidad de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_acc': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'acc', addLogFn, tgtStages)) return;
    tgtStages.acc = Math.max(-6, (tgtStages.acc || 0) - 1);
    addLogFn(`¡Bajó la Precisión de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_eva': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'eva', addLogFn, tgtStages)) return;
    tgtStages.eva = Math.max(-6, (tgtStages.eva || 0) - 1);
    addLogFn(`¡Bajó la Evasión de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_spe_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'spe', addLogFn, tgtStages)) return;
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 2);
    addLogFn(`¡Bajó mucho la Velocidad de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_spd_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'spd', addLogFn, tgtStages)) return;
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 2);
    addLogFn(`¡Bajó mucho la Def. Especial de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_spd': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'spd', addLogFn, tgtStages)) return;
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 1);
    addLogFn(`¡Bajó la Def. Especial de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_atk_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'atk', addLogFn, tgtStages)) return;
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 2);
    addLogFn(`¡Bajó mucho el Ataque de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_atk_10': (src, tgt, srcStages, tgtStages, addLogFn) => {
    // Probabilidad del 10% manejada por ActionRegistry
    if (checkInmunity(tgt, 'atk', addLogFn, tgtStages)) return;
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    addLogFn(`¡Bajó el Ataque de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_enemy_atk_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (checkInmunity(tgt, 'atk', addLogFn, tgtStages)) return;
    if (checkInmunity(tgt, 'def', addLogFn, tgtStages)) return;
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
    addLogFn(`¡Bajó el Ataque y la Defensa de ${tgt.name}!`, 'log-info', tgt);
  },
  'stat_down_self_atk_def': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.atk = Math.max(-6, (srcStages.atk || 0) - 1);
    srcStages.def = Math.max(-6, (srcStages.def || 0) - 1);
    addLogFn(`¡Bajó el Ataque y la Defensa de ${src.name}!`, 'log-info', src);
  },
  'stat_up_self_def_10': (src, tgt, srcStages, tgtStages, addLogFn) => {
    // Probabilidad del 10% manejada por ActionRegistry
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡Subió la Defensa de ${src.name}!`, 'log-info', src);
  },
  'stat_down_self_spa_2': (src, tgt, srcStages, tgtStages, addLogFn) => {
    srcStages.spa = Math.max(-6, (srcStages.spa || 0) - 2);
    addLogFn(`¡Bajó mucho el At. Esp de ${src.name}!`, 'log-info', src);
  },
  'reset_stats': (src, tgt, srcStages, tgtStages, addLogFn) => {
    ['atk', 'def', 'spa', 'spd', 'spe', 'eva', 'acc'].forEach(s => {
      srcStages[s] = 0;
      tgtStages[s] = 0;
    });
    addLogFn("¡Se han eliminado los cambios en las estadísticas!", 'log-info', src);
  },
  'psych_up': (src, tgt, srcStages, tgtStages, addLogFn) => {
    ['atk', 'def', 'spa', 'spd', 'spe', 'eva', 'acc'].forEach(s => {
      srcStages[s] = tgtStages[s] || 0;
    });
    addLogFn(`¡${src.name} copió los cambios de estadísticas de ${tgt.name}!`, 'log-info', src);
  }
};

function checkInmunity(tgt, stat, addLogFn, tgtStages) {
  if (tgt.ability === 'Cuerpo Puro') {
    addLogFn(`¡El Cuerpo Puro de ${tgt.name} evitó las reducciones!`, 'log-info', tgt);
    return true;
  }
  
  if (tgt.ability === 'Humo Blanco') {
    addLogFn(`¡El Humo Blanco de ${tgt.name} evitó las reducciones!`, 'log-info', tgt);
    return true;
  }
  if (stat === 'atk' && tgt.ability === 'Corte Fuerte') {
    addLogFn(`¡El Corte Fuerte de ${tgt.name} evitó que bajara su ataque!`, 'log-info', tgt);
    return true;
  }
  
  if (tgtStages[stat] <= -6) {
    console.warn(`[StatActions] Blocked: ${stat} already at minimum for ${tgt.name}`);
    return true;
  }
  if (stat === 'acc' && tgt.ability === 'Vista lince') {
    addLogFn(`¡La Vista lince de ${tgt.name} evitó que bajara su precisión!`, 'log-info', tgt);
    return true;
  }
  return false;
}
