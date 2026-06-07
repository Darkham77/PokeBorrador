import { ref } from 'vue'
import type { Pokemon } from '@/types/pokemon'
import { makePokemon } from '@/logic/pokemonFactory'

const FOSSIL_POKEMON_IDS = ['omanyte', 'kabuto', 'aerodactyl'] as const
const FISH_POKEMON_IDS = ['magikarp', 'goldeen', 'staryu'] as const

interface MinigameConfig {
  inventoryStore: { addItem: (id: string, qty: number) => void }
  injectedItems: { value: Set<string> }
  travelLog: { value: string[] }
  triggerExtraLoot: (itemId: string, defaultQtyValue?: number) => void
  resumeTravelAfterEvent: () => void
}

export function useAdventureMinigames(config: MinigameConfig) {
  const showArchaeology = ref(false)
  const showFishing = ref(false)
  const minigamePokemon = ref<Pokemon | null>(null)

  const startMinigame = (type: 'archaeology' | 'fishing') => {
    if (type === 'archaeology') {
      const fossilId = FOSSIL_POKEMON_IDS[Math.floor(Math.random() * FOSSIL_POKEMON_IDS.length)]!
      minigamePokemon.value = makePokemon(fossilId, 20) as Pokemon
      showArchaeology.value = true
      config.travelLog.value.push('⛏️ ¡Usas Golpe Roca y encuentras restos fósiles! Comienza la excavación...')
    } else {
      const fishId = FISH_POKEMON_IDS[Math.floor(Math.random() * FISH_POKEMON_IDS.length)]!
      minigamePokemon.value = makePokemon(fishId, 20) as Pokemon
      showFishing.value = true
      config.travelLog.value.push('🎣 ¡Lanzas la caña! Comienza el minijuego de pesca...')
    }
  }

  const handleMinigameWin = (source: 'archaeology' | 'fishing') => {
    showArchaeology.value = false
    showFishing.value = false
    minigamePokemon.value = null
    if (source === 'archaeology') {
      const fossils = ['helix_fossil', 'dome_fossil', 'old_amber']
      const chosen = fossils[Math.floor(Math.random() * fossils.length)]!
      config.inventoryStore.addItem(chosen, 1)
      config.injectedItems.value.add(chosen)
      const name = chosen === 'helix_fossil' ? 'Fósil Hélix' : (chosen === 'dome_fossil' ? 'Fósil Domo' : 'Ámbar Viejo')
      config.travelLog.value.push(`🦴 ¡Excavación exitosa! Has recuperado el fósil completo: +1 ${name} obtenido en tu mochila de pruebas.`)
      config.triggerExtraLoot(chosen, 1)
    } else {
      const fishLoot = ['pearl', 'big_pearl', 'water_stone']
      const chosen = fishLoot[Math.floor(Math.random() * fishLoot.length)]!
      config.inventoryStore.addItem(chosen, 1)
      config.injectedItems.value.add(chosen)
      const name = chosen === 'pearl' ? 'Perla' : (chosen === 'big_pearl' ? 'Perla Grande' : 'Piedra Agua')
      config.travelLog.value.push(`🐟 ¡Pesca exitosa! Has capturado un objeto marino: +1 ${name} obtenido en tu mochila de pruebas.`)
      config.triggerExtraLoot(chosen, 1)
    }
    config.resumeTravelAfterEvent()
  }

  const handleMinigameFail = (source: 'archaeology' | 'fishing') => {
    showArchaeology.value = false
    showFishing.value = false
    minigamePokemon.value = null
    if (source === 'archaeology') {
      config.travelLog.value.push('💔 El fósil se desmoronó... Mejor suerte la próxima vez.')
    } else {
      config.travelLog.value.push('💔 El Pokémon escapó de la caña... Sigues tu camino.')
    }
    config.resumeTravelAfterEvent()
  }

  return {
    showArchaeology,
    showFishing,
    minigamePokemon,
    startMinigame,
    handleMinigameWin,
    handleMinigameFail
  }
}
