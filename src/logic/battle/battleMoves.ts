import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages, LogFn, BattleState } from '@/types/battle/battle';

export function applyMoveEffect(effect: string | null | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, options: { b?: BattleState | null } = {}) {
  const { b } = options;
  
  switch (effect) {
    case 'atk+1': 
      srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
      addLogFn(`¡El Ataque de ${src.name} subió!`, 'log-info', src); break;
    case 'def+1': 
      srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
      addLogFn(`¡La Defensa de ${src.name} subió!`, 'log-info', src); break;
    case 'spa+1': 
      srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
      addLogFn(`¡El At. Esp de ${src.name} subió!`, 'log-info', src); break;
    case 'spd+1': 
      srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
      addLogFn(`¡La Def. Esp de ${src.name} subió!`, 'log-info', src); break;
    case 'spe+1': 
      srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
      addLogFn(`¡La Velocidad de ${src.name} subió!`, 'log-info', src); break;
    
    case 'atk-1': 
      tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
      addLogFn(`¡El Ataque de ${tgt.name} bajó!`, 'log-info', tgt); break;
    case 'def-1': 
      tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
      addLogFn(`¡La Defensa de ${tgt.name} bajó!`, 'log-info', tgt); break;
    case 'spe-1': 
      tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1);
      addLogFn(`¡La Velocidad de ${tgt.name} bajó!`, 'log-info', tgt); break;

    case 'poison':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info', src); }
      else if (tgt.type === 'poison' || tgt.type === 'steel' || tgt.type2 === 'poison' || tgt.type2 === 'steel') {
        addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info', tgt);
      } else {
        tgt.status = 'poison'; addLogFn(`¡${tgt.name} fue envenenado!`, 'log-info', tgt);
      }
      break;
    case 'paralyze':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info', src); }
      else if (tgt.type === 'electric' || tgt.type2 === 'electric') {
        addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info', tgt);
      } else {
        tgt.status = 'paralysis'; addLogFn(`¡${tgt.name} fue paralizado!`, 'log-info', tgt);
      }
      break;
    case 'burn':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info', src); }
      else if (tgt.type === 'fire' || tgt.type2 === 'fire') {
        addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info', tgt);
      } else {
        tgt.status = 'burn'; addLogFn(`¡${tgt.name} fue quemado!`, 'log-info', tgt);
      }
      break;
    case 'sleep':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info', src); }
      else {
        tgt.status = 'sleep';
        tgt.sleepTurns = 1 + Math.floor(Math.random() * 3);
        addLogFn(`¡${tgt.name} se quedó dormido!`, 'log-info', tgt);
      }
      break;
    
    case 'confusion':
      if (tgt.confused) { addLogFn('¡Pero falló!', 'log-info', src); }
      else {
        tgt.confused = 2 + Math.floor(Math.random() * 4);
        addLogFn(`¡${tgt.name} está confundido!`, 'log-info', tgt);
      }
      break;

    case 'sun': 
      if (b) {
        b.weather = { type: 'sun', turns: 5 }; 
        addLogFn("¡El sol empezó a brillar con fuerza!", 'log-info', src);
      }
      break;
    case 'rain': 
      if (b) {
        b.weather = { type: 'rain', turns: 5 }; 
        addLogFn("¡Empezó a llover!", 'log-info', src);
      }
      break;
    case 'hail': 
      if (b) {
        b.weather = { type: 'hail', turns: 5 }; 
        addLogFn("¡Empezó a granizar!", 'log-info', src);
      }
      break;
    case 'sandstorm': 
      if (b) {
        b.weather = { type: 'sandstorm', turns: 5 }; 
        addLogFn("¡Empezó una tormenta de arena!", 'log-info', src);
      }
      break;
    
    case 'reflect':
      if (srcStages.reflect) { addLogFn("¡Pero falló!", 'log-info', src); }
      else {
        srcStages.reflect = 5;
        addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques físicos!`, 'log-info', src);
      }
      break;
    case 'light_screen':
      if (srcStages.lightScreen) { addLogFn("¡Pero falló!", 'log-info', src); }
      else {
        srcStages.lightScreen = 5;
        addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques especiales!`, 'log-info', src);
      }
      break;
  }
}
