/**
 * Move Effects logic (Buffs, Debuffs, Weather, Field).
 */

export function applyMoveEffect(effect, src, tgt, srcStages, tgtStages, addLogFn, options = {}) {
  const { state, b } = options;
  
  switch (effect) {
    case 'atk+1': 
      srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
      addLogFn(`¡El Ataque de ${src.name} subió!`, 'log-info'); break;
    case 'def+1': 
      srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
      addLogFn(`¡La Defensa de ${src.name} subió!`, 'log-info'); break;
    case 'spa+1': 
      srcStages.spa = Math.min(6, (srcStages.spa || 0) + 1);
      addLogFn(`¡El At. Esp de ${src.name} subió!`, 'log-info'); break;
    case 'spd+1': 
      srcStages.spd = Math.min(6, (srcStages.spd || 0) + 1);
      addLogFn(`¡La Def. Esp de ${src.name} subió!`, 'log-info'); break;
    case 'spe+1': 
      srcStages.spe = Math.min(6, (srcStages.spe || 0) + 1);
      addLogFn(`¡La Velocidad de ${src.name} subió!`, 'log-info'); break;
    
    case 'atk-1': 
      tgtStages.atk = Math.max(-6, (tgtStages.atk || 0) - 1);
      addLogFn(`¡El Ataque de ${tgt.name} bajó!`, 'log-info'); break;
    case 'def-1': 
      tgtStages.def = Math.max(-6, (tgtStages.def || 0) - 1);
      addLogFn(`¡La Defensa de ${tgt.name} bajó!`, 'log-info'); break;
    case 'spe-1': 
      tgtStages.spe = Math.max(-6, (tgtStages.spe || 0) - 1);
      addLogFn(`¡La Velocidad de ${tgt.name} bajó!`, 'log-info'); break;

    case 'poison':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info'); }
      else if (tgt.type === 'poison' || tgt.type === 'steel' || tgt.type2 === 'poison' || tgt.type2 === 'steel') {
        addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info');
      } else {
        tgt.status = 'poison'; addLogFn(`¡${tgt.name} fue envenenado!`, 'log-info');
      }
      break;
    case 'paralyze':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info'); }
      else if (tgt.type === 'electric' || tgt.type2 === 'electric') {
        addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info');
      } else {
        tgt.status = 'paralyze'; addLogFn(`¡${tgt.name} fue paralizado!`, 'log-info');
      }
      break;
    case 'burn':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info'); }
      else if (tgt.type === 'fire' || tgt.type2 === 'fire') {
        addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info');
      } else {
        tgt.status = 'burn'; addLogFn(`¡${tgt.name} fue quemado!`, 'log-info');
      }
      break;
    case 'sleep':
      if (tgt.status) { addLogFn('¡Pero falló!', 'log-info'); }
      else {
        tgt.status = 'sleep';
        tgt.sleepTurns = 1 + Math.floor(Math.random() * 3);
        addLogFn(`¡${tgt.name} se quedó dormido!`, 'log-info');
      }
      break;
    
    case 'confusion':
      if (tgt.confused) { addLogFn('¡Pero falló!', 'log-info'); }
      else {
        tgt.confused = 2 + Math.floor(Math.random() * 4);
        addLogFn(`¡${tgt.name} está confundido!`, 'log-info');
      }
      break;

    case 'sun': 
      if (b) {
        b.weather = { type: 'sun', turns: 5 }; 
        addLogFn("¡El sol empezó a brillar con fuerza!", 'log-info');
      }
      break;
    case 'rain': 
      if (b) {
        b.weather = { type: 'rain', turns: 5 }; 
        addLogFn("¡Empezó a llover!", 'log-info');
      }
      break;
    
    case 'reflect':
      if (srcStages.reflect) { addLogFn("¡Pero falló!", 'log-info'); }
      else {
        srcStages.reflect = 5;
        addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques físicos!`, 'log-info');
      }
      break;
    case 'light_screen':
      if (srcStages.lightScreen) { addLogFn("¡Pero falló!", 'log-info'); }
      else {
        srcStages.lightScreen = 5;
        addLogFn(`¡Un muro de luz protege a ${src.name} contra ataques especiales!`, 'log-info');
      }
      break;
  }
}
