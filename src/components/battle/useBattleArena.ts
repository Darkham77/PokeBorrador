import { computed, watch, ref } from 'vue'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useMapStore } from '@/stores/map'
import { useModalStore } from '@/stores/modals'
import { useGameStore } from '@/stores/game'
import { usePlayerClassStore } from '@/stores/playerClass'
import { getRouteWeather } from '@/logic/weather/weatherUtils'
import { getWeatherAnimSeed } from '@/logic/weather/weatherMath.ts'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { POKEMON_FEET_DATABASE } from '@/data/pokemonFeetDatabase'
import { GYMS } from '@/data/gyms.ts'
import { logger } from '@/logic/utils/logger'
import type { Pokemon } from '@/types/pokemon'

export function useBattleArena(
  p1Pos: { x: number; y: number },
  p2Pos: { x: number; y: number },
  resetAll: () => void,
  preloadCombatCoords: (
    player: Pokemon | null,
    enemy: Pokemon | null,
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    pTeam: Pokemon[],
    eTeam: Pokemon[]
  ) => void
) {
  const battleStore = useBattleStore()
  const mapStore = useMapStore()
  const uiStore = useUIStore()
  const gameStore = useGameStore()
  const classStore = usePlayerClassStore()
  const modalStore = useModalStore()

  const battle = computed(() => battleStore.state)
  const enemy = computed(() => battle.value?.enemy)

  const trainerShadowUrl = ref('')

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 7
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      ctx.beginPath()
      ctx.ellipse(5, 3.5, 5, 3.5, 0, 0, Math.PI * 2)
      ctx.fill()
      trainerShadowUrl.value = canvas.toDataURL('image/png')
    }
  }

  const getTrainerShadowStyle = (spriteUrl: string, entitySize: number) => {
    let dbKey = spriteUrl || ''
    const base = import.meta.env.BASE_URL || '/'
    if (base !== '/' && dbKey.startsWith(base)) {
      dbKey = dbKey.slice(base.length - 1)
    }
    try {
      dbKey = decodeURIComponent(dbKey)
    } catch (_e) {
      // Ignore decode error
    }
    const cached = POKEMON_FEET_DATABASE[dbKey] || { feetY: 0.9, feetX: 0.5 }
    
    const widthPx = 0.7 * entitySize
    const heightPx = entitySize * 0.08
    const offsetX = (cached.feetX - 0.5) * entitySize

    return {
      position: 'absolute' as const,
      backgroundImage: `url(${trainerShadowUrl.value})`,
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      left: `calc(50% + ${offsetX}px)`,
      top: `${cached.feetY * 100}%`,
      width: `${widthPx}px`,
      height: `${heightPx}px`,
      transform: 'translate(-50%, -75%)',
      zIndex: -1,
      pointerEvents: 'none' as const
    }
  }

  const playerBackSpriteUrl = computed(() => {
    const spriteId = classStore.currentClassDef?.avatarSpriteId || classStore.currentClassDef?.id || 'entrenador'
    const gender = gameStore.state.gender || 'h'
    return getAssetUrl(ASSET_TYPES.TRAINER, spriteId, { trainerSuffix: 'back', gender })
  })

  const showStandingTrainers = computed(() => {
    return battleStore.isBattleActive && 
           battleStore.currentFsmState !== 'FIRST_INTRO' && 
           battleStore.currentFsmState !== 'INITIALIZING' &&
           !battleStore.isSearching
  })

  const trainerDialogText = computed(() => {
    if (!battle.value) return ''
    if (battle.value.isGym && battle.value.gymId) {
      const gym = GYMS.find(g => g.id === battle.value?.gymId)
      if (gym) return gym.quote
    }
    if (battle.value.quote) return battle.value.quote
    return '¡Prepárate para combatir! ¡No te lo pondré fácil!'
  })

  const triggerPreloadCoords = () => preloadCombatCoords(
    battle.value?.player || null,
    battle.value?.enemy || null,
    p1Pos,
    p2Pos,
    battle.value?.playerTeam || [],
    battle.value?.enemyTeam || []
  )

  const handleMinigameCancel = async () => {
    logger.warn('useBattleArena', 'Minigame CANCELLED by user')
    if (battleStore.state) {
      battleStore.state.isFishing = false
      battleStore.state.isArchaeology = false
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    await battleStore.completeBattleFlow('map')
  }

  const handleFishingSuccess = async () => {
    logger.success('useBattleArena', 'Fishing SUCCESS')
    if (battleStore.state) {
      battleStore.state.isFishing = false
      battleStore.state.isArchaeology = false
    }
    resetAll()
    await battleStore.startEncounter()
  }

  const handleFishingFail = async () => {
    logger.warn('useBattleArena', 'Fishing FAIL')
    uiStore.notify('El Pokémon escapó...', '💨')
    battleStore.addLog('El Pokémon escapó...', 'log-info')

    if (battleStore.state) {
      battleStore.state.isFishing = false
      battleStore.state.isArchaeology = false
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    await battleStore.completeBattleFlow('search')
  }

  const handleArchaeologySuccess = async (difficulty: string) => {
    logger.success('useBattleArena', `Archaeology SUCCESS: ${difficulty}`)
    const locId = battleStore.state?.locationId || 'route1'
    await mapStore.triggerArchaeologyRewards(locId, difficulty)
    
    if (battleStore.state) {
      battleStore.state.isArchaeology = false
      battleStore.state.isFishing = false
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    await battleStore.completeBattleFlow('search')
  }

  const handleArchaeologyFail = async () => {
    logger.warn('useBattleArena', 'Archaeology FAIL')
    
    let fossilName = 'Ámbar Viejo'
    let emoji = '💎'
    if (enemy.value?.id === 'kabuto') {
      fossilName = 'Fósil Domo'
      emoji = '🛡'
    } else if (enemy.value?.id === 'omanyte') {
      fossilName = 'Fósil Hélix'
      emoji = '🐚'
    }
    
    const { getItemByName } = await import('@/data/items')
    const itemData = getItemByName(fossilName)
    const itemSprite = itemData ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : emoji

    uiStore.notify(`El ${fossilName} se desmoronó...`, itemSprite)
    battleStore.addLog(`El ${fossilName} se desmoronó...`, 'log-info', fossilName)

    if (battleStore.state) {
      battleStore.state.isArchaeology = false
      battleStore.state.isFishing = false
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    await battleStore.completeBattleFlow('search')
  }

  const computedWeather = computed(() => {
    if (mapStore.globalWeather) return mapStore.globalWeather
    return getRouteWeather(battle.value?.locationId || 'route1', mapStore.currentSeason.id, mapStore.currentEpochHour, mapStore.currentCycle)
  })

  const atmosphereSeed = computed(() => {
    return getWeatherAnimSeed(battle.value?.locationId || 'route1')
  })

  // FSM Watcher Setup
  watch(
    () => {
      const fsm = battleStore.fsm
      if (!fsm) return [null, null]
      return [fsm.currentState, fsm.currentSubState]
    },
    async ([newState, newSubState]) => {
      logger.debug('useBattleArena', `FSM: ${newState} ${newSubState || ''}`)
      if (!newState) return

      if (newState === 'FIRST_INTRO') {
        logger.info('useBattleArena', 'Phase: FIRST_INTRO')
      }

      if (newState === 'REWARDS_PHASE' && newSubState === 'EMPTY_WAIT') {
        logger.info('useBattleArena', '-> EMPTY_WAIT (REWARDS_PHASE)')
        resetAll()
        battleStore.attackerSide = null
        battleStore.activeMove = null
        battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
      }

      if (newSubState === 'MINIGAME_CHECK' && enemy.value) {
        if (battleStore.state?.isFishing) {
          modalStore.open('Fishing', {
            pokemon: enemy.value,
            rarity: battle.value?.rarity || 50,
            onWin: handleFishingSuccess,
            onFail: handleFishingFail,
            onCloseCallback: handleMinigameCancel
          })
        } else if (battleStore.state?.isArchaeology) {
          modalStore.open('Archaeology', {
            pokemon: enemy.value,
            rarity: battle.value?.rarity || 50,
            onWin: handleArchaeologySuccess,
            onFail: handleArchaeologyFail,
            onCloseCallback: handleMinigameCancel
          })
        }
      }
    },
    { immediate: true }
  )

  watch(() => battleStore.currentSubState, async (sub) => {
    if (sub === 'PRELOAD_FINAL_COORDS') await triggerPreloadCoords()
  })

  return {
    computedWeather,
    atmosphereSeed,
    trainerDialogText,
    showStandingTrainers,
    playerBackSpriteUrl,
    getTrainerShadowStyle,
    triggerPreloadCoords,
    handleMinigameCancel
  }
}
