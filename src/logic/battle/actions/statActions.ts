
export const STAT_ACTIONS = {
  'atk+1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    addLogFn(`¡El Ataque de ${src.name} subió!`, 'log-info', src);
  },
  'def+1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡La Defensa de ${src.name} subió!`, 'log-info', src);
  },
  'spa+1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    addLogFn(`¡El At. Esp de ${src.name} subió!`, 'log-info', src);
  },
  'spd+1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡La Def. Esp de ${src.name} subió!`, 'log-info', src);
  },
  'spe+1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡La Velocidad de ${src.name} subió!`, 'log-info', src);
  },
  'atk+2': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 2);
    addLogFn(`¡El Ataque de ${src.name} subió mucho!`, 'log-info', src);
  },
  'def+2': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 2);
    addLogFn(`¡La Defensa de ${src.name} subió mucho!`, 'log-info', src);
  },
  'spa+2': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 2);
    addLogFn(`¡El At. Esp de ${src.name} subió mucho!`, 'log-info', src);
  },
  'spd+2': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 2);
    addLogFn(`¡La Def. Esp de ${src.name} subió mucho!`, 'log-info', src);
  },
  'spe+2': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 2);
    addLogFn(`¡La Velocidad de ${src.name} subió mucho!`, 'log-info', src);
  },
  'eva+1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.eva = Math.min(6, (srcStages.eva || 0) + 1);
    addLogFn(`¡La Evasión de ${src.name} subió!`, 'log-info', src);
  },
  'acc+1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.acc = Math.min(6, (srcStages.acc || 0) + 1);
    addLogFn(`¡La Precisión de ${src.name} subió!`, 'log-info', src);
  },
  'atk-1': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
    addLogFn(`¡El Ataque de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'def-1': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
    addLogFn(`¡La Defensa de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'spa-1': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.spa = Math.max(-6, (tgtStages.spa || 0) - 1);
    addLogFn(`¡El At. Esp de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'spd-1': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 1);
    addLogFn(`¡La Def. Esp de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'spe-1': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1);
    addLogFn(`¡La Velocidad de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'eva-1': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.eva = Math.max(-6, (tgtStages.eva || 0) - 1);
    addLogFn(`¡La Evasión de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'acc-1': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.acc = Math.max(-6, (tgtStages.acc || 0) - 1);
    addLogFn(`¡La Precisión de ${tgt.name} bajó!`, 'log-info', tgt);
  },
  'atk-2': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 2);
    addLogFn(`¡El Ataque de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'def-2': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 2);
    addLogFn(`¡La Defensa de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'spa-2': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.spa = Math.max(-6, (tgtStages.spa || 0) - 2);
    addLogFn(`¡El At. Esp de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'spd-2': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.spd = Math.max(-6, (tgtStages.spd || 0) - 2);
    addLogFn(`¡La Def. Esp de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'spe-2': (_src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 2);
    addLogFn(`¡La Velocidad de ${tgt.name} bajó mucho!`, 'log-info', tgt);
  },
  'cosmic_power': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡La Defensa y Def. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'bulk_up': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
    addLogFn(`¡El Ataque y Defensa de ${src.name} subieron!`, 'log-info', src);
  },
  'calm_mind': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
    addLogFn(`¡El At. Esp y Def. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'dragon_dance': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
    addLogFn(`¡El Ataque y Velocidad de ${src.name} subieron!`, 'log-info', src);
  },
  'growth': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
    srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
    addLogFn(`¡El Ataque y At. Esp de ${src.name} subieron!`, 'log-info', src);
  },
  'superpower': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.atk = Math.max(-6, (srcStages.atk || 0) - 1);
    srcStages.def = Math.max(-6, (srcStages.def || 0) - 1);
    addLogFn(`¡El Ataque y Defensa de ${src.name} bajaron!`, 'log-info', src);
  },
  'stat_down_self_def_spd_1': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.def = Math.max(-6, (srcStages.def || 0) - 1);
    srcStages.spd = Math.max(-6, (srcStages.spd || 0) - 1);
    addLogFn(`¡La Defensa y Def. Esp de ${src.name} bajaron!`, 'log-info', src);
  },
  'stat_down_self_spa_2': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    srcStages.spa = Math.max(-6, (srcStages.spa || 0) - 2);
    addLogFn(`¡Bajó mucho el At. Esp de ${src.name}!`, 'log-info', src);
  },
  'reset_stats': (src: any, _tgt: any, srcStages: any, tgtStages: any, addLogFn: any) => {
    ['atk', 'def', 'spa', 'spd', 'spe', 'eva', 'acc'].forEach(s => {
      srcStages[s] = 0;
      tgtStages[s] = 0;
    });
    addLogFn("¡Se han eliminado los cambios en las estadísticas!", 'log-info', src);
  },
  'belly_drum': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    const cost = Math.floor(src.maxHp / 2);
    if (src.hp > cost && srcStages.atk < 6) {
      src.hp -= cost;
      srcStages.atk = 6;
      addLogFn(`¡${src.name} redujo su HP y maximizó su Ataque!`, 'log-info', src);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'psych_up': (src: any, tgt: any, srcStages: any, tgtStages: any, addLogFn: any) => {
    ['atk', 'def', 'spa', 'spd', 'spe', 'eva', 'acc'].forEach(s => {
      srcStages[s] = tgtStages[s] || 0;
    });
    addLogFn(`¡${src.name} copió los cambios de estadísticas de ${tgt.name}!`, 'log-info', src);
  }
};
