<script setup>
import { ref, computed, watch } from 'vue'
import { libraryContent, libraryCategories } from '@/data/libraryData'
import BaseModal from '@/components/common/BaseModal.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  initialTab: { type: String, default: 'gimnasios' }
})

const emit = defineEmits(['close'])

// Default to 'gimnasios' if initialTab is null or not in categories
const selectedTab = ref(props.initialTab || 'gimnasios')
const contentFade = ref(true)

watch(() => props.initialTab, (newTab) => {
  if (newTab) selectedTab.value = newTab
})

const currentContent = computed(() => {
  return libraryContent[selectedTab.value] || '<h1>Próximamente</h1><p>En construcción.</p>'
})

const selectTab = (tabId) => {
  if (selectedTab.value === tabId) return
  
  contentFade.value = false
  setTimeout(() => {
    selectedTab.value = tabId
    contentFade.value = true
  }, 150)
}
</script>

<template>
  <BaseModal
    :show="show"
    max-width="1200px"
    title="BIBLIOTECA"
    :show-close-button="true"
    padding="raw"
    no-scroll
    @close="emit('close')"
  >
    <div class="library-container">
      <aside class="library-sidebar">
        <nav class="library-nav custom-scrollbar">
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

      <main class="library-content custom-scrollbar">
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
@use "@/styles/core/tools" as *;

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.library-container {
  display: flex;
  width: 100%;
  min-height: 650px;
  max-height: 85vh;
  overflow: hidden;
  background: linear-gradient(180deg, #161a2e 0%, #0a0c14 100%);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  @media (max-width: 900px) {
    flex-direction: column;
    height: 90vh;
    border-radius: 0;
  }
}

.library-sidebar {
  width: 280px;
  background: rgba(10, 10, 15, 0.4);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 32px 16px;
  gap: 8px;

  @media (max-width: 900px) {
    width: 100%;
    height: auto;
    flex-direction: row;
    padding: 16px;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
}

.library-nav {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;

  @media (max-width: 900px) {
    flex-direction: row;
    padding-bottom: 8px;
  }

  .library-nav-item {
    padding: 14px 20px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: 'Press Start 2P', cursive;
    font-size: 10px;
    font-weight: 400;
    color: var(--gray, #94a3b8);
    @include pixelated;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid transparent;

    &:hover {
      background: rgba(255, 255, 255, 0.04);
      color: #fff;
      transform: translateX(4px);
      border-color: rgba(250, 204, 21, 0.2);
    }

    &.active {
      background: rgba(250, 204, 21, 0.1);
      border-color: rgba(250, 204, 21, 0.3);
      color: var(--yellow);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 900px) {
      white-space: nowrap;
      padding: 10px 14px;
      transform: none !important;
    }
  }
}

.library-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: rgba(0, 0, 0, 0.15);
  position: relative;
}

.library-article {
  max-width: 900px;
  margin: 0 auto;
  padding: 60px 40px;
  line-height: 1.8;
  color: #ddd;

  :deep(h1) {
    font-family: 'Press Start 2P', cursive;
    font-size: 24px;
    color: var(--yellow);
    margin-bottom: 40px;
    text-shadow: 0 4px 10px rgba(0,0,0,0.5);
    @include pixelated;
  }

  :deep(h3) {
    color: var(--purple, #bf5af2);
    margin: 40px 0 20px;
    font-size: 20px;
    font-weight: 800;
    @include pixelated;
  }

  :deep(p) {
    margin-bottom: 25px;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
  }

  :deep(ul) {
    margin-bottom: 25px;
    padding-left: 20px;
    li { 
      margin-bottom: 12px; 
      color: rgba(255, 255, 255, 0.7);
    }
  }

  :deep(strong) {
    color: #fff;
    font-weight: 700;
  }

  :deep(table) {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 30px 0;
    background: rgba(255, 255, 255, 0.02);
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.05);
    
    th, td {
      padding: 16px 20px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    th { 
      background: rgba(255, 255, 255, 0.05);
      color: var(--yellow);
      font-size: 12px;
      font-family: 'Press Start 2P', cursive;
      text-transform: uppercase;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    td {
      font-size: 14px;
    }
  }

  :deep(.class-info-box) {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 32px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
</style>
