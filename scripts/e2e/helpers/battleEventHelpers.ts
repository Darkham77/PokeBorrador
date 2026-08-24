// fallow-ignore-file security-sink
import { type Page } from '@playwright/test';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';
import { BATTLE_UI_EVENTS, type BattleForcedSwitchDetail, type BattleReadyForInputDetail } from '../../../src/types/battle/battleEvents.ts';
import { GAME_UI_EVENTS, type GameStoreReadyDetail } from '../../../src/types/system/gameEvents.ts';

export type WindowWithResolver = Window;

export async function armBattleFlowCompletion(page: Page): Promise<void> {
  await page.evaluate((eventName) => {
    if (window.__E2E_BATTLE_FLOW_COMPLETION__) {
      throw new Error('[E2E] A battle-flow completion listener is already armed.');
    }
    window.__E2E_BATTLE_FLOW_COMPLETION__ = new Promise<void>((resolve, reject) => {
      window.addEventListener(eventName, (event) => {
        if (!(event instanceof CustomEvent)) {
          reject(new Error('[E2E] battle-flow-completed must be a CustomEvent.'));
          return;
        }
        const detail = event.detail as Record<string, unknown> | null; // open-record
        if (typeof detail !== 'object' || detail === null || !('destination' in detail) || detail.destination !== 'map') {
          reject(new Error('[E2E] battle-flow-completed has an invalid detail payload.'));
          return;
        }
        resolve();
      }, { once: true });
    });
  }, BATTLE_UI_EVENTS.FLOW_COMPLETED);
}

export async function awaitBattleFlowCompletion(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const completion = window.__E2E_BATTLE_FLOW_COMPLETION__;
    if (!completion) {
      throw new Error('[E2E] Battle-flow completion was awaited without an armed event listener.');
    }
    try {
      await completion;
    } finally {
      delete window.__E2E_BATTLE_FLOW_COMPLETION__;
    }
  });
}

export async function armBattleReadyForInput(page: Page, timeoutMs = MAX_PER_ACTION_TIMEOUT_MS): Promise<void> {
  await page.evaluate(({ tMs }) => {
    if (window.__E2E_BATTLE_READY_FOR_INPUT__) {
      throw new Error('[E2E] A battle-ready-for-input listener is already armed.');
    }
    const debug = window.__VITE_DEBUG__;
    if (debug?.waitForBattleReady) {
      window.__E2E_BATTLE_READY_FOR_INPUT__ = debug.waitForBattleReady(tMs, { skipImmediate: true });
      return;
    }
    throw new Error('[E2E] debug.waitForBattleReady is missing.');
  }, { tMs: timeoutMs });
}

export async function awaitBattleReadyForInput(page: Page, timeoutMs = MAX_PER_ACTION_TIMEOUT_MS): Promise<BattleReadyForInputDetail> {
  const result = await page.evaluate(async (tMs) => {
    const ready = window.__E2E_BATTLE_READY_FOR_INPUT__;
    if (ready) {
      try {
        return await ready;
      } finally {
        delete window.__E2E_BATTLE_READY_FOR_INPUT__;
      }
    }
    const debugObj = window.__VITE_DEBUG__;
    if (debugObj?.waitForBattleReady) {
      return await debugObj.waitForBattleReady(tMs);
    }
    throw new Error('[E2E] Battle ready-for-input was awaited without an armed event listener.');
  }, timeoutMs);
  return result as BattleReadyForInputDetail;
}

export async function armBattleForcedSwitch(page: Page): Promise<void> {
  await page.evaluate((eventName) => {
    if (window.__E2E_BATTLE_FORCED_SWITCH__) {
      throw new Error('[E2E] A battle forced-switch listener is already armed.');
    }
    window.__E2E_BATTLE_FORCED_SWITCH__ = new Promise<BattleForcedSwitchDetail>((resolve, reject) => {
      window.addEventListener(eventName, (event) => {
        if (!(event instanceof CustomEvent)) {
          reject(new Error(`[E2E] ${eventName} must be a CustomEvent.`));
          return;
        }
        const detail = event.detail as BattleForcedSwitchDetail | null;
        if (!detail || detail.side !== 'player') {
          reject(new Error(`[E2E] ${eventName} has an invalid detail payload.`));
          return;
        }
        resolve(detail);
      }, { once: true });
    });
  }, BATTLE_UI_EVENTS.FORCED_SWITCH_REQUIRED);
}

