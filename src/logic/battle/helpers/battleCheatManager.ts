import type { Battle, Side, Pokemon, SideID } from '@pkmn/sim';
import { REPLAY_SEATS } from './showdownSeats.ts';
import { applyHealCheatToSide, applyPpRefillCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';

export interface LegacyCheatEntry {
  turn: number;
  side: SideID;
  type: 'heal' | 'preHeal' | 'ppRefill';
  turnCount?: number;
  battleTurn?: number;
}

interface HistoryCheatEntry {
  turn?: number;
  turnCount?: number;
  battleTurn?: number;
  p1Heal?: boolean;
  p2Heal?: boolean;
  p3Heal?: boolean;
  p4Heal?: boolean;
  p1PpRefill?: boolean;
  p2PpRefill?: boolean;
  p3PpRefill?: boolean;
  p4PpRefill?: boolean;
}

export type FuzzerCheat = LegacyCheatEntry | HistoryCheatEntry;

export class BattleCheatManager {
  /** Certified post-turn heals are keyed by the atomic submission ordinal. */
  private readonly postHealMap = new Map<number, Partial<Record<SideID, boolean>>>(); // runtime-map
  private readonly preHealMap = new Map<number, Partial<Record<SideID, boolean>>>(); // runtime-map
  private readonly ppMap = new Map<number, Partial<Record<SideID, boolean>>>(); // runtime-map
  private readonly applied = new Set<string>(); // runtime-set

  constructor(history?: FuzzerCheat[]) {
    for (const h of history ?? []) {
      const turnNum = typeof h.battleTurn === 'number' ? h.battleTurn : (typeof h.turnCount === 'number' ? h.turnCount : h.turn);
      if (turnNum === undefined) continue;

      for (const sideId of REPLAY_SEATS) {
        const ppKey = `${sideId}PpRefill` as keyof HistoryCheatEntry;
        if ((h as HistoryCheatEntry)[ppKey]) {
          const e = this.ppMap.get(turnNum) ?? {};
          e[sideId] = true;
          this.ppMap.set(turnNum, e);
        }

        const preHealKey = `${sideId}PreHeal` as keyof HistoryCheatEntry;
        if ((h as HistoryCheatEntry)[preHealKey]) {
          const e = this.preHealMap.get(turnNum) ?? {};
          e[sideId] = true;
          this.preHealMap.set(turnNum, e);
        }

        const healKey = `${sideId}Heal` as keyof HistoryCheatEntry;
        if ((h as HistoryCheatEntry)[healKey]) {
          const e = this.postHealMap.get(turnNum) ?? {};
          e[sideId] = true;
          this.postHealMap.set(turnNum, e);
        }
      }

      if ('side' in h && h.side) {
        if (h.type === 'ppRefill') {
          const e = this.ppMap.get(turnNum) ?? {};
          e[h.side] = true;
          this.ppMap.set(turnNum, e);
        } else if (h.type === 'preHeal') {
          const e = this.preHealMap.get(turnNum) ?? {};
          e[h.side] = true;
          this.preHealMap.set(turnNum, e);
        } else {
          const postEntry = this.postHealMap.get(turnNum) ?? {};
          postEntry[h.side] = true;
          this.postHealMap.set(turnNum, postEntry);
        }
      }
    }
  }

  public getAppliedCheatsCount(): number {
    return this.applied.size;
  }

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
  public applyPreTurnCheats(battle: Battle, _isFuzzerSimulation = true, historyStep?: number | { [key: string]: unknown }): void {
    if (battle.ended) return;
    const isObj = typeof historyStep === 'object' && historyStep !== null;
    const targetTurn = isObj ? (((historyStep.battleTurn ?? historyStep.turnCount) as number | undefined) ?? battle.turn) : (historyStep !== undefined ? historyStep : battle.turn);
    const entryPre = !isObj ? this.preHealMap.get(targetTurn) : undefined;
    const entryPost = !isObj ? this.postHealMap.get(targetTurn) : undefined;
    const entryPp = !isObj ? this.ppMap.get(targetTurn) : undefined;

    for (const side of battle.sides) {
      if (!side) continue;
      const sideId = side.id as SideID;
      const seatPpRefillKey = `${sideId}PpRefill`;
      const needsPpRefill = isObj ? Boolean(historyStep[seatPpRefillKey]) : (entryPp?.[sideId] ?? false);
      if (needsPpRefill) {
        const ppKey = `pre-pp-${targetTurn}-${sideId}`;
        if (!this.applied.has(ppKey)) {
          applyPpRefillCheatToSide(side);
          this.applied.add(ppKey);
        }
      }

      const seatPreKey = `${sideId}PreHeal`;
      const hasFainted = side.pokemon.some((p: Pokemon) => p && (p.fainted || p.hp === 0));
      const needsPre = isObj ? Boolean(historyStep[seatPreKey]) : (entryPre?.[sideId] ?? false);
      const legacyNeedsPre = !isObj && (entryPost?.[sideId] ?? false) && hasFainted;
      const needs = needsPre || legacyNeedsPre;

      if (!needs) continue;
      const key = `pre-${targetTurn}-${sideId}`;
      if (this.applied.has(key)) continue;
      this.executeHeal(battle, side, key, 'PRE');
    }
  }

  /** Post-turn: heal Pokémon whose HP dropped critically after choices resolved using unified processIPBHeals. */
  public applyPostTurnCheats(battle: Battle, historyStep?: number | { [key: string]: unknown }): void {
    if (battle.ended) return;
    const isObj = typeof historyStep === 'object' && historyStep !== null;
    const targetTurn = isObj ? (((historyStep.battleTurn ?? historyStep.turnCount) as number | undefined) ?? battle.turn) : (historyStep !== undefined ? historyStep : battle.turn);
    const entry = !isObj ? this.postHealMap.get(targetTurn) : undefined;

    for (const side of battle.sides) {
      if (!side) continue;
      const seatKey = `${side.id}Heal`;
      const needs = isObj ? Boolean(historyStep[seatKey]) : (entry?.[side.id as SideID] ?? false); // domain-ok
      if (!needs) continue;
      const key = `post-${targetTurn}-${side.id}`;
      if (this.applied.has(key)) continue;
      applyHealCheatToSide(side);
      side.pokemon.forEach((p: Pokemon) => { if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`); });
      syncRequestConditionsWithSimulator(side as Parameters<typeof syncRequestConditionsWithSimulator>[0]); // domain-ok
      this.applied.add(key);
    }
  }
}
