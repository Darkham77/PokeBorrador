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
    title-color="var(--yellow)"
    header-background="#161a2e"
    :show-close-button="true"
    padding="raw"
    no-scroll
    @close="emit('close')"
  >
    <div class="library-container">
      <aside class="library-sidebar">
        <nav class="library-nav custom-scrollbar-vicio">
          <div
            v-for="cat in libraryCategories"
            :key="cat.id"
            class="library-nav-item"
            :class="{ active: selectedTab === cat.id }"
            @click.stop="selectTab(cat.id)"
          >
            {{ cat.label }}
          </div>
        </nav>
      </aside>

      <main class="library-content custom-scrollbar-vicio">
        <transition name="fade">
          <!-- eslint-disable vue/no-v-html -->
          <div
            v-if="contentFade"
            id="library-article-content"
            class="library-article"
            v-html="currentContent"
          />
          <!-- eslint-enable vue/no-v-html -->
        </transition>
      </main>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.library-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  width: 100%;
  height: 600px;
  max-height: 85dvh;
  overflow: hidden;
  background: Linear-Gradient(180deg, #161a2e 0%, #0a0c14 100%);
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    height: 90dvh;
    border-radius: 0;
  }
}

.library-sidebar {
  background: Rgba(10, 10, 15, 0.4);
  border-right: 1px solid Rgba(255, 255, 255, 0.05);
  overflow: hidden;
  height: 100%;
  position: relative;

  @media (max-width: 900px) {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  }
}

.library-nav {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto !important;
  overflow-x: hidden;
  min-height: 0; // Prevent flex collapse
  padding: 8px; // Reducido al mínimo para maximizar espacio
  display: block;
  
  @media (max-width: 900px) {
    position: relative;
    display: flex;
    flex-direction: row;
    padding: 12px;
    overflow-x: auto;
    overflow-y: hidden;
  }

  .library-nav-item {
    margin-bottom: 6px;
    padding: 12px 16px; // Ajustado
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    @include pixelated;
    font-size: 12px;
    line-height: 1.2;
    font-weight: 400;
    color: Var(--gray, #94a3b8);
    @include pixelated;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid transparent;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background: Rgba(255, 255, 255, 0.04);
      color: $white;
      padding-left: 20px;
      border-color: Rgba(250, 204, 21, 0.2);
    }

    &.active {
      background: Rgba(250, 204, 21, 0.1);
      border-color: Rgba(250, 204, 21, 0.3);
      color: Var(--yellow);
      box-shadow: 0 4px 15px Rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 900px) {
      white-space: nowrap;
      padding: 10px 14px;
      margin-bottom: 0;
      margin-right: 8px;
      transform: none !important;
    }
  }
}

.library-content {
  overflow-y: auto !important;
  background: Rgba(0, 0, 0, 0.08);
  height: 100%;
  min-height: 0; // Prevent flex collapse
  position: relative;
}

.library-article {
  width: 100%;
  padding: 24px 32px; // Reducido drásticamente el padding "terrible"
  line-height: 1.6;
  color: #ddd;

  :Deep(h1) {
    @include pixelated;
    font-size: 20px;
    color: Var(--yellow);
    margin-bottom: 24px;
    text-shadow: 3px 3px 0px Rgba(0,0,0,0.8);
    @include pixelated;
  }

  :Deep(h3) {
    color: Var(--purple, $purple);
    margin: 32px 0 16px;
    font-size: 18px;
    font-weight: 800;
    text-shadow: 2px 2px 0px Rgba(0,0,0,0.5);
    @include pixelated;
  }

  :Deep(p) {
    margin-bottom: 20px;
    font-size: 15px;
    color: Rgba(255, 255, 255, 0.85);
  }

  :Deep(ul) {
    margin-bottom: 20px;
    padding-left: 20px;
    li { 
      margin-bottom: 10px; 
      color: Rgba(255, 255, 255, 0.8);
    }
  }

  :Deep(strong) {
    color: $white;
    font-weight: 700;
  }

  :Deep(table) {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin: 24px 0;
    background: Rgba(255, 255, 255, 0.02);
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid Rgba(255, 255, 255, 0.05);
    
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid Rgba(255, 255, 255, 0.05);
    }
    
    th { 
      background: Rgba(255, 255, 255, 0.05);
      color: Var(--yellow);
      font-size: 10px;
      @include pixelated;
      text-transform: uppercase;
      @include pixelated;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    td {
      font-size: 14px;
    }
  }

  :Deep(.class-info-box) {
    background: Rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
  }
}
</style>




