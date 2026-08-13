import {
  BATTLE_UI_EVENTS,
  type BattleFlowCompletedDetail,
  type BattleFlowDestination,
} from '@/types/battle/battleEvents';

export function emitBattleFlowCompleted(destination: BattleFlowDestination): void {
  if (typeof window === 'undefined') return;
  const detail: BattleFlowCompletedDetail = { destination };
  window.dispatchEvent(new CustomEvent(BATTLE_UI_EVENTS.FLOW_COMPLETED, { detail }));
}
