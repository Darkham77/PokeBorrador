<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { libraryContent, libraryCategories } from '@/data/libraryData'

const uiStore = useUIStore()
const isLibraryOpen = computed({
  get: () => uiStore.isLibraryOpen,
  set: (val) => { uiStore.isLibraryOpen = val }
})

const selectedTab = computed({
  get: () => uiStore.libraryTab,
  set: (val) => { uiStore.libraryTab = val }
})

const currentContent = computed(() => {
  return libraryContent[selectedTab.value] || '<h1>Proximamente</h1><p>En construccion.</p>'
})

const selectTab = (tabId) => {
  if (selectedTab.value === tabId) return
  
  contentFade.value = false
  setTimeout(() => {
    selectedTab.value = tabId
    contentFade.value = true
  }, 150)
}

const contentFade = ref(true)

const toggleLibrary = () => {
  uiStore.toggleLibrary()
}

onMounted(() => {
  // Ensure default is set if not already
  if (!uiStore.libraryTab) uiStore.libraryTab = 'gimnasios'
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isLibraryOpen"
      id="library-modal"
      class="modal-overlay active"
      @click.self="toggleLibrary"
    >
      <div class="library-container glass-morphism">
        <aside class="library-sidebar">
          <div class="sidebar-header">
            <span class="book-icon">📖</span>
            <h2>BIBLIOTECA</h2>
          </div>
          
          <nav class="library-nav">
            <div
              v-for="cat in libraryCategories"
              :key="cat.id"
              class="library-nav-item"
              :class="{ active: selectedTab === cat.id }"
              @click="selectTab(cat.id)"
            >
              {{ cat.label }}
            </div>
          </nav>
        </aside>

        <main class="library-content">
          <button
            class="library-close"
            title="Cerrar"
            @click="toggleLibrary"
          >
            ✕
          </button>

          <transition name="fade">
            <div
              v-if="contentFade"
              id="library-article-content"
              class="library-article"
              v-html="currentContent"
            />
          </transition>
        </main>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.library-container {
  display: flex;
  width: 900px;
  height: 600px;
  max-width: 95vw;
  max-height: 85vh;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  animation: modalScaleUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.library-sidebar {
  width: 240px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;

  .sidebar-header {
    padding: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    .book-icon { font-size: 24px; }
    h2 {
      margin: 0;
      font-size: 16px;
      font-family: 'Press Start 2P', monospace;
      color: #fff;
      letter-spacing: 1px;
    }
  }
}

.library-nav {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

  .library-nav-item {
    padding: 12px 16px;
    margin-bottom: 4px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
      transform: translateX(4px);
    }

    &.active {
      background: var(--primary-color, #3b82f6);
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
  }
}

.library-content {
  flex: 1;
  background: #1a1a1a;
  position: relative;
  overflow-y: auto;
  padding: 40px;
  color: #eee;

  .library-close {
    position: absolute;
    top: 20px;
    right: 20px;
    background: none;
    border: none;
    color: #fff;
    font-size: 24px;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
    z-index: 10;

    &:hover { opacity: 1; }
  }
}

.library-article {
  max-width: 700px;
  margin: 0 auto;
  line-height: 1.6;

  :deep(h1) {
    font-family: 'Press Start 2P', monospace;
    font-size: 18px;
    color: var(--primary-light, #60a5fa);
    margin-bottom: 24px;
    border-bottom: 2px solid rgba(255,255,255,0.05);
    padding-bottom: 12px;
  }

  :deep(h3) {
    color: #fff;
    margin: 24px 0 12px;
  }

  :deep(ul) {
    padding-left: 20px;
    li { margin-bottom: 8px; }
  }

  :deep(.library-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 13px;
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    
    th { color: var(--gray, #9ca3af); font-weight: 600; }
  }

  :deep(.class-info-box) {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
}

@keyframes modalScaleUp {
  from { opacity: 0; transform: #{"scale(0.95)"}; }
  to { opacity: 1; transform: #{"scale(1)"}; }
}
</style>

