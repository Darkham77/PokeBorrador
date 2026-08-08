import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/game.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { GYMS, requireGymId, isGymId, type GymDifficultyId, type GymId } from '@/data/world/gyms.ts'

function isPokemon(value: Pokemon | null): value is Pokemon {
  return value !== null
}

export const useGymsStore = defineStore('gyms', {
  state: () => ({
    gyms: GYMS,
    defeatedGyms: Array<GymId>()
  }),
  actions: {
    async loadGymProgress() {
      const gameStore = useGameStore()
      this.defeatedGyms = gameStore.state.defeatedGyms || []
    },
    isGymDefeated(gymId: string) {
      if (!isGymId(gymId)) return false
      return this.defeatedGyms.includes(gymId)
    },
    isDifficultyDefeated(gymId: string, difficulty: GymDifficultyId) {
      const gameStore = useGameStore()
      const validGymId = requireGymId(gymId)
      const prog = gameStore.state.gymProgress[validGymId]
      if (!prog) return false
      return prog[difficulty] === true
    },
    async challengeGym(gymId: string, difficulty: GymDifficultyId = 'easy') {
      const battleStore = useBattleStore()
      const validGymId = requireGymId(gymId)
      
      const gym = this.gyms.find(g => g.id === validGymId)
      if (!gym) return

      const diffData = gym.difficulties[difficulty] || gym.difficulties.easy
      const enemyTeam = diffData.pokemon.map((id, idx) => makePokemon(id, diffData.levels[idx] || 1)).filter(isPokemon)
      
      const mainEnemy = enemyTeam[enemyTeam.length - 1] as Pokemon // The ace

      await battleStore.startBattle(mainEnemy, {
        isGym: true,
        isTrainer: true,
        gymId: gym.id,
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
