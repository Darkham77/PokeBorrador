
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages, LogFn } from '@/types/battle/battle';

import type { BattleContext } from '@/types/battle/battleContext';

export type MoveAction = (
  src: Pokemon, 
  tgt: Pokemon, 
  srcStages: BattleStages, 
  tgtStages: BattleStages, 
  addLogFn: LogFn, 
  battleCtx?: BattleContext
) => void;

export const STATUS_ACTIONS: Record<string, MoveAction> = {
  'burn': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'fire' || tgt.type2 === 'fire') {
      addLogFn(`¡${tgt.name} es inmune a las quemaduras!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'brn';
    addLogFn(`¡${tgt.name} fue quemado!`, 'log-info', tgt);
  },
  
  'paralyze': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.ability === 'limber') {
      addLogFn(`¡La Flexibilidad de ${tgt.name} evitó la parálisis!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'par';
    addLogFn(`¡${tgt.name} fue paralizado!`, 'log-info', tgt);
  },
  
  'poison': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') {
      addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info', tgt);
      return;
    }
    if (tgt.ability === 'immunity') {
      addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'psn';
    addLogFn(`¡${tgt.name} fue envenenado!`, 'log-info', tgt);
  },
  
  'bad_poison': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'poison' || tgt.type2 === 'poison' || tgt.type === 'steel' || tgt.type2 === 'steel') {
      addLogFn(`¡${tgt.name} es inmune al veneno!`, 'log-info', tgt);
      return;
    }
    if (tgt.ability === 'immunity') {
      addLogFn(`¡La Inmunidad de ${tgt.name} evitó el envenenamiento!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'tox';
    tgt.badPoison = 1;
    addLogFn(`¡${tgt.name} fue gravemente envenenado!`, 'log-info', tgt);
  },
  
  'sleep': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.ability === 'insomnia' || tgt.ability === 'vitalspirit') {
      addLogFn(`¡${tgt.name} tiene una habilidad que le impide dormir!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'slp';
    tgt.sleepTurns = 1 + Math.floor(Math.random() * 3);
    addLogFn(`¡${tgt.name} se quedó dormido!`, 'log-info', tgt);
  },
  
  'freeze': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.status) return;
    if (tgt.type === 'ice' || tgt.type2 === 'ice') {
      addLogFn(`¡${tgt.name} es inmune al congelamiento!`, 'log-info', tgt);
      return;
    }
    tgt.status = 'frz';
    addLogFn(`¡${tgt.name} fue congelado!`, 'log-info', tgt);
  },
  
  'confuse': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.confused) return;
    if (tgt.ability === 'owntempo') {
      addLogFn(`¡El Ritmo Propio de ${tgt.name} evitó la confusión!`, 'log-info', tgt);
      return;
    }
    tgt.confused = 2 + Math.floor(Math.random() * 4);
    addLogFn(`¡${tgt.name} está confundido!`, 'log-info', tgt);
  },
  
  'attract': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.attracted) return;
    if (tgt.ability === 'oblivious') {
      addLogFn(`¡El Despiste de ${tgt.name} evitó la atracción!`, 'log-info', tgt);
      return;
    }
    tgt.attracted = true;
    addLogFn(`¡${tgt.name} se ha enamorado de ${src.name}!`, 'log-info', tgt);
  },
  
  'curse': (src, tgt, srcStages, _tgtStages, addLogFn) => {
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
  
  'flinch': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    // No puede provocar retroceso si el objetivo ya atacó en este turno.
    // battleFlow.ts se encargará de limpiar el flag al inicio del siguiente turno.
    if (tgt.flinched) return;
    tgt.flinched = true;
    addLogFn(`¡${tgt.name} retrocedió y no puede atacar!`, 'log-info', tgt);
  },

  'heal_status_party': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (!battleCtx) return;
    const isPlayer = (src === battleCtx.player.value);
    const team = isPlayer ? (battleCtx.activeBattle.value?.playerTeam || []) : (battleCtx.activeBattle.value?.enemyTeam || []);
    
    team.forEach((p: Pokemon) => {
      p.status = '';
      p.sleepTurns = 0;
    });
    
    addLogFn(`¡Un aroma curativo rodeó al equipo de ${src.name}!`, 'log-info', src);
  },

  'yawn': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.status) {
      addLogFn("¡Pero falló!", 'log-info', tgt);
      return;
    }
    if (tgt.volatileCounters?.['yawn'] !== undefined) {
      addLogFn(`¡${tgt.name} ya tiene sueño!`, 'log-info', tgt);
      return;
    }
    if (!tgt.volatileCounters) {
      tgt.volatileCounters = {};
    }
    tgt.volatileCounters['yawn'] = 2;
    addLogFn(`¡${tgt.name} empezó a bostezar!`, 'log-info', tgt);
  }
};
