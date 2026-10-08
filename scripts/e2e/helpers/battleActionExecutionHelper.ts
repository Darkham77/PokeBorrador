import type { Page } from '@playwright/test';
import { MAX_PER_ACTION_TIMEOUT_MS } from '../simulation_config.ts';
import {
  armBattleReadyForInput,
  awaitBattleReadyForInput,
  armBattleFlowCompletion,
  awaitBattleFlowCompletion,
  clickResilient,
  type WindowWithResolver
} from '../e2e_helpers.ts';
import type { BattleReadyForInputDetail } from '../../../src/types/battle/battleEvents.ts';
import type { ItemId } from '../../../src/data/inventory/items.ts';

const THROW_BALL_TIMEOUT_MULTIPLIER = 2;

/** Shape returned by getBattleStoreState — covers the active pokémon and bench. */
export interface BattleStoreSnapshot {
  activePlayerName: string;
  activePlayerUid: string;
  playerHp: number;
  playerMaxHp: number;
  playerStatus: string | null;
  playerTeam: Array<{ uid: string; name: string; hp: number; maxHp: number; status: string | null }>;
}

interface EvaluatedTeamPokemonMember {
  uid?: string;
  name?: string;
  hp?: number;
  maxHp?: number;
  status?: string | null;
}

export async function getPlayerHpHelper(page: Page): Promise<number> {
  return await page.evaluate(() => (window as WindowWithResolver).__VITE_DEBUG_STORE_RESOLVER__?.().state?.player?.hp ?? 0);
}

export async function getPlayerHpInfoHelper(page: Page): Promise<{ hp: number; maxHp: number }> {
  return await page.evaluate(async () => {
    const debug = window.__VITE_DEBUG__ as {
      useBattleStore?: () => { player?: { hp?: number; maxHp?: number }; state?: { player?: { hp?: number; maxHp?: number } } };
      useGameStore?: () => { state?: { team?: Array<{ hp?: number; maxHp?: number }> } };
    } | undefined;
    const battleStore = debug?.useBattleStore?.();
    const gameStore = debug?.useGameStore?.();
    const player = battleStore?.player || battleStore?.state?.player;
    const team0 = gameStore?.state?.team?.[0];
    return { hp: player?.hp ?? team0?.hp ?? 0, maxHp: player?.maxHp ?? team0?.maxHp ?? 1 };
  });
}

export async function getBattleStoreStateHelper(page: Page): Promise<BattleStoreSnapshot | null> {
  return await page.evaluate(async () => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const store = useBattleStore();
    const gameStore = useGameStore();

    const bState = store?.state && typeof store.state === 'object' && 'value' in store.state
      ? (store.state as { value?: { player?: { name?: string; uid?: string; hp?: number; maxHp?: number; status?: string | null }; playerTeam?: Array<{ uid?: string; name?: string; hp?: number; maxHp?: number; status?: string | null }> } }).value
      : (store?.state as { player?: { name?: string; uid?: string; hp?: number; maxHp?: number; status?: string | null }; playerTeam?: Array<{ uid?: string; name?: string; hp?: number; maxHp?: number; status?: string | null }> } | undefined);
    if (!bState) return null;
    const team = (gameStore.state?.team && gameStore.state.team.length > 0)
      ? gameStore.state.team
      : (bState.playerTeam || []);
    return {
      activePlayerName: bState.player?.name ?? '',
      activePlayerUid: bState.player?.uid ?? '',
      playerHp: bState.player?.hp ?? 0,
      playerMaxHp: bState.player?.maxHp ?? 0,
      playerStatus: bState.player?.status || null,
      playerTeam: team.map((p: EvaluatedTeamPokemonMember) => ({
        uid: p?.uid ?? '',
        name: p?.name ?? '',
        hp: p?.hp ?? 0,
        maxHp: p?.maxHp ?? 0,
        status: p?.status || null
      }))
    };
  });
}

