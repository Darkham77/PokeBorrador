import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ShowdownPlayerRequest } from '@/types/battle/battle'
import { isMatchingUid } from './showdownUidMapper.ts'

export function parseCondition(cond: string): { hp: number; status: Pokemon['status'] } {
  let hp = 0
  let status: Pokemon['status'] = ''
  if (!cond.includes('fnt')) {
    const slashIdx = cond.indexOf('/')
    if (slashIdx !== -1) {
      hp = parseInt(cond.substring(0, slashIdx), 10) || 0
    }
    const spaceIdx = cond.indexOf(' ')
    if (spaceIdx !== -1) {
      status = (cond.substring(spaceIdx + 1).trim() || '') as Pokemon['status']
    }
  }
  return { hp, status }
}

export function syncTeamHP(ctx: BattleContext) {
  const active = ctx.activeBattle.value
  if (!active) return

  if (active.playerUsedItem) {
    console.debug('[SYNC-TEAM-HP] Player used an item. Skipping sync from outdated playerRequest.')
    return
  }
  
  console.debug(`[SYNC-TEAM-HP] Running syncTeamHP. playerRequest: ${!!active.playerRequest}, enemyRequest: ${!!active.enemyRequest}`)
  
  if (active.playerRequest?.side?.pokemon && ctx.gs.state.team) {
    active.playerRequest.side.pokemon.forEach((reqPoke: Required<ShowdownPlayerRequest>['side']['pokemon'][number]) => {
      if (reqPoke && reqPoke.uid) {
        const teamPoke = ctx.gs.state.team.find((p: Pokemon) => p && isMatchingUid(p.uid, reqPoke.uid))
        const battlePoke = active.playerTeam?.find((p: Pokemon) => p && isMatchingUid(p.uid, reqPoke.uid))

        const { hp, status } = parseCondition(reqPoke.condition || '')

        if (teamPoke) {
          const old = teamPoke.hp
          teamPoke.hp = hp
          teamPoke.status = status
          console.debug(`[SYNC-TEAM-HP] Player GS Poké ${teamPoke.nickname} (uid: ${reqPoke.uid}): HP ${old} -> ${hp}, status: ${status}`)
        }

        if (battlePoke) {
          const old = battlePoke.hp
          battlePoke.hp = hp
          battlePoke.status = status
          console.debug(`[SYNC-TEAM-HP] Player Battle Poké ${battlePoke.nickname} (uid: ${reqPoke.uid}): HP ${old} -> ${hp}, status: ${status}`)
        }
      }
    })
  }

  const enemyTeam = active.enemyTeam
  if (active.enemyRequest?.side?.pokemon && enemyTeam) {
    active.enemyRequest.side.pokemon.forEach((reqPoke: Required<ShowdownPlayerRequest>['side']['pokemon'][number]) => {
      if (reqPoke && reqPoke.uid) {
        const enemyPoke = enemyTeam.find((p: Pokemon) => p && isMatchingUid(p.uid, reqPoke.uid))

        if (enemyPoke) {
          const { hp, status } = parseCondition(reqPoke.condition || '')
          const old = enemyPoke.hp
          enemyPoke.hp = hp
          enemyPoke.status = status
          console.debug(`[SYNC-TEAM-HP] Enemy Battle Poké ${enemyPoke.nickname} (uid: ${reqPoke.uid}): HP ${old} -> ${hp}, status: ${status}`)
        }
      }
    })
  }

  if (active.player && ctx.gs.state.team) {
    const teamPoke = ctx.gs.state.team.find((p: Pokemon) => p && isMatchingUid(p.uid, active.player?.uid))
    if (teamPoke) {
      active.player.hp = teamPoke.hp
      active.player.status = teamPoke.status
    }
  }

  if (active.enemy && active.enemyTeam) {
    const enemyPoke = active.enemyTeam.find((p: Pokemon) => p && isMatchingUid(p.uid, active.enemy?.uid))
    if (enemyPoke) {
      active.enemy.hp = enemyPoke.hp
      active.enemy.status = enemyPoke.status
    }
    active.enemyTeam = [...active.enemyTeam]
  }
}

export function syncAndPersist(ctx: BattleContext) {
  const active = ctx.activeBattle.value
  if (!active || active.over) {
    ctx.gs.state.activeBattle = null
    return
  }
  syncTeamHP(ctx)
  ctx.gs.state.activeBattle = {
    ...active,
    playerStages: ctx.playerStages.value,
    enemyStages: ctx.enemyStages.value,
    battleLogs: ctx.battleLogs.value.slice(-10)
  }
  ctx.gs.save(false)
}
