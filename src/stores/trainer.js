import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { MARKET_UNLOCKS } from '@/data/items'

export const TRAINER_RANKS = [
  { lv: 1, title: 'Novato', expNeeded: 100 },
  { lv: 2, title: 'Principiante', expNeeded: 250 },
  { lv: 3, title: 'Aprendiz', expNeeded: 500 },
  { lv: 4, title: 'Explorador', expNeeded: 900 },
  { lv: 5, title: 'Aventurero', expNeeded: 1400 },
  { lv: 6, title: 'Veterano', expNeeded: 2100 },
  { lv: 7, title: 'Experto', expNeeded: 3000 },
  { lv: 8, title: 'Maestro', expNeeded: 4200 },
  { lv: 9, title: 'Gran Maestro', expNeeded: 6000 },
  { lv: 10, title: 'Campeón', expNeeded: 8500 },
  { lv: 11, title: 'As de la Liga', expNeeded: 11500 },
  { lv: 12, title: 'Entrenador de Elite', expNeeded: 15000 },
  { lv: 13, title: 'Gran Campeón', expNeeded: 19000 },
  { lv: 14, title: 'Leyenda Viviente', expNeeded: 23500 },
  { lv: 15, title: 'Maestro Pokémon', expNeeded: 28500 },
  { lv: 16, title: 'Héroe Regional', expNeeded: 34000 },
  { lv: 17, title: 'Vencedor Supremo', expNeeded: 40000 },
  { lv: 18, title: 'Estratega Maestro', expNeeded: 46500 },
  { lv: 19, title: 'Guardián de Kanto', expNeeded: 53500 },
  { lv: 20, title: 'Elegido de los Dioses', expNeeded: 61000 },
  { lv: 21, title: 'Trascendente', expNeeded: 69000 },
  { lv: 22, title: 'Sabio de Combate', expNeeded: 77500 },
  { lv: 23, title: 'Señor de los Dragones', expNeeded: 86500 },
  { lv: 24, title: 'Conquistador de Cimas', expNeeded: 96000 },
  { lv: 25, title: 'Místico de Kanto', expNeeded: 106000 },
  { lv: 26, title: 'Soberano de Batalla', expNeeded: 116500 },
  { lv: 27, title: 'Omnisciente', expNeeded: 127500 },
  { lv: 28, title: 'Eterno', expNeeded: 139000 },
  { lv: 29, title: 'Divinidad Pokémon', expNeeded: 151500 },
  { lv: 30, title: 'Deidad de Kanto', expNeeded: 9999999 },
]

export const useTrainerStore = defineStore('trainer', () => {
  const gameStore = useGameStore()
  const uiStore = useUIStore()

  const level = computed(() => gameStore.state.trainerLevel || 1)
  const exp = computed(() => gameStore.state.trainerExp || 0)

  const currentRank = computed(() => {
    return TRAINER_RANKS[Math.min(level.value - 1, TRAINER_RANKS.length - 1)]
  })

  const nextRank = computed(() => {
    if (level.value >= 30) return null
    return TRAINER_RANKS[level.value]
  })

  const expProgress = computed(() => {
    const needed = currentRank.value.expNeeded
    return Math.min(100, (exp.value / needed) * 100)
  })

  function addExp(amount) {
    let currentExp = gameStore.state.trainerExp + amount
    let currentLevel = gameStore.state.trainerLevel
    const MAX_LEVEL = 30

    let rank = TRAINER_RANKS[Math.min(currentLevel - 1, TRAINER_RANKS.length - 1)]
    
    while (currentExp >= rank.expNeeded && currentLevel < MAX_LEVEL) {
      currentExp -= rank.expNeeded
      currentLevel++
      rank = TRAINER_RANKS[Math.min(currentLevel - 1, TRAINER_RANKS.length - 1)]
      
      uiStore.notify(`¡Subiste al rango ${rank.title}! Nivel ${currentLevel}`, '⭐')
      
      // Check for market unlocks
      if (MARKET_UNLOCKS[currentLevel]) {
        setTimeout(() => {
          uiStore.notify(`¡Nuevos items en el Poké Market!`, '🛒')
        }, 1500)
      }
    }

    gameStore.state.trainerExp = currentExp
    gameStore.state.trainerLevel = currentLevel
  }

  return {
    level,
    exp,
    currentRank,
    nextRank,
    expProgress,
    addExp
  }
})
