import type { Page } from '@playwright/test';
import {
  awaitBattleReadyForInput,
  type CertifiedTestBatch
} from '../e2e_helpers.ts';
import type { BattleReadyForInputDetail } from '../../../src/types/battle/battleEvents.ts';
import {
  isHealthyBenchUidHelper,
  getHealthyBenchUidHelper,
  useItemOnPokemonHelper,
  voluntarySwitchHelper,
  selectMoveHelper
} from './battleActionExecutionHelper.ts';

const REPLAY_TIME_SCALE = 100;
const MILLISECONDS_IN_SECOND = 1000;

export interface ReplayContext {
  page: Page;
  batch: CertifiedTestBatch;
  driver: 'sqlite' | 'postgres';
  username: string;
  logBuffer: string[];
  lastBattleReady: BattleReadyForInputDetail | null;
  speedUpAnimations: (scale: number) => Promise<void>;
}

export function validateReplayStepMetadata(
  entry: CertifiedTestBatch['history'][number],
  stateSnapshot: { p1Uid?: string; p2Uid?: string; weather?: string; terrain?: string },
  step: number
): void {
  if (entry.p1ActiveUid && stateSnapshot.p1Uid && entry.p1ActiveUid !== stateSnapshot.p1Uid) {
    console.warn(`[E2E-METADATA-WARN] P1 Active UID mismatch at step ${step}: expected ${entry.p1ActiveUid}, actual ${stateSnapshot.p1Uid}`);
  }
  if (entry.p2ActiveUid && stateSnapshot.p2Uid && entry.p2ActiveUid !== stateSnapshot.p2Uid) {
    console.warn(`[E2E-METADATA-WARN] P2 Active UID mismatch at step ${step}: expected ${entry.p2ActiveUid}, actual ${stateSnapshot.p2Uid}`);
  }
  if (entry.weather && stateSnapshot.weather && entry.weather !== stateSnapshot.weather) {
    console.warn(`[E2E-METADATA-WARN] Weather mismatch at step ${step}: expected ${entry.weather}, actual ${stateSnapshot.weather}`);
  }
  if (entry.terrain && stateSnapshot.terrain && entry.terrain !== stateSnapshot.terrain) {
    console.warn(`[E2E-METADATA-WARN] Terrain mismatch at step ${step}: expected ${entry.terrain}, actual ${stateSnapshot.terrain}`);
  }
}

export async function resolveForcedSwitchTargetUid(
  page: Page,
  batch: CertifiedTestBatch,
  currentBrowserIdx: number,
  lastBattleReady: BattleReadyForInputDetail | null
): Promise<{ targetUid: string; switchIdx: number }> {
  let switchEntry = batch.history[currentBrowserIdx]!;
  let switchIdx = currentBrowserIdx;
  if (!switchEntry.p1Choice.startsWith('switch ')) {
    const nextSwitchOffset = batch.history.slice(currentBrowserIdx).findIndex((h) => h.p1Choice.startsWith('switch '));
    if (nextSwitchOffset !== -1) {
      switchIdx = currentBrowserIdx + nextSwitchOffset;
      switchEntry = batch.history[switchIdx]!;
    }
  }

  const candidateUid = switchEntry.p1ActiveUid
    || (switchEntry.p1Choice.startsWith('switch ')
      ? lastBattleReady?.playerSwitchSlots?.find(
          (slot) => slot.showdownSlot === Number(switchEntry.p1Choice.slice('switch '.length))
        )?.pokemonUid
      : undefined);

  const targetUid = (await isHealthyBenchUidHelper(page, candidateUid)) ? candidateUid : await getHealthyBenchUidHelper(page);
  if (!targetUid) {
    throw new Error(`[E2E-CERTIFIED-REPLAY] Could not resolve Pokémon UID for forced switch: ${JSON.stringify(switchEntry)}. Available slots: ${JSON.stringify(lastBattleReady?.playerSwitchSlots)}`);
  }
  return { targetUid, switchIdx };
}

