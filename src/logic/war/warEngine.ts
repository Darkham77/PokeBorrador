/**
 * War Engine - Faction Dominance Logic
 * Handles time-cycles, point calculations, and world-state rules.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */
import { normalizeZonedDateTime } from '../utils/timeUtils.ts';
import {
  DAYS_PER_WEEK,
  ISO_DAY_MONDAY,
  ISO_DAY_FRIDAY,
  DOMINANCE_BONUS_SHINY_MULT,
  DOMINANCE_BONUS_EXP_MULT,
  DOMINANCE_BONUS_IV_BOOST
} from '../constants/gameplay.ts';


const WAR_PTS_CAPTURE_WIN = 5
const WAR_PTS_CAPTURE_LOSE = 1
const WAR_PTS_TRAINER_WIN = 8
const WAR_PTS_TRAINER_LOSE = 2
const WAR_PTS_WILD_WIN = 1
const WAR_PTS_WILD_LOSE = 0
const WAR_PTS_FISHING_WIN = 4
const WAR_PTS_FISHING_LOSE = 1
const WAR_PTS_SHINY_WIN = 40
const WAR_PTS_SHINY_LOSE = 10
const WAR_PTS_EVENT_WIN = 20
const WAR_PTS_EVENT_LOSE = 5
const WAR_PTS_GUARDIAN_WIN = 150
const WAR_PTS_GUARDIAN_LOSE = 10

export const WAR_PTS_TABLE = {
  CAPTURE: { win: WAR_PTS_CAPTURE_WIN, lose: WAR_PTS_CAPTURE_LOSE },
  TRAINER_WIN: { win: WAR_PTS_TRAINER_WIN, lose: WAR_PTS_TRAINER_LOSE },
  WILD_WIN: { win: WAR_PTS_WILD_WIN, lose: WAR_PTS_WILD_LOSE },
  FISHING: { win: WAR_PTS_FISHING_WIN, lose: WAR_PTS_FISHING_LOSE },
  SHINY_CAPTURE: { win: WAR_PTS_SHINY_WIN, lose: WAR_PTS_SHINY_LOSE },
  EVENT: { win: WAR_PTS_EVENT_WIN, lose: WAR_PTS_EVENT_LOSE },
  GUARDIAN: { win: WAR_PTS_GUARDIAN_WIN, lose: WAR_PTS_GUARDIAN_LOSE }
} as const;

export type WarEventType = keyof typeof WAR_PTS_TABLE;

export function isWarEventType(val: string): val is WarEventType {
  return val in WAR_PTS_TABLE;
}

export const DAILY_MAP_CAP = 300;
export const FACTION_CHANGE_COST = 25000;
export const DAILY_COIN_CAP = 50;
export const WAR_POINTS_PER_COIN = 10;
export const GUARDIAN_DEFEAT_POINTS_MULTIPLIER = 0.7;
export const FACTION_VICTORY_BONUS_COINS = 50;

const MILESTONE_TIER_1_PTS = 1
const MILESTONE_TIER_1_COINS = 10
const MILESTONE_TIER_2_PTS = 101
const MILESTONE_TIER_2_COINS = 35
const MILESTONE_TIER_3_PTS = 501
const MILESTONE_TIER_3_COINS = 75
const MILESTONE_TIER_4_PTS = 1501
const MILESTONE_TIER_4_COINS = 150

export const WEEKLY_REWARD_MILESTONES = [
  { pt: MILESTONE_TIER_1_PTS, coins: MILESTONE_TIER_1_COINS },
  { pt: MILESTONE_TIER_2_PTS, coins: MILESTONE_TIER_2_COINS },
  { pt: MILESTONE_TIER_3_PTS, coins: MILESTONE_TIER_3_COINS },
  { pt: MILESTONE_TIER_4_PTS, coins: MILESTONE_TIER_4_COINS }
] as const;


/**
 * Calculates the current week ID based on the ISO 8601 standard.
 * Format: YYYY-WXX
 * @param {Date | Temporal.ZonedDateTime} date 
 * @returns {string}
 */
export function getWeekId(date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): string {
  const zdt = normalizeZonedDateTime(date)
  
  return `${zdt.yearOfWeek}-W${String(zdt.weekOfYear).padStart(2, '0')}`
}

/**
 * Calculates the previous week ID based on the ISO 8601 standard.
 * Format: YYYY-WXX
 * @param {Temporal.ZonedDateTime | Temporal.Instant} date 
 * @returns {string}
 */
export function getPreviousWeekId(date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): string {
  const zdt = normalizeZonedDateTime(date)
  const prevZdt = zdt.subtract({ days: DAYS_PER_WEEK })
  
  return `${prevZdt.yearOfWeek}-W${String(prevZdt.weekOfYear).padStart(2, '0')}`
}

/**
 * Returns all valid week IDs for the current reconciliation period.
 * (Legacy compatibility for 2026 transition)
 */
export function getReconciledWeekIds(): string[] {
  const current = getWeekId()
  // Specific reconciliation for April 2026 transition
  if (current === '2026-W14' || current === '2026-04-06') { // magic-ok
    return [current, '2026-W15', '2026-04-06'] // magic-ok
  }
  return [current]
}

/**
 * Check if we are in the Dispute Phase (Monday to Friday).
 * Saturday and Sunday are Dominance Phases (bonuses active, no points earned).
 * @param {Temporal.ZonedDateTime|Temporal.Instant} date 
 * @returns {boolean}
 */
export function isDisputePhase(date: Temporal.ZonedDateTime | Temporal.Instant = Temporal.Now.instant()): boolean {
  const zdt = normalizeZonedDateTime(date)
  
  const day = zdt.dayOfWeek // 1 (Mon) to 7 (Sun)
  return (day >= ISO_DAY_MONDAY && day <= ISO_DAY_FRIDAY)
}



/**
 * Gets the raw point reward for an event.
 * @param {WarEventType} eventType 
 * @param {boolean} success 
 * @returns {number}
 */
export function getPointReward(eventType: string, success: boolean): number {
  const validEvent = isWarEventType(eventType) ? eventType : null;
  const record = validEvent ? WAR_PTS_TABLE[validEvent] : { win: 1, lose: 0 };
  
  // Special rule for wild win balance
  if (eventType === 'WILD_WIN') return 1;
  
  return success ? record.win : record.lose;
}

/**
 * Calculates bonuses based on map dominance.
 * @param {boolean} isDominant 
 * @returns {object} { shinyMult, expMult, ivBoost }
 */
export function calculateMapBonuses(isDominant: boolean): { shinyMult: number; expMult: number; ivBoost: number } {
  if (!isDominant) return { shinyMult: 1, expMult: 1, ivBoost: 0 }
  
  return {
    shinyMult: DOMINANCE_BONUS_SHINY_MULT,
    expMult: DOMINANCE_BONUS_EXP_MULT,
    ivBoost: DOMINANCE_BONUS_IV_BOOST
  }
}
