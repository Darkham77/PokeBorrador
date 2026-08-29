import type { Battle, Side, Pokemon, SideID } from '@pkmn/sim';
import { REPLAY_SEATS } from './showdownSeats.ts';
import { applyHealCheatToSide, applyPpRefillCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';
import type { CertifiedBattleHistoryEntry } from '../../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import type { CertifiedReplayHistoryEntry } from './showdownBattleRunner.ts';

export type CertifiedCheatHistoryStep = CertifiedBattleHistoryEntry | CertifiedReplayHistoryEntry | number | { [key: string]: unknown };

export class BattleCheatManager {
  /** Certified post-turn heals are keyed by the atomic submission ordinal. */
  private readonly postHealMap = new Map<number, Partial<Record<SideID, boolean>>>(); // runtime-map
  private readonly preHealMap = new Map<number, Partial<Record<SideID, boolean>>>(); // runtime-map
  private readonly ppMap = new Map<number, Partial<Record<SideID, boolean>>>(); // runtime-map
  private readonly applied = new Set<string>(); // runtime-set

  public readonly hasHistory: boolean;

  constructor(history?: CertifiedBattleHistoryEntry[]) {
    const list = history ?? [];
    this.hasHistory = list.length > 0;
    for (let idx = 0; idx < list.length; idx++) {
      const h = list[idx]!;
      const stepOrdinal = idx + 1;

      const targetTurns = new Set<number>();
      if (typeof h.battleTurn === 'number') targetTurns.add(h.battleTurn);
      if (typeof h.turnCount === 'number') targetTurns.add(h.turnCount);
      targetTurns.add(stepOrdinal);

      for (const targetTurn of targetTurns) {
        for (const sideId of REPLAY_SEATS) {
          const ppRefillKey = `${sideId}PpRefill` as keyof CertifiedBattleHistoryEntry;
          if (h[ppRefillKey]) {
            const e = this.ppMap.get(targetTurn) ?? {};
            e[sideId] = true;
            this.ppMap.set(targetTurn, e);
          }

          const preKey = `${sideId}PreHeal` as keyof CertifiedBattleHistoryEntry;
          if (h[preKey]) {
            const e = this.preHealMap.get(targetTurn) ?? {};
            e[sideId] = true;
            this.preHealMap.set(targetTurn, e);
          }

          const healKey = `${sideId}Heal` as keyof CertifiedBattleHistoryEntry;
          if (h[healKey]) {
            const e = this.postHealMap.get(targetTurn) ?? {};
            e[sideId] = true;
            this.postHealMap.set(targetTurn, e);
          }
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

  /** Pre-turn: heal fainted Pokémon and refill PP if recorded in history step before choices are submitted. */
  public applyPreTurnCheats(battle: Battle, _isFuzzerSimulation = true, historyStep?: CertifiedCheatHistoryStep): void {
    if (battle.ended) return;
    const isObj = typeof historyStep === 'object' && historyStep !== null;
    const stepObj = isObj ? (historyStep as Record<string, unknown>) : null; // open-record
    const targetTurn = stepObj ? (((stepObj.battleTurn ?? stepObj.turnCount) as number | undefined) ?? battle.turn) : (typeof historyStep === 'number' ? historyStep : battle.turn);
    const entryPre = !isObj ? this.preHealMap.get(targetTurn) : undefined;
    const entryPost = !isObj ? this.postHealMap.get(targetTurn) : undefined;
    const entryPp = !isObj ? this.ppMap.get(targetTurn) : undefined;

    for (const side of battle.sides) {
      if (!side) continue;
      const sideId = side.id as SideID;
      const seatPpRefillKey = `${sideId}PpRefill`;
      const needsPpRefill = stepObj ? Boolean(stepObj[seatPpRefillKey]) : (entryPp?.[sideId] ?? false);
      if (needsPpRefill) {
        const ppKey = `pre-pp-${targetTurn}-${sideId}`;
        if (!this.applied.has(ppKey)) {
          applyPpRefillCheatToSide(side);
          this.applied.add(ppKey);
        }
      }

      const seatPreKey = `${sideId}PreHeal`;
      const seatHealKey = `${sideId}Heal`;
      const hasFainted = side.pokemon.some(p => p && (p.fainted || p.hp <= 0));
      const needs = stepObj
        ? (Boolean(stepObj[seatPreKey]) || (hasFainted && Boolean(stepObj[seatHealKey])))
        : (Boolean(entryPre?.[sideId]) || (hasFainted && Boolean(entryPost?.[sideId])));

      if (!needs) continue;
      const key = `pre-${targetTurn}-${sideId}`;
      if (!isObj && this.applied.has(key)) continue;
      this.executeHeal(battle, side, key, 'PRE');
    }
  }

  /** Post-turn: heal Pokémon whose HP dropped critically after choices resolved using unified processIPBHeals. */
  public applyPostTurnCheats(battle: Battle, historyStep?: CertifiedCheatHistoryStep): void {
    if (battle.ended) return;
    const isObj = typeof historyStep === 'object' && historyStep !== null;
    const stepObj = isObj ? (historyStep as Record<string, unknown>) : null; // open-record
    const targetTurn = stepObj ? (((stepObj.battleTurn ?? stepObj.turnCount) as number | undefined) ?? battle.turn) : (typeof historyStep === 'number' ? historyStep : battle.turn);
    const entry = !isObj ? this.postHealMap.get(targetTurn) : undefined;

    for (const side of battle.sides) {
      if (!side) continue;
      const seatKey = `${side.id}Heal`;
      const needs = stepObj ? Boolean(stepObj[seatKey]) : (entry?.[side.id as SideID] ?? false); // domain-ok
      if (!needs) continue;
      const key = `post-${targetTurn}-${side.id}`;
      if (!isObj && this.applied.has(key)) continue;
      applyHealCheatToSide(side);
      side.pokemon.forEach((p: Pokemon) => { if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`); });
      syncRequestConditionsWithSimulator(side as Parameters<typeof syncRequestConditionsWithSimulator>[0]); // domain-ok
      this.applied.add(key);
    }
  }
}
