/**
 * src/logic/battle/replay/tacticalReplayEngine.ts
 *
 * Tactical Replay Engine for PvP spectator playback.
 * Manages deterministic turn-by-turn stepping and Fog-of-War reveal state.
 */

import type {
  BattleReplayRecord,
  ReplayChoiceStep,
  ReplayCombatantSummary,
  ReplayCombatantPokemonSummary
} from '@/types/battle/pvp.ts';
import type { SideID } from '@pkmn/sim';

export interface FogOfWarPokemonState extends ReplayCombatantPokemonSummary {
  isFainted: boolean;
  isActive: boolean;
}

export interface FogOfWarSideState {
  readonly userId: string;
  readonly username: string;
  readonly tier: string;
  readonly elo: number;
  readonly pokemonList: FogOfWarPokemonState[];
  readonly activePokemon: FogOfWarPokemonState | null;
}

const MOVE_LOG_REGEX = /^\|move\|p([12])[a-d]?:\s*([^|]+)\|([^|]+)/i;
const ABILITY_LOG_REGEX = /^\|-ability\|p([12])[a-d]?:\s*([^|]+)\|([^|]+)/i;
const ITEM_LOG_REGEX = /^\|-(?:item|enditem)\|p([12])[a-d]?:\s*([^|]+)\|([^|]+)/i;
const FAINT_LOG_REGEX = /^\|faint\|p([12])[a-d]?:\s*([^|]+)/i;
const SWITCH_LOG_REGEX = /^\|switch\|p([12])[a-d]?:\s*([^|]+)\|([^|,]+)/i;

export interface ITacticalReplayEngine {
  getRecord(): BattleReplayRecord;
  getCurrentTurn(): number;
  getTotalTurns(): number;
  isPlaying(): boolean;
  isOver(): boolean;
  getWinnerSide(): SideID;
  play(): void;
  pause(): void;
  restart(): void;
  nextTurn(): boolean;
  jumpToTurn(targetTurn: number): void;
  getCurrentStep(): ReplayChoiceStep | null;
  getLogsForCurrentTurn(): readonly string[];
  getAllLogsUpToCurrentTurn(): readonly string[];
  getFogOfWarState(side: SideID): FogOfWarSideState;
}

export class TacticalReplayEngine implements ITacticalReplayEngine {
  private readonly record: BattleReplayRecord;
  private currentTurnIndex: number = 0; // 0 = initial preview, 1..N = after turn N choices
  private playing: boolean = false;

  constructor(record: BattleReplayRecord) {
    this.record = record;
  }

  public getRecord(): BattleReplayRecord {
    return this.record;
  }

  public getCurrentTurn(): number {
    return this.currentTurnIndex;
  }