export async function isHealthyBenchUidHelper(page: Page, uid?: string): Promise<boolean> {
  if (!uid) return false;
  return await page.evaluate((targetUid) => {
    const debug = window.__VITE_DEBUG__ as {
      useGameStore?: () => { state?: { team?: Array<{ uid?: string; hp?: number }> }; team?: Array<{ uid?: string; hp?: number }> };
      useBattleStore?: () => { player?: { uid?: string }; activeBattle?: { player?: { uid?: string } } };
    } | undefined;
    const gameStore = debug?.useGameStore?.();
    const battleStore = debug?.useBattleStore?.();
    const team = (gameStore?.team || gameStore?.state?.team || []) as Array<{ uid?: string; hp?: number }>;
    const activeUid = battleStore?.player?.uid ?? null;
    const p = team.find((poke) => poke && poke.uid === targetUid);
    return Boolean(p && typeof p.hp === 'number' && p.hp > 0 && p.uid !== activeUid);
  }, uid);
}

export async function getHealthyBenchUidHelper(page: Page): Promise<string | undefined> {
  return await page.evaluate(() => {
    const debug = window.__VITE_DEBUG__ as {
      useGameStore?: () => { state?: { team?: Array<{ uid?: string; hp?: number }> }; team?: Array<{ uid?: string; hp?: number }> };
      useBattleStore?: () => { player?: { uid?: string }; activeBattle?: { player?: { uid?: string } } };
    } | undefined;
    const gameStore = debug?.useGameStore?.();
    const battleStore = debug?.useBattleStore?.();
    const team = (gameStore?.team || gameStore?.state?.team || []) as Array<{ uid?: string; hp?: number }>;
    const activeUid = battleStore?.player?.uid ?? null;
    const healthy = team.find((p) => p && typeof p.hp === 'number' && p.hp > 0 && Boolean(p.uid) && p.uid !== activeUid);
    return healthy?.uid;
  });
}

export async function useItemOnPokemonHelper(page: Page, itemId: ItemId, pokemonUid: string): Promise<BattleReadyForInputDetail> {
  await page.waitForFunction(() => {
    const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isProcessing?: boolean; isIntroAnimating?: boolean } } | undefined;
    const store = debug?.useBattleStore?.();
    return !store?.isProcessing && !store?.isIntroAnimating;
  }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });

  await armBattleReadyForInput(page);
  await page.evaluate(async ({ item, targetUid }) => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const battleStore = useBattleStore();
    const gameStore = useGameStore();
    const team = gameStore.state.team || [];
    const index = team.findIndex(p => p && p.uid === targetUid);
    await battleStore.useItemInBattle(item, index !== -1 ? index : null);
  }, { item: itemId, targetUid: pokemonUid });
  return await awaitBattleReadyForInput(page);
}

