
/**
 * Módulo de Acciones de Estado (Status)
 * Gestiona la aplicación de quemaduras, parálisis, veneno, etc.
 */

export const STATUS_ACTIONS = {
  'burn': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.status) return;
    if (tgt.type === 'fire' || tgt.type2 === 'fire') {
      addLogFn(`¡${tgt.name} es inmune a las quemaduras!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'burn';
    addLogFn(`¡${tgt.name} fue quemado!`, 'log-info', tgt);
  },
  
  'paralyze': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.status) return;
    if (tgt.ability === 'Flexibilidad') {
      addLogFn(`¡La Flexibilidad de ${tgt.name} evitó la parálisis!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'paralyze';
    addLogFn(`¡${tgt.name} fue paralizado!`, 'log-info', tgt);
  },
  
  'poison': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.status) return;
    if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') {
      addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info', tgt);
      return;
    }
    if (tgt.ability === 'Inmunidad') {
      addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'poison';
    addLogFn(`¡${tgt.name} fue envenenado!`, 'log-info', tgt);
  },
  
  'bad_poison': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.status) return;
    if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') {
      addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info', tgt);
      return;
    }
    if (tgt.ability === 'Inmunidad') {
      addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'poison';
    tgt.badPoison = 1;
    addLogFn(`¡${tgt.name} fue gravemente envenenado!`, 'log-info', tgt);
  },
  
  'sleep': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.status) return;
    if (tgt.ability === 'Insomnio' || tgt.ability === 'Espíritu Vital') {
      addLogFn(`¡${tgt.name} tiene ${tgt.ability} y no puede dormir!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'sleep';
    tgt.sleepTurns = 1 + Math.floor(Math.random() * 3);
    addLogFn(`¡${tgt.name} se quedó dormido!`, 'log-info', tgt);
  },
  
  'freeze': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.status) return;
    if (tgt.type === 'ice' || tgt.type2 === 'ice') {
      addLogFn(`¡${tgt.name} es inmune al congelamiento!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'freeze';
    addLogFn(`¡${tgt.name} fue congelado!`, 'log-info', tgt);
  },
  
  'confuse': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.confused) return;
    if (tgt.ability === 'Ritmo Propio') {
      addLogFn(`¡El Ritmo Propio de ${tgt.name} evitó la confusión!`, 'log-info', tgt);
      return;
    }
    tgt.confused = 2 + Math.floor(Math.random() * 4);
    addLogFn(`¡${tgt.name} está confundido!`, 'log-info', tgt);
  },
  
  'attract': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.attracted) return;
    if (tgt.ability === 'Despiste') {
      addLogFn(`¡El Despiste de ${tgt.name} evitó la atracción!`, 'log-info', tgt);
      return;
    }
    tgt.attracted = true;
    addLogFn(`¡${tgt.name} se ha enamorado de ${src.name}!`, 'log-info', tgt);
  },
  
  'curse': (src: any, tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    const isGhost = (src.type === 'ghost' || src.type2 === 'ghost');
    
    if (isGhost) {
      if (tgt.cursed) {
        addLogFn("¡Pero falló!", 'log-info', src);
        return;
      }
      tgt.cursed = true;
      src.hp -= Math.floor(src.maxHp / 2);
      addLogFn(`¡${src.name} se sacrificó para maldecir a ${tgt.name}!`, 'log-info', src);
    } else {
      // No fantasma: +1 Atk, +1 Def, -1 Speed
      srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
      srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
      srcStages.spe = Math.max(-6, (srcStages.spe || 0) - 1);
      addLogFn(`¡${src.name} usó su propia energía para fortalecerse!`, 'log-info', src);
    }
  },
  
  'heal_status_party': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (!battleCtx) return;
    const isPlayer = (src === battleCtx.player);
    const team = isPlayer ? (battleCtx.playerTeam || []) : (battleCtx.enemyTeam || []);
    
    team.forEach((p: any) => {
      p.status = null;
      p.sleepTurns = 0;
    });
    
    addLogFn(`¡Un aroma curativo rodeó al equipo de ${src.name}!`, 'log-info', src);
  }
};
