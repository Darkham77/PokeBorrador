<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import { useGameStore } from '@/stores/game'

const uiStore = useUIStore()
const gameStore = useGameStore()

const gs = computed(() => gameStore.state)
const activeTab = computed(() => uiStore.activeTab)

const handleTabChange = (tab, event) => {
  uiStore.activeTab = tab
  if (typeof window.showTab === 'function') {
    window.showTab(tab, event.target.closest('.mobile-nav-btn'))
  }
}
</script>

<template>
  <div
    v-if="gs && gs.starterChosen"
    class="mobile-nav"
  >
    <button
      class="mobile-nav-btn"
      :class="{ active: activeTab === 'map' }"
      @click="handleTabChange('map', $event)"
    >
      <span class="nav-icon">🗺️</span>
      <span class="nav-label">Mapa</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: ['team', 'box', 'pokedex'].includes(activeTab) }"
      @click="handleTabChange('team', $event)"
    >
      <span class="nav-icon">⚡</span>
      <span class="nav-label">PkMn</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: activeTab === 'bag' }"
      @click="handleTabChange('bag', $event)"
    >
      <span class="nav-icon">🎒</span>
      <span class="nav-label">Mochila</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: activeTab === 'gyms' }"
      @click="handleTabChange('gyms', $event)"
    >
      <span class="nav-icon">🏆</span>
      <span class="nav-label">Gims</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: activeTab === 'daycare' }"
      @click="handleTabChange('daycare', $event)"
    >
      <span class="nav-icon">🥚</span>
      <span class="nav-label">Cría</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: ['online-market', 'market', 'trainer-shop'].includes(activeTab) }"
      @click="handleTabChange('market', $event)"
    >
      <span class="nav-icon">🛒</span>
      <span class="nav-label">Market</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: ['friends', 'war'].includes(activeTab) }"
      @click="handleTabChange('friends', $event)"
    >
      <span class="nav-icon">👥</span>
      <span class="nav-label">Social</span>
    </button>
    <button
      class="mobile-nav-btn"
      :class="{ active: activeTab === 'ranked' }"
      @click="handleTabChange('ranked', $event)"
    >
      <span class="nav-icon">🏅</span>
      <span class="nav-label">Rank</span>
    </button>
  </div>
</template>