export async function voluntarySwitchHelper(
  page: Page,
  pokemonUid: string,
  lastBattleReady: BattleReadyForInputDetail | null
): Promise<BattleReadyForInputDetail> {
  try {
    await page.waitForFunction(() => {
      const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isProcessing?: boolean; isIntroAnimating?: boolean } } | undefined;
      const store = debug?.useBattleStore?.();
      return !store?.isProcessing && !store?.isIntroAnimating;
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (err) {
    const debugState = await page.evaluate(() => {
      const debug = window.__VITE_DEBUG__;
      const store = debug?.useBattleStore?.();
      return {
        isProcessing: store?.isProcessing,
        isIntroAnimating: store?.isIntroAnimating,
        currentState: store?.currentState,
        currentSubState: store?.currentSubState,
        player: Boolean(store?.player),
        enemy: Boolean(store?.enemy),
      };
    });
    console.error(`[E2E-VOLUNTARY-SWITCH-TIMEOUT] Diagnostic state:`, JSON.stringify(debugState));
    throw err;
  }

  const isOver = await page.evaluate(() => {
    const debug = window.__VITE_DEBUG__ as { useBattleStore?: () => { isBattleActive?: boolean; over?: boolean; activeBattle?: { over?: boolean } } } | undefined;
    const store = debug?.useBattleStore?.();
    return !store?.isBattleActive || Boolean(store?.over) || Boolean(store?.activeBattle?.over);
  });
  if (isOver || lastBattleReady?.over) {
    return lastBattleReady!;
  }

  const shouldSkip = await page.evaluate(async (targetUid) => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const battleStore = useBattleStore();
    const bState = battleStore?.state && typeof battleStore.state === 'object' && 'playerRequest' in battleStore.state
      ? (battleStore.state as { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } })
      : (battleStore?.state as { value?: { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } } } | undefined)?.value;
    const currentActiveUid = bState?.player?.uid || null;

    if (currentActiveUid === targetUid) {
      const debugObj = window.__VITE_DEBUG__;
      if (debugObj) {
        const cur = (Reflect.get(debugObj, 'replayHistoryIdx') as number) ?? 0;
        Reflect.set(debugObj, 'replayHistoryIdx', cur + 1);
      }
      return true;
    }
    return false;
  }, pokemonUid);

  if (shouldSkip) {
    return lastBattleReady!;
  }

  await armBattleReadyForInput(page);
  await page.evaluate(async (targetUid) => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const { useGameStore } = await import('../../../src/stores/game.ts');
    const { useUIStore } = await import('../../../src/stores/ui.ts');
    const battleStore = useBattleStore();
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const bState = battleStore?.state && typeof battleStore.state === 'object' && 'playerRequest' in battleStore.state
      ? (battleStore.state as { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } })
      : (battleStore?.state as { value?: { player?: { uid?: string }; playerRequest?: { forceSwitch?: boolean | boolean[] } } } | undefined)?.value;

    const team = (gameStore.state?.team && gameStore.state.team.length > 0)
      ? gameStore.state.team
      : (battleStore.state?.playerTeam || []);
    const index = team.findIndex(p => p && p.uid === targetUid);
    if (index === -1) {
      throw new Error(`[E2E-VOLUNTARY-SWITCH] Target Pokémon UID "${targetUid}" not found in team: ${JSON.stringify(team.map(p => ({ uid: p?.uid, name: p?.name })))}`);
    }
    const forceSw = bState?.playerRequest?.forceSwitch;
    const hasPendingForceSwitch = Array.isArray(forceSw) ? forceSw.some(Boolean) : Boolean(forceSw);
    const subStateRaw = battleStore?.currentSubState;
    const subStateStr = typeof subStateRaw === 'string'
      ? subStateRaw
      : (subStateRaw && typeof subStateRaw === 'object' && 'value' in subStateRaw ? String((subStateRaw as { value?: unknown }).value ?? '') : '');
    const isForced = Boolean(uiStore?.isBattleSwitchForced) || subStateStr === 'SWITCH_MENU' || hasPendingForceSwitch;
    await battleStore.executeSwitch(index, isForced);
  }, pokemonUid);

  return await awaitBattleReadyForInput(page);
}

