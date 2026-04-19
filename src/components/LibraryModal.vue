<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUIStore } from '@/stores/ui'
import { libraryContent, libraryCategories } from '@/data/libraryData'
import BaseModal from '@/components/common/BaseModal.vue'

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
  <BaseModal
    :show="isLibraryOpen"
    max-width="1200px"
    hide-header
    padding="raw"
    no-scroll
    @close="toggleLibrary"
  >
    <div class="library-container">
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
  </BaseModal>
</template>

<style lang="scss" scoped>
.fade-enter-active, .fade-leave-active {
  transition: Opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  Opacity: 0;
}

.library-container {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 0; /* Allow shrinking */
  max-width: 1400px;
  margin: 0 auto;
  overflow: hidden;
  overflow-x: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

.library-sidebar {
  width: 280px;
  background: rgba(255, 255, 255, 0.03);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  padding: 40px 20px;
  overflow-x: hidden;

  .sidebar-header {
    padding-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;

    .book-icon { font-size: 20px; }
    h2 {
      margin: 0;
      font-size: 14px;
      font-family: 'Press Start 2P', monospace;
      color: var(--yellow);
      letter-spacing: 1px;
    }
  }
}

.library-nav {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

  .library-nav-item {
    padding: 14px 20px;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease;
    font-size: 14px;
    font-weight: 700;
    color: var(--gray);
    display: flex;
    align-items: center;
    gap: 12px;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }

    &.active {
      background: var(--yellow);
      color: var(--darker);
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(255, 214, 10, 0.2);
    }
  }
}

.library-content {
  flex: 1;
  background: transparent;
  position: relative;
  overflow-y: auto;
  padding: 60px;
  color: #eee;

  .library-close {
    position: absolute;
    top: 30px;
    right: 40px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: #fff;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: all 0.2s;
    z-index: 10;

    &:hover { 
      background: var(--red);
      transform: rotate(90deg);
    }
  }
}

.library-article {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.8;

  :deep(h1) {
    font-family: 'Press Start 2P', monospace;
    font-size: 24px;
    color: var(--yellow);
    margin-bottom: 40px;
  }

  :deep(h3) {
    color: var(--purple);
    margin: 30px 0 15px;
    font-size: 20px;
  }

  :deep(p) {
    margin-bottom: 25px;
    color: #ccc;
    font-size: 16px;
  }

  :deep(ul) {
    margin-bottom: 25px;
    padding-left: 20px;
    li { 
      margin-bottom: 10px; 
      color: #bbb;
    }
  }

  :deep(strong) {
    color: #fff;
  }

  :deep(.library-table) {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    background: rgba(255,255,255,0.02);
    border-radius: 12px;
    overflow: hidden;
    
    th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    
    th { 
      background: rgba(255,255,255,0.05);
      color: var(--yellow);
      font-size: 14px;
    }
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
  from { Opacity: #{0}; transform: Scale(#{0.95}); }
  to { Opacity: #{1}; transform: Scale(#{1.0}); }
}

@media (max-width: 768px) {
  .library-container {
    flex-direction: column;
  }
  .library-sidebar {
    width: 100%;
    height: auto;
    flex-direction: row;
    padding: 20px;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
    .sidebar-header { display: none; }
  }
  .library-nav {
    flex-direction: row;
    overflow-x: auto;
    padding: 10px;
    .library-nav-item {
      white-space: nowrap;
    }
  }
  .library-content {
    padding: 30px 20px;
  }
}
</style>

