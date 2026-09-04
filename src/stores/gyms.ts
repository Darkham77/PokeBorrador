import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/game.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { GYMS, GYMS_BY_ID, requireGymId, type GymDifficultyId, type GymId, type Gym } from '@/data/world/gyms.ts'

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
    }
  }
})
