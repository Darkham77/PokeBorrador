import { ChoiceRequest, RequestKind, classifyRequest } from '../../../../src/logic/battle/helpers/requestHelper.ts';
import { ShowdownBattleAgent, ActiveSlotRequest } from '../../../../src/logic/battle/helpers/showdownBattleAgent.ts';

export interface SidePokemon {
  ident: string;
  details: string;
  condition: string;
  active: boolean;
  stats: { hp: number };
  moves: string[];
  ability: string;
}

export type { ChoiceRequest, RequestKind };
export { classifyRequest };

export class BattleAgent extends ShowdownBattleAgent {
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

    // Periodic voluntary switch
    if (
      !isTrapped &&
      !this.justSwitched &&
      this.periodicSwitchEvery > 0 &&
      this.turnCount % this.periodicSwitchEvery === 0 &&
      team.length > 1
    ) {
      const switchTarget = this.findBenchCandidate(team);
      if (switchTarget !== null) {
        this.justSwitched = true;
        return `switch ${switchTarget}`;
      }
    }

    // Auto-switch if active exhausted test moves but bench has pending ones
    const activeHasPending = activePoke?.moves.some((m: string) => this.movesToTest.has(toCleanId(m)));
    if (!isTrapped && !activeHasPending && this.movesToTest.size > 0 && !this.justSwitched) {
      for (let i = 0; i < team.length; i++) {
        const mon = team[i]!;
        if (!mon.active && !this.isFainted(mon.condition)) {
          const hasPending = mon.moves.some((m: string) => this.movesToTest.has(toCleanId(m)));
          if (hasPending) {
            this.justSwitched = true;
            return `switch ${i + 1}`;
          }
        }
      }
    }

    const moves = slotReq.moves ?? [];

    // Trigger slot override
    if (this.abilityTriggerMoveSlot !== null) {
      const triggerIdx = this.abilityTriggerMoveSlot - 1;
      const trigger = moves[triggerIdx];
      if (trigger && !trigger.disabled && (trigger.pp ?? 0) > 0) {
        return `move ${this.abilityTriggerMoveSlot}${targetLocation ? ` ${targetLocation}` : ''}`;
      }
    }

    // Prioritize pending moves to test
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i]!;
      if (!m.disabled && (m.pp ?? 0) > 0) {
        const id = toCleanId(m.id);
        if (this.movesToTest.has(id)) {
          this.movesToTest.delete(id);
          return super.decideSingleSlot(slotReq, slotIdx, fullRequest, targetLocation);
        }
      }
    }

    return super.decideSingleSlot(slotReq, slotIdx, fullRequest, targetLocation);
  }
}

function toCleanId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}
