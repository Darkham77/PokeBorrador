<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { PDEX_ORDER, GEN2_PDEX_ORDER } from '@/logic/pokedexConstants'
import { usePokedex } from '@/composables/usePokedex'

// Components
import PokedexHeader from '@/components/pokedex/PokedexHeader.vue'
import PokedexControls from '@/components/pokedex/PokedexControls.vue'
import PokedexPokemonCard from '@/components/pokedex/PokedexPokemonCard.vue'
import { useUIStore } from '@/stores/ui'

const gameStore = useGameStore() as any
const uiStore = useUIStore() as any
const gs = computed(() => gameStore.state)

const currentGen = ref(1)

const currentOrder = computed(() => currentGen.value === 1 ? PDEX_ORDER : GEN2_PDEX_ORDER)
const { searchQuery, sortBy, pokemonList } = usePokedex(gs, currentOrder, currentGen)

const stats = computed(() => {
  const caught = gs.value.pokedex || []
  const seen = gs.value.seenPokedex || []
  const currentGenTotal = currentOrder.value.length
  const currentGenSeen = currentOrder.value.filter((id: string) => seen.includes(id) || caught.includes(id)).length
  const currentGenCaught = currentOrder.value.filter((id: string) => caught.includes(id)).length

  return { seen: currentGenSeen, caught: currentGenCaught, total: currentGenTotal }
})

const openDetail = (p: any) => {
  if (!p.isSeen) return
  uiStore.open('PokedexDetail', { speciesId: p.id, context: 'pokedex' })
}
</script>

<template>
  <div class="pokedex-view">
    <PokedexHeader :stats="stats" />

    <PokedexControls 
      v-model:current-gen="currentGen"
      v-model:sort-by="sortBy"
      v-model:search-query="searchQuery"
    />

    <div class="pokedex-grid">
      <PokedexPokemonCard 
        v-for="p in pokemonList" 
        :key="p.id" 
        :p="p"
        data-ignore="[PureVue-Ignore]"
        @click.stop="openDetail(p)"
      />
    </div>
  </div>
</template>

<style lang="scss">
</style>
