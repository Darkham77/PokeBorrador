import { logger } from '../utils/logger.ts';
import type { BattleState } from '@/types/battle/battle';
import { buildCombatReplayPayload } from './helpers/combatReplayHelper.ts';
import { resolveBattleStore } from './showdownWorkerInstance.ts';

export interface SimulationValidationResult {
  shouldBypass: boolean;
  replayContext: string;
  isSimulation: boolean;
  history?: unknown;
  certifiedHistoryStep?: number;
}

interface ReplayTraceContextArgs {
  isSimulation: boolean;
  p1Choice: string;
  p2Choice?: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  p1UsedBattleItem?: boolean;
  certifiedHistoryStep?: number;
  historyLength?: number;
}

function isReplayExecutionComplete(
  debugObj: Record<string, unknown>,
  history: unknown,
  certifiedHistoryIndex: number | undefined
): boolean {
  const isEnded = Reflect.get(debugObj, 'certifiedReplayWorkerEnded') === true;
  return isEnded || (Array.isArray(history) && typeof certifiedHistoryIndex === 'number' && certifiedHistoryIndex >= history.length);
}

function recordReplayTrace(
  debugObj: Record<string, unknown>,
  p1Choice: string,
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean,
  p1UsedBattleItem?: boolean
): void {
  const trace = Reflect.get(debugObj, 'certifiedReplaySubmissionTrace');
  const entries = (Array.isArray(trace) ? trace : []) as Record<string, unknown>[]; // open-record: Generic key-value data dictionary container
  entries.push({
    historyIndex: Reflect.get(debugObj, 'replayHistoryIdx'),
    p1Choice,
    p2Choice: p2Choice ?? '',
    p1Skip: !!p1Skip,
    p2Skip: !!p2Skip,
    p1UsedBattleItem: !!p1UsedBattleItem
  });
  Reflect.set(debugObj, 'certifiedReplaySubmissionTrace', entries);
}

function serializeReplayContext(args: ReplayTraceContextArgs): string {
  const viteDebug = typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined;
  return JSON.stringify({
    isSimulation: args.isSimulation,
    p1Choice: args.p1Choice,
    p2Choice: args.p2Choice,
    p1Skip: !!args.p1Skip,
    p2Skip: !!args.p2Skip,
    p1UsedBattleItem: !!args.p1UsedBattleItem,
    p1ChoiceIdx: viteDebug?.p1ChoiceIdx,
    p2ChoiceIdx: viteDebug?.p2ChoiceIdx,
    playerChoiceCount: Array.isArray(viteDebug?.playerChoices) ? viteDebug.playerChoices.length : undefined,
    enemyChoiceCount: Array.isArray(viteDebug?.enemyChoices) ? viteDebug.enemyChoices.length : undefined,
    historyCount: args.historyLength,
    certifiedHistoryStep: args.certifiedHistoryStep,
  });
}

export function validateAndTraceSimulationReplay(
  p1Choice: string,
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean,
  p1UsedBattleItem?: boolean
): SimulationValidationResult {
  const isSimulation = typeof window !== 'undefined' && !!window.__VITE_DEBUG__?.isScriptedReplayMode;
  const debugObj = (typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined) as Record<string, unknown> | undefined; // open-record: Generic key-value data dictionary container
  const history = debugObj?.history;
  const certifiedHistoryIndex = isSimulation && debugObj
    ? (Reflect.get(debugObj, 'replayHistoryIdx') as number | undefined)
    : undefined;

  if (isSimulation && debugObj && isReplayExecutionComplete(debugObj, history, certifiedHistoryIndex)) {
    console.warn('[ShowdownWorkerClient] Bypassing executeTurnInWorker because certified replay has already finished all history steps.');
    return { shouldBypass: true, replayContext: '', isSimulation, history };
  }

  if (isSimulation && (typeof certifiedHistoryIndex !== 'number' || certifiedHistoryIndex < 0)) {
    throw new Error(`[ShowdownWorkerClient] Certified replay submission is missing its atomic history cursor. context=${JSON.stringify({ certifiedHistoryIndex, historyLength: Array.isArray(history) ? history.length : undefined, p1Choice, p2Choice })}`);
  }

  const certifiedHistoryStep = typeof certifiedHistoryIndex === 'number' ? certifiedHistoryIndex + 1 : undefined;
  if (isSimulation && debugObj) {
    recordReplayTrace(debugObj, p1Choice, p2Choice, p1Skip, p2Skip, p1UsedBattleItem);
  }

  const replayContext = serializeReplayContext({
    isSimulation,
    p1Choice,
    p2Choice,
    p1Skip,
    p2Skip,
    p1UsedBattleItem,
    certifiedHistoryStep,
    historyLength: Array.isArray(history) ? history.length : undefined,
  });

  return { shouldBypass: false, replayContext, isSimulation, history, certifiedHistoryStep };
}

export function generateWorkerReproductionError(payloadMessage?: string): Error {
  let reproductionReport = '';
  try {
    const battleStore = resolveBattleStore();
    const active = ((battleStore?.state as { value?: BattleState } | undefined)?.value || battleStore?.state) as BattleState | null | undefined;
    if (active) {
      const reportObj = buildCombatReplayPayload(active);
      reproductionReport = `\n\n--- REPRODUCE BATTLE TEST CASE ---\nJSON Payload:\n${JSON.stringify(reportObj, null, 2)}\n----------------------------------`;
    }
  } catch (err) {
    logger.warn('[showdownWorkerClient] Fallo al generar reporte de reproducción:', err);
  }

  const errorMsg = (payloadMessage || '') + reproductionReport;
  const err = new Error(errorMsg);
  if (errorMsg.includes('INVALID_CHOICE')) {
    err.name = 'InvalidChoiceError';
  }
  return err;
}
