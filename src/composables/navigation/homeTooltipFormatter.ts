export interface HomeNotificationCounts {
  eventsAndRanked: number
  legacyToDiscard: number
  gtsSales: number
  gtsPurchases: number
  gtsReturns: number
  gtsTrades: number
  gtsOther: number
  classLoot: number
  dailyMissions: number
  classDeploy: number
  readyEggs: number
  rematches: number
  allRewardsCount: number
}

export interface HomeRewardItem {
  isClaimable?: boolean
  isLegacy?: boolean
  source?: string
  title: string
  prize?: { money?: number; [key: string]: unknown } | null
}

export function categorizeHomeRewards(
  allRewards: readonly HomeRewardItem[]
) {
  const claimables = allRewards.filter(r => r.isClaimable)
  const discardables = allRewards.filter(r => r.isLegacy)

  const eventsAndRanked = claimables.filter(r => r.source === 'event' || r.source === 'ranked_milestone').length
  const legacyToDiscard = discardables.length
  const classLoot = claimables.filter(r => r.source === 'class_mission').length

  let gtsSales = 0
  let gtsPurchases = 0
  let gtsReturns = 0
  let gtsTrades = 0
  let gtsOther = 0

  for (const r of claimables) {
    if (r.source !== 'gts_claim') continue
    const titleLower = r.title.toLowerCase()
    if (titleLower.includes('venta') || (r.prize && 'money' in r.prize)) {
      gtsSales++
    } else if (titleLower.includes('compra')) {
      gtsPurchases++
    } else if (titleLower.includes('devolución') || titleLower.includes('devolucion')) {
      gtsReturns++
    } else if (titleLower.includes('intercambio') || titleLower.includes('recepción') || titleLower.includes('recepcion')) {
      gtsTrades++
    } else {
      gtsOther++
    }
  }

  return {
    eventsAndRanked,
    legacyToDiscard,
    classLoot,
    gtsSales,
    gtsPurchases,
    gtsReturns,
    gtsTrades,
    gtsOther,
    allRewardsCount: allRewards.length,
  }
}

function appendCountLine(lines: string[], count: number, singular: string, plural: string) {
  if (count > 0) {
    lines.push(`• ${count} ${count === 1 ? singular : plural}`)
  }
}

export function formatHomeTooltip(counts: HomeNotificationCounts, total: number): string {
  if (total === 0) {
    return "Panel central con eventos mundiales, crianza, mercado y misiones activas.\n\nHaz clic para ir a Inicio."
  }

  const lines: string[] = [`Novedades pendientes (${total}):`] // no-domain: Non-domain utility collection or data structure

  appendCountLine(lines, counts.eventsAndRanked, 'recompensa', 'recompensas')
  appendCountLine(lines, counts.legacyToDiscard, 'recompensa para descartar', 'recompensas para descartar')
  appendCountLine(lines, counts.readyEggs, 'huevo listo para eclosionar', 'huevos listos para eclosionar')
  appendCountLine(lines, counts.gtsSales, 'venta en GTS', 'ventas en GTS')
  appendCountLine(lines, counts.gtsPurchases, 'compra en GTS', 'compras en GTS')
  appendCountLine(lines, counts.gtsReturns, 'devolución de GTS', 'devoluciones de GTS')
  appendCountLine(lines, counts.gtsTrades, 'intercambio pendiente', 'intercambios pendientes')
  appendCountLine(lines, counts.gtsOther, 'reclamo de mercado pendiente', 'reclamos de mercado pendientes')
  appendCountLine(lines, counts.classLoot, 'botín de clase para reclamar', 'botines de clase para reclamar')
  appendCountLine(lines, counts.dailyMissions, 'misión diaria para entregar', 'misiones diarias para entregar')

  if (counts.classDeploy > 0) {
    lines.push("• 1 misión de clase para desplegar")
  }

  if (counts.rematches > 0) {
    lines.push(`• ${counts.rematches} ${counts.rematches === 1 ? 'revancha diaria de líder disponible' : 'revanchas diarias de líderes disponibles'} 🔥`)
  }

  const accounted = counts.eventsAndRanked + counts.legacyToDiscard + counts.classLoot +
    counts.gtsSales + counts.gtsPurchases + counts.gtsReturns + counts.gtsTrades + counts.gtsOther
  const unaccounted = counts.allRewardsCount - accounted
  if (unaccounted > 0) {
    lines.push(`• ${unaccounted} ${unaccounted === 1 ? 'otra novedad pendiente' : 'otras novedades pendientes'}`)
  }

  lines.push("")
  lines.push("Haz clic para ir a Inicio.")
  return lines.join("\n")
}