export async function awaitBattleForcedSwitch(page: Page): Promise<BattleForcedSwitchDetail> {
  return await page.evaluate(async () => {
    const forcedSwitch = window.__E2E_BATTLE_FORCED_SWITCH__;
    if (!forcedSwitch) {
      throw new Error('[E2E] Forced switch was awaited without an armed event listener.');
    }
    try {
      return await forcedSwitch;
    } finally {
      delete window.__E2E_BATTLE_FORCED_SWITCH__;
    }
  });
}

export async function armGameStoreReady(page: Page): Promise<void> {
  await page.evaluate((eventName) => {
    if (window.__E2E_GAME_STORE_READY__) {
      return;
    }
    window.__E2E_GAME_STORE_READY__ = new Promise<GameStoreReadyDetail>((resolve, reject) => {
      window.addEventListener(eventName, (event) => {
        if (!(event instanceof CustomEvent)) {
          reject(new Error(`[E2E] ${eventName} must be a CustomEvent.`));
          return;
        }
        const detail = event.detail as GameStoreReadyDetail | null;
        if (!detail || detail.ready !== true) {
          reject(new Error(`[E2E] ${eventName} has an invalid detail payload.`));
          return;
        }
        resolve(detail);
      }, { once: true });
    });
  }, GAME_UI_EVENTS.STORE_READY);
}

export async function awaitGameStoreReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const ready = window.__E2E_GAME_STORE_READY__;
    if (!ready) {
      throw new Error('[E2E] Game store readiness was awaited without an armed event listener.');
    }
    try {
      await ready;
    } finally {
      delete window.__E2E_GAME_STORE_READY__;
    }
  });
}

export async function waitForWaitInput(page: Page): Promise<void> {
  try {
    await page.waitForFunction(() => {
      const resolver = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__;
      if (!resolver) return false;
      const store = resolver();
      if (!store) return false;
      if (!store.state) return false;
      if (store.state.over || store.currentFsmState === 'REWARDS_PHASE' || store.currentFsmState === 'EXIT_BATTLE') return true;
      return !store.isProcessing && store.currentFsmState === 'ACTIVE_BATTLE' &&
        (store.currentSubState === 'WAIT_INPUT' || store.currentSubState === 'SWITCH_MENU');
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (error: unknown) {
    const battleState = await page.evaluate(() => {
      const store = (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.();
      return {
        fsm: store?.currentFsmState,
        subState: store?.currentSubState,
        isProcessing: store?.isProcessing,
        isOver: store?.state?.over,
        hasActiveRequest: Boolean(store?.state?.playerRequest?.active),
        hasForcedSwitch: Boolean(store?.state?.playerRequest?.forceSwitch),
        workerInitError: (window as WindowWithResolver).__VITE_DEBUG__?.lastWorkerInitError,
        workerInitStage: (window as WindowWithResolver).__VITE_DEBUG__?.lastWorkerInitStage
      };
    });
    const recentBrowserLogs = (page as { _e2eLogBuffer?: string[] })._e2eLogBuffer?.slice(-20) ?? [];
    throw new Error(
      `[E2E] Battle did not reach an input-ready FSM state: ${JSON.stringify(battleState)}. Recent browser logs: ${JSON.stringify(recentBrowserLogs)}`,
      { cause: error }
    );
  }
}

export async function waitForBattleReadyEvent(page: Page, batchIndex: number, turnCount: number): Promise<{ subState: string; p1ChoiceIdx: number; p2ChoiceIdx: number; over: boolean }> {
  try {
    const detail = await page.evaluate(async (timeoutMs) => {
      const debug = window.__VITE_DEBUG__;
      if (debug?.waitForBattleReady) {
        return await debug.waitForBattleReady(timeoutMs);
      }
      return null;
    }, MAX_PER_ACTION_TIMEOUT_MS);

    if (!detail) {
      throw new Error(`[E2E-EVENT-TIMEOUT] Batch #${batchIndex} Turn ${turnCount}: window.__VITE_DEBUG__.waitForBattleReady is not available`);
    }
    return detail;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[E2E-EVENT-TIMEOUT] Batch #${batchIndex} Turn ${turnCount}: Failed awaiting battle-ready-for-input event: ${msg}`);
  }
}
