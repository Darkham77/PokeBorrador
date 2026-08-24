import { logger } from '@/logic/utils/logger'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { ItemId } from '@/data/inventory/items'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { resetBattleMinigameFlags, type BattleMinigame } from '@/logic/battle/battleMinigames'

interface BattleStoreMinigameRef {
  state?: {
    minigame?: BattleMinigame | null
    locationId?: string
    rarity?: number
  } | null
  attackerSide: string | null
  activeMove: unknown
  enemyStages: Record<string, number | undefined>
  addLog: (text: string, type: string, icon: string) => void
  completeBattleFlow: (flow: string) => Promise<void>
  startEncounter: () => Promise<void>
}

interface MapStoreMinigameRef {
  triggerArchaeologyRewards: (locId: string, difficulty: string) => Promise<void>
}

interface UIStoreMinigameRef {
  notify: (msg: string, icon: string) => void
}

export function useBattleMinigames(
  battleStore: BattleStoreMinigameRef,
  mapStore: MapStoreMinigameRef,
  uiStore: UIStoreMinigameRef,
  enemy: { value: Pokemon | null | undefined },
  resetAll: () => void
) {
  const handleMinigameCancel = async () => {
    logger.warn('BattleArenaView', 'Minigame CANCELLED by user')
    if (battleStore.state) {
      resetBattleMinigameFlags(battleStore.state)
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
    await battleStore.completeBattleFlow('search')
  }

  const handleFishingSuccess = async () => {
    logger.success('BattleArenaView', 'Fishing SUCCESS')
    if (battleStore.state) {
      resetBattleMinigameFlags(battleStore.state)
    }
    resetAll()
    await battleStore.startEncounter()
  }

  const handleFishingFail = async () => {
    logger.warn('BattleArenaView', 'Fishing FAIL')
    uiStore.notify('El Pokémon escapó...', '💨')
    battleStore.addLog('El Pokémon escapó...', 'log-info', '💨')

    if (battleStore.state) {
      resetBattleMinigameFlags(battleStore.state)
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    await battleStore.completeBattleFlow('search')
  }

  const handleArchaeologySuccess = async (difficulty: string) => {
    logger.success('BattleArenaView', `Archaeology SUCCESS: ${difficulty}`)
    const locId = battleStore.state?.locationId || 'route1'

    if (battleStore.state) {
      resetBattleMinigameFlags(battleStore.state)
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    await mapStore.triggerArchaeologyRewards(locId, difficulty)
    await battleStore.completeBattleFlow('search')
  }

  const handleArchaeologyFail = async () => {
    logger.warn('BattleArenaView', 'Archaeology FAIL')
    const enemyId = enemy.value?.id
    let fossilId: ItemId = 'oldamber'
    let emoji = '💎'
    if (enemyId === 'kabuto') {
      fossilId = 'domefossil'
      emoji = '🛡'
    } else if (enemyId === 'omanyte') {
      fossilId = 'helixfossil'
      emoji = '🐚'
    }

    if (battleStore.state) {
      resetBattleMinigameFlags(battleStore.state)
    }
    resetAll()
    battleStore.attackerSide = null
    battleStore.activeMove = null
    battleStore.enemyStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

    const { getItemName, SHOP_ITEMS } = await import('@/data/inventory/items')
    const fossilName = getItemName(fossilId)
    const itemData = SHOP_ITEMS.find(i => i.id === fossilId)
    const itemSprite = (itemData && itemData.sprite) ? getAssetUrl(ASSET_TYPES.ITEM, itemData.sprite) : emoji

    uiStore.notify(`El ${fossilName} se desmoronó...`, itemSprite)
    battleStore.addLog(`El ${fossilName} se desmoronó...`, 'log-info', fossilId)
    await battleStore.completeBattleFlow('search')
  }

  return {
    handleMinigameCancel,
    handleFishingSuccess,
    handleFishingFail,
    handleArchaeologySuccess,
    handleArchaeologyFail
  }
}
