import { computed, type Ref } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality'
import { filterAndSortPokemon } from '@/logic/pokemon/pokemonSelectionFilter.ts'
import { isPokemonBusy, isPokemonFilterTagId } from '@/logic/constants/tags.ts'
import type { useGameStore } from '@/stores/game'

export function useMarketPublishPokemon(
  game: ReturnType<typeof useGameStore>,
  searchQuery: Ref<string>,
  sortBy: Ref<string>,
  sortOrder: Ref<string>,
  activeTags: Ref<string[]>
) {
  const availablePokemon = computed(() => {
    const team = (game.state.team || [])
      .map((p, i) => ({ pokemon: p, _source: 'team' as const, index: i }))
      .filter((item): item is { pokemon: Pokemon, _source: 'team', index: number } => 
        item.pokemon !== null && !isPokemonBusy(item.pokemon) && !item.pokemon.isIllegal && checkPokemonLegality(item.pokemon).isLegal
      )

    const box = (game.state.box || [])
      .map((p, i) => ({ pokemon: p, _source: 'box' as const, index: i }))
      .filter((item): item is { pokemon: Pokemon, _source: 'box', index: number } => 
        item.pokemon !== null && !isPokemonBusy(item.pokemon) && !item.pokemon.isIllegal && checkPokemonLegality(item.pokemon).isLegal
      )

    return [...team, ...box]
  })

  const filteredAndSortedPokemon = computed(() => {
    return filterAndSortPokemon(availablePokemon.value, {
      searchQuery: searchQuery.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      activeTags: activeTags.value.filter(isPokemonFilterTagId)
    })
  })

  return {
    availablePokemon,
    filteredAndSortedPokemon
  }
}
