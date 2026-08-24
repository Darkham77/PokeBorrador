import { computed, type Ref } from 'vue'
import type { AbilityId } from '@/data/battle/abilities'
import type { ItemId } from '@/data/inventory/items'

const PASSIVE_BONUS_SPEED_PCT = 0.15
const PASSIVE_BONUS_LOOT_PCT = 0.20
const PASSIVE_SYNC_CHANCE_PCT = 0.50

const ADVENTURE_PASSIVES: Partial<Record<AbilityId, { id: string; label: string; desc: string; value: number }>> = {
  flamebody: { id: 'speed_bonus', label: 'Cuerpo Llama', desc: `+${Math.round(PASSIVE_BONUS_SPEED_PCT * 100)}% Vel. Viaje`, value: PASSIVE_BONUS_SPEED_PCT },
  magmaarmor: { id: 'speed_bonus', label: 'Escudo Magma', desc: `+${Math.round(PASSIVE_BONUS_SPEED_PCT * 100)}% Vel. Viaje`, value: PASSIVE_BONUS_SPEED_PCT },
  pickup: { id: 'loot_bonus', label: 'Recogida', desc: `+${Math.round(PASSIVE_BONUS_LOOT_PCT * 100)}% Prob. Botín`, value: PASSIVE_BONUS_LOOT_PCT },
  synchronize: { id: 'nature_sync', label: 'Sincronía', desc: 'Sincronizar Naturaleza', value: PASSIVE_SYNC_CHANCE_PCT }
}

export function useAdventurePassives(gameStore: { state: { team?: Array<{ hp: number; ability?: AbilityId } | null> } }) {
  const activeTeamPassives = computed(() => {
    const team = gameStore.state.team || []
    let speedBonus = 0
    let lootBonus = 0
    let natureSync = false
    const activePassivesList: { label: string; desc: string }[] = []

    team.forEach(pkmn => {
      if (pkmn && pkmn.hp > 0 && pkmn.ability) {
        const passive = ADVENTURE_PASSIVES[pkmn.ability]
        if (passive) {
          if (passive.id === 'speed_bonus') {
            speedBonus = Math.max(speedBonus, passive.value)
          } else if (passive.id === 'loot_bonus') {
            lootBonus = Math.max(lootBonus, passive.value)
          } else if (passive.id === 'nature_sync') {
            natureSync = true
          }
          if (!activePassivesList.some(p => p.label === passive.label)) {
            activePassivesList.push({ label: passive.label, desc: passive.desc })
          }
        }
      }
    })

    return {
      speedBonus,
      lootBonus,
      natureSync,
      list: activePassivesList
    }
  })

  function triggerExtraLoot(
    itemId: ItemId,
    defaultQty: number = 1,
    inventoryStore: { addItem: (id: ItemId, qty: number) => void },
    injectedItems: Ref<Set<ItemId>>,
    travelLog: Ref<string[]>
  ) {
    const lootBonus = activeTeamPassives.value.lootBonus
    if (lootBonus > 0 && Math.random() < lootBonus) {
      inventoryStore.addItem(itemId, defaultQty)
      injectedItems.value.add(itemId)
      travelLog.value.push(`🌟 ¡Pasiva Recogida activa! Tu Pokémon ha encontrado un objeto extra: +${defaultQty}x ${itemId} obtenido en tu mochila real.`)
    }
  }

  return {
    activeTeamPassives,
    triggerExtraLoot
  }
}
