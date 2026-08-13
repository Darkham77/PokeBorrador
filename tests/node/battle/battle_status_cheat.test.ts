import { describe, expect, it } from 'vitest'
import { applyStatusCheatToSide, type CheatSide } from '@/logic/battle/cheats.ts'

const PLAYER_UID = 'player-uid'
const OTHER_UID = 'other-uid'
const POISON_STATUS = 'psn'

describe('applyStatusCheatToSide', () => {
  it('updates only the UID-selected simulator Pokémon so a legal switch retains its status', () => {
    const side: CheatSide = {
      pokemon: [
        { uid: PLAYER_UID, hp: 10, status: '' },
        { uid: OTHER_UID, hp: 10, status: '' },
      ],
    }

    applyStatusCheatToSide(side, OTHER_UID, POISON_STATUS)

    expect(side.pokemon[0]?.status).toBe('')
    expect(side.pokemon[1]?.status).toBe(POISON_STATUS)
  })

  it('fails instead of silently desynchronizing when the selected UID is absent', () => {
    const side: CheatSide = { pokemon: [{ uid: PLAYER_UID, hp: 10, status: '' }] }

    expect(() => applyStatusCheatToSide(side, OTHER_UID, POISON_STATUS)).toThrow(OTHER_UID)
  })
})
