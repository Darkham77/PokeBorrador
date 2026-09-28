import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { resolveCurrentWeather } from '../weather/weatherRegistry.ts'
import { getMapEnvironment } from '@/logic/environment/map/mapEnvironmentRegistry.ts'

export async function resetActiveBattleState(ctx: BattleContext, initialPlayer: Pokemon, isGym: boolean) {
  if (ctx.activeBattle.value) {
    const active = ctx.activeBattle.value
    const locId = active.locationId
    if (!locId) {
      throw new Error('[orchestratorStateHelper] resetActiveBattleState: activeBattle.locationId es requerido. Se prohíben fallbacks silenciosos.')
    }
    const environment = getMapEnvironment(locId, {
      isGym: active.isGym || isGym,
      gymId: active.gymId,
      isPvP: active.isPvP,
      isCave: active.isCave || active.isCrystalCave,
      isIndoors: active.isIndoors
    })
    const curWeather = environment.isWeatherAllowed() ? resolveCurrentWeather() : undefined
    active.weather = environment.resolveCombatWeather(curWeather)
    ctx.activeBattle.value.over = false
    ctx.activeBattle.value.turnCount = 1
    ctx.activeBattle.value.turn = 'player'
    ctx.activeBattle.value.isCapture = false
    ctx.activeBattle.value.escapeAttempts = 0
    ctx.activeBattle.value.participants = [initialPlayer.uid]
    ctx.activeBattle.value.lastDamage = undefined
    ctx.activeBattle.value.enemyUsedItem = false
    ctx.activeBattle.value.pendingSlotEffects = []
    ctx.activeBattle.value.minigame = null
    ctx.activeBattle.value.rewardsProcessed = false
    ctx.activeBattle.value._rewardCombatants = []
    ctx.activeBattle.value.playerSideConditions = {}
    ctx.activeBattle.value.enemySideConditions = {}
    ctx.activeBattle.value.terrain = null
    ctx.activeBattle.value.fieldConditions = {}
    ctx.activeBattle.value.playerRequest = undefined
    ctx.activeBattle.value.enemyRequest = undefined
    if (!ctx.activeBattle.value.isTrainer && !ctx.activeBattle.value.isGym && !ctx.activeBattle.value.isPvP) {
      ctx.activeBattle.value.enemyTeam = undefined
    }
  }

  ctx.playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  ctx.faintedSides.value.clear()
  ctx.clearLogs()
}
