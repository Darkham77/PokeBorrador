import type { MoveAction } from '@/types/battle';
import { getDayCycle } from '@/logic/timeUtils';
import { getMechanicalWeather, WEATHER_MECHANICAL } from '../weatherMapper.ts';

export const HEALING_ACTIONS: Record<string, MoveAction> = {
  'heal_50': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    if (src.hp >= src.maxHp) {
      addLogFn('¡Pero falló!', 'log-info', src);
      return;
    }
    const healAmt = Math.floor(src.maxHp / 2);
    src.hp = Math.min(src.maxHp, src.hp + healAmt);
    addLogFn(`¡${src.name} recuperó salud! (+${healAmt} HP)`, 'log-info', src);
  },

  'heal_weather': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (src.hp >= src.maxHp) return;
    
    let healPct = 0.5;
    const weather = battleCtx?.activeBattle.value?.weather?.type;
    const mechWeather = getMechanicalWeather(weather);

    // Prioridad 1: Clima (Mecánicas oficiales)
    const badWeathers: string[] = [WEATHER_MECHANICAL.RAIN, WEATHER_MECHANICAL.HAIL, WEATHER_MECHANICAL.SNOW, WEATHER_MECHANICAL.SANDSTORM, WEATHER_MECHANICAL.FOG];
    if (mechWeather === WEATHER_MECHANICAL.SUN) {
      healPct = 0.66;
    } else if (badWeathers.includes(mechWeather)) {
      healPct = 0.25;
    } else {
      // Prioridad 2: Ciclo horario (Mecánica RPG extendida)
      const cycle = getDayCycle();
      if (cycle === 'day' || cycle === 'morning') healPct = 0.66;
      else if (cycle === 'dusk') healPct = 0.33;
      else if (cycle === 'night') healPct = 0.25;
    }
    
    const hwAmt = Math.floor(src.maxHp * healPct);
    src.hp = Math.min(src.maxHp, src.hp + hwAmt);
    addLogFn(`¡${src.name} recuperó salud con el clima! (+${hwAmt} HP)`, 'log-info', src);
  },

  'rest': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.hp = src.maxHp;
    src.status = 'sleep';
    src.sleepTurns = 2;
    addLogFn(`¡${src.name} se recuperó completamente y se quedó dormido!`, 'log-info', src);
  },

  'leech_seed': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.type === 'grass' || tgt.type2 === 'grass') {
      addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info', tgt);
      return;
    }
    if (!tgt.seeded) {
      tgt.seeded = true;
      addLogFn(`¡${tgt.name} fue infectado por drenadoras!`, 'log-info', tgt);
    } else {
      addLogFn(`¡${tgt.name} ya está infectado!`, 'log-info', tgt);
    }
  }
};
