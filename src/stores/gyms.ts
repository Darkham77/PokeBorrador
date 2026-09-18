import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/game.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { GYMS, GYMS_BY_ID, requireGymId, type GymId } from '@/data/world/gyms.ts'
import type { BattleDifficulty } from '@/types/battle/battle'
import { 
  GYM_REMATCHES, 
  getAvailableGymRematches, 
  isGymRematchAvailable, 
  isGymRematchCompletedToday 
} from '@/data/world/gymRematches'

const DEFAULT_REMATCH_LEVEL = 70 as const;

function isPokemon(value: Pokemon | null): value is Pokemon {
  return value !== null
}

export const useGymsStore = defineStore('gyms', () => {
  const gameStore = useGameStore()
  const battleStore = useBattleStore()

  // SSoT: Pure reactive derivations from gameStore.state
  const gyms = GYMS

  const defeatedGyms = computed<GymId[]>(() => {
    return gameStore.state.defeatedGyms || []
  })

  const defeatedGymsSet = computed<ReadonlySet<GymId>>(() => {
    return new Set<GymId>(defeatedGyms.value) // runtime-set: Fast O(1) membership lookup set
  })

  const availableRematchesList = computed<GymId[]>(() => {
    return getAvailableGymRematches(gameStore.state)
  })

  const availableRematchesCount = computed<number>(() => {
    return availableRematchesList.value.length
  })

  function isGymDefeated(gymId: GymId): boolean {
    return defeatedGymsSet.value.has(gymId)
  }

  function isDifficultyDefeated(gymId: GymId, difficulty: BattleDifficulty): boolean {
    const prog = gameStore.state.gymProgress[gymId]
    if (prog && prog[difficulty] === true) return true
    if (difficulty === 'easy' && isGymDefeated(gymId)) return true
    return false
  }

  function isRematchAvailable(gymId: GymId): boolean {
    return isGymRematchAvailable(gameStore.state, gymId)
  }

  function isRematchDoneToday(gymId: GymId): boolean {
    return isGymRematchCompletedToday(gameStore.state, gymId)
  }

  async function challengeGym(gymId: GymId, difficulty: BattleDifficulty = 'easy'): Promise<void> {
    const validGymId = requireGymId(gymId)
    
    const gym = GYMS_BY_ID[validGymId]
    if (!gym) return

    const diffData = gym.difficulties[difficulty] || gym.difficulties.easy
    const enemyTeam = diffData.pokemon.map((id, idx) => makePokemon(id, diffData.levels[idx] || 1)).filter(isPokemon)
    
    const mainEnemy = enemyTeam[enemyTeam.length - 1] as Pokemon // The ace

    await battleStore.startBattle(mainEnemy, {
      isGym: true,
      isTrainer: true,
      gymId: validGymId,
      locationId: 'gym',
      trainerName: `Líder ${gym.leader}`,
      trainerSprite: gym.sprite,
      enemyTeam: enemyTeam,
      difficulty,
      rewardTM: gym.rewardTM,
      cannotEscape: true,
      wasSearching: false
    })
  }

  async function challengeRematch(gymId: GymId): Promise<void> {
    const validGymId = requireGymId(gymId)
    const gym = GYMS_BY_ID[validGymId]
    const rematchConfig = GYM_REMATCHES[validGymId]
    if (!gym || !rematchConfig) return

    const enemyTeam = rematchConfig.pokemon
      .map((id, idx) => makePokemon(id, rematchConfig.levels[idx] ?? DEFAULT_REMATCH_LEVEL))
      .filter(isPokemon)

    const mainEnemy = enemyTeam[enemyTeam.length - 1] as Pokemon

    await battleStore.startBattle(mainEnemy, {
      isGym: true,
      isTrainer: true,
      isRematch: true,
      gymId: validGymId,
      locationId: 'gym',
      trainerName: `Líder ${gym.leader} (Revancha)`,
      trainerSprite: gym.sprite,
      enemyTeam: enemyTeam,
      difficulty: 'hard',
      cannotEscape: true,
      wasSearching: false
    })
  }

  return {
    gyms,
    availableRematchesCount,
    isGymDefeated,
    isDifficultyDefeated,
    isRematchAvailable,
    isRematchDoneToday,
    challengeGym,
    challengeRematch
  }
})
