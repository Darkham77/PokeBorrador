import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ShowdownPlayerRequest, BattleState } from '@/types/battle/battle'
import { isMatchingUid } from './showdownUidMapper.ts'
import { isBattleMinigame } from './battleMinigames.ts'

const RADIX_DECIMAL = 10;
const RECENT_BATTLE_LOGS_MAX_KEEP = 10;

export function parseCondition(cond: string): { hp: number; status: Pokemon['status'] } {
  let hp = 0
  let status: Pokemon['status'] = ''
  if (!cond.includes('fnt')) {
    const slashIdx = cond.indexOf('/')
    if (slashIdx !== -1) {
      hp = parseInt(cond.substring(0, slashIdx), RADIX_DECIMAL) || 0
    }
    const spaceIdx = cond.indexOf(' ')
    if (spaceIdx !== -1) {
      status = (cond.substring(spaceIdx + 1).trim() || '') as Pokemon['status']
    }
  }
  return { hp, status }
}

function syncMovesPP(sourceMoves: Pokemon['moves'], targetMoves: Pokemon['moves']): void {
  if (!Array.isArray(sourceMoves) || !Array.isArray(targetMoves)) return;
  for (const am of sourceMoves) {
    if (!am || !am.id) continue;
    const tm = targetMoves.find(m => m && m.id === am.id);
    if (tm && typeof am.pp === 'number') {
      tm.pp = am.pp;
      if (typeof am.maxPP === 'number') {
        tm.maxPP = am.maxPP;
      }
    }
  }
}

function syncPlayerRequestPokemon(active: BattleState, ctx: BattleContext): void {
  if (!active.playerRequest?.side?.pokemon) return;

  active.playerRequest.side.pokemon.forEach((reqPoke: Required<ShowdownPlayerRequest>['side']['pokemon'][number]) => {
    if (!reqPoke || !reqPoke.uid) return;

    const teamPoke = !active.isPvP && ctx.gs.state.team
      ? ctx.gs.state.team.find((p: Pokemon) => p && isMatchingUid(p.uid, reqPoke.uid))
      : undefined;
    const battlePoke = active.playerTeam?.find((p: Pokemon) => p && isMatchingUid(p.uid, reqPoke.uid));
    const { hp, status } = parseCondition(reqPoke.condition || '');

    if (teamPoke) {
      const old = teamPoke.hp;
      teamPoke.hp = hp;
      teamPoke.status = status;
      teamPoke.fainted = hp <= 0;
      console.debug(`[SYNC-TEAM-HP] Player GS Poké ${teamPoke.nickname} (uid: ${reqPoke.uid}): HP ${old} -> ${hp}, status: ${status}`);
    }

    if (battlePoke) {
      const old = battlePoke.hp;
      battlePoke.hp = hp;
      battlePoke.status = status;
      battlePoke.fainted = hp <= 0;
      console.debug(`[SYNC-TEAM-HP] Player Battle Poké ${battlePoke.nickname} (uid: ${reqPoke.uid}): HP ${old} -> ${hp}, status: ${status}`);
    }
  });
}

function syncEnemyTeamState(active: BattleState): void {
  const enemyTeam = active.enemyTeam;
  if (active.enemy && enemyTeam) {
    const activeEnemyInTeam = enemyTeam.find((p: Pokemon) => p && isMatchingUid(p.uid, active.enemy?.uid));
    if (activeEnemyInTeam) {
      activeEnemyInTeam.hp = active.enemy.hp;
      activeEnemyInTeam.status = active.enemy.status;
      activeEnemyInTeam.fainted = active.enemy.hp <= 0;
    }
  }

  if (enemyTeam) {
    enemyTeam.forEach((enemyPoke: Pokemon) => {
      if (enemyPoke) {
        console.debug(`[SYNC-TEAM-HP] Enemy Battle Poké ${enemyPoke.nickname || enemyPoke.name} (uid: ${enemyPoke.uid}): HP ${enemyPoke.hp}, status: ${enemyPoke.status}, fainted: ${enemyPoke.fainted}`);
      }
    });
  }

  if (active.enemy && active.enemyTeam) {
    const enemyPoke = active.enemyTeam.find((p: Pokemon) => p && isMatchingUid(p.uid, active.enemy?.uid));
    if (enemyPoke) {
      active.enemy.hp = enemyPoke.hp;
      active.enemy.status = enemyPoke.status;
    }
    active.enemyTeam = [...active.enemyTeam];
  }
}

function syncPlayerStateToGameState(active: BattleState, ctx: BattleContext): void {
  if (active.isPvP || !ctx.gs.state.team) return;

  if (active.player) {
    const teamPoke = ctx.gs.state.team.find((p: Pokemon) => p && isMatchingUid(p.uid, active.player?.uid));
    if (teamPoke) {
      active.player.hp = teamPoke.hp;
      active.player.status = teamPoke.status;
      syncMovesPP(active.player.moves, teamPoke.moves);
    }
  }

  if (Array.isArray(active.playerTeam)) {
    active.playerTeam.forEach((battlePoke: Pokemon) => {
      if (!battlePoke || !battlePoke.uid) return;
      const teamPoke = ctx.gs.state.team.find((p: Pokemon) => p && isMatchingUid(p.uid, battlePoke.uid));
      if (teamPoke) {
        syncMovesPP(battlePoke.moves, teamPoke.moves);
      }
    });
  }
}

export function syncTeamHP(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active) return;

  if (active.playerUsedItem) {
    console.debug('[SYNC-TEAM-HP] Player used an item. Skipping sync from outdated playerRequest.');
    return;
  }
  
  console.debug(`[SYNC-TEAM-HP] Running syncTeamHP. playerRequest: ${!!active.playerRequest}, enemyRequest: ${!!active.enemyRequest}`);
  
  syncPlayerRequestPokemon(active, ctx);
  syncEnemyTeamState(active);
  syncPlayerStateToGameState(active, ctx);
}

export function syncAndPersist(ctx: BattleContext) {
  const active = ctx.activeBattle.value
  if (!active) return

  // 1. Sync live team HP, status, and PP back to GameStore team SSoT
  syncTeamHP(ctx)

  // 2. If battle is over or minigame, clear activeBattle and persist team
  if (active.over || isBattleMinigame(active)) {
    ctx.gs.state.activeBattle = null
    ctx.gs.save(false)
    return
  }

  const isSearchPhase = ctx.fsm.currentState.value === ctx.BATTLE_STATES.SEARCH_PHASE;
  ctx.gs.state.activeBattle = {
    ...active,
    inSearchPhase: isSearchPhase,
    playerStages: ctx.playerStages.value,
    enemyStages: ctx.enemyStages.value,
    battleLogs: ctx.battleLogs.value.slice(-RECENT_BATTLE_LOGS_MAX_KEEP)
  }
  ctx.gs.save(false)
}
