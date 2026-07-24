import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { MapStore } from '@/types/system/stores'
import { mapVisualToOfficialWeather } from '../weather/weatherGenerationProvider.ts'
import { ACTIVE_GENERATION } from '../../data/system/constants.ts'

export async function resetActiveBattleState(ctx: BattleContext, initialPlayer: Pokemon, isGym: boolean) {
  if (ctx.activeBattle.value) {
    const { useMapStore } = await import('@/stores/map')
    const mapStore = useMapStore() as unknown as MapStore
    ctx.activeBattle.value.weather = {
      type: isGym ? 'none' : mapVisualToOfficialWeather(mapStore.currentWeather, ACTIVE_GENERATION),
      visual: isGym ? 'clear' : mapStore.currentWeather,
      turns: -1
    }
    ctx.activeBattle.value.over = false
    ctx.activeBattle.value.turnCount = 1
    ctx.activeBattle.value.turn = 'player'
    ctx.activeBattle.value.isCapture = false
    ctx.activeBattle.value.escapeAttempts = 0
    ctx.activeBattle.value.participants = [initialPlayer.uid]
    ctx.activeBattle.value.lastDamage = undefined
    ctx.activeBattle.value.enemyUsedItem = false
    ctx.activeBattle.value.futureSightTurns = undefined
    ctx.activeBattle.value.futureSightTarget = null
    ctx.activeBattle.value.isFishing = false
    ctx.activeBattle.value.isArchaeology = false
    ctx.activeBattle.value.rewardsProcessed = false
    ctx.activeBattle.value._rewardCombatants = []
    ctx.activeBattle.value.playerSideConditions = {}
    ctx.activeBattle.value.enemySideConditions = {}
  }

  ctx.playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  ctx.faintedSides.value.clear()
  ctx.clearLogs()
}
