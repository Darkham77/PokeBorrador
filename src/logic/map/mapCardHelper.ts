
/**
 * src/logic/map/mapCardHelper.ts
 * Extracted pure logic for MapCard UI.
 */

export function normalizeFaction(faction: string | null | undefined): string {
  if (!faction) return ''
  const lower = faction.toLowerCase()
  if (lower === 'poder' || lower === 'power') return 'power'
  if (lower === 'unión' || lower === 'union') return 'union'
  return lower
}

export function checkPlayerWinner(routeWinner: string | null | undefined, playerFaction: string | null | undefined): boolean {
  if (!routeWinner || routeWinner === 'none') return false
  return normalizeFaction(routeWinner) === normalizeFaction(playerFaction)
}

export function calculateSpawnGrid(spawnsCount: number, preferredCols: number = 3): { rows: number; cols: number; totalSlots: number } {
  if (spawnsCount === 0) return { rows: 0, cols: 0, totalSlots: 0 }
  
  let cols = Math.max(3, preferredCols)
  
  // For very small counts, we might want to stay with 3 columns to avoid 
  // a single row of 5 if preferredCols is 5, but the user specifically 
  // asked for 3-5 range flexibility. 
  // However, we maintain a minimum of 3 cols for consistency.

  // If spawnsCount is high and sqrt(count) > cols, we expand cols 
  // to maintain a more balanced grid.
  const idealCols = Math.ceil(Math.sqrt(spawnsCount))
  if (idealCols > cols) {
    cols = idealCols
  }

  let rows = Math.ceil(spawnsCount / cols)
  
  // To maintain size consistency, we always want at least 2 rows.
  if (rows < 2 && spawnsCount > 0) {
    rows = 2
  }
  
  return { rows, cols, totalSlots: rows * cols }
}
