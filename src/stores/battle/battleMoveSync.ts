import { getActivePinia } from 'pinia';

import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { logger } from '@/logic/utils/logger';
import { useGameStore } from '@/stores/game';
import type { BattleState, BattleSide, ShowdownPlayerRequest } from '@/types/battle/battle';
import type { Move } from '@/types/pokemon/pokemon';

type RequestMoveItem = NonNullable<
  NonNullable<ShowdownPlayerRequest['active']>[number]['moves']
>[number];

const MAX_ACTIVE_MOVES = 4;

function isStaleRequest(request: BattleState['playerRequest'], pokeUid: string): boolean {
  const activeReqMon =
    request?.side?.pokemon?.find((p) => p && p.active) || request?.side?.pokemon?.[0];
  const monUid = (activeReqMon as { uid?: string } | undefined)?.uid;
  return Boolean(monUid && monUid !== pokeUid);
}

function buildTransformedMoves(reqMoves: readonly RequestMoveItem[]): Move[] {
  const transformedMoves: Move[] = [];
  for (const reqMove of reqMoves) {
    if (!reqMove?.id) continue;
    const md = pokemonDataProvider.getMoveData(reqMove.id);
    if (md && md.name) {
      transformedMoves.push({
        id: reqMove.id,
        name: md.name,
        type: md.type || 'normal',
        cat: md.cat || 'physical',
        power: md.power,
        acc: md.acc,
        pp: reqMove.pp ?? 5,
        maxPP: reqMove.maxpp ?? 5,
        priority: md.priority || 0,
        effect: md.effect,
        target: undefined,
        disabled: Boolean(reqMove.disabled)
      });
    }
  }
  return transformedMoves;
}

function updateExistingMovesInPlace(
  currentMoves: (Move | null)[],
  reqMoves: readonly RequestMoveItem[],
  seenIds: Set<string>
): void {
  const reqMap = new Map<string, RequestMoveItem>();
  for (const rm of reqMoves) {
    if (rm?.id) reqMap.set(rm.id, rm);
  }

  for (const move of currentMoves) {
    if (!move?.id) continue;
    seenIds.add(move.id);

    const matchingReq = reqMap.get(move.id);
    if (matchingReq) {
      move.pp = matchingReq.pp ?? move.pp;
      move.maxPP = matchingReq.maxpp ?? move.maxPP;
      move.disabled = Boolean(matchingReq.disabled);
    } else {
      move.disabled = true;
    }
  }
}

function appendMissingShowdownMoves(
  currentMoves: (Move | null)[],
  reqMoves: readonly RequestMoveItem[],
  seenIds: Set<string>
): void {
  for (const reqMove of reqMoves) {
    if (!reqMove?.id || seenIds.has(reqMove.id) || currentMoves.length >= MAX_ACTIVE_MOVES)
      continue;
    const md = pokemonDataProvider.getMoveData(reqMove.id);
    if (md && md.name) {
      currentMoves.push({
        id: reqMove.id,
        name: md.name,
        type: md.type || 'normal',
        cat: md.cat || 'physical',
        power: md.power,
        acc: md.acc,
        pp: reqMove.pp ?? 0,
        maxPP: reqMove.maxpp ?? 0,
        priority: md.priority || 0,
        effect: md.effect,
        target: undefined,
        disabled: Boolean(reqMove.disabled)
      });
      seenIds.add(reqMove.id);
    }
  }
}

function syncPlayerTeamMoves(pokeUid: string, moves: (Move | null)[]): void {
  if (!getActivePinia()) return;
  try {
    const team = useGameStore().state?.team;
    if (!team) return;
    const teamMon = team.find((p) => p && p.uid === pokeUid);
    if (teamMon) {
      teamMon.moves = moves;
    }
  } catch (err) {
    logger.debug(
      '[battleMoveSync] No se pudo sincronizar movimientos del equipo (gameStore no inicializado)',
      {
        cause: err instanceof Error ? err.message : String(err)
      }
    );
  }
}

export function syncActiveMovesFromRequest(active: BattleState | null, side: BattleSide): void {
  if (!active) return;

  const request = side === 'player' ? active.playerRequest : active.enemyRequest;
  const poke = side === 'player' ? active.player : active.enemy;
  if (!poke) return;

  const reqActive = request?.active?.[0];
  if (reqActive) {
    poke.trapped = Boolean(reqActive.trapped || reqActive.maybeTrapped);
  }

  if (!reqActive?.moves) return;

  if (isStaleRequest(request, poke.uid)) {
    logger.debug(
      `[syncActiveMovesFromRequest] Bypassed stale request for ${poke.name} (${poke.uid})`
    );
    return;
  }

  const reqMoves = reqActive.moves;

  if (poke.isTransformed) {
    poke.moves = buildTransformedMoves(reqMoves);
    return;
  }

  const currentMoves = poke.moves || [];
  const seenIds = new Set<string>(); // runtime-set: Fast O(1) membership lookup set
  updateExistingMovesInPlace(currentMoves, reqMoves, seenIds);
  appendMissingShowdownMoves(currentMoves, reqMoves, seenIds);

  poke.moves = currentMoves;
  if (side === 'player') {
    syncPlayerTeamMoves(poke.uid, currentMoves);
  }
  logger.debug(
    `[useBattleStore] Sync'd ${side} moves from request:`,
    JSON.stringify(
      poke.moves.map((m) => (m ? `${m.id} (pp: ${m.pp}/${m.maxPP}, dis: ${m.disabled})` : ''))
    )
  );
}
