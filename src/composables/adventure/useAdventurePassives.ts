import { computed, type Ref } from 'vue'
import type { AbilityId } from '@/data/battle/abilities'

const ADVENTURE_PASSIVES: Partial<Record<AbilityId, { id: string; label: string; desc: string; value: number }>> = {
  flamebody: { id: 'speed_bonus', label: 'Cuerpo Llama', desc: '+15% Vel. Viaje', value: 0.15 },
  magmaarmor: { id: 'speed_bonus', label: 'Escudo Magma', desc: '+15% Vel. Viaje', value: 0.15 },
  pickup: { id: 'loot_bonus', label: 'Recogida', desc: '+20% Prob. Botín', value: 0.20 },
  synchronize: { id: 'nature_sync', label: 'Sincronía', desc: 'Sincronizar Naturaleza', value: 0.50 }
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
    itemId: string,
    defaultQty: number = 1,
    inventoryStore: { addItem: (id: string, qty: number) => void },
    injectedItems: Ref<Set<string>>,
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
