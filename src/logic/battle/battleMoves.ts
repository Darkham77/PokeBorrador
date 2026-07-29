import type { MoveEffect, Pokemon } from '@/types/pokemon/pokemon';
import type { BattleStages, LogFn, BattleState } from '@/types/battle/battle';

type BattleStageStatKey = keyof Pick<BattleStages, 'atk' | 'def' | 'spa' | 'spd' | 'spe'>;

function requireBattleStageStatKey(stat: MoveEffect['stat']): BattleStageStatKey {
  if (stat === 'atk' || stat === 'def' || stat === 'spa' || stat === 'spd' || stat === 'spe') return stat;
  throw new Error(`[battleMoves] Invalid battle stage stat: ${stat}`);
}

function applyStructuredMoveEffect(effect: MoveEffect, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, b?: BattleState | null): void {
  if (effect.text) addLogFn(effect.text, 'log-info', src);

  if (effect.type === 'status' && effect.status) {
    if (tgt.status) {
      addLogFn('¡Pero falló!', 'log-info', src);
      return;
    }
    tgt.status = effect.status;
    addLogFn(`¡${tgt.name} sufrió un problema de estado!`, 'log-info', tgt);
    return;
  }

  if (effect.type === 'stat' && effect.stat && effect.stages) {
    const stat = requireBattleStageStatKey(effect.stat);
    const targetStages = effect.stages > 0 ? srcStages : tgtStages;
    const target = effect.stages > 0 ? src : tgt;
    targetStages[stat] = Math.max(-6, Math.min(6, (targetStages[stat] || 0) + effect.stages));
    addLogFn(`¡Las estadísticas de ${target.name} cambiaron!`, 'log-info', target);
    return;
  }

  if (effect.type === 'confuse') {
    if (tgt.confused) {
      addLogFn('¡Pero falló!', 'log-info', src);
    } else {
      tgt.confused = 2 + Math.floor(Math.random() * 4);
      addLogFn(`¡${tgt.name} está confundido!`, 'log-info', tgt);
    }
    return;
  }

  if (effect.type === 'recharge') {
    if (!src.volatileCounters) src.volatileCounters = {};
    src.volatileCounters.mustrecharge = 1;
    return;
  }

  if (effect.type === 'trap') {
    tgt.trapped = true;
    return;
  }

  if (effect.type === 'heal' && effect.percent) {
    src.hp = Math.min(src.maxHp, src.hp + Math.floor(src.maxHp * effect.percent));
    addLogFn(`¡${src.name} recuperó PS!`, 'log-info', src);
    return;
  }

  if (effect.type === 'fixed' && effect.val) {
    tgt.hp = Math.max(0, tgt.hp - effect.val);
    return;
  }

  if (effect.type === 'multi' || effect.type === 'drain' || effect.type === 'recoil' || effect.type === 'flinch') {
    return;
  }

  if (b && effect.type === 'status' && effect.status === '') {
    b.weather = { type: 'clear', turns: 0 };
  }
}

export function applyMoveEffect(effect: MoveEffect | MoveEffect[] | null | undefined, src: Pokemon, tgt: Pokemon, srcStages: BattleStages, tgtStages: BattleStages, addLogFn: LogFn, options: { b?: BattleState | null } = {}) {
  const { b } = options;
  if (!effect) return;
  const effects = Array.isArray(effect) ? effect : [effect];
  for (const item of effects) {
    applyStructuredMoveEffect(item, src, tgt, srcStages, tgtStages, addLogFn, b);
  }
}
