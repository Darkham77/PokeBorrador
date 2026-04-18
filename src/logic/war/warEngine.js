/**
 * War Engine - Faction Dominance Logic
 * Handles time-cycles, point calculations, and world-state rules.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */

export const WAR_PTS_TABLE = {
  CAPTURE: { win: 5, lose: 1 },
  TRAINER_WIN: { win: 8, lose: 2 },
  WILD_WIN: { win: 1, lose: 0 },
  FISHING: { win: 4, lose: 1 },
  SHINY_CAPTURE: { win: 40, lose: 10 },
  EVENT: { win: 20, lose: 5 },
  GUARDIAN: { win: 150, lose: 10 }
}

export const DAILY_MAP_CAP = 300
export const FACTION_CHANGE_COST = 25000

export const WEEKLY_REWARD_MILESTONES = [
  { pt: 1, coins: 10 },
  { pt: 101, coins: 35 },
  { pt: 501, coins: 75 },
  { pt: 1501, coins: 150 }
]

export const WEEKLY_WIN_BONUS_COINS = 50

/**
 * Gets a clean date string for Argentina Time (UTC-3).
 * @param {Date} date 
 * @returns {string} YYYY-MM-DD
 */
export function getArgDateString(date = new Date()) {
  const argTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const y = argTime.getFullYear()
  const m = String(argTime.getMonth() + 1).padStart(2, '0')
  const d = String(argTime.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calculates the current week ID based on the legacy anchor (Monday).
 * Format: YYYY-WXX
 * @param {Date} date 
 * @returns {string}
 */
export function getWeekId(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 (Sun) to 6 (Sat)
  
  // Find the Monday of this week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  
  // Standard week calculation formula
  const jan4 = new Date(monday.getFullYear(), 0, 4)
  const days = Math.floor((monday - jan4) / 86400000)
  const week = Math.ceil((days + jan4.getDay() + 1) / 7)
  
  return `${monday.getFullYear()}-W${String(week).padStart(2, '0')}`
}

/**
 * Returns all valid week IDs for the current reconciliation period.
 * (Legacy compatibility for 2026 transition)
 */
export function getReconciledWeekIds() {
  const current = getWeekId()
  // Specific reconciliation for April 2026 transition
  if (current === '2026-W14' || current === '2026-04-06') {
    return [current, '2026-W15', '2026-04-06']
  }
  return [current]
}

/**
 * Check if we are in the Dispute Phase (Monday to Friday).
 * Saturday and Sunday are Dominance Phases (bonuses active, no points earned).
 * @param {Date} date 
 * @returns {boolean}
 */
export function isDisputePhase(date = new Date()) {
  const day = date.getDay()
  return (day >= 1 && day <= 5)
}

/**
 * Gets the raw point reward for an event.
 * @param {string} eventType 
 * @param {boolean} success 
 * @returns {number}
 */
export function getPointReward(eventType, success) {
  const type = eventType.toUpperCase()
  const record = WAR_PTS_TABLE[type] || { win: 1, lose: 0 }
  
  // Special rule for wild win balance
  if (type === 'WILD_WIN') return 1
  
  return success ? record.win : record.lose
}

/**
 * Calculates bonuses based on map dominance.
 * @param {boolean} isDominant 
 * @returns {object} { shinyMult, expMult, ivBoost }
 */
export function calculateMapBonuses(isDominant) {
  if (!isDominant) return { shinyMult: 1, expMult: 1, ivBoost: 0 }
  
  return {
    shinyMult: 1.3,
    expMult: 1.3,
    ivBoost: 1 // Legacy bonus: IVs guaranteed or boosted
  }
}
