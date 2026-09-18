<script setup lang="ts">
import PVGenderBadge from '@/components/common/PVGenderBadge.vue'
import PokemonTypeTag from '@/components/shared/PokemonTypeTag.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { DetailSpeciesHeaderData } from './pokemonSummaryTypes.ts'

const NATIONAL_ID_PADDING_LENGTH = 3

interface Props {
  species: DetailSpeciesHeaderData
  targetPokemon?: Pokemon | null
  isInstance?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'editNickname'): void
}>()
</script>

<template>
  <header class="pdex-custom-header">
    <div
      class="poke-identity"
      :class="{ 'has-nickname': targetPokemon?.nickname }"
    >
      <span class="p-id">#{{ species.nationalId.padStart(NATIONAL_ID_PADDING_LENGTH, '0') }}</span>
      <div
        class="name-with-edit"
        style="display: flex; align-items: center; gap: 8px;"
      >
        <button 
          v-if="isInstance" 
          class="edit-nick-btn" 
          style="font-size: 10px; padding: 0; opacity: 0.5; cursor: pointer; flex-shrink: 0;"
          @click.stop="emit('editNickname')"
        >
          <span class="emoji">✏️</span>
        </button>
        <PVGenderBadge
          v-if="targetPokemon?.gender"
          :gender="targetPokemon.gender"
          size="sm"
        />
        <div class="name-container">
          <span
            v-if="targetPokemon?.nickname"
            class="p-nickname-prefix"
          >
            {{ targetPokemon.nickname }}
          </span>
          <h2
            class="p-name"
            style="margin: 0;"
          >
            {{ species.name.toUpperCase() }}
          </h2>
        </div>
      </div>
    </div>

    <div class="header-right">
      <div class="p-types">
        <PokemonTypeTag
          v-for="t in species.type"
          :key="t"
          :type="t"
          size="md"
        />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
@use "../../styles/components/pokedex-detail" as *;
@use "../../styles/components/unified-pokemon-detail" as *;
</style>
