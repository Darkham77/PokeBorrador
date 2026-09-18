import type { Battle, Side, Pokemon, SideID } from '@pkmn/sim';
import { classifyRequest, requiresAction, type ChoiceRequest } from '../helpers/requestHelper.ts';
import { getFirstValidMoveSlot } from '../helpers/showdownMoveChoiceHelper.ts';
import { applyHealCheatToSide, syncRequestConditionsWithSimulator } from '../cheats.ts';
import type { BattleCheatManager, CertifiedCheatHistoryStep } from '../helpers/battleCheatManager.ts';

const CRITICAL_HP_THRESHOLD_RATIO = 0.3 as const;

export interface BattleCheatRecord {
  turn: number;
  side: SideID;
  type: 'heal';
}

export interface BattleAgent {
  decide(request: ChoiceRequest | null | undefined): string;
}

export interface TurnExecutionInput {
  p1Choice?: string;
  p2Choice?: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  p1UsedBattleItem?: boolean;
  p1Agent?: BattleAgent;
  p2Agent?: BattleAgent;
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weather?: string;
  ipbActive?: boolean;
  certifiedHistoryStep?: CertifiedCheatHistoryStep;
}

export interface BattleSeat {
  id: string;
  side: Side;
  choice: string;
  skip: boolean;
  mustAct: boolean;
}

export function sanitizeExplicitSwitchChoice(trimmed: string, side: Side, reqKind: string): string | undefined {
  const switchMatch = /^switch\s+(\d+)$/.exec(trimmed);
  if (!switchMatch) return trimmed;
  const targetSlot = parseInt(switchMatch[1]!, 10);
  const targetPoke = side.pokemon[targetSlot - 1];
  const isFnt = targetPoke && (targetPoke.fainted || targetPoke.hp <= 0);
  const isAct = targetPoke && side.active.includes(targetPoke);
  if (!isFnt && !isAct) return trimmed;
  if (reqKind === 'move') {
    const activeReqMoves = (side.activeRequest && 'active' in side.activeRequest && Array.isArray(side.activeRequest.active?.[0]?.moves)) ? side.activeRequest.active[0]!.moves : [];
    return getFirstValidMoveSlot(activeReqMoves);
  }
  return undefined;
}

export function sanitizeSeatChoiceInput(explicit: string | undefined, side: Side, reqKind: string, isForce: boolean): string | undefined {
  if (!explicit) return undefined;
  const trimmed = explicit.trim().toLowerCase();
  if (isForce && trimmed.startsWith('move ')) return undefined;
  return sanitizeExplicitSwitchChoice(trimmed, side, reqKind);
}

export function buildTurnSeats(
  battle: Battle,
  input: TurnExecutionInput,
  resolveChoice: (seatId: SideID, req: unknown, explicit?: string, agent?: BattleAgent) => string
): BattleSeat[] {
  const inputBySeat: Record<string, { explicit?: string; agent?: BattleAgent; skip: boolean }> = {
    p1: { explicit: input.p1Choice, agent: input.p1Agent, skip: Boolean(input.p1Skip) },
    p2: { explicit: input.p2Choice, agent: input.p2Agent, skip: Boolean(input.p2Skip) },
    p3: { explicit: undefined, agent: input.p2Agent, skip: false },
    p4: { explicit: undefined, agent: input.p2Agent, skip: false },
  };

  const hasAnyForceSwitch = battle.sides.some(s => {
    if (!s) return false;
    const k = classifyRequest(s.activeRequest);
    return k === 'force-switch' || k === 'revive-target';
  });

  return battle.sides
    .filter((side): side is Side => Boolean(side))
    .map(side => {
      const seatId = side.id as SideID;
      const reqKind = classifyRequest(side.activeRequest);
      const isForce = reqKind === 'force-switch' || reqKind === 'revive-target';
      const mustAct = reqKind === 'wait'
        ? false
        : (hasAnyForceSwitch ? isForce : requiresAction(side.activeRequest));
      const seatInput = inputBySeat[seatId] ?? { skip: false };
      const explicitToUse = sanitizeSeatChoiceInput(seatInput.explicit, side, reqKind, isForce);
      const choice = (mustAct && !seatInput.skip) ? resolveChoice(seatId, side.activeRequest, explicitToUse, seatInput.agent) : 'pass';
      return { id: seatId, side, choice, skip: !mustAct || seatInput.skip || choice === 'pass', mustAct };
    });
}

export function applyPostTurnHealing(
  battle: Battle,
  isReplayer: boolean,
  cheatManager: BattleCheatManager,
  input: TurnExecutionInput,
  appliedCheats: BattleCheatRecord[]
): void {
  if (isReplayer) {
    cheatManager.applyPostTurnCheats(battle, input.certifiedHistoryStep);
  } else if (input.ipbActive !== false) {
    for (const side of battle.sides) {
      const sideId = side.id as SideID;
      const activeMon = side.active?.[0];
      if (activeMon && !activeMon.fainted && activeMon.hp <= activeMon.maxhp * CRITICAL_HP_THRESHOLD_RATIO) {
        applyHealCheatToSide(side);
        side.pokemon.forEach((p: Pokemon) => {
          if (p) battle.add('-heal', p, `${p.hp}/${p.maxhp}`);
        });
        syncRequestConditionsWithSimulator(side);
        appliedCheats.push({ turn: battle.turn, side: sideId, type: 'heal' });
      }
    }
  }
}
