/**
 * Event Engine - Global Event Logic
 * Handles scheduled intervals, bonus multipliers, and competition validation.
 * 
 * Absolute isolation: This module does not store state or connect to DB.
 */

/**
 * Checks if an event is active based on current time (America/Argentina/Buenos_Aires).
 * @param {object} event 
 * @param {Date} date 
 * @returns {boolean}
 */
export function isEventActiveNow(event, date = new Date()) {
  if (!event.active) return false
  if (event.manual) return true

  // 1. Absolute date check
  if (event.start_at && event.end_at) {
    const start = new Date(event.start_at)
    const end = new Date(event.end_at)
    if (date >= start && date <= end) return true
  }

  // 2. Weekly schedule check (Argentina Time UTC-3)
  const sched = event.schedule
  if (!sched || sched.type !== 'weekly' || !sched.days) return false

  // Convert current date to Argentina Time
  const argTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }))
  const day = argTime.getDay()
  const hour = argTime.getHours() + argTime.getMinutes() / 60

  if (!sched.days.includes(day)) return false

  if (sched.startHour !== undefined && sched.endHour !== undefined) {
    const start = sched.startHour
    const end = sched.endHour
    if (start < end) {
      // Normal range (e.g., 10 to 18)
      if (hour < start || hour >= end) return false
    } else {
      // Midnight crossover (e.g., 23 to 01)
      if (hour < start && hour >= end) return false
    }
  }

  return true
}

/**
 * Calculates global multipliers from a list of active events.
 * @param {Array} activeEvents 
 * @returns {object}
 */
export function getGlobalMultipliers(activeEvents) {
  const multipliers = {
    exp: 1,
    money: 1,
    bc: 1,
    shiny: 1,
    eggShiny: 1,
    hatch: 1,
    rival: 1,
    trainer: 1,
    fishing: 1
  }

  for (const ev of activeEvents) {
    const cfg = ev.config || {}
    multipliers.exp *= (cfg.expMult || 1)
    multipliers.money *= (cfg.moneyMult || 1)
    multipliers.bc *= (cfg.bcMult || 1)
    multipliers.shiny *= (cfg.shinyMult || 1)
    multipliers.eggShiny *= (cfg.eggShinyMult || 1)
    multipliers.hatch *= (cfg.hatchMult || 1)
    multipliers.rival *= (cfg.rivalMult || 1)
    multipliers.trainer *= (cfg.trainerMult || 1)
    multipliers.fishing *= (cfg.fishingMult || 1)
  }

  return multipliers
}

/**
 * Checks if a specific species has active boosts.
 * @param {Array} activeEvents 
 * @param {string} speciesId 
 * @returns {object} { rate: number, shiny: number }
 */
export function getSpeciesBoosts(activeEvents, speciesId) {
  let rateMult = 1
  let shinyMult = 1
  const sId = speciesId.toLowerCase()

  for (const ev of activeEvents) {
    const cfg = ev.config || {}
    if (!cfg.species) continue

    const speciesList = cfg.species.split(',').map(s => s.trim().toLowerCase())
    if (speciesList.includes(sId)) {
      rateMult *= (cfg.speciesRateMult || 1)
      shinyMult *= (cfg.speciesShinyMult || 1)
    }
  }

  return { rate: rateMult, shiny: shinyMult }
}

/**
 * Validates if the new entry is better for a competition.
 * @param {object} existingData 
 * @param {object} newData 
 * @param {string} sortBy (e.g., 'data.total_ivs', 'data.level')
 * @returns {boolean}
 */
export function isNewEntryBetter(existingData, newData, sortBy = 'data.total_ivs') {
  if (!existingData) return true
  
  const getVal = (obj, path) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj) || 0
  }

  const oldScore = getVal(existingData, sortBy)
  const newScore = getVal(newData, sortBy)

  return newScore > oldScore
}
