import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

export interface SpeciesTabItem {
  id: string
  species?: PokemonSpeciesId
  name: string
  icon?: string
  totalCount: number
  enrolledCount: number
  isComplete: boolean
}
