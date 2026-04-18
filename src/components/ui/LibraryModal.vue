<script setup>
import { useLibraryStore } from '@/stores/library'
import { libraryContent } from '@/data/libraryContent'
import { computed } from 'vue'

const libraryStore = useLibraryStore()

const currentContent = computed(() => {
  return libraryContent[libraryStore.currentTab] || '<h1>Próximamente</h1><p>En construcción.</p>'
})

const tabs = [
  { id: 'gimnasios', label: 'Gimnasios', icon: '🏆' },
  { id: 'captura', label: 'Captura', icon: '🔴' },
  { id: 'clases', label: 'Clases', icon: '🎭' },
  { id: 'crianza', label: 'Crianza', icon: '🥚' },
  { id: 'misiones', label: 'Misiones', icon: '📋' },
  { id: 'encuentros', label: 'Encuentros', icon: '🗺️' },
  { id: 'shinys', label: 'Shinys', icon: '✨' },
  { id: 'combate', label: 'Combate', icon: '⚔️' },
  { id: 'guerra', label: 'Guerra', icon: '🛡️' },
  { id: 'pokedex', label: 'Pokédex', icon: '📂' },
  { id: 'eventos', label: 'Eventos', icon: '📅' },
]

const close = () => {
  libraryStore.close()
}

const switchTab = (tabId) => {
  libraryStore.switchTab(tabId)
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="libraryStore.isOpen"
      class="library-modal"
      @click.self="close"
    >
      <div class="library-container">
        <aside class="library-sidebar">
          <h2>📚 BIBLIOTECA</h2>
          <div 
            v-for="tab in tabs" 
            :key="tab.id"
            class="library-nav-item"
            :class="{ active: libraryStore.currentTab === tab.id }"
            @click="switchTab(tab.id)"
          >
            <span class="icon">{{ tab.icon }}</span>
            <span class="label">{{ tab.label }}</span>
          </div>
        </aside>

        <main class="library-content">
          <button
            class="library-close"
            @click="close"
          >
            ✕
          </button>
          <div
            class="library-article"
            v-html="currentContent"
          />
        </main>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.library-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  z-index: 9000;
  color: white;
  display: flex;
  backdrop-filter: blur(10px);
}

.library-container {
  display: flex;
  width: 100%;
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
  overflow: hidden;
}

.library-sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;

  h2 {
    font-family: 'Press Start 2P', cursive;
    font-size: 14px;
    color: var(--yellow, #facc15);
    margin-bottom: 30px;
    padding-left: 10px;
  }

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
}

.library-nav-item {
  padding: 14px 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 700;
  color: #888;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #fff;
  }

  &.active {
    background: var(--yellow, #facc15);
    color: #000;
    box-shadow: 0 4px 15px rgba(250, 204, 21, 0.2);
  }

  .icon {
    font-size: 18px;
  }
}

.library-content {
  flex: 1;
  padding: 60px;
  overflow-y: auto;
  position: relative;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
}

.library-close {
  position: absolute;
  top: 30px;
  right: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: all 0.2s;
  z-index: 10;

  &:hover {
    background: var(--red, #ef4444);
    transform: rotate(90deg) scale(1.1);
  }
}

.library-article {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.8;
  animation: slideUp 0.3s ease-out;

  :deep(h1) {
    font-family: 'Press Start 2P', cursive;
    font-size: 24px;
    color: var(--yellow, #facc15);
    margin-bottom: 40px;
    text-shadow: 0 4px 10px rgba(0,0,0,0.5);
  }

  :deep(h3) {
    color: #a855f7; /* Purple */
    margin: 40px 0 15px;
    font-size: 20px;
    font-weight: 800;
  }

  :deep(p) {
    margin-bottom: 25px;
    color: #ccc;
    font-size: 16px;
  }

  :deep(ul) {
    margin-bottom: 25px;
    padding-left: 20px;
    list-style: none;
  }

  :deep(li) {
    margin-bottom: 12px;
    color: #bbb;
    position: relative;
    padding-left: 20px;

    &::before {
      content: '▹';
      position: absolute;
      left: 0;
      color: var(--yellow, #facc15);
    }
  }

  :deep(strong) {
    color: #fff;
    font-weight: 800;
  }

  :deep(.library-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 30px 0;
    background: rgba(255,255,255,0.02);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.05);

    th, td {
      padding: 16px 20px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }

    th {
      background: rgba(255,255,255,0.05);
      color: var(--yellow, #facc15);
      font-size: 12px;
      font-family: 'Press Start 2P', cursive;
    }

    td {
      font-size: 14px;
    }
  }

  :deep(.class-info-box) {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    transition: transform 0.2s;

    &:hover {
      transform: scale(1.02);
      background: rgba(255, 255, 255, 0.05);
    }

    h3 {
      margin-top: 0;
      font-family: 'Press Start 2P', cursive;
      font-size: 12px;
      margin-bottom: 16px;
    }
  }
}

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .library-container {
    flex-direction: column;
  }
  .library-sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    padding: 15px;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    overflow-x: auto;

    h2 { display: none; }
  }
  .library-nav-item {
    padding: 10px 15px;
    white-space: nowrap;
    
    .label { font-size: 12px; }
  }
  .library-content {
    padding: 30px 20px;
  }
  .library-article h1 { font-size: 18px; }
}
</style>
