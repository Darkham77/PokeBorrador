import type { Pokemon as SimPokemon, Battle, Side } from '@pkmn/sim';
import { type ChoiceRequest, classifyRequest } from '../helpers/requestHelper.ts';
import { resolveValidMoveChoice, getFirstValidMoveSlot } from '../helpers/showdownMoveChoiceHelper.ts';

export interface RequestPokemonItem {
  ident?: string;
  condition?: string;
  active?: boolean;
  fainted?: boolean;
}

export function isPokemonFaintedOrActive(
  targetPoke: unknown,
  activeList: unknown[]
): { isFnt: boolean; isAct: boolean } {
  if (!targetPoke || typeof targetPoke !== 'object') {
    return { isFnt: false, isAct: false };
  }
  const pokeObj = targetPoke as Record<string, unknown>; // open-record: Generic key-value data dictionary container
  const isFnt = typeof pokeObj.fainted === 'boolean'
    ? pokeObj.fainted
    : (typeof pokeObj.condition === 'string' ? pokeObj.condition.includes('fnt') : false);
  const isAct = typeof pokeObj.active === 'boolean'
    ? pokeObj.active
    : activeList.includes(targetPoke as SimPokemon);
  return { isFnt, isAct };
}

export function resolveExplicitChoiceHelper(
  explicitChoice: string,
  isForceSwitch: boolean,
  simPokemons: unknown[],
  requestPokemons: unknown[],
  activeList: unknown[],
  effectiveReq: ChoiceRequest | null | undefined
): string | undefined {
  if (isForceSwitch) {
    const trimmed = explicitChoice.trim().toLowerCase(); // domain-ok: Open dynamic text or non-domain string payload
    const switchMatch = /^switch\s+(\d+)$/.exec(trimmed);
    if (switchMatch) {
      const targetSlot = parseInt(switchMatch[1]!, 10);
      const targetPoke = simPokemons[targetSlot - 1] ?? requestPokemons[targetSlot - 1];
      if (targetPoke) {
        const { isFnt, isAct } = isPokemonFaintedOrActive(targetPoke, activeList);
        if (!isFnt && !isAct) {
          return explicitChoice;
        }
      } else {
        return explicitChoice;
      }
    }
    return undefined;
  }
  const activeMoves = (effectiveReq && 'active' in effectiveReq && Array.isArray(effectiveReq.active?.[0]?.moves)) ? effectiveReq.active[0]!.moves : [];
  return resolveValidMoveChoice(explicitChoice, activeMoves);
}

export function resolveForceSwitchFallback(
  reqKind: string,
  simPokemons: SimPokemon[],
  requestPokemons: RequestPokemonItem[],
  activeList: SimPokemon[]
): string {
  const isReviving = reqKind === 'revive-target';
  const targetIdx = simPokemons.length > 0
    ? simPokemons.findIndex(p => p && !activeList.includes(p) && (isReviving ? (p.fainted || p.hp === 0) : (!p.fainted && p.hp > 0)))
    : (requestPokemons as RequestPokemonItem[]).findIndex(p => p && !p.active && (isReviving ? (p.fainted || String(p.condition ?? '').includes('fnt')) : (!p.fainted && !String(p.condition ?? '').includes('fnt'))));

  if (targetIdx !== -1) {
    return `switch ${targetIdx + 1}`;
  }
  const hasAnyLiving = simPokemons.length > 0
    ? simPokemons.some(p => p && !p.fainted && p.hp > 0)
    : (requestPokemons as RequestPokemonItem[]).some(p => p && !p.fainted && !String(p?.condition ?? '').includes('fnt'));
  if (!hasAnyLiving) {
    return 'pass';
  }
  return 'default';
}