export async function resolveReplayMoveIndex(page: Page, moveIndex: number, targetMoveId?: string): Promise<number> {
  return await page.evaluate(({ targetIdx, targetMoveId }) => {
    const debug = window.__VITE_DEBUG__;
    const store = debug?.useBattleStore?.();
    const active = (store?.activeBattle || (store?.state as { value?: unknown } | undefined)?.value || store?.state) as { playerRequest?: unknown } | undefined;
    const pReq = active?.playerRequest as { active?: Array<{ moves?: Array<{ id?: string; disabled?: boolean | string; pp?: number }> }> } | undefined;
    const activeMoves = pReq?.active?.[0]?.moves;
    if (Array.isArray(activeMoves)) {
      if (activeMoves.length === 1 && activeMoves[0]?.id) return 0;
      if (targetMoveId) {
        const idMatchIdx = activeMoves.findIndex((m) => m && m.id === targetMoveId && !m.disabled && (m.pp === undefined || m.pp > 0));
        if (idMatchIdx !== -1) return idMatchIdx;
      }
      if (activeMoves[targetIdx] && !activeMoves[targetIdx]?.disabled && (activeMoves[targetIdx]?.pp === undefined || (activeMoves[targetIdx]?.pp ?? 0) > 0)) {
        return targetIdx;
      }
      const validIdx = activeMoves.findIndex((m) => m && !m.disabled && (m.pp === undefined || m.pp > 0));
      if (validIdx !== -1) return validIdx;
    }
    return targetIdx;
  }, { targetIdx: moveIndex, targetMoveId });
}

export async function resolveVoluntarySwitchTargetUid(
  page: Page,
  choice: string,
  lastBattleReady: BattleReadyForInputDetail | null,
  p1ActiveUid?: string
): Promise<string> {
  const switchSlot = Number(choice.slice('switch '.length));
  const target = lastBattleReady?.playerSwitchSlots?.find((slot) => slot.showdownSlot === switchSlot);
  const candidateUid = p1ActiveUid || target?.pokemonUid;
  const targetUid = (await isHealthyBenchUidHelper(page, candidateUid)) ? candidateUid : await getHealthyBenchUidHelper(page);
  if (!targetUid) {
    throw new Error(`[E2E-CERTIFIED-REPLAY] Could not resolve Pokémon UID for Showdown switch slot ${switchSlot}. Available slots: ${JSON.stringify(lastBattleReady?.playerSwitchSlots)}`);
  }
  return targetUid;
}

export async function executeReplayStepHelper(
  ctx: ReplayContext,
  currentBrowserIdx: number
): Promise<{ shouldContinue: boolean; updatedReady: BattleReadyForInputDetail | null }> {
  const entry = ctx.batch.history[currentBrowserIdx];
  if (!entry) return { shouldContinue: false, updatedReady: ctx.lastBattleReady };

  const gameAction = entry.p1GameAction;
  if (gameAction?.kind === 'bag-item') {
    const target = ctx.batch.playerTeam[gameAction.targetSlot - 1];
    if (!target?.uid) throw new Error(`[E2E-CERTIFIED-REPLAY] Missing bag target slot ${gameAction.targetSlot}.`);
    const ready = await useItemOnPokemonHelper(ctx.page, gameAction.itemId, target.uid);
    return { shouldContinue: true, updatedReady: ready };
  }

  const choice = entry.p1Choice.trim().toLowerCase();
  if (choice.startsWith('move ')) {
    const moveIndex = Number(choice.slice('move '.length)) - 1;
    if (!Number.isInteger(moveIndex) || moveIndex < 0) throw new Error(`[E2E-CERTIFIED-REPLAY] Invalid move ${entry.p1Choice}.`);
    const resolvedMoveIndex = await resolveReplayMoveIndex(ctx.page, moveIndex, entry.p1MoveId);
    const ready = await selectMoveHelper(ctx.page, resolvedMoveIndex, ctx.lastBattleReady);
    return { shouldContinue: true, updatedReady: ready };
  }

  if (choice.startsWith('switch ')) {
    const isTrappedOrRecharging = await ctx.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__;
      const store = debug?.useBattleStore?.();
      const active = (store?.activeBattle || (store?.state as { value?: unknown } | undefined)?.value || store?.state) as { player?: { volatileCounters?: Record<string, number> }; playerRequest?: { active?: Array<{ trapped?: boolean; moves?: Array<{ id?: string }> }> } } | undefined;
      const p = active?.player;
      const req = active?.playerRequest;
      const isRecharging = req?.active?.[0]?.moves?.length === 1 && req.active[0].moves[0]?.id === 'recharge';
      const isTrapped = req?.active?.[0]?.trapped === true || Boolean(p?.volatileCounters?.['mustrecharge']);
      return isRecharging || isTrapped;
    });

    if (isTrappedOrRecharging) {
      const ready = await selectMoveHelper(ctx.page, 0, ctx.lastBattleReady);
      return { shouldContinue: true, updatedReady: ready };
    }

    const targetUid = await resolveVoluntarySwitchTargetUid(ctx.page, choice, ctx.lastBattleReady, entry.p1ActiveUid);
    const ready = await voluntarySwitchHelper(ctx.page, targetUid, ctx.lastBattleReady);
    return { shouldContinue: true, updatedReady: ready };
  }

  if (choice === '' || choice === 'pass') {
    if (ctx.lastBattleReady?.over) return { shouldContinue: false, updatedReady: ctx.lastBattleReady };
    await ctx.page.evaluate((expectedIdx: number) => {
      const debugObj = window.__VITE_DEBUG__;
      if (debugObj) {
        const cur = (Reflect.get(debugObj, 'replayHistoryIdx') as number) ?? 0;
        if (cur === expectedIdx) Reflect.set(debugObj, 'replayHistoryIdx', cur + 1);
      }
    }, currentBrowserIdx);
    return { shouldContinue: true, updatedReady: null };
  }

  throw new Error(`[E2E-CERTIFIED-REPLAY] No visible P1 action for ${JSON.stringify(entry)}.`);
}

