// src/logic/battle/helpers/showdownBattleAgent.ts
import { ChoiceRequest, classifyRequest } from './requestHelper.ts';

export type ActiveSlotRequest = NonNullable<ChoiceRequest['active']>[number];

export abstract class ShowdownBattleAgent {
  protected turnCount = 0;
  protected justSwitched = false;

  constructor(
    public sideId: 'p1' | 'p2',
    public periodicSwitchEvery: number = 4
  ) {}

  /**
   * Main decision method. Returns a comma-separated choice string suitable for Showdown.
   */
  decide(request: ChoiceRequest | null | undefined): string {
    const kind = classifyRequest(request);
    if (kind === 'none' || kind === 'wait') return 'pass';

    this.turnCount++;
    this.justSwitched = false;

    if (kind === 'team-preview') return 'team 1';

    if (kind === 'force-switch') {
      return this.decideForcedSwitch(request!);
    }

    // Move request
    const activeSlots = request?.active ?? [];
    const isDoubles = activeSlots.length > 1;
    const actions = activeSlots.map((slotReq, slotIdx) => {
      // In doubles, target defaults to adjacent foe 1 (targetLocation = 1) or 2 (targetLocation = 2) if not specified
      const defaultTargetLocation = isDoubles ? (slotIdx === 0 ? 1 : 2) : undefined;
      return this.decideSingleSlot(slotReq, slotIdx, request!, defaultTargetLocation);
    });
    return actions.join(', ') || 'pass';
  }

  /**
   * Decide action for a single active slot. Subclasses can override for custom move policies.
   */
  protected decideSingleSlot(
    slotReq: ActiveSlotRequest,
    _slotIdx: number,
    _fullRequest: ChoiceRequest,
    targetLocation?: number
  ): string {
    // 2. Otherwise pick a random valid move
    if (slotReq.moves && slotReq.moves.length > 0) {
      const validMoves = slotReq.moves.filter(m => !m.disabled && (m.pp === undefined || m.pp > 0));
      const pool = validMoves.length > 0 ? validMoves : slotReq.moves;
      const move = pool[Math.floor(Math.random() * pool.length)];
      const moveIdx = move ? slotReq.moves.indexOf(move) + 1 : 1;
      
      // Showdown accepts at most ONE event modifier per move choice (mega, terastallize, zmove, ultra, etc.)
      let modifier = '';
      const availableModifiers: string[] = [];
      if ((slotReq as unknown as { canMegaEvoX?: boolean }).canMegaEvoX) {
        availableModifiers.push(' megax');
      } else if ((slotReq as unknown as { canMegaEvoY?: boolean }).canMegaEvoY) {
        availableModifiers.push(' megay');
      } else if (slotReq.canMegaEvo) {
        availableModifiers.push(' mega');
      }
      if (slotReq.canTerastallize) availableModifiers.push(' terastallize');
      if ((slotReq as unknown as { canZMove?: boolean }).canZMove) availableModifiers.push(' zmove');
      if ((slotReq as unknown as { canUltraBurst?: boolean }).canUltraBurst) availableModifiers.push(' ultra');
      if ((slotReq as unknown as { canDynamax?: boolean }).canDynamax) availableModifiers.push(' dynamax');

      if (availableModifiers.length > 0 && Math.random() < 0.5) {
        modifier = availableModifiers[Math.floor(Math.random() * availableModifiers.length)] || '';
      }

      const targetStr = targetLocation !== undefined ? ` ${targetLocation}` : '';
      
      return `move ${moveIdx}${targetStr}${modifier}`;
    }

    return 'pass';
  }

  /**
   * Select candidate for a forced switch slot.
   */
  protected decideForcedSwitch(request: ChoiceRequest): string {
    const forceSwitchList = request.forceSwitch ?? [];
    const team = request.side?.pokemon ?? [];
    const chosenIndices = new Set<number>();

    const actions = forceSwitchList.map((mustSwitch, slotIdx) => {
      if (!mustSwitch) return 'pass';
      const isObjReviving = typeof mustSwitch === 'object' && Boolean((mustSwitch as unknown as { reviving?: boolean }).reviving);
      const slotPoke = team[slotIdx];
      const isPokeReviving = Boolean(slotPoke && (slotPoke as unknown as { reviving?: boolean }).reviving);
      const isReviving = isObjReviving || isPokeReviving;
      
      // Find the first valid bench pokemon (fainted if reviving, non-fainted otherwise) that hasn't been chosen yet
      const targetIdx = team.findIndex((p, idx) => {
        if (p.active || chosenIndices.has(idx)) return false;
        const fainted = this.isFainted(p.condition);
        return isReviving ? fainted : !fainted;
      });
      if (targetIdx !== -1) {
        chosenIndices.add(targetIdx);
        return `switch ${targetIdx + 1}`;
      }
      return 'pass';
    });

    return actions.join(', ');
  }

  protected isTrapped(slotReq: ActiveSlotRequest): boolean {
    return !!(slotReq.trapped || slotReq.maybeTrapped);
  }

  protected isFainted(condition?: string): boolean {
    return !!condition?.endsWith(' fnt');
  }

  protected findBenchCandidate(team: NonNullable<ChoiceRequest['side']>['pokemon']): number | null {
    for (let i = 0; i < team.length; i++) {
      const mon = team[i]!;
      if (!mon.active && !this.isFainted(mon.condition)) return i + 1;
    }
    return null;
  }
}
