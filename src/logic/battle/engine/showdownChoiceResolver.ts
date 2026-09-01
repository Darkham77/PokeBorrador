import type { Pokemon as SimPokemon } from '@pkmn/sim';
import type { ChoiceRequest } from '../helpers/requestHelper.ts';
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
  const pokeObj = targetPoke as Record<string, unknown>; // open-record
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
    const trimmed = explicitChoice.trim().toLowerCase(); // domain-ok
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
  const trimmed = choiceCandidate.trim().toLowerCase(); // domain-ok
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
