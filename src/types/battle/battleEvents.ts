import { isBattleSubStateName, type BattleSubStateName } from '@/logic/battle/battleStateMachine.ts';
import { CERTIFIED_BATTLE_TEAM_SLOTS, type CertifiedBattleTeamSlot } from './certifiedBattleActions.ts';

export const BATTLE_UI_EVENTS = {
  FLOW_COMPLETED: 'battle-flow-completed',
  FORCED_SWITCH_REQUIRED: 'battle-forced-switch-required',
  READY_FOR_INPUT: 'battle-ready-for-input',
} as const;

export type BattleUiEventName = typeof BATTLE_UI_EVENTS[keyof typeof BATTLE_UI_EVENTS];

export const BATTLE_FLOW_DESTINATIONS = ['map', 'search'] as const;
export type BattleFlowDestination = (typeof BATTLE_FLOW_DESTINATIONS)[number];

export interface BattleFlowCompletedDetail {
  destination: BattleFlowDestination;
}

export interface BattleForcedSwitchDetail {
  side: 'player';
}

export type BattleReadySubState = BattleSubStateName | '';

export interface BattleReadySwitchSlot {
  showdownSlot: CertifiedBattleTeamSlot;
  pokemonUid: string; // domain-ok
}

export interface BattleReadyForInputDetail {
  subState: BattleReadySubState;
  p1ChoiceIdx: number;
  p2ChoiceIdx: number;
  over: boolean;
  playerSwitchSlots: BattleReadySwitchSlot[];
}

export function isBattleReadyForInputDetail(value: unknown): value is BattleReadyForInputDetail {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>; // open-record
  if (!('subState' in obj) || !('p1ChoiceIdx' in obj) || !('p2ChoiceIdx' in obj) || !('over' in obj) || !('playerSwitchSlots' in obj)) return false;

  const { subState, p1ChoiceIdx, p2ChoiceIdx, over, playerSwitchSlots } = obj;
  return typeof subState === 'string' &&
    (subState === '' || isBattleSubStateName(subState)) &&
    typeof p1ChoiceIdx === 'number' &&
    typeof p2ChoiceIdx === 'number' &&
    typeof over === 'boolean' &&
    Array.isArray(playerSwitchSlots) &&
    playerSwitchSlots.every((slot) => {
      if (typeof slot !== 'object' || slot === null) return false;
      const s = slot as Record<string, unknown>; // open-record
      return 'showdownSlot' in s &&
        CERTIFIED_BATTLE_TEAM_SLOTS.some((candidate) => candidate === s.showdownSlot) &&
        'pokemonUid' in s &&
        typeof s.pokemonUid === 'string' &&
        s.pokemonUid.length > 0;
    });
}
