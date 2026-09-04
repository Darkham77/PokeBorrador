import { ref, computed, type Ref } from 'vue'
import { useUIStore } from '@/stores/ui'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_SPRITE_IDS } from '@/data/pokemon/spriteMapping'
import { requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { GameState, PokedexItem } from '@/types/system/game'

function toPokemonSpeciesIds(values: readonly string[]): PokemonSpeciesId[] {
  return values.map(requirePokemonSpeciesId)
}

export function usePokedex(gs: Ref<GameState>, currentOrder: Ref<readonly PokemonSpeciesId[]>, _currentGen: Ref<number>) {
  const uiStore = useUIStore()
  const searchQuery = ref('')
  const sortBy = ref('number') // 'number' | 'name'
  const sortOrder = ref<'asc' | 'desc'>('asc')

  const pokemonList = computed<PokedexItem[]>(() => {
    let caught = toPokemonSpeciesIds(gs.value.pokedex || [])
    let seen = toPokemonSpeciesIds(gs.value.seenPokedex || [])
    const orderedSpecies = currentOrder.value
    
    // Debug Overrides (Temporary)
    if (uiStore.debugPokedexMode === 'none') {
      caught = []
      seen = []
    } else if (uiStore.debugPokedexMode === 'caught') {
      caught = [...orderedSpecies]
      seen = [...orderedSpecies]
    } else if (uiStore.debugPokedexMode === 'seen') {
      seen = [...orderedSpecies]
    }

    
    // 1. Prepare raw list with proper numbers
    const list: PokedexItem[] = orderedSpecies.map((id) => {
      const isCaught = caught.includes(id)
      const isSeen = seen.includes(id) || isCaught
      const data = pokemonDataProvider.getPokemonData(id)
      if (!data) {
        throw new Error(`[usePokedex] Missing Pokemon data for species: ${id}`)
      }
      
      // Use POKEMON_SPRITE_IDS as the authority for the national number
      const spriteId = POKEMON_SPRITE_IDS[id]
      if (spriteId === undefined) {
        throw new Error(`[usePokedex] Missing sprite id for Pokemon species: ${id}`)
      }
      const nationalNum = parseInt(String(spriteId))
      
      return {
        id,
        dexNum: String(nationalNum).padStart(3, '0'),
        rawDexNum: nationalNum,
        name: isSeen ? data.name : 'Desconocido',
        isSeen,
        isCaught,
        spriteUrl: isSeen ? getAssetUrl(ASSET_TYPES.POKEMON, id) : null
      }
    })

    // 2. Filter
    const filtered = list.filter(p => {
      if (!searchQuery.value) return true
      const query = searchQuery.value.toLowerCase() // text-ok: UI text display localization string
      // If unseen, we can only search by #number
      if (!p.isSeen) return p.dexNum.includes(query)
      return p.name.toLowerCase().includes(query) || p.dexNum.includes(query) // text-ok: UI text display localization string
    })

    // 3. Sort
    return filtered.sort((a, b) => {
      let comp = 0
      if (sortBy.value === 'name') {
        // Unseen pokes at bottom when sorting by name? or by ID?
        // Usually, original Dexter keeps them in place. 
        // But if user asks to sort by name, they expect alphabetical.
        if (a.name === 'Desconocido' && b.name !== 'Desconocido') comp = 1
        else if (a.name !== 'Desconocido' && b.name === 'Desconocido') comp = -1
        else comp = a.name.localeCompare(b.name)
      } else {
        comp = a.rawDexNum - b.rawDexNum
      }
      return sortOrder.value === 'asc' ? comp : -comp
    })
  })

  return {
    searchQuery,
    sortBy,
    sortOrder,
    pokemonList
  }
}
