/**
 * Módulo de Acciones de Estado (Status)
 * Gestiona la aplicación de quemaduras, parálisis, veneno, etc.
 */

export const STATUS_ACTIONS = {
  'burn': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'fire' || tgt.type2 === 'fire') {
      addLogFn(`¡${tgt.name} es inmune a las quemaduras!`, 'log-info');
      return;
    }
    tgt.status = 'burn';
    addLogFn(`¡${tgt.name} fue quemado!`, 'log-info');
  },
  
  'paralyze': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.ability === 'Flexibilidad') {
      addLogFn(`¡La Flexibilidad de ${tgt.name} evitó la parálisis!`, 'log-info');
      return;
    }
    tgt.status = 'paralyze';
    addLogFn(`¡${tgt.name} fue paralizado!`, 'log-info');
  },
  
  'poison': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') {
      addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info');
      return;
    }
    if (tgt.ability === 'Inmunidad') {
      addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info');
      return;
    }
    tgt.status = 'poison';
    addLogFn(`¡${tgt.name} fue envenenado!`, 'log-info');
  },
  
  'bad_poison': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') {
      addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info');
      return;
    }
    if (tgt.ability === 'Inmunidad') {
      addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info');
      return;
    }
    tgt.status = 'poison';
    tgt.badPoison = 1;
    addLogFn(`¡${tgt.name} fue gravemente envenenado!`, 'log-info');
  },
  
  'sleep': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.ability === 'Insomnio' || tgt.ability === 'Espíritu Vital') {
      addLogFn(`¡${tgt.name} tiene ${tgt.ability} y no puede dormir!`, 'log-info');
      return;
    }
    tgt.status = 'sleep';
    tgt.sleepTurns = 1 + Math.floor(Math.random() * 3);
    addLogFn(`¡${tgt.name} se quedó dormido!`, 'log-info');
  },
  
  'freeze': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'ice' || tgt.type2 === 'ice') {
      addLogFn(`¡${tgt.name} es inmune al congelamiento!`, 'log-info');
      return;
    }
    tgt.status = 'freeze';
    addLogFn(`¡${tgt.name} fue congelado!`, 'log-info');
  },
  
  'confuse': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.confused) return;
    if (tgt.ability === 'Ritmo Propio') {
      addLogFn(`¡El Ritmo Propio de ${tgt.name} evitó la confusión!`, 'log-info');
      return;
    }
    tgt.confused = 2 + Math.floor(Math.random() * 4);
    addLogFn(`¡${tgt.name} está confundido!`, 'log-info');
  },
  
  'attract': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.attracted) return;
    if (tgt.ability === 'Despiste') {
      addLogFn(`¡El Despiste de ${tgt.name} evitó la atracción!`, 'log-info');
      return;
    }
    tgt.attracted = true;
    addLogFn(`¡${tgt.name} se ha enamorado de ${src.name}!`, 'log-info');
  },
  
  'ghost_curse': (src, tgt, srcStages, tgtStages, addLogFn) => {
    if (tgt.cursed) return;
    tgt.cursed = true;
    src.hp -= Math.floor(src.maxHp / 2);
    addLogFn(`¡${src.name} se sacrificó para maldecir a ${tgt.name}!`, 'log-info');
  }
};
