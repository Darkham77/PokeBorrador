import type { ItemId } from '@/data/inventory/itemIds'
import type { PokemonType } from '@/data/battle/types'

const _TEAM_ACTIVE_MODES = ['aventura', 'pvp3', 'pvp6', 'guerra'] as const
export type TeamActiveMode = (typeof _TEAM_ACTIVE_MODES)[number]

export interface TeamMember {
  uid: string
  id: number
  name: string
  level: number
  gender: 'm' | 'f'
  power: number
  hp: number
  maxHp: number
  tier: string
  tierColor: string
  passives: string[]
  heldItem?: ItemId
  badges: string[]
  types: { id: PokemonType; label: string }[]
}
