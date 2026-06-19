import { defineStore } from 'pinia'
import { useGameStore } from '@/stores/game.ts'
import { useBattleStore } from '@/stores/battle/battle.ts'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'

import { GYMS } from '@/data/world/gyms.ts'

export const useGymsStore = defineStore('gyms', {
  state: () => ({
    gyms: GYMS,
    defeatedGyms: [] as string[]
  }),
  actions: {
    async loadGymProgress() {
      const gameStore = useGameStore()
      this.defeatedGyms = gameStore.state.defeatedGyms || []
    },
    isGymDefeated(gymId: string) {
      return this.defeatedGyms.includes(gymId)
    },
    isDifficultyDefeated(gymId: string, difficulty: string) {
      const gameStore = useGameStore()
      const prog = gameStore.state.gymProgress[gymId]
      if (!prog) return false
      return prog[difficulty as keyof typeof prog] === true
    },
    async challengeGym(gymId: string, difficulty: 'easy' | 'normal' | 'hard' = 'easy') {
      const battleStore = useBattleStore()
      
      const gym = this.gyms.find(g => g.id === gymId)
      if (!gym) return

      const diffData = gym.difficulties[difficulty] || gym.difficulties.easy
      const enemyTeam = diffData.pokemon.map((id: string, idx: number) => makePokemon(id, diffData.levels[idx] || 1)).filter(Boolean) as Pokemon[]
      
      const mainEnemy = enemyTeam[enemyTeam.length - 1] as Pokemon // The ace

      await battleStore.startBattle(mainEnemy, {
        isGym: true,
        isTrainer: true,
        gymId: gym.id,
        trainerName: `Líder ${gym.leader}`,
        trainerSprite: gym.sprite,
        enemyTeam: enemyTeam,
        locationId: 'gym',
        difficulty,
        rewardTM: gym.rewardTM,
        cannotEscape: true
      })
    }
  }
})
