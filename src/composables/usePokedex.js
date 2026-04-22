import { ref, computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { POKEMON_SPRITE_IDS } from '@/logic/pokedexConstants'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'

export function usePokedex(gs, currentOrder, _currentGen) {
  const uiStore = useUIStore()
  const searchQuery = ref('')
  const sortBy = ref('number') // 'number' | 'name'

  const pokemonList = computed(() => {
    let caught = gs.value.pokedex || []
    let seen = gs.value.seenPokedex || []
    
    // Debug Overrides (Temporary)
    if (uiStore.debugPokedexMode === 'caught') {
      caught = [...currentOrder.value]
      seen = [...currentOrder.value]
    } else if (uiStore.debugPokedexMode === 'seen') {
      seen = [...currentOrder.value]
    }
    
    // 1. Prepare raw list with proper numbers
    const list = currentOrder.value.map((id) => {
      const isCaught = caught.includes(id)
      const isSeen = seen.includes(id) || isCaught
      const data = pokemonDataProvider.getPokemonData(id) || { name: id }
      
      // Use POKEMON_SPRITE_IDS as the authority for the national number
      const nationalNum = POKEMON_SPRITE_IDS[id] || 0
      
      return {
        id,
        dexNum: String(nationalNum).padStart(3, '0'),
        rawDexNum: nationalNum,
        name: isSeen ? data.name : '???',
        isSeen,
        isCaught,
        spriteUrl: isSeen ? getAssetUrl(ASSET_TYPES.POKEMON, id) : null
      }
    })

    // 2. Filter
    const filtered = list.filter(p => {
      if (!searchQuery.value) return true
      const query = searchQuery.value.toLowerCase()
      // If unseen, we can only search by #number
      if (!p.isSeen) return p.dexNum.includes(query)
      return p.name.toLowerCase().includes(query) || p.dexNum.includes(query)
    })

    // 3. Sort
    return filtered.sort((a, b) => {
      if (sortBy.value === 'name') {
        // Unseen pokes at bottom when sorting by name? or by ID?
        // Usually, original Dexter keeps them in place. 
        // But if user asks to sort by name, they expect alphabetical.
        if (a.name === '???' && b.name !== '???') return 1
        if (a.name !== '???' && b.name === '???') return -1
        return a.name.localeCompare(b.name)
      }
      return a.rawDexNum - b.rawDexNum
    })
  })

  return {
    searchQuery,
    sortBy,
    pokemonList
  }
}
