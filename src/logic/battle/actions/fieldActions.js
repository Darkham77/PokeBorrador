/**
 * Módulo de Acciones de Campo (Field effects)
 * Maneja pantallas (Screens), velos (Safeguard) y climas adicionales.
 */

export const FIELD_ACTIONS = {
  'reflect': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (srcStages.reflect) {
      addLogFn("¡Pero falló!", 'log-info');
    } else {
      srcStages.reflect = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques físicos!`, 'log-info');
    }
  },
  'light_screen': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (srcStages.lightScreen) {
      addLogFn("¡Pero falló!", 'log-info');
    } else {
      srcStages.lightScreen = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques especiales!`, 'log-info');
    }
  },
  'safeguard': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (srcStages.safeguard) {
      addLogFn("¡Pero falló!", 'log-info');
    } else {
      srcStages.safeguard = 5;
      addLogFn(`¡Tu equipo está protegido contra estados por el Velo Sagrado!`, 'log-info');
    }
  },
  'hail': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'hail', turns: 5 };
      addLogFn("¡Empezó a granizar!", 'log-info');
    }
  }
};
