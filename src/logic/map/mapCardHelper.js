/**
 * src/logic/map/mapCardHelper.js
 * Extracted pure logic for MapCard UI.
 */

export function normalizeFaction(faction) {
  if (!faction) return ''
  const lower = faction.toLowerCase()
  if (lower === 'poder' || lower === 'power') return 'power'
  if (lower === 'unión' || lower === 'union') return 'union'
  return lower
}

export function checkPlayerWinner(routeWinner, playerFaction) {
  if (!routeWinner || routeWinner === 'none') return false
  return normalizeFaction(routeWinner) === normalizeFaction(playerFaction)
}

export function calculateSpawnGrid(spawnsCount) {
  if (spawnsCount === 0) return { rows: 0, cols: 0, totalSlots: 0 }
  
  let rows, cols
  if (spawnsCount <= 6) {
    rows = 2
    cols = 3
  } else {
    cols = Math.ceil(Math.sqrt(spawnsCount))
    rows = Math.ceil(spawnsCount / cols)
  }
  
  return { rows, cols, totalSlots: rows * cols }
}
