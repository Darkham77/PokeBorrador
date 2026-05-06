
/**
 * Módulo de Acciones de Campo (Field effects)
 * Maneja pantallas (Screens), velos (Safeguard) y climas adicionales.
 */

export const FIELD_ACTIONS = {
  'reflect': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    if (srcStages.reflect) {
      addLogFn("¡Pero falló!", 'log-info', src);
    } else {
      srcStages.reflect = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques físicos!`, 'log-info', src);
    }
  },
  'light_screen': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    if (srcStages.lightScreen) {
      addLogFn("¡Pero falló!", 'log-info', src);
    } else {
      srcStages.lightScreen = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques especiales!`, 'log-info', src);
    }
  },
  'safeguard': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    if (srcStages.safeguard) {
      addLogFn("¡Pero falló!", 'log-info', src);
    } else {
      srcStages.safeguard = 5;
      addLogFn(`¡${src.name} envuelve al equipo en un Velo Sagrado!`, 'log-info', src);
    }
  },
  'hail': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'hail', turns: 5 };
      addLogFn("¡Empezó a granizar!", 'log-info', src);
    }
  },
  'rain': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'rain', turns: 5 };
      addLogFn("¡Empezó a llover!", 'log-info', src);
    }
  },
  'sun': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'sun', turns: 5 };
      addLogFn("¡El sol se volvió muy intenso!", 'log-info', src);
    }
  },
  'sandstorm': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'sandstorm', turns: 5 };
      addLogFn("¡Se desató una tormenta de arena!", 'log-info', src);
    }
  },
  'weather_sandstorm': (src: any, tgt: any, srcStages: any, tgtStages: any, addLogFn: any, battleCtx: any) => {
    FIELD_ACTIONS.sandstorm(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  },
  'break_screens': (src: any, _tgt: any, _srcStages: any, tgtStages: any, addLogFn: any) => {
    if (tgtStages.reflect || tgtStages.lightScreen) {
      tgtStages.reflect = 0;
      tgtStages.lightScreen = 0;
      addLogFn(`¡${src.name} rompió las barreras de su oponente!`, 'log-info', src);
    }
  },
  'spikes': (src: any, _tgt: any, _srcStages: any, tgtStages: any, addLogFn: any, _battleCtx: any) => {
    tgtStages.spikes = Math.min(3, (tgtStages.spikes || 0) + 1);
    addLogFn(`¡${src.name} lanzó púas alrededor de su rival!`, 'log-info', src);
  },
  'mist': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    srcStages.mist = 5;
    addLogFn(`¡Una neblina protectora rodea a ${src.name}!`, 'log-info', src);
  }
};
