import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleContext } from '@/types/battle/battleContext'
import { resetActiveBattleState } from '@/logic/battle/orchestratorStateHelper'

describe('Wild Encounter Enemy Team Synchronization (Tier 1 RED Reproduction)', () => {
  it('resets enemyTeam to contain exclusively the wild opponent when starting a wild battle with residual enemyTeam', async () => {
    const kadabra = makePokemon('kadabra', 30, { bypassWhitelist: true }) as Pokemon
    const magneton = makePokemon('magneton', 32, { bypassWhitelist: true }) as Pokemon
    const playerPikachu = makePokemon('pikachu', 35, { bypassWhitelist: true }) as Pokemon

    // Simulate activeBattle state having leftover Magneton in enemyTeam from a previous trainer/gym/encounter
    const mockActiveBattle = ref({
      isTrainer: false,
      isGym: false,
      isPvP: false,
      enemy: kadabra,
      enemyTeam: [magneton], // RESIDUAL ENEMY TEAM!
      locationId: 'route-1',
      weather: null,
      turnCount: 0
    })

    const mockCtx = {
      activeBattle: mockActiveBattle,
      playerStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
      enemyStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }),
      faintedSides: ref(new Set()),
      clearLogs: () => {}
    } as unknown as BattleContext

    await resetActiveBattleState(mockCtx, playerPikachu, false)

    // In a wild encounter, residual enemyTeam MUST NOT persist!
    // It should be cleared or set to undefined so it never leaks old Pokémon to Showdown.
    expect(mockActiveBattle.value.enemyTeam).toBeUndefined()
  })
})
