import { useBattleStore } from '@/stores/battle'
import { MOVE_DATA } from '@/data/moves'
import { 
  calculateDamage, 
  getTypeEffectiveness, 
  calculateCatchRate,
  getStatMultiplier,
  getAccuracyMultiplier,
  getEffectiveSpeed
} from '@/logic/battle/battleEngine.js';
import { 
  tickStatus, 
  tickLeechSeed 
} from '@/logic/battle/battleStatus.js';
import { 
  handleEntryAbilities, 
  applyAbilityEffects,
  checkAbilityImmunity
} from '@/logic/battle/battleAbilities.js';
import { applyMoveEffect } from '@/logic/battle/battleMoves.js';
import { getBestEnemyMove } from '@/logic/battle/battleAI.js';

export function initBattleBridge() {
  const battleStore = useBattleStore()

  // Data & Engine Bindings
  window.calculateDamage = (a, d, m, c) => calculateDamage(a, d, m, c);
  window.calcDamage = (a, d, m, atkS, defS) => {
    return calculateDamage(a, d, m, { atkStages: atkS, defStages: defS });
  };
  window.getTypeEffectiveness = getTypeEffectiveness;
  window.calculateCatchRate = calculateCatchRate;
  window.getStatMultiplier = getStatMultiplier;
  window.stageMult = getStatMultiplier;
  window.getAccuracyMultiplier = getAccuracyMultiplier;
  
  window.getEffectiveSpeed = (p, s) => {
    return getEffectiveSpeed(p, s, { 
      getStatMultiplier, 
      getDayCycle: window.getDayCycle 
    });
  };

  // Status & Ability Bindings
  window.tickStatus = tickStatus;
  window.tickLeechSeed = (p, r, b, log) => tickLeechSeed(p, r, b, log, window.state);
  
  window.checkAbilityImmunity = (a, d, m, log, b) => {
    return checkAbilityImmunity(a, d, m, MOVE_DATA, log, { 
      b, 
      enemyStages: b?.enemyStages, 
      playerStages: b?.playerStages 
    });
  };

  window.handleEntryAbilities = handleEntryAbilities;
  window.applyAbilityEffects = (a, d, m, dr, log) => {
    return applyAbilityEffects(a, d, m, dr, MOVE_DATA, log);
  };

  window.applyMoveEffect = (e, s, t, ss, ts, log) => {
    return applyMoveEffect(e, s, t, ss, ts, log, { b: window.state?.battle });
  };

  window.getBestEnemyMove = (e, t, ts) => {
    return getBestEnemyMove(e, t, ts, { MOVE_DATA, getTypeEffectiveness });
  };

  // UI Bridge Bindings
  window.setLog = (msg, cls = 'log-info') => {
    battleStore.clearLogs()
    battleStore.addLog(msg, cls)
  }
  window.addLog = (msg, cls = '') => {
    battleStore.addLog(msg, cls)
  }

  window.updateBattleUI = () => {
    console.log('[BattleBridge] Syncing Vue UI (Reactive-First)');
    if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
  }

  window.setBattleSprite = (side, pokemonId, useBack) => {
    // Managed reactively by BattleArena.vue
  }

  window.updateBattleMoves = () => {
    if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
  }

  window.renderMoveButtons = () => {
    if (typeof window.triggerVueSync === 'function') window.triggerVueSync()
  }

  window.showBattleEndUI = (callback, locId, isDraw) => {
    console.log('[BattleBridge] Battle End Flow Started');
    battleStore.setFinishing(callback);
    
    if (typeof window.hatchEggs === 'function') window.hatchEggs();
    if (typeof window.scheduleSave === 'function') window.scheduleSave();
  }
}
