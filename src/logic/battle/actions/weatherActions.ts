import type { MoveAction } from '@/types/battle/battle';

export const WEATHER_ACTIONS: Record<string, MoveAction> = {
  'sun': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (battleCtx?.activeBattle.value) {
      battleCtx.activeBattle.value.weather = { type: 'sun', visual: 'sun', turns: 5 };
      addLogFn("¡El sol empezó a brillar con fuerza!", 'log-info', src);
    }
  },
  'rain': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (battleCtx?.activeBattle.value) {
      battleCtx.activeBattle.value.weather = { type: 'rain', visual: 'rain', turns: 5 };
      addLogFn("¡Empezó a llover!", 'log-info', src);
    }
  },
  'sandstorm': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (battleCtx?.activeBattle.value) {
      battleCtx.activeBattle.value.weather = { type: 'sandstorm', visual: 'sandstorm', turns: 5 };
      addLogFn("¡Se desató una tormenta de arena!", 'log-info', src);
    }
  }
};
