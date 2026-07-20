import type { Battle, Side, Pokemon } from '@pkmn/sim';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';

export interface FuzzerCheat {
  turn: number;
  side: 'p1' | 'p2';
  type: 'heal';
}

export class BattleCheatManager {
  private cheats: FuzzerCheat[] = [];
  private appliedCheats = new Set<string>();

  constructor(cheats?: FuzzerCheat[]) {
    if (cheats && Array.isArray(cheats)) {
      this.cheats = cheats;
    }
  }

  public getAppliedCheatsCount(): number {
    return this.appliedCheats.size;
  }

  public clearAppliedCheats(): void {
    this.appliedCheats.clear();
  }

  private executeHealCheat(battle: Battle, sideObj: Side, key: string, phase: 'PRE' | 'POST'): void {
    try {
      applyHealCheatToSide(sideObj);
      sideObj.pokemon.forEach((p: Pokemon) => {
        if (p) {
          const healthStr = `${p.hp}/${p.maxhp}`;
          battle.add('-heal', p, healthStr);
        }
      });
      syncRequestConditionsWithSimulator(sideObj as unknown as Parameters<typeof syncRequestConditionsWithSimulator>[0]);
      this.appliedCheats.add(key);
      console.debug(`[CheatManager-${phase}] Applied ${phase.toLowerCase()}-turn cheat ${key} on side ${sideObj.id} for turn ${key.split('-')[0]} (battle.turn: ${battle.turn})`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[CheatManager-${phase}-ERROR] Failed to apply cheat ${key}: ${errMsg}`);
    }
  }

  /**
   * Evaluates and applies pre-turn cheats.
   */
  public applyPreTurnCheats(battle: Battle, isFuzzerSimulation = true): void {
    if (!isFuzzerSimulation) return;
    for (let i = 0; i < this.cheats.length; i++) {
      const ch = this.cheats[i];
      if (!ch) continue;

      const key = `${ch.turn}-${ch.side}-${ch.type}`;
      if (ch.turn === battle.turn && ch.type === 'heal' && !this.appliedCheats.has(key)) {
        const sideObj = ch.side === 'p1' ? battle.p1 : battle.p2;
        const hasFainted = sideObj.pokemon.some(p => p.fainted || p.hp <= 0);
        if (hasFainted) {
          this.executeHealCheat(battle, sideObj, key, 'PRE');
        }
      }
    }
  }

  /**
   * Evaluates and applies post-turn cheats.
   * Post-turn cheats are checked after choices resolve, comparing against turnBeforeP1 (the turn number before choices were executed).
   */
  public applyPostTurnCheats(battle: Battle, turnBeforeP1: number): void {
    for (let i = 0; i < this.cheats.length; i++) {
      const ch = this.cheats[i];
      if (!ch) continue;

      const key = `${ch.turn}-${ch.side}-${ch.type}`;
      console.debug(`[CheatManager-POST-DEBUG] Evaluating post-turn cheat ${key}: ch.turn=${ch.turn}, turnBeforeP1=${turnBeforeP1}, battle.turn=${battle.turn}, applied=${this.appliedCheats.has(key)}`);
      
      if (ch.turn === turnBeforeP1 && ch.type === 'heal' && !this.appliedCheats.has(key)) {
        const sideObj = ch.side === 'p1' ? battle.p1 : battle.p2;
        this.executeHealCheat(battle, sideObj, key, 'POST');
      }
    }
  }
}