export async function selectMoveHelper(
  page: Page,
  moveIndex: number,
  lastBattleReady: BattleReadyForInputDetail | null
): Promise<BattleReadyForInputDetail> {
  try {
    await page.waitForFunction(() => {
      const debug = window.__VITE_DEBUG__ as {
        useBattleStore?: () => {
          isProcessing?: boolean;
          isIntroAnimating?: boolean;
          player?: unknown;
          enemy?: unknown;
          isBattleActive?: boolean;
          over?: boolean;
          currentSubState?: string;
          activeBattle?: { playerRequest?: { forceSwitch?: unknown } };
        };
      } | undefined;
      const store = debug?.useBattleStore?.();
      if (!store?.isBattleActive || store?.over) return true;
      const pReq = store?.activeBattle?.playerRequest;
      const hasForceSwitch = Array.isArray(pReq?.forceSwitch) ? pReq.forceSwitch.some(Boolean) : Boolean(pReq?.forceSwitch);
      const isSwitchRequired = store?.currentSubState === 'SWITCH_MENU' || hasForceSwitch || (!store?.player && Boolean(store?.enemy));
      if (isSwitchRequired) return true;
      return !store?.isProcessing && !store?.isIntroAnimating && Boolean(store?.player) && Boolean(store?.enemy);
    }, undefined, { timeout: MAX_PER_ACTION_TIMEOUT_MS });
  } catch (err) {
    const debugState = await page.evaluate(() => {
      const debug = window.__VITE_DEBUG__;
      const store = debug?.useBattleStore?.();
      return {
        isProcessing: store?.isProcessing,
        isIntroAnimating: store?.isIntroAnimating,
        isBattleActive: store?.isBattleActive,
        over: store?.over,
        hasPlayer: Boolean(store?.player),
        hasEnemy: Boolean(store?.enemy),
        currentState: store?.currentState,
        currentSubState: store?.currentSubState,
        activeMove: store?.activeMove,
        attackerSide: store?.attackerSide,
        lastLog: Array.isArray(store?.battleLogs) ? store.battleLogs[store.battleLogs.length - 1] : undefined
      };
    });
    console.error(`[E2E-SELECT-MOVE-TIMEOUT] Diagnostic state at timeout:`, JSON.stringify(debugState));
    throw err;
  }

  const shouldSkip = await page.evaluate(() => {
    const debug = window.__VITE_DEBUG__ as {
      useBattleStore?: () => {
        isBattleActive?: boolean;
        over?: boolean;
        player?: unknown;
        enemy?: unknown;
        currentSubState?: string;
        activeBattle?: { playerRequest?: { forceSwitch?: unknown } };
      };
    } | undefined;
    const store = debug?.useBattleStore?.();
    const pReq = store?.activeBattle?.playerRequest;
    const hasForceSwitch = Array.isArray(pReq?.forceSwitch) ? pReq.forceSwitch.some(Boolean) : Boolean(pReq?.forceSwitch);
    const isSwitchRequired = store?.currentSubState === 'SWITCH_MENU' || hasForceSwitch || (!store?.player && Boolean(store?.enemy));
    return !store?.isBattleActive || store?.over || !store?.player || !store?.enemy || isSwitchRequired;
  });
  if (shouldSkip) {
    return lastBattleReady ?? { subState: '', p1ChoiceIdx: 0, p2ChoiceIdx: 0, over: true, playerSwitchSlots: [] };
  }

  await armBattleReadyForInput(page);
  await page.evaluate(async (idx) => {
    const { useBattleStore } = await import('../../../src/stores/battle/battle.ts');
    const store = useBattleStore();
    await store.executeMove(idx);
  }, moveIndex);
  return await awaitBattleReadyForInput(page);
}

export async function throwBallHelper(
  page: Page,
  ballId: string,
  options: { expectCapture?: boolean; timeout?: number; awaitFlowCompletion?: boolean } = {}
): Promise<void> {
  const {
    expectCapture = false,
    timeout = MAX_PER_ACTION_TIMEOUT_MS * THROW_BALL_TIMEOUT_MULTIPLIER,
    awaitFlowCompletion = true
  } = options;
  const ballCard = page.locator(`.quick-item-card[data-item-id="${ballId}"]:not(.is-disabled)`).first();
  await ballCard.waitFor({ state: 'visible', timeout });

  if (expectCapture) {
    if (awaitFlowCompletion) {
      await armBattleFlowCompletion(page);
      await clickResilient(ballCard, { timeout });
      await awaitBattleFlowCompletion(page);
    } else {
      await clickResilient(ballCard, { timeout });
    }
  } else {
    await armBattleReadyForInput(page, timeout);
    await clickResilient(ballCard, { timeout });
    await awaitBattleReadyForInput(page, timeout);
  }
}