export function resolveReplayerCandidate(
  choiceCandidate: string,
  reqKind: string,
  effectiveReq: ChoiceRequest | null | undefined,
  simPokemons: SimPokemon[],
  requestPokemons: RequestPokemonItem[],
  activeList: SimPokemon[]
): string {
  const activeMoves = (effectiveReq && 'active' in effectiveReq && Array.isArray(effectiveReq.active?.[0]?.moves)) ? effectiveReq.active[0]!.moves : [];
  const trimmed = choiceCandidate.trim().toLowerCase(); // domain-ok: Open dynamic text or non-domain string payload
  if (trimmed.startsWith('move ')) {
    return resolveValidMoveChoice(choiceCandidate, activeMoves);
  }
  const switchMatch = /^switch\s+(\d+)$/.exec(trimmed);
  if (switchMatch) {
    const targetSlot = parseInt(switchMatch[1]!, 10);
    const targetPoke = simPokemons[targetSlot - 1] ?? (requestPokemons[targetSlot - 1] as RequestPokemonItem | undefined);
    const { isFnt, isAct } = isPokemonFaintedOrActive(targetPoke, activeList);
    if (isFnt || isAct) {
      if (reqKind === 'move') {
        return getFirstValidMoveSlot(activeMoves);
      }
      const validBenchIdx = simPokemons.findIndex(p => p && !activeList.includes(p) && !p.fainted && p.hp > 0);
      if (validBenchIdx !== -1) {
        return `switch ${validBenchIdx + 1}`;
      }
      return 'default';
    }
  }
  return choiceCandidate;
}

const SEAT_INDEX_MAP: Readonly<Record<string, number>> = { p1: 0, p2: 1, p3: 2, p4: 3 };

export function extractSeatSide(battle: Battle | undefined, seatId: string): Side | undefined {
  return battle?.sides.find(s => s && s.id === seatId)
    ?? (SEAT_INDEX_MAP[seatId] !== undefined ? battle?.sides[SEAT_INDEX_MAP[seatId]!] : undefined);
}

export function resolveEffectiveRequestKind(effectiveReq: ChoiceRequest | null | undefined, sideObj: Side | undefined): string {
  const baseKind = classifyRequest(effectiveReq);
  if (baseKind !== 'none') return baseKind;
  if (sideObj?.requestState === 'switch') return 'force-switch';
  if (sideObj?.requestState === 'move') return 'move';
  return 'none';
}

export function resolveCandidateOrFallback(
  choiceCandidate: string | undefined,
  isForceSwitch: boolean,
  reqKind: string,
  effectiveReq: ChoiceRequest | null | undefined,
  simPokemons: SimPokemon[],
  requestPokemons: Array<{ ident?: string; details?: string; active?: boolean; condition?: string }>,
  activeList: (SimPokemon | null)[]
): string | undefined {
  if (isForceSwitch) {
    if (choiceCandidate !== undefined) {
      const validatedChoice = resolveExplicitChoiceHelper(choiceCandidate, true, simPokemons, requestPokemons, activeList, effectiveReq);
      if (validatedChoice !== undefined) return validatedChoice;
    }
    return resolveForceSwitchFallback(reqKind, simPokemons, requestPokemons, activeList as SimPokemon[]);
  }

  if (choiceCandidate !== undefined) {
    return resolveReplayerCandidate(choiceCandidate, reqKind, effectiveReq, simPokemons, requestPokemons, activeList as SimPokemon[]);
  }

  return undefined;
}

export function advanceSeatReplayerCandidate(
  mode: string,
  seatChoices: Map<string, string[]>,
  choiceIdx: Map<string, number>,
  seatId: string
): string | undefined {
  if (mode !== 'replayer') return undefined;
  const choicesList = seatChoices.get(seatId) ?? [];
  const currentIdx = choiceIdx.get(seatId) ?? 0;
  if (currentIdx < choicesList.length) {
    const candidate = choicesList[currentIdx];
    choiceIdx.set(seatId, currentIdx + 1);
    return candidate;
  }
  return undefined;
}

export function consumeCertifiedChoice(
  mode: string,
  seatChoices: Map<string, string[]>,
  choiceIdx: Map<string, number>,
  seatId: string,
  activeRequest: ChoiceRequest | null | undefined
): string {
  const choicesList = seatChoices.get(seatId) ?? [];
  const currentIdx = choiceIdx.get(seatId) ?? 0;

  if (currentIdx >= choicesList.length) {
    throw new Error(`[ShowdownBattleEngine] Required certified choice is missing. context=${JSON.stringify({ seat: seatId, choiceIndex: currentIdx, choiceCount: choicesList.length, activeRequest, mode })}`);
  }

  const rawChoice = choicesList[currentIdx] as string;

  if (!rawChoice || rawChoice.trim().length === 0) {
    throw new Error(`[ShowdownBattleEngine] Required certified choice is empty. context=${JSON.stringify({ seat: seatId, choiceIndex: currentIdx, choiceCount: choicesList.length, activeRequest, mode })}`);
  }

  choiceIdx.set(seatId, currentIdx + 1);
  return rawChoice;
}
