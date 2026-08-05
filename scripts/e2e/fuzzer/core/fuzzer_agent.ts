import { ChoiceRequest, RequestKind, classifyRequest, type ChoiceRequestPokemon } from '../../../../src/logic/battle/helpers/requestHelper.ts';
import { ShowdownBattleAgent, ActiveSlotRequest } from '../../../../src/logic/battle/helpers/showdownBattleAgent.ts';

export type SidePokemon = ChoiceRequestPokemon;

export type { ChoiceRequest, RequestKind };
export { classifyRequest };

export class BattleAgent extends ShowdownBattleAgent {
  public failedSwitches = new Set<number>();

  constructor(
    sideId: 'p1' | 'p2',
    public movesToTest: Set<string> = new Set(),
    public abilityTriggerMoveSlot: number | null = null,
    periodicSwitchEvery: number = 4,
    public useItemsEnabled: boolean = true
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
    if (!cannotSwitch && !activeHasPending && this.movesToTest.size > 0 && !this.justSwitched) {
      for (let i = 0; i < team.length; i++) {
        const mon = team[i]!;
        const switchIdx = i + 1;
        if (!mon.active && !this.isFainted(mon.condition) && !this.failedSwitches.has(switchIdx)) {
          const hasPending = (mon.moves ?? []).some((m: string) => this.movesToTest.has(toCleanId(m)));
          if (hasPending) {
            this.justSwitched = true;
            return `switch ${switchIdx}`;
          }
        }
      }
    }

    const isAvailable = (m: { disabled?: boolean | string; pp?: number }) => {
      if (m.disabled) return false;
      if (m.pp !== undefined && m.pp <= 0) return false;
      return true;
    };

    // Trigger slot override
    if (this.abilityTriggerMoveSlot !== null) {
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

    // All objectives dispatched — pick the first non-disabled move deterministically.
    // Prefer non-self-switching moves to avoid infinite Shed Tail / Baton Pass switch loops.
    const SELF_SWITCHING_MOVES = new Set(['shedtail', 'batonpass', 'uturn', 'voltswitch', 'teleport', 'partingshot', 'chillyreception', 'flipturn']);
    const nonSwitchingIndex = moves.findIndex(m => isAvailable(m) && !SELF_SWITCHING_MOVES.has(toCleanId(m.id)));
    const firstValidIndex = moves.findIndex(m => isAvailable(m));
    if (firstValidIndex !== -1) {
      const chosenIdx = nonSwitchingIndex !== -1 ? nonSwitchingIndex : firstValidIndex;
      return `move ${chosenIdx + 1}${targetLocation ? ` ${targetLocation}` : ''}`;
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
