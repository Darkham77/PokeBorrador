import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/game.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { GYMS, GYMS_BY_ID, requireGymId, type GymDifficultyId, type GymId, type Gym } from '@/data/world/gyms.ts'
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

export const useGymsStore = defineStore('gyms', {
  state: () => ({
    gyms: GYMS
  }),
  getters: {
    defeatedGyms(): GymId[] {
      const gameStore = useGameStore()
      return gameStore.state.defeatedGyms || []
    },
    defeatedGymsSet(): ReadonlySet<GymId> {
      return new Set<GymId>(this.defeatedGyms) // runtime-set: Fast O(1) membership lookup set
    },
    // fallow-ignore-next-line unused-store-members
    gymsById(): Record<GymId, Gym> {
      return GYMS_BY_ID
    },
    availableRematchesList(): GymId[] {
      const gameStore = useGameStore()
      return getAvailableGymRematches(gameStore.state)
    },
    availableRematchesCount(): number {
      return this.availableRematchesList.length
    }
  },
  actions: {
    async loadGymProgress() {
      // SSoT is gameStore.state.defeatedGyms & gameStore.state.gymProgress
    },
    isGymDefeated(gymId: GymId): boolean {
      return this.defeatedGymsSet.has(gymId)
    },
    isDifficultyDefeated(gymId: GymId, difficulty: GymDifficultyId): boolean {
      const gameStore = useGameStore()
      const prog = gameStore.state.gymProgress[gymId]
      if (prog && prog[difficulty] === true) return true
      if (difficulty === 'easy' && this.isGymDefeated(gymId)) return true
      return false
    },
    isRematchAvailable(gymId: GymId): boolean {
      const gameStore = useGameStore()
      return isGymRematchAvailable(gameStore.state, gymId)
    },
    isRematchDoneToday(gymId: GymId): boolean {
      const gameStore = useGameStore()
      return isGymRematchCompletedToday(gameStore.state, gymId)
    },
    async challengeGym(gymId: GymId, difficulty: GymDifficultyId = 'easy') {
      const battleStore = useBattleStore()
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
    },
    async challengeRematch(gymId: GymId) {
      const battleStore = useBattleStore()
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
  }
})
