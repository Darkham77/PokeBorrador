
/**
 * Módulo de Acciones de Clima (Weather)
 */

export const WEATHER_ACTIONS = {
  'sun': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'sun', turns: 5 };
      addLogFn("¡El sol empezó a brillar con fuerza!", 'log-info', src);
    }
  },
  'rain': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'rain', turns: 5 };
      addLogFn("¡Empezó a llover!", 'log-info', src);
    }
  },
  'sandstorm': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx) {
      battleCtx.weather = { type: 'sandstorm', turns: 5 };
      addLogFn("¡Se desató una tormenta de arena!", 'log-info', src);
    }
  }
};