  public getTotalTurns(): number {
    return this.record.turnsCount;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public isOver(): boolean {
    return this.currentTurnIndex >= this.record.turnsCount;
  }

  public getWinnerSide(): SideID {
    return this.record.winnerSide;
  }

  public play(): void {
    this.playing = true;
  }

  public pause(): void {
    this.playing = false;
  }

  public restart(): void {
    this.currentTurnIndex = 0;
    this.playing = false;
  }

  public nextTurn(): boolean {
    if (this.currentTurnIndex >= this.record.turnsCount) {
      this.playing = false;
      return false;
    }
    this.currentTurnIndex++;
    if (this.currentTurnIndex >= this.record.turnsCount) {
      this.playing = false;
    }
    return true;
  }

  public jumpToTurn(targetTurn: number): void {
    this.currentTurnIndex = Math.max(0, Math.min(this.record.turnsCount, Math.floor(targetTurn)));
    if (this.currentTurnIndex >= this.record.turnsCount) {
      this.playing = false;
    }
  }

  public getCurrentStep(): ReplayChoiceStep | null {
    if (this.currentTurnIndex <= 0) return null;
    return this.record.choiceStream[this.currentTurnIndex - 1] ?? null;
  }

  public getLogsForCurrentTurn(): readonly string[] {
    const step = this.getCurrentStep();
    return step ? step.logLines : [];
  }

  public getAllLogsUpToCurrentTurn(): readonly string[] {
    const lines: string[] = [];
    for (let i = 0; i < this.currentTurnIndex; i++) {
      const step = this.record.choiceStream[i];
      if (step?.logLines) {
        lines.push(...step.logLines);
      }
    }
    return lines;
  }

  /**
   * Computes the authentic Fog of War reveal state for a combatant side
   * based on all turns processed up to currentTurnIndex.
   */
  public getFogOfWarState(side: SideID): FogOfWarSideState {
    const summary: ReplayCombatantSummary = side === 'p1' ? this.record.p1 : this.record.p2;
    const sideNum = side === 'p1' ? '1' : '2';

    // Map initial unrevealed list
    const pokemonStates: FogOfWarPokemonState[] = summary.team.map((poke, index) => ({
      species: poke.species,
      name: poke.name,
      level: poke.level,
      sprite: poke.sprite,
      revealedMoves: [],
      revealedItem: undefined,
      revealedAbility: undefined,
      isFainted: false,
      isActive: index === 0 // Lead pokemon starts active
    }));

    const pokeByName = new Map<string, FogOfWarPokemonState>();
    for (const p of pokemonStates) {
      pokeByName.set(p.name.toLowerCase(), p);
      pokeByName.set(String(p.species).toLowerCase(), p);
    }

    const processedLogs = this.getAllLogsUpToCurrentTurn();

    for (const line of processedLogs) {
      const trimmed = line.trim();

      // 1. Move revealed
      const moveMatch = trimmed.match(MOVE_LOG_REGEX);
      if (moveMatch && moveMatch[1] === sideNum && moveMatch[2] && moveMatch[3]) {
        const pokeName = moveMatch[2].trim().toLowerCase();
        const moveName = moveMatch[3].trim();
        const poke = pokeByName.get(pokeName);
        if (poke && !poke.revealedMoves.includes(moveName)) {
          poke.revealedMoves.push(moveName);
        }
      }

      // 2. Ability revealed
      const abilityMatch = trimmed.match(ABILITY_LOG_REGEX);
      if (abilityMatch && abilityMatch[1] === sideNum && abilityMatch[2] && abilityMatch[3]) {
        const pokeName = abilityMatch[2].trim().toLowerCase();
        const abilityName = abilityMatch[3].trim();
        const poke = pokeByName.get(pokeName);
        if (poke && !poke.revealedAbility) {
          poke.revealedAbility = abilityName;
        }
      }

      // 3. Item revealed
      const itemMatch = trimmed.match(ITEM_LOG_REGEX);
      if (itemMatch && itemMatch[1] === sideNum && itemMatch[2] && itemMatch[3]) {
        const pokeName = itemMatch[2].trim().toLowerCase();
        const itemName = itemMatch[3].trim();
        const poke = pokeByName.get(pokeName);
        if (poke && !poke.revealedItem) {
          poke.revealedItem = itemName;
        }
      }

      // 4. Faint detected
      const faintMatch = trimmed.match(FAINT_LOG_REGEX);
      if (faintMatch && faintMatch[1] === sideNum && faintMatch[2]) {
        const pokeName = faintMatch[2].trim().toLowerCase();
        const poke = pokeByName.get(pokeName);
        if (poke) {
          poke.isFainted = true;
          poke.isActive = false;
        }
      }

      // 5. Switch detected
      const switchMatch = trimmed.match(SWITCH_LOG_REGEX);
      if (switchMatch && switchMatch[1] === sideNum && switchMatch[2]) {
        const switchedInName = switchMatch[2].trim().toLowerCase();
        for (const p of pokemonStates) {
          p.isActive = (p.name.toLowerCase() === switchedInName || String(p.species).toLowerCase() === switchedInName);
        }
      }
    }

    const activePoke = pokemonStates.find(p => p.isActive && !p.isFainted) ?? null;

    return {
      userId: summary.userId,
      username: summary.username,
      tier: summary.tier,
      elo: summary.elo,
      pokemonList: pokemonStates,
      activePokemon: activePoke
    };
  }
}
