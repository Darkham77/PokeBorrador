import { requireCertifiedBattleTeamSlot } from '@/types/battle/certifiedBattleActions.ts'
import type { ShowdownPlayerRequest } from '@/types/battle/battle.ts'
import type { BattleReadySwitchSlot } from '@/types/battle/battleEvents.ts'

const SHOWDOWN_SLOT_INDEX_OFFSET = 1

export function projectBattleReadySwitchSlots(request: ShowdownPlayerRequest | undefined): BattleReadySwitchSlot[] {
  if (!request || !request.side) return []

  return request.side.pokemon.map((pokemon, index) => {
    if (typeof pokemon.uid !== 'string' || pokemon.uid.length === 0) {
      throw new Error(`[BattleReadySwitchSlots] Showdown slot ${index + SHOWDOWN_SLOT_INDEX_OFFSET} has no mapped Pokémon UID.`)
    }
    return {
      showdownSlot: requireCertifiedBattleTeamSlot(index + SHOWDOWN_SLOT_INDEX_OFFSET),
      pokemonUid: pokemon.uid,
    }
  })
}
