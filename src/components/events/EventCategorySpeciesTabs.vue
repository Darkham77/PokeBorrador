<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import type { SpeciesTabItem } from './eventCardTypes'

interface Props {
  tabs: SpeciesTabItem[]
  activeTabId: string // infra-id-ok: UI active tab identifier
  eventId: string
  idPrefix?: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', tabId: string): void
}>()
</script>

<template>
  <div
    v-if="tabs.length > 1"
    class="species-tabs-container"
  >
    <button
      v-for="tab in tabs"
      :id="(idPrefix || '') + 'event-species-tab-' + eventId + '-' + tab.id"
      :key="tab.id"
      type="button"
      class="species-tab-btn pixelated"
      :class="{
        active: activeTabId === tab.id,
        'is-complete': tab.isComplete,
        'has-enrolled': tab.enrolledCount > 0 && !tab.isComplete
      }"
      @click.stop="emit('select', tab.id)"
    >
      <img
        v-if="tab.species"
        :src="getAssetUrl(ASSET_TYPES.POKEMON, tab.species)"
        class="tab-poke-sprite"
        :alt="tab.name"
        draggable="false"
      >
      <span
        v-else
        class="tab-global-icon"
      ><span class="emoji">{{ tab.icon || '🧬' }}</span></span>

      <span class="tab-label">{{ tab.name }}</span>

      <!-- Green Check Pill if Completed -->
      <span
        v-if="tab.isComplete"
        class="tab-check-pill complete"
        title="Categorías completadas"
      >
        <span class="emoji">✓</span>
      </span>
      <span
        v-else-if="tab.enrolledCount > 0"
        class="tab-check-pill partial"
      >
        {{ tab.enrolledCount }}/{{ tab.totalCount }}
      </span>
    </button>
  </div>
</template>

<style scoped src="./EventCardCategoryPreview.styles.scss" lang="scss"></style>
