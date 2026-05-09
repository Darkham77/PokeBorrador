<script setup>
import { ref } from 'vue';
import AdminEventTab from './AdminEventTab.vue';
import AdminRankedTab from './AdminRankedTab.vue';

const activeTab = ref('events'); // 'events' | 'ranked'
</script>

<template>
  <div class="admin-panel">
    <header class="admin-header">
      <div class="tabs-nav">
        <button 
          :class="{ active: activeTab === 'events' }" 
          @click.stop="activeTab = 'events'"
        >
          EVENTOS
        </button>
        <button 
          :class="{ active: activeTab === 'ranked' }" 
          @click.stop="activeTab = 'ranked'"
        >
          RANKED
        </button>
      </div>
    </header>

    <!-- Event List -->
    <AdminEventTab v-if="activeTab === 'events'" />

    <!-- Ranked Tab -->
    <AdminRankedTab v-else-if="activeTab === 'ranked'" />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.admin-panel {
  padding: 30px;
  background: Var(--glass-bg);
  color: $white;
  border-radius: 24px;
  border: 1px solid Var(--glass-border);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
  padding-bottom: 20px;

  .tabs-nav {
    display: flex;
    gap: 20px;
    button {
      background: transparent;
      border: none;
      color: $muted;
      @include pixelated;
      font-size: 10px;
      cursor: pointer;
      padding: 10px 0;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
      &:hover { color: $white; }
      &.active {
        color: Var(--yellow);
        border-bottom-color: Var(--yellow);
      }
    }
  }
}
</style>
