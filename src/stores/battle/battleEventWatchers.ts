/**
 * src/stores/battle/battleEventWatchers.ts
 * 
 * Synchronizes battle state transitions with external UI/E2E custom events.
 */

import { watch, type Ref, type ComputedRef } from 'vue';
import { BATTLE_UI_EVENTS, type BattleForcedSwitchDetail, type BattleReadyForInputDetail } from '@/types/battle/battleEvents.ts';
import { BATTLE_STATES, BATTLE_SUBSTATES, createBattleStateMachine } from '@/logic/battle/battleStateMachine.ts';
import { classifyRequest, requiresAction } from '@/logic/battle/helpers/requestHelper.ts';
import { canExecuteScriptedReplayAction } from '@/logic/battle/helpers/scriptedReplayReadiness.ts';
import { isBattleCompletionReady } from '@/logic/battle/helpers/battleCompletionReadiness.ts';
import { nextBattleReadyEventKey } from '@/logic/battle/helpers/battleReadyEventKey.ts';
import { projectBattleReadySwitchSlots } from '@/logic/battle/helpers/battleReadySwitchSlots.ts';
import type { BattleState } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

export type BattleStateMachine = ReturnType<typeof createBattleStateMachine>;

export interface BattleEventWatchersContext {
  activeBattle: Ref<BattleState | null>;
  fsm: BattleStateMachine;
  player: ComputedRef<Pokemon | null | undefined>;
  isProcessing: Ref<boolean>;
  isIntroAnimating: Ref<boolean>;
}

export function setupBattleEventWatchers(ctx: BattleEventWatchersContext): void {
  const { activeBattle, fsm, player, isProcessing, isIntroAnimating } = ctx;

  let lastEmittedStateKey = '';
  let lastForcedSwitchUid = '';

  // 1. Forced switch event watcher
  watch(
    [fsm.currentState, fsm.currentSubState, player],
    ([state, subState, activePlayer]) => {
      const isForcedPlayerSwitch =
        state === BATTLE_STATES.ACTIVE_BATTLE &&
        subState === BATTLE_SUBSTATES.SWITCH_MENU &&
        !!activePlayer &&
        activePlayer.hp <= 0;
      if (!isForcedPlayerSwitch) {
        lastForcedSwitchUid = '';
        return;
      }
      if (lastForcedSwitchUid === activePlayer.uid || typeof window === 'undefined') return;
      lastForcedSwitchUid = activePlayer.uid;
      const detail: BattleForcedSwitchDetail = { side: 'player' };
      window.dispatchEvent(new CustomEvent<BattleForcedSwitchDetail>(BATTLE_UI_EVENTS.FORCED_SWITCH_REQUIRED, { detail }));
    },
  );

  // 2. Ready for input event watcher
  watch(
    [
      fsm.currentSubState,
      isProcessing,
      isIntroAnimating,
      () => activeBattle.value?.playerRequest,
      () => activeBattle.value?.enemyRequest,
      () => activeBattle.value?.turnCount,
      () => activeBattle.value?.player?.hp,
    ],
    ([subState, processing, intro]) => {
      const req = activeBattle.value?.playerRequest;
      const enemyReq = activeBattle.value?.enemyRequest;
      if (processing || intro || fsm.currentState.value !== BATTLE_STATES.ACTIVE_BATTLE || (!req && !enemyReq) || activeBattle.value?.over) {
        lastEmittedStateKey = '';
        return;
      }
      const isInputSubState = subState === BATTLE_SUBSTATES.WAIT_INPUT || subState === BATTLE_SUBSTATES.SWITCH_MENU;
      if (!isInputSubState) {
        lastEmittedStateKey = nextBattleReadyEventKey(lastEmittedStateKey, false, '') ?? '';
        return;
      }
      if (
        fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE &&
        (req || enemyReq)
      ) {
        const p1NeedsAction = requiresAction(req);
        const anySeatNeedsAction = [req, enemyReq].some(r => requiresAction(r));
        if (!anySeatNeedsAction) return;

        const kind = p1NeedsAction ? classifyRequest(req) : classifyRequest(enemyReq);
        const hasPendingSwitch = Boolean(Reflect.get(activeBattle.value!, 'switchingToPlayer')) || Boolean(Reflect.get(activeBattle.value!, 'switchingToEnemy'));

        const activePoke = activeBattle.value?.player;
        const isMoveReady = kind !== 'move' || !p1NeedsAction || (!!activePoke && activePoke.hp > 0);
        const isReady = (kind === 'team-preview' || canExecuteScriptedReplayAction({
          isActiveBattle: fsm.currentState.value === BATTLE_STATES.ACTIVE_BATTLE,
          subState,
          isProcessing: processing,
          isIntroAnimating: intro,
          hasPendingSwitch,
          hasPendingPlayerAction: p1NeedsAction,
        })) && isMoveReady;

        if (isReady && typeof window !== 'undefined') {
          const p1Idx = window.__VITE_DEBUG__?.p1ChoiceIdx ?? 0;
          const p2Idx = window.__VITE_DEBUG__?.p2ChoiceIdx ?? 0;
          const reqRqid = (req as { rqid?: number } | undefined)?.rqid ?? 0;
          const turnCount = activeBattle.value?.turnCount ?? 0;
          const emitKey = `${subState}_${kind}_${p1Idx}_${p2Idx}_${reqRqid}_${turnCount}`;
          const nextKey = nextBattleReadyEventKey(lastEmittedStateKey, true, emitKey);
          if (nextKey === null) return;
          lastEmittedStateKey = nextKey;

          const detail: BattleReadyForInputDetail = {
            subState: subState ?? '',
            p1ChoiceIdx: p1Idx,
            p2ChoiceIdx: p2Idx,
            over: false,
            playerSwitchSlots: projectBattleReadySwitchSlots(req),
          };
          window.dispatchEvent(
            new CustomEvent<BattleReadyForInputDetail>(BATTLE_UI_EVENTS.READY_FOR_INPUT, {
              detail,
            })
          );
        }
      }
    }
  );

  // 3. Battle Over event watcher
  watch(
    [() => activeBattle.value?.over, fsm.currentState, fsm.currentSubState],
    ([isOver, fsmState, fsmSubState]) => {
      if (typeof window !== 'undefined' && isBattleCompletionReady({
        hasActiveBattle: activeBattle.value !== null,
        isOver: isOver === true,
        fsmState,
        fsmSubState,
      })) {
        const detail: BattleReadyForInputDetail = {
          subState: '',
          p1ChoiceIdx: window.__VITE_DEBUG__?.p1ChoiceIdx ?? 0,
          p2ChoiceIdx: window.__VITE_DEBUG__?.p2ChoiceIdx ?? 0,
          over: true,
          playerSwitchSlots: [],
        };
        window.dispatchEvent(
          new CustomEvent<BattleReadyForInputDetail>(BATTLE_UI_EVENTS.READY_FOR_INPUT, {
            detail,
          })
        );
      }
    }
  );
}
