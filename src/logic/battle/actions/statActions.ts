import type { MoveAction } from '@/types/battle';

export const STAT_ACTIONS: Record<string, MoveAction> = {
  'atk+1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    addLogFn(`¡El Ataque de ${src.name} subió!`, 'log-info', src);
  },
  'def+1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡La Defensa de ${src.name} subió!`, 'log-info', src);
  },
  'spa+1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    addLogFn(`¡El At. Esp de ${src.name} subió!`, 'log-info', src);
  },
  'spd+1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡La Def. Esp de ${src.name} subió!`, 'log-info', src);
  },
  'spe+1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡La Velocidad de ${src.name} subió!`, 'log-info', src);
  },
  'atk+2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 2);
    addLogFn(`¡El Ataque de ${src.name} subió mucho!`, 'log-info', src);
  },
  'def+2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 2);
    addLogFn(`¡La Defensa de ${src.name} subió mucho!`, 'log-info', src);
  },
  'spa+2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 2);
    addLogFn(`¡El At. Esp de ${src.name} subió mucho!`, 'log-info', src);
  },
  'spd+2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 2);
    addLogFn(`¡La Def. Esp de ${src.name} subió mucho!`, 'log-info', src);
  },
  'spe+2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 2);
    addLogFn(`¡La Velocidad de ${src.name} subió mucho!`, 'log-info', src);
  },
  'eva+1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 1);
    addLogFn(`¡La Evasión de ${src.name} subió!`, 'log-info', src);
  },
  'acc+1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.acc = Math.min(6, (srcStages.acc || 0) + 1);
    addLogFn(`¡La Precisión de ${src.name} subió!`, 'log-info', src);
  },
  'atk-1': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    addLogFn(`¡El Ataque de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'def-1': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
    addLogFn(`¡La Defensa de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'spa-1': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spa = Math.max(-6, (tgtStages.spa || 0) - 1);
    addLogFn(`¡El At. Esp de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'spd-1': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 1);
    addLogFn(`¡La Def. Esp de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'spe-1': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1);
    addLogFn(`¡La Velocidad de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'eva-1': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.eva = Math.max(-6, (tgtStages.eva || 0) - 1);
    addLogFn(`¡La Evasión de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'acc-1': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.acc = Math.max(-6, (tgtStages.acc || 0) - 1);
    addLogFn(`¡La Precisión de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'atk-2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 2);
    addLogFn(`¡El Ataque de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'def-2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 2);
    addLogFn(`¡La Defensa de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'spa-2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spa = Math.max(-6, (tgtStages.spa || 0) - 2);
    addLogFn(`¡El At. Esp de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'spd-2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 2);
    addLogFn(`¡La Def. Esp de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'spe-2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 2);
    addLogFn(`¡La Velocidad de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'cosmic_power': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡La Defensa y Def. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'bulk_up': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡El Ataque y Defensa de ${src.name} subieron!`, 'log-info', src);
  },
  'calm_mind': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡El At. Esp y Def. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'dragon_dance': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡El Ataque y Velocidad de ${src.name} subieron!`, 'log-info', src);
  },
  'growth': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    addLogFn(`¡El Ataque y At. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'superpower': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.max(-6, (srcStages.atk || 0) - 1);
    srcStages.def = Math.max(-6, (srcStages.def || 0) - 1);
    addLogFn(`¡El Ataque y Defensa de ${src.name} bajaron!`, 'log-info', src);
  },
  'stat_down_self_def_spd_1': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.def = Math.max(-6, (srcStages.def || 0) - 1);
    srcStages.spd = Math.max(-6, (srcStages.spd || 0) - 1);
    addLogFn(`¡La Defensa y Def. Esp de ${src.name} bajaron!`, 'log-info', src);
  },
  'stat_down_self_spa_2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spa = Math.max(-6, (srcStages.spa || 0) - 2);
    addLogFn(`¡Bajó mucho el At. Esp de ${src.name}!`, 'log-info', src);
  },
  'reset_stats': (src, _tgt, srcStages, tgtStages, addLogFn) => {
    ['atk', 'def', 'spa', 'spd', 'spe', 'eva', 'acc'].forEach(s => {
      srcStages[s] = 0;
      tgtStages[s] = 0;
    });
    addLogFn("¡Se han eliminado los cambios en las estadísticas!", 'log-info', src);
  },
  'belly_drum': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    const cost = Math.floor(src.maxHp / 2);
    if (src.hp > cost && srcStages.atk < 6) {
      src.hp -= cost;
      srcStages.atk = 6;
      addLogFn(`¡${src.name} redujo su HP y maximizó su Ataque!`, 'log-info', src);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'psych_up': (src, tgt, srcStages, tgtStages, addLogFn) => {
    ['atk', 'def', 'spa', 'spd', 'spe', 'eva', 'acc'].forEach(s => {
      srcStages[s] = tgtStages[s] || 0;
    });
    addLogFn(`¡${src.name} copió los cambios de estadísticas de ${tgt.name}!`, 'log-info', src);
  },
  'stat_down_enemy_atk': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    addLogFn(`¡El Ataque de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'stat_down_enemy_def': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
    addLogFn(`¡La Defensa de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'stat_down_enemy_spe': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1);
    addLogFn(`¡La Velocidad de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'stat_down_enemy_spa': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spa = Math.max(-6, (tgtStages.spa || 0) - 1);
    addLogFn(`¡El At. Esp de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'stat_down_enemy_spd': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 1);
    addLogFn(`¡La Def. Esp de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'stat_down_enemy_acc': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.acc = Math.max(-6, (tgtStages.acc || 0) - 1);
    addLogFn(`¡La Precisión de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'stat_down_enemy_eva': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.eva = Math.max(-6, (tgtStages.eva || 0) - 1);
    addLogFn(`¡La Evasión de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'stat_down_enemy_def_2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 2);
    addLogFn(`¡La Defensa de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'stat_down_enemy_atk_2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 2);
    addLogFn(`¡El Ataque de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'stat_down_enemy_spe_2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 2);
    addLogFn(`¡La Velocidad de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'stat_down_enemy_spd_2': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 2);
    addLogFn(`¡La Def. Esp de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'stat_down_enemy_atk_def': (_src, tgt, _srcStages, tgtStages, addLogFn) => {
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
    addLogFn(`¡El Ataque y Defensa de ${tgt.name} bajaron!`, 'log-info', tgt);
  },

  // Missing stat_up_self mappings
  'stat_up_self_atk': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    addLogFn(`¡El Ataque de ${src.name} subió!`, 'log-info', src);
  },
  'stat_up_self_def': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡La Defensa de ${src.name} subió!`, 'log-info', src);
  },
  'stat_up_self_spa': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    addLogFn(`¡El At. Esp de ${src.name} subió!`, 'log-info', src);
  },
  'stat_up_self_spd': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡La Def. Esp de ${src.name} subió!`, 'log-info', src);
  },
  'stat_up_self_spe': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡La Velocidad de ${src.name} subió!`, 'log-info', src);
  },
  'stat_up_self_eva': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 1);
    addLogFn(`¡La Evasión de ${src.name} subió!`, 'log-info', src);
  },
  'stat_up_self_acc': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.acc = Math.min(6, (srcStages.acc || 0) + 1);
    addLogFn(`¡La Precisión de ${src.name} subió!`, 'log-info', src);
  },

  'stat_up_self_atk_2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 2);
    addLogFn(`¡El Ataque de ${src.name} subió mucho!`, 'log-info', src);
  },
  'stat_up_self_def_2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 2);
    addLogFn(`¡La Defensa de ${src.name} subió mucho!`, 'log-info', src);
  },
  'stat_up_self_spa_2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 2);
    addLogFn(`¡El At. Esp de ${src.name} subió mucho!`, 'log-info', src);
  },
  'stat_up_self_spd_2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 2);
    addLogFn(`¡La Def. Esp de ${src.name} subió mucho!`, 'log-info', src);
  },
  'stat_up_self_spe_2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 2);
    addLogFn(`¡La Velocidad de ${src.name} subió mucho!`, 'log-info', src);
  },
  'stat_up_self_eva_2': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 2);
    addLogFn(`¡La Evasión de ${src.name} subió mucho!`, 'log-info', src);
  },

  'stat_up_self_atk_spe': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡El Ataque y Velocidad de ${src.name} subieron!`, 'log-info', src);
  },
  'stat_up_self_def_spd': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡La Defensa y Def. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'stat_up_self_spa_spd': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡El At. Esp y Def. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'stat_up_self_atk_def': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡El Ataque y Defensa de ${src.name} subieron!`, 'log-info', src);
  },
  'stat_up_self_all': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva'].forEach(s => {
      srcStages[s] = Math.min(6, (srcStages[s] || 0) + 1);
    });
    addLogFn(`¡Todas las estadísticas de ${src.name} subieron!`, 'log-info', src);
  }
};
