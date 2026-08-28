import type { Pokemon } from '@/types/pokemon/pokemon'
import { mapToShowdownSet } from './showdownAdapter.ts'
import { getShowdownNickname } from './showdownUidMapper.ts'
import { toID } from '@/logic/utils/strings.ts'

export function prepareSeatPayload(
  rawTeam: Pokemon[],
  initialMon?: Pokemon,
  debugSeed?: unknown,
  trainerName: string = 'Player'
) {
  const teamList = [...(rawTeam || [])].filter((p): p is Pokemon => !!p)
  if (initialMon) {
    const idx = teamList.findIndex(p => p.uid === initialMon.uid)
    if (idx > 0 && !debugSeed) {
      const [p] = teamList.splice(idx, 1)
      if (p) teamList.unshift(p)
    }
  }

  const showdownSets = teamList.map(p => mapToShowdownSet(p))
  const hps: Record<string, number> = {}
  const statuses: Record<string, string> = {}
  const movesPP: Record<string, Record<string, number>> = {}

  teamList.forEach(p => {
    if (p) {
      hps[p.uid] = p.hp
      statuses[p.uid] = p.status || ''
      if (Array.isArray(p.moves)) {
        movesPP[p.uid] = {}
        p.moves.forEach(m => {
          if (m && m.id && typeof m.pp === 'number') {
            movesPP[p.uid]![toID(m.id)] = m.pp
          }
        })
      }
    }
  })

  const formattedTeam = showdownSets.map((p, idx) => ({
    ...p,
    nickname: getShowdownNickname(teamList[idx]?.uid || ''),
    name: getShowdownNickname(teamList[idx]?.uid || ''),
    uid: teamList[idx]?.uid
  }))

  return {
    name: trainerName,
    team: formattedTeam,
    teamList,
    hps,
    statuses,
    movesPP
  }
}
