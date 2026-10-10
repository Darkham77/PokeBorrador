<script setup lang="ts">
import type { SearchResult } from '@/stores/social/social'

defineProps<{
  player: SearchResult
}>()

const emit = defineEmits<{
  (e: 'send-request', id: string): void
  (e: 'respond-request', relId: string): void
}>()
</script>

<template>
  <div class="search-actions">
    <button 
      v-if="player.status === 'none'" 
      :id="`social-search-send-btn-${player.id}`"
      v-gsap-hover
      class="btn-vicio-secondary btn-vicio-sm" 
      @click.stop="emit('send-request', player.id)"
    >
      <span class="emoji">➕</span> ENVIAR
    </button>

    <button 
      v-else-if="player.status === 'pending' && !player.isRequester" 
      :id="`social-search-accept-btn-${player.id}`"
      v-gsap-hover
      class="btn-vicio-success btn-vicio-sm" 
      @click.stop="player.relId && emit('respond-request', player.relId)"
    >
      <span class="emoji">✓</span> ACEPTAR
    </button>

    <span
      v-else-if="player.status === 'pending' && player.isRequester"
      class="status-badge pending"
    >
      <span class="emoji">⏳</span> ENVIADA
    </span>

    <span
      v-else-if="player.status === 'accepted'"
      class="status-badge friend"
    >
      <span class="emoji">✅</span> AMIGO
    </span>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.search-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.status-badge {
  @include pixelated;

  display: inline-flex;
  justify-content: center;
  align-items: center;
  gap: $spacing-sm-alt;
  padding: 8px 12px;
  border-radius: $radius-lg;
  font-family: var(--font-pixel), $font-family-emoji;
  font-size: var(--font-8);
  line-height: 1.5;
  text-align: center;
  
  &.pending {
    border: 1px solid Rgb(250 204 21 / 25%);
    background: var(--slate-600);
    color: var(--amber-400);
    box-shadow: var(--shadow-card);
  }
  
  &.friend {
    border: 1px solid Rgb(74 222 128 / 25%);
    background: var(--slate-800);
    color: var(--green-light);
    box-shadow: var(--shadow-card);
  }
}
</style>
