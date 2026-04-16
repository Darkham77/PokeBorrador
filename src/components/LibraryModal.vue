<script setup>
import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()

const isLibraryOpen = computed({
  get: () => uiStore.isLibraryOpen,
  set: (val) => { uiStore.isLibraryOpen = val }
})

const toggleLibrary = () => {
  uiStore.toggleLibrary()
}

const switchLibraryTab = (tab, event) => {
  if (typeof window.switchLibraryTab === 'function') {
    window.switchLibraryTab(tab, event.target)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isLibraryOpen"
      id="library-modal"
      class="modal-overlay"
      :class="{ active: isLibraryOpen }"
    >
      <div class="library-container">
        <aside class="library-sidebar">
          <h2>BIBLIOTECA</h2>
          <div
            class="library-nav-item active"
            @click="switchLibraryTab('gimnasios', $event)"
          >
            🏆 Gimnasios
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('captura', $event)"
          >
            🔴 Captura
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('clases', $event)"
          >
            🎭 Clases
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('crianza', $event)"
          >
            🥚 Crianza
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('misiones', $event)"
          >
            📋 Misiones
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('encuentros', $event)"
          >
            🗺️ Encuentros
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('shinys', $event)"
          >
            ✨ Shinys
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('combate', $event)"
          >
            ⚔️ Combate
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('guerra', $event)"
          >
            🛡️ Guerra
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('pokedex', $event)"
          >
            📂 Pokédex
          </div>
          <div
            class="library-nav-item"
            @click="switchLibraryTab('eventos', $event)"
          >
            📅 Eventos
          </div>
        </aside>
        <main class="library-content">
          <button
            class="library-close"
            @click="toggleLibrary"
          >
            ✕
          </button>
          <div
            id="library-article-content"
            class="library-article"
          >
            <div style="text-align:center; padding:100px 0;">
              <div style="font-size:40px; margin-bottom:20px;">
                📖
              </div>
              <div style="font-family:'Press Start 2P',monospace; font-size:12px; color:var(--gray);">
                Selecciona un tema para leer
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Scoped styles would go here if not already in global CSS */
</style>
