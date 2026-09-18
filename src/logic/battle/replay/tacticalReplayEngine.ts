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
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService.ts';
import type { SideID } from '@pkmn/sim';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex.ts';

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

function createInitialFogOfWarPokemonStates(summary: ReplayCombatantSummary): FogOfWarPokemonState[] {
  return summary.team.map((poke, index) => {
    const legacyPoke = poke as { id?: PokemonSpeciesId; speciesId?: PokemonSpeciesId };
    const resolvedId = legacyPoke.id ?? legacyPoke.speciesId;
    return {
      id: (resolvedId ?? poke.id),
      name: poke.name || resolvedId || '',
      level: poke.level,
      sprite: poke.sprite || (resolvedId ? getAssetUrl(ASSET_TYPES.POKEMON, resolvedId) : ''),
      revealedMoves: poke.revealedMoves ? [...poke.revealedMoves] : [],
      revealedItem: poke.revealedItem,
      revealedAbility: poke.revealedAbility,
      isFainted: false,
      isActive: index === 0 // Lead pokemon starts active
    };
  });
}

function buildPokeLookupMap(pokemonStates: FogOfWarPokemonState[]): Map<string, FogOfWarPokemonState> {
  const map = new Map<string, FogOfWarPokemonState>();
  for (const p of pokemonStates) {
    if (p.name) map.set(p.name.toLowerCase(), p);
    if (p.id) map.set(String(p.id).toLowerCase(), p);
  }
  return map;
}

function handleFogOfWarMoveMatch(
  trimmed: string,
  sideNum: string,
  pokeByName: Map<string, FogOfWarPokemonState>
): boolean {
  const match = trimmed.match(MOVE_LOG_REGEX);
  if (!match || match[1] !== sideNum || !match[2] || !match[3]) return false;
  const pokeName = match[2].trim().toLowerCase();
  const moveName = match[3].trim();
  const poke = pokeByName.get(pokeName);
  if (poke && !poke.revealedMoves.includes(moveName)) {
    poke.revealedMoves.push(moveName);
  }
  return true;
}

function handleFogOfWarAbilityMatch(
  trimmed: string,
  sideNum: string,
  pokeByName: Map<string, FogOfWarPokemonState>
): boolean {
  const match = trimmed.match(ABILITY_LOG_REGEX);
  if (!match || match[1] !== sideNum || !match[2] || !match[3]) return false;
  const pokeName = match[2].trim().toLowerCase();
  const abilityName = match[3].trim();
  const poke = pokeByName.get(pokeName);
  if (poke && !poke.revealedAbility) {
    poke.revealedAbility = abilityName;
  }
  return true;
}

function handleFogOfWarItemMatch(
  trimmed: string,
  sideNum: string,
  pokeByName: Map<string, FogOfWarPokemonState>
): boolean {
  const match = trimmed.match(ITEM_LOG_REGEX);
  if (!match || match[1] !== sideNum || !match[2] || !match[3]) return false;
  const pokeName = match[2].trim().toLowerCase();
  const itemName = match[3].trim();
  const poke = pokeByName.get(pokeName);
  if (poke && !poke.revealedItem) {
    poke.revealedItem = itemName;
  }
  return true;
}

function handleFogOfWarFaintMatch(
  trimmed: string,
  sideNum: string,
  pokeByName: Map<string, FogOfWarPokemonState>
): boolean {
  const match = trimmed.match(FAINT_LOG_REGEX);
  if (!match || match[1] !== sideNum || !match[2]) return false;
  const pokeName = match[2].trim().toLowerCase();
  const poke = pokeByName.get(pokeName);
  if (poke) {
    poke.isFainted = true;
    poke.isActive = false;
  }
  return true;
}

function handleFogOfWarSwitchMatch(
  trimmed: string,
  sideNum: string,
  pokemonStates: FogOfWarPokemonState[]
): boolean {
  const match = trimmed.match(SWITCH_LOG_REGEX);
  if (!match || match[1] !== sideNum || !match[2]) return false;
  const switchedInName = match[2].trim().toLowerCase();
  for (const p of pokemonStates) {
    p.isActive = Boolean(
      (p.name && p.name.toLowerCase() === switchedInName) ||
      (p.id && String(p.id).toLowerCase() === switchedInName)
    );
  }
  return true;
}

function applyFogOfWarLogLine(
  trimmed: string,
  sideNum: string,
  pokeByName: Map<string, FogOfWarPokemonState>,
  pokemonStates: FogOfWarPokemonState[]
): void {
  if (handleFogOfWarMoveMatch(trimmed, sideNum, pokeByName)) return;
  if (handleFogOfWarAbilityMatch(trimmed, sideNum, pokeByName)) return;
  if (handleFogOfWarItemMatch(trimmed, sideNum, pokeByName)) return;
  if (handleFogOfWarFaintMatch(trimmed, sideNum, pokeByName)) return;
  handleFogOfWarSwitchMatch(trimmed, sideNum, pokemonStates);
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

    const pokemonStates = createInitialFogOfWarPokemonStates(summary);
    const pokeByName = buildPokeLookupMap(pokemonStates);
    const processedLogs = this.getAllLogsUpToCurrentTurn();

    for (const line of processedLogs) {
      applyFogOfWarLogLine(line.trim(), sideNum, pokeByName, pokemonStates);
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
