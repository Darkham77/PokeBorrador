import type { MoveAction } from '@/types/battle/battle';

export const FIELD_ACTIONS: Record<string, MoveAction> = {
  'reflect': (src, _tgt, srcStages, _tgtStages, addLogFn, _battleCtx) => {
    if (srcStages.reflect) {
      addLogFn("¡Pero falló!", 'log-info', src);
    } else {
      srcStages.reflect = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques físicos!`, 'log-info', src);
    }
  },
  'light_screen': (src, _tgt, srcStages, _tgtStages, addLogFn, _battleCtx) => {
    if (srcStages.lightScreen) {
      addLogFn("¡Pero falló!", 'log-info', src);
    } else {
      srcStages.lightScreen = 5;
      addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques especiales!`, 'log-info', src);
    }
  },
  'safeguard': (src, _tgt, srcStages, _tgtStages, addLogFn, _battleCtx) => {
    if (srcStages.safeguard) {
      addLogFn("¡Pero falló!", 'log-info', src);
    } else {
      srcStages.safeguard = 5;
      addLogFn(`¡${src.name} envuelve al equipo en un Velo Sagrado!`, 'log-info', src);
    }
  },
  'hail': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (battleCtx?.activeBattle.value) {
      battleCtx.activeBattle.value.weather = { type: 'hail', visual: 'hail', turns: 5 };
      addLogFn("¡Empezó a granizar!", 'log-info', src);
    }
  },
  'rain': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (battleCtx?.activeBattle.value) {
      battleCtx.activeBattle.value.weather = { type: 'rain', visual: 'rain', turns: 5 };
      addLogFn("¡Empezó a llover!", 'log-info', src);
    }
  },
  'sun': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (battleCtx?.activeBattle.value) {
      battleCtx.activeBattle.value.weather = { type: 'sun', visual: 'sun', turns: 5 };
      addLogFn("¡El sol se volvió muy intenso!", 'log-info', src);
    }
  },
  'sandstorm': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (battleCtx?.activeBattle.value) {
      battleCtx.activeBattle.value.weather = { type: 'sandstorm', visual: 'sandstorm', turns: 5 };
      addLogFn("¡Se desató una tormenta de arena!", 'log-info', src);
    }
  },
  'weather_sandstorm': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    const action = FIELD_ACTIONS['sandstorm'];
    if (action) action(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  },
  'break_screens': (src, _tgt, _srcStages, tgtStages, addLogFn) => {
    if (tgtStages.reflect || tgtStages.lightScreen) {
      tgtStages.reflect = 0;
      tgtStages.lightScreen = 0;
      addLogFn(`¡${src.name} rompió las barreras de su oponente!`, 'log-info', src);
    }
  },
  'spikes': (src, _tgt, _srcStages, tgtStages, addLogFn, _battleCtx) => {
    tgtStages.spikes = Math.min(3, (tgtStages.spikes || 0) + 1);
    addLogFn(`¡${src.name} lanzó púas alrededor de su rival!`, 'log-info', src);
  },
  'toxic_spikes': (src, _tgt, _srcStages, tgtStages, addLogFn, _battleCtx) => {
    tgtStages.toxicSpikes = Math.min(2, (tgtStages.toxicSpikes || 0) + 1);
    addLogFn(`¡${src.name} lanzó púas tóxicas alrededor de su rival!`, 'log-info', src);
  },
  'stealth_rock': (src, _tgt, _srcStages, tgtStages, addLogFn, _battleCtx) => {
    if (tgtStages.stealthRock) {
      addLogFn("¡Pero falló!", 'log-info', src);
    } else {
      tgtStages.stealthRock = 1;
      addLogFn(`¡Piedras flotantes rodean al equipo rival!`, 'log-info', src);
    }
  },
  'mist': (src, _tgt, srcStages, _tgtStages, addLogFn, _battleCtx) => {
    srcStages.mist = 5;
    addLogFn(`¡Una neblina protectora rodea a ${src.name}!`, 'log-info', src);
  }
};
