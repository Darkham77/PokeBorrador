import type { Battle, Side, Pokemon, SideID } from '@pkmn/sim';
import { REPLAY_SEATS } from './showdownSeats.ts';
import { applyHealCheatToSide, applyPpRefillCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';
import type { CertifiedBattleHistoryEntry } from '../../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import type { CertifiedReplayHistoryEntry } from './showdownBattleRunner.ts';

export type CertifiedCheatHistoryStep = CertifiedBattleHistoryEntry | CertifiedReplayHistoryEntry | number | { [key: string]: unknown };

type CheatMap = Map<number, Partial<Record<SideID, boolean>>>;

function resolveHistoryTargetTurns(h: CertifiedBattleHistoryEntry, stepOrdinal: number): Set<number> {
  const targetTurns = new Set<number>();
  if (typeof h.battleTurn === 'number') targetTurns.add(h.battleTurn);
  if (typeof h.turnCount === 'number') targetTurns.add(h.turnCount);
  targetTurns.add(stepOrdinal);
  return targetTurns;
}

function recordSeatCheats(
  h: CertifiedBattleHistoryEntry,
  targetTurn: number,
  sideId: SideID,
  ppMap: CheatMap,
  preHealMap: CheatMap,
  postHealMap: CheatMap
): void {
  const ppRefillKey = `${sideId}PpRefill` as keyof CertifiedBattleHistoryEntry;
  if (h[ppRefillKey]) {
    const e = ppMap.get(targetTurn) ?? {};
    e[sideId] = true;
    ppMap.set(targetTurn, e);
  }

  const preKey = `${sideId}PreHeal` as keyof CertifiedBattleHistoryEntry;
  if (h[preKey]) {
    const e = preHealMap.get(targetTurn) ?? {};
    e[sideId] = true;
    preHealMap.set(targetTurn, e);
  }

  const healKey = `${sideId}Heal` as keyof CertifiedBattleHistoryEntry;
  if (h[healKey]) {
    const e = postHealMap.get(targetTurn) ?? {};
    e[sideId] = true;
    postHealMap.set(targetTurn, e);
  }
}

function extractTargetTurnContext(battleTurn: number, historyStep?: CertifiedCheatHistoryStep): {
  targetTurn: number;
  stepObj: Record<string, unknown> | null;
} {
  const isObj = typeof historyStep === 'object' && historyStep !== null;
  const stepObj = isObj ? (historyStep as Record<string, unknown>) : null; // open-record: Generic key-value data dictionary container
  const rawTurn = stepObj
    ? (((stepObj.battleTurn ?? stepObj.turnCount) as number | undefined) ?? battleTurn)
    : (typeof historyStep === 'number' ? historyStep : battleTurn);
  return { targetTurn: rawTurn, stepObj };
}

function shouldApplyPreHeal(
  side: Side,
  stepObj: Record<string, unknown> | null,
  entryPre?: Partial<Record<SideID, boolean>>,
  entryPost?: Partial<Record<SideID, boolean>>
): boolean {
  const sideId = side.id as SideID;
  if (stepObj) {
    return Boolean(stepObj[`${sideId}PreHeal`]);
  }
  const hasFainted = side.pokemon.some(p => p && (p.fainted || p.hp <= 0));
  return Boolean(entryPre?.[sideId]) || (hasFainted && Boolean(entryPost?.[sideId]));
}

export class BattleCheatManager {
  /** Certified post-turn heals are keyed by the atomic submission ordinal. */
  private readonly postHealMap: CheatMap = new Map(); // runtime-map: Fast O(1) keyed lookup dictionary
  private readonly preHealMap: CheatMap = new Map(); // runtime-map: Fast O(1) keyed lookup dictionary
  private readonly ppMap: CheatMap = new Map(); // runtime-map: Fast O(1) keyed lookup dictionary
  private readonly applied = new Set<string>(); // runtime-set: Fast O(1) membership lookup set

  public readonly hasHistory: boolean;

  constructor(history?: CertifiedBattleHistoryEntry[]) {
    const list = history ?? [];
    this.hasHistory = list.length > 0;
    for (let idx = 0; idx < list.length; idx++) {
      const h = list[idx]!;
      const stepOrdinal = idx + 1;
      const targetTurns = resolveHistoryTargetTurns(h, stepOrdinal);

      for (const targetTurn of targetTurns) {
        for (const sideId of REPLAY_SEATS) {
          recordSeatCheats(h, targetTurn, sideId, this.ppMap, this.preHealMap, this.postHealMap);
        }
      }
    }
  }

  public getAppliedCheatsCount(): number {
    return this.applied.size;
  }

  // fallow-ignore-next-line unused-class-member
  public clearAppliedCheats(): void {
    this.applied.clear();
  }

  private executeHeal(_battle: Battle, side: Side, key: string, phase: 'PRE' | 'POST'): void {
    try {
      applyHealCheatToSide(side);
      syncRequestConditionsWithSimulator(side);
      this.applied.add(key);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[CheatManager-${phase}-ERROR] Failed heal for ${side.id}: ${msg}`);
    }
  }

  private handleSidePpRefill(side: Side, targetTurn: number, stepObj: Record<string, unknown> | null): void {
    const sideId = side.id as SideID;
    const entryPp = !stepObj ? this.ppMap.get(targetTurn) : undefined;
    const needsPpRefill = stepObj ? Boolean(stepObj[`${sideId}PpRefill`]) : (entryPp?.[sideId] ?? false);
    if (!needsPpRefill) return;

    const ppKey = `pre-pp-${targetTurn}-${sideId}`;
    if (!this.applied.has(ppKey)) {
      applyPpRefillCheatToSide(side);
      this.applied.add(ppKey);
    }
  }

  private handleSidePreHeal(
    battle: Battle,
    side: Side,
    targetTurn: number,
    stepObj: Record<string, unknown> | null
  ): void {
    const sideId = side.id as SideID;
    const entryPre = !stepObj ? this.preHealMap.get(targetTurn) : undefined;
    const entryPost = !stepObj ? this.postHealMap.get(targetTurn) : undefined;
    const needs = shouldApplyPreHeal(side, stepObj, entryPre, entryPost);
    if (!needs) return;

    const key = `pre-${targetTurn}-${sideId}`;
    if (!stepObj && this.applied.has(key)) return;
    this.executeHeal(battle, side, key, 'PRE');
  }

  /** Pre-turn: heal fainted Pokémon and refill PP if recorded in history step before choices are submitted. */
  public applyPreTurnCheats(battle: Battle, _isFuzzerSimulation = true, historyStep?: CertifiedCheatHistoryStep): void {
    if (battle.ended) return;
    const { targetTurn, stepObj } = extractTargetTurnContext(battle.turn, historyStep);

    for (const side of battle.sides) {
      if (!side) continue;
      this.handleSidePpRefill(side, targetTurn, stepObj);
      this.handleSidePreHeal(battle, side, targetTurn, stepObj);
    }
  }

  /** Post-turn: heal Pokémon whose HP dropped critically after choices resolved using unified processIPBHeals. */
  public applyPostTurnCheats(battle: Battle, historyStep?: CertifiedCheatHistoryStep): void {
    if (battle.ended) return;
    const { targetTurn, stepObj } = extractTargetTurnContext(battle.turn, historyStep);
    const entry = !stepObj ? this.postHealMap.get(targetTurn) : undefined;

    for (const side of battle.sides) {
      if (!side) continue;
      const seatKey = `${side.id}Heal`;
      const needs = stepObj ? Boolean(stepObj[seatKey]) : (entry?.[side.id as SideID] ?? false); // domain-ok: Open dynamic text or non-domain string payload
      if (!needs) continue;
      const key = `post-${targetTurn}-${side.id}`;
      if (!stepObj && this.applied.has(key)) continue;
      applyHealCheatToSide(side);
      side.pokemon.forEach((p: Pokemon) => { if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`); });
      syncRequestConditionsWithSimulator(side as Parameters<typeof syncRequestConditionsWithSimulator>[0]); // domain-ok: Open dynamic text or non-domain string payload
      this.applied.add(key);
    }
  }
}
