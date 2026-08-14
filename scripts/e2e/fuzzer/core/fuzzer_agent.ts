import { ChoiceRequest, RequestKind, classifyRequest, type ChoiceRequestPokemon } from '../../../../src/logic/battle/helpers/requestHelper.ts';
import { ShowdownBattleAgent, ActiveSlotRequest } from '../../../../src/logic/battle/helpers/showdownBattleAgent.ts';
import { Dex } from '@pkmn/sim';

export type SidePokemon = ChoiceRequestPokemon;

export type { ChoiceRequest, RequestKind };
export { classifyRequest };

interface FinishingMoveRequest {
  id: string;
  disabled?: boolean | string;
  pp?: number;
}

function isAvailableMove(move: FinishingMoveRequest): boolean {
  return !move.disabled && (move.pp === undefined || move.pp > 0);
}

export function selectNaturalFinishingMoveIndex(moves: readonly FinishingMoveRequest[]): number {
  let selectedIndex = -1;
  let selectedPower = -1;
  for (let index = 0; index < moves.length; index++) {
    const move = moves[index];
    if (!move || !isAvailableMove(move)) continue;
    const power = Dex.moves.get(move.id).basePower;
    if (power > selectedPower) {
      selectedIndex = index;
      selectedPower = power;
    }
  }
  return selectedIndex;
}

import type { SideID } from '@pkmn/sim';

export class BattleAgent extends ShowdownBattleAgent {
  public failedSwitches = new Set<number>();

  constructor(
    sideId: SideID,
    public movesToTest: Set<string> = new Set(),
    public abilityTriggerMoveSlot: number | null = null,
    periodicSwitchEvery: number = 4,
    public useItemsEnabled: boolean = true,
    private voluntarySwitchObjective: boolean = false,
    public abilityObjectives: Set<string> = new Set()
  ) {
    super(sideId, periodicSwitchEvery);
  }

  override decide(request: ChoiceRequest | null | undefined): string {
    return super.decide(request);
  }

  protected override decideSingleSlot(
    slotReq: ActiveSlotRequest,
    slotIdx: number,
    fullRequest: ChoiceRequest,
    targetLocation?: number
  ): string {
    const team = fullRequest.side?.pokemon ?? [];
    const activePokemonList = team.filter((p: SidePokemon) => p.active);
    const activePoke = activePokemonList[slotIdx] || team[slotIdx] || team[0];
    const isTrapped = this.isTrapped(slotReq);
    const moves = slotReq.moves ?? [];
    const isLockedInMove = moves.length > 0 && moves.every(m => m.disabled);
    const cannotSwitch = isTrapped || isLockedInMove;

    if (this.voluntarySwitchObjective && !cannotSwitch && !this.justSwitched && team.length > 1) {
      const switchTarget = this.findBenchCandidate(team);
      if (switchTarget !== null && !this.failedSwitches.has(switchTarget)) {
        this.voluntarySwitchObjective = false;
        this.justSwitched = true;
        return `switch ${switchTarget}`;
      }
    }

    // Periodic voluntary switch (ONLY while there are pending moves to test)
    if (
      !cannotSwitch &&
      !this.justSwitched &&
      this.movesToTest.size > 0 &&
      this.periodicSwitchEvery > 0 &&
      this.turnCount % this.periodicSwitchEvery === 0 &&
      team.length > 1
    ) {
      const switchTarget = this.findBenchCandidate(team);
      if (switchTarget !== null && !this.failedSwitches.has(switchTarget)) {
        this.justSwitched = true;
        return `switch ${switchTarget}`;
      }
    }

    // Auto-switch if active exhausted test moves but bench has pending ones
    const activeHasPending = (activePoke?.moves ?? []).some((m: string) => this.movesToTest.has(toCleanId(m)));
    if (!cannotSwitch && !activeHasPending && this.abilityObjectives.size > 0 && !this.justSwitched) {
      for (let index = 0; index < team.length; index++) {
        const candidate = team[index]!;
        const switchIndex = index + 1;
        if (!candidate.active && !this.isFainted(candidate) && this.abilityObjectives.has(toCleanId(candidate.ability ?? ''))) {
          this.justSwitched = true;
          return `switch ${switchIndex}`;
        }
      }
    }
    if (!cannotSwitch && !activeHasPending && this.movesToTest.size > 0 && !this.justSwitched) {
      for (let i = 0; i < team.length; i++) {
        const mon = team[i]!;
        const switchIdx = i + 1;
        if (!mon.active && !this.isFainted(mon) && !this.failedSwitches.has(switchIdx)) {
          const hasPending = (mon.moves ?? []).some((m: string) => this.movesToTest.has(toCleanId(m)));
          if (hasPending) {
            this.justSwitched = true;
            return `switch ${switchIdx}`;
          }
        }
      }
    }

    const isAvailable = isAvailableMove;

    // Trigger slot override
    if (this.movesToTest.size > 0 && this.abilityTriggerMoveSlot !== null) {
      const triggerIdx = this.abilityTriggerMoveSlot - 1;
      const trigger = moves[triggerIdx];
      if (trigger && isAvailable(trigger)) {
        return `move ${this.abilityTriggerMoveSlot}${targetLocation ? ` ${targetLocation}` : ''}`;
      }
    }

    // Prioritize pending moves to test
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]!;
      if (isAvailable(m)) {
        const id = toCleanId(m.id);
        if (this.movesToTest.has(id)) {
          this.movesToTest.delete(id);
          return `move ${i + 1}${targetLocation ? ` ${targetLocation}` : ''}`;
        }
      }
    }

    // After objective coverage, continue with the strongest legal damaging move
    // until Showdown ends the battle naturally; no turn cutoff is involved.
    const finishingMoveIndex = selectNaturalFinishingMoveIndex(moves);
    if (finishingMoveIndex !== -1) {
      return `move ${finishingMoveIndex + 1}${targetLocation ? ` ${targetLocation}` : ''}`;
    }

    return super.decideSingleSlot(slotReq, slotIdx, fullRequest, targetLocation);
  }

  protected override decideForcedSwitch(request: ChoiceRequest): string {
    this.failedSwitches.clear();
    return super.decideForcedSwitch(request);
  }
}

function toCleanId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}