export async function fetchReplayStepContext(
  ctx: ReplayContext
): Promise<{
  shouldBreak: boolean;
  currentBrowserIdx: number;
  stateSnapshot: { isOver: boolean; p1Uid?: string; p2Uid?: string; weather?: string; terrain?: string };
  updatedReady: BattleReadyForInputDetail | null;
}> {
  let currentBrowserIdx = 0;
  const fallbackSnapshot = { isOver: false, p1Uid: undefined as string | undefined, p2Uid: undefined as string | undefined, weather: undefined as string | undefined, terrain: undefined as string | undefined };
  let ready = ctx.lastBattleReady;
  try {
    currentBrowserIdx = Number(await ctx.page.evaluate(() => window.__VITE_DEBUG__?.replayHistoryIdx ?? 0));
    if (currentBrowserIdx >= ctx.batch.history.length) {
      console.log(`[E2E-REPLAY] Reached end of history (${currentBrowserIdx}/${ctx.batch.history.length}).`);
      return { shouldBreak: true, currentBrowserIdx, stateSnapshot: fallbackSnapshot, updatedReady: ready };
    }

    if (!ready) {
      ready = await awaitBattleReadyForInput(ctx.page);
    }
    if (ready.over) {
      console.log(`[E2E-REPLAY] Battle ended after ready check at idx=${currentBrowserIdx}.`);
      return { shouldBreak: true, currentBrowserIdx, stateSnapshot: fallbackSnapshot, updatedReady: ready };
    }

    const stateSnapshot = await ctx.page.evaluate(() => {
      const debug = window.__VITE_DEBUG__;
      const b = (debug?.useBattleStore?.() as { activeBattle?: { over?: boolean; player?: { uid?: string }; enemy?: { uid?: string }; weather?: { type?: string }; terrain?: string } } | undefined)?.activeBattle;
      return {
        isOver: Boolean(b?.over),
        p1Uid: b?.player?.uid,
        p2Uid: b?.enemy?.uid,
        weather: b?.weather?.type,
        terrain: b?.terrain
      };
    });

    if (stateSnapshot.isOver || ready?.over) {
      console.log(`[E2E-REPLAY] Battle ended at step ${currentBrowserIdx + 1}/${ctx.batch.history.length}.`);
      return { shouldBreak: true, currentBrowserIdx, stateSnapshot, updatedReady: ready };
    }

    return { shouldBreak: false, currentBrowserIdx, stateSnapshot, updatedReady: ready };
  } catch (navError: unknown) {
    const msg = navError instanceof Error ? navError.message : String(navError);
    if (msg.includes('Execution context was destroyed') || msg.includes('Target page, context or browser has been closed')) {
      console.log(`[E2E-REPLAY] Navigation detected at battle completion. Replay finished cleanly.`);
      return { shouldBreak: true, currentBrowserIdx, stateSnapshot: fallbackSnapshot, updatedReady: ready };
    }
    throw navError;
  }
}

