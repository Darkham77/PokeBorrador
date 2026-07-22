import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ShowdownPlayerRequest } from '@/types/battle/battle'

export function parseCondition(cond: string): { hp: number; status: Pokemon['status'] } {
  let hp = 0
  let status: Pokemon['status'] = undefined
  if (!cond.includes('fnt')) {
    const slashIdx = cond.indexOf('/')
    if (slashIdx !== -1) {
      hp = parseInt(cond.substring(0, slashIdx), 10) || 0
    }
    const spaceIdx = cond.indexOf(' ')
    if (spaceIdx !== -1) {
      status = (cond.substring(spaceIdx + 1).trim() || undefined) as Pokemon['status']
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
        const teamPoke = ctx.gs.state.team.find((p: Pokemon) => p && p.uid === reqPoke.uid)
        const battlePoke = active.playerTeam?.find((p: Pokemon) => p && p.uid === reqPoke.uid)

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
        const battlePoke = enemyTeam.find((p: Pokemon) => p && p.uid === reqPoke.uid)

        const { hp, status } = parseCondition(reqPoke.condition || '')

        if (battlePoke) {
          const old = battlePoke.hp
          battlePoke.hp = hp
          battlePoke.status = status
          console.debug(`[SYNC-TEAM-HP] Enemy Battle Poké ${battlePoke.nickname} (uid: ${reqPoke.uid}): HP ${old} -> ${hp}, status: ${status}`)
        }
      }
    })
  }

  if (active.player && active.playerRequest?.side?.pokemon) {
    const activeReqPoke = active.playerRequest.side.pokemon.find((p: Required<ShowdownPlayerRequest>['side']['pokemon'][number]) => p && p.uid === active.player?.uid)
    if (activeReqPoke) {
      const { hp, status } = parseCondition(activeReqPoke.condition || '')
      active.player.hp = hp
      active.player.status = status
    }
  }

  // Sincronizar el HP/estado del enemigo activo con su equipo (Entrenador/Gimnasio/PvP)
  if (active.isTrainer || active.isGym || active.isPvP) {
    if (active.enemy && active.enemyTeam) {
      const enemyIdx = active.enemyTeam.findIndex((p: Pokemon) => p && p.uid === active.enemy?.uid)
      if (enemyIdx !== -1) {
        const teamPoke = active.enemyTeam[enemyIdx]
        if (teamPoke) {
          teamPoke.hp = active.enemy.hp
          teamPoke.status = active.enemy.status
        }
      }
      active.enemyTeam = [...active.enemyTeam]
    }
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
