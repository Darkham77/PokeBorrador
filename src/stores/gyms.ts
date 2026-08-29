import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/game.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { GYMS, GYMS_BY_ID, requireGymId, isGymId, type GymDifficultyId, type GymId, type Gym } from '@/data/world/gyms.ts'

function isPokemon(value: Pokemon | null): value is Pokemon {
  return value !== null
}

export const useGymsStore = defineStore('gyms', {
  state: () => ({
    gyms: GYMS,
    defeatedGyms: Array<GymId>()
  }),
  getters: {
    defeatedGymsSet(state): ReadonlySet<GymId> {
      return new Set<GymId>(state.defeatedGyms) // runtime-set
    },
    // fallow-ignore-next-line unused-store-members
    gymsById(): Record<GymId, Gym> {
      return GYMS_BY_ID
    }
  },
  actions: {
    async loadGymProgress() {
      const gameStore = useGameStore()
      this.defeatedGyms = gameStore.state.defeatedGyms || []
    },
    isGymDefeated(gymId: string): boolean {
      if (!isGymId(gymId)) return false
      return this.defeatedGymsSet.has(gymId)
    },
    isDifficultyDefeated(gymId: string, difficulty: GymDifficultyId): boolean {
      const gameStore = useGameStore()
      const validGymId = requireGymId(gymId)
      const prog = gameStore.state.gymProgress[validGymId]
      if (!prog) return false
      return prog[difficulty] === true
    },
    async challengeGym(gymId: string, difficulty: GymDifficultyId = 'easy') {
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
