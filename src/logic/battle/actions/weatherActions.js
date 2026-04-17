/**
 * Módulo de Acciones de Clima (Weather)
 */

export const WEATHER_ACTIONS = {
  'sun': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'sun', turns: 5 };
      addLogFn("¡El sol empezó a brillar con fuerza!", 'log-info');
    }
  },
  'rain': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'rain', turns: 5 };
      addLogFn("¡Empezó a llover!", 'log-info');
    }
  },
  'sandstorm': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'sandstorm', turns: 5 };
      addLogFn("¡Se desató una tormenta de arena!", 'log-info');
    }
  }
};
