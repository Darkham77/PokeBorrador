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
  gap: 8px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: var(--font-pixel), "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  font-size: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  @include pixelated;
  gap: 6px;
  line-height: 1.5;
  
  &.pending {
    background: #475569;
    color: #facc15;
    border: 1px solid Rgba(250, 204, 21, 0.25);
    box-shadow: 0 3px 0 #334155;
  }
  
  &.friend {
    background: #1e293b;
    color: #4ade80;
    border: 1px solid Rgba(74, 222, 128, 0.25);
    box-shadow: 0 3px 0 #0f172a;
  }
}
</style>