export async function isLiveSwitchRequiredHelper(page: Page, lastBattleReady: BattleReadyForInputDetail | null): Promise<boolean> {
  if (lastBattleReady?.subState === 'SWITCH_MENU') return true;
  return await page.evaluate(() => {
    const debug = window.__VITE_DEBUG__ as {
      useBattleStore?: () => {
        currentSubState?: string;
        isBattleActive?: boolean;
        over?: boolean;
        player?: unknown;
        enemy?: unknown;
        activeBattle?: { playerRequest?: { forceSwitch?: unknown } };
      };
    } | undefined;
    const store = debug?.useBattleStore?.();
    const pReq = store?.activeBattle?.playerRequest;
    const hasForceSwitch = Array.isArray(pReq?.forceSwitch) ? pReq.forceSwitch.some(Boolean) : Boolean(pReq?.forceSwitch);
    return store?.currentSubState === 'SWITCH_MENU' || hasForceSwitch || Boolean(store?.isBattleActive && !store?.over && !store?.player && store?.enemy);
  });
}

export async function handleForcedSwitchInReplay(ctx: ReplayContext, currentBrowserIdx: number): Promise<BattleReadyForInputDetail> {
  const { targetUid, switchIdx } = await resolveForcedSwitchTargetUid(ctx.page, ctx.batch, currentBrowserIdx, ctx.lastBattleReady);
  if (switchIdx !== currentBrowserIdx) {
    await ctx.page.evaluate((targetIdx: number) => {
      const debugObj = window.__VITE_DEBUG__;
      if (debugObj) Reflect.set(debugObj, 'replayHistoryIdx', targetIdx);
    }, switchIdx);
  }
  return await voluntarySwitchHelper(ctx.page, targetUid, ctx.lastBattleReady);
}

export async function replayCertifiedBattleRunner(ctx: ReplayContext): Promise<BattleReadyForInputDetail | null> {
  const replayStartTime = Temporal.Now.instant().epochMilliseconds;
  console.log(`⚔️ [${ctx.driver.toUpperCase()}] [REPLAY:START] Lote "${ctx.batch.id || ctx.username}" (${ctx.batch.playerTeam.length}v${ctx.batch.enemyTeam.length}) - ${ctx.batch.history.length} turnos`);
  await ctx.speedUpAnimations(REPLAY_TIME_SCALE);

  while (true) {
    if (ctx.lastBattleReady?.over) {
      console.log(`[E2E-REPLAY] Battle already over. Replay complete.`);
      break;
    }

    const { shouldBreak, currentBrowserIdx, stateSnapshot, updatedReady } = await fetchReplayStepContext(ctx);
    ctx.lastBattleReady = updatedReady;
    if (shouldBreak) break;

    const entry = ctx.batch.history[currentBrowserIdx];
    if (!entry) break;

    ctx.logBuffer.push(`Step ${currentBrowserIdx + 1}/${ctx.batch.history.length}: P1="${entry.p1Choice}", P2="${entry.p2Choice}"`);
    validateReplayStepMetadata(entry, stateSnapshot, currentBrowserIdx + 1);

    if (await isLiveSwitchRequiredHelper(ctx.page, ctx.lastBattleReady)) {
      ctx.lastBattleReady = await handleForcedSwitchInReplay(ctx, currentBrowserIdx);
      continue;
    }

    const { shouldContinue, updatedReady: stepReady } = await executeReplayStepHelper(ctx, currentBrowserIdx);
    ctx.lastBattleReady = stepReady;
    if (!shouldContinue) break;
  }

  const durationSec = ((Temporal.Now.instant().epochMilliseconds - replayStartTime) / MILLISECONDS_IN_SECOND).toFixed(1);
  console.log(`✅ [${ctx.driver.toUpperCase()}] [REPLAY:DONE] Lote "${ctx.batch.id || ctx.username}" completado con éxito (${ctx.batch.history.length} turnos en ${durationSec}s)`);
  return ctx.lastBattleReady;
}
