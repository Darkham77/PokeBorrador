import type { Battle, Side, Pokemon } from '@pkmn/sim';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';

interface HistoryEntry {
  battleTurn: number;
  p1Heal?: true;
  p2Heal?: true;
}

export type FuzzerCheat = { turn: number; side: 'p1' | 'p2'; type: 'heal' } | HistoryEntry;

export class BattleCheatManager {
  /** Derived from history: maps battleTurn → which sides need healing on that turn. */
  private readonly healMap = new Map<number, { p1: boolean; p2: boolean }>();
  private readonly applied = new Set<string>();

  constructor(history?: FuzzerCheat[]) {
    for (const h of history ?? []) {
      const turnNum = 'turn' in h ? h.turn : h.battleTurn;
      const isP1 = 'side' in h ? h.side === 'p1' : !!h.p1Heal;
      const isP2 = 'side' in h ? h.side === 'p2' : !!h.p2Heal;

      if (!isP1 && !isP2) continue;
      const entry = this.healMap.get(turnNum) ?? { p1: false, p2: false };
      if (isP1) entry.p1 = true;
      if (isP2) entry.p2 = true;
      this.healMap.set(turnNum, entry);
    }
  }

  public getAppliedCheatsCount(): number {
    return this.applied.size;
  }

  public clearAppliedCheats(): void {
    this.applied.clear();
  }

  private executeHeal(battle: Battle, side: Side, key: string, phase: 'PRE' | 'POST'): void {
    try {
      applyHealCheatToSide(side);
      side.pokemon.forEach((p: Pokemon) => {
        if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`);
      });
      syncRequestConditionsWithSimulator(side as unknown as Parameters<typeof syncRequestConditionsWithSimulator>[0]);
      this.applied.add(key);
      console.debug(`[CheatManager-${phase}] Applied heal for ${side.id} at battle.turn=${battle.turn}`); // text-ok
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[CheatManager-${phase}-ERROR] Failed heal for ${side.id}: ${msg}`);
    }
  }

  /** Pre-turn: heal fainted Pokémon before choices are submitted. */
  public applyPreTurnCheats(battle: Battle, isFuzzerSimulation = true): void {
    if (!isFuzzerSimulation) return;
    const entry = this.healMap.get(battle.turn);
    if (!entry) return;
    for (const [sideId, needs] of [['p1', entry.p1], ['p2', entry.p2]] as const) {
      if (!needs) continue;
      const key = `pre-${battle.turn}-${sideId}`;
      if (this.applied.has(key)) continue;
      const side = sideId === 'p1' ? battle.p1 : battle.p2;
      if (side.pokemon.some(p => p.fainted || p.hp <= 0)) {
        this.executeHeal(battle, side, key, 'PRE');
      }
    }
  }

  /** Post-turn: heal Pokémon whose HP dropped critically after choices resolved using unified processIPBHeals. */
  public applyPostTurnCheats(battle: Battle, turnOverride?: number): void {
    const targetTurn = turnOverride !== undefined ? turnOverride : battle.turn;
    const entry = this.healMap.get(targetTurn);
    if (!entry) return;
    const key = `post-${targetTurn}`;
    if (this.applied.has(key)) return;

    if (entry.p1 || entry.p2) {
      if (entry.p1) applyHealCheatToSide(battle.p1);
      if (entry.p2) applyHealCheatToSide(battle.p2);
      if (entry.p1) {
        battle.p1.pokemon.forEach((p: Pokemon) => { if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`); });
        syncRequestConditionsWithSimulator(battle.p1 as unknown as Parameters<typeof syncRequestConditionsWithSimulator>[0]);
      }
      if (entry.p2) {
        battle.p2.pokemon.forEach((p: Pokemon) => { if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`); });
        syncRequestConditionsWithSimulator(battle.p2 as unknown as Parameters<typeof syncRequestConditionsWithSimulator>[0]);
      }
      this.applied.add(key);
    }
  }
}
