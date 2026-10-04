<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { gsap } from 'gsap'
import { libraryContent, libraryCategories } from '@/data/system/libraryData'
import BaseModal from '@/components/common/BaseModal.vue'
import { useGsapTransition } from '@/composables/ui/useGsapTransition'

interface Props {
  show?: boolean
  initialTab?: string
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  initialTab: 'gimnasios'
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Default to 'gimnasios' if initialTab is null or not in categories
const selectedTab = ref(props.initialTab || 'gimnasios')
const contentFade = ref(true)
const { beforeEnter, enter, leave } = useGsapTransition({ type: 'fade', duration: 0.2 })

watch(() => props.initialTab, (newTab) => {
  if (newTab) selectedTab.value = newTab
})

const currentContent = computed(() => {
  return (libraryContent as Record<string, string>)[selectedTab.value] || '<h1>Próximamente</h1><p>En construcción.</p>' // open-record: Contenedor JSON dinámico de clave-valor genérico
})

const TAB_SWITCH_FADE_DELAY_SEC = 0.15

const selectTab = (tabId: string) => {
  if (selectedTab.value === tabId) return
  
  contentFade.value = false
  gsap.delayedCall(TAB_SWITCH_FADE_DELAY_SEC, () => {
    selectedTab.value = tabId
    contentFade.value = true
  })
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
        <Transition
          :css="false"
          @before-enter="beforeEnter"
          @enter="enter"
          @leave="leave"
        >
          <div
            v-if="contentFade"
            id="library-article-content"
            class="library-article"
          >
            <!-- fallow-ignore-next-line security-sink -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-html="currentContent" />
          </div>
        </Transition>
      </main>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.library-container {
  display: grid;
  grid-template-columns: 280px 1fr;
  width: 100%;
  height: 600px;
  max-height: 85dvh;
  background: Linear-Gradient(180deg, #161a2e 0%, #0a0c14 100%);
  overflow: hidden;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  @media (width <= 900px) {
    display: flex;
    flex-direction: column;
    height: 90dvh;
    border-radius: 0;
  }
}

.library-sidebar {
  position: relative;
  height: 100%;
  background: Rgb(10 10 15 / 40%);
  border-right: 1px solid Rgb(255 255 255 / 5%);
  overflow: hidden;

  @media (width <= 900px) {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid Rgb(255 255 255 / 10%);
  }
}

.library-nav {
  position: absolute;
  display: block;
  min-height: 0; // Prevent flex collapse
  padding: 8px; // Reducido al mínimo para maximizar espacio
  inset: 0;
  overflow-y: auto !important;
  overflow-x: hidden;
  
  @media (width <= 900px) {
    position: relative;
    display: flex;
    flex-direction: row;
    padding: 12px;
    overflow: auto hidden;
  }

  .library-nav-item {
    @include pixelated;
    @include pixelated;

    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px; // Ajustado
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--gray, #94a3b8);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.2;
    margin-bottom: 6px;
    cursor: pointer;

    &:last-child {
      margin-bottom: 0;
    }

    &:hover {
      background: Rgb(255 255 255 / 4%);
      color: $white;
      border-color: Rgb(250 204 21 / 20%);
    }

    &.active {
      background: Rgb(250 204 21 / 10%);
      color: var(--yellow);
      border-color: Rgb(250 204 21 / 30%);
      box-shadow: 0 4px 15px Rgb(0 0 0 / 20%);
    }

    @media (width <= 900px) {
      padding: 10px 14px;
      transform: none;
      white-space: nowrap;
      margin-bottom: 0;
      margin-right: 8px;
    }
  }
}

.library-content {
  position: relative;
  height: 100%;
  min-height: 0; // Prevent flex collapse
  background: Rgb(0 0 0 / 8%);
  overflow-y: auto !important;
}

.library-article {
  @include pixelated;

  width: 100%;
  padding: 24px 32px;
  color: #ddd;
  font-size: 8px;
  line-height: 1.8;

  :deep(h1) {
    color: var(--yellow);
    font-size: 12px;
    margin-bottom: 24px;
    text-shadow: 3px 3px 0 Rgb(0 0 0 / 80%);
  }

  :deep(h3) {
    margin: 32px 0 16px;
    color: var(--purple, $purple);
    font-size: 10px;
    font-weight: 800;
    text-shadow: 2px 2px 0 Rgb(0 0 0 / 50%);
  }

  :deep(p) {
    color: Rgb(255 255 255 / 85%);
    margin-bottom: 20px;
  }

  :deep(ul) {
    margin-bottom: 20px;
    padding-left: 20px;
    li { 
      color: Rgb(255 255 255 / 80%); 
      margin-bottom: 10px;
    }
  }

  :deep(strong) {
    color: $white;
    font-weight: 700;
  }

  :deep(table) {
    width: 100%;
    margin: 24px 0;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: 12px;
    background: Rgb(255 255 255 / 2%);
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    
    %cell-base {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid Rgb(255 255 255 / 5%);
    }
    
    th { 
      @extend %cell-base;

      background: Rgb(255 255 255 / 5%);
      color: var(--yellow);
      font-size: 10px;
      text-transform: uppercase;
    }
    
    tr:last-child td {
      border-bottom: none;
    }
    
    td {
      @extend %cell-base;

      font-size: 8px;
    }
  }

  :deep(.class-info-box) {
    padding: 24px;
    border: 1px solid Rgb(255 255 255 / 5%);
    border-radius: 12px;
    background: Rgb(255 255 255 / 3%);
    margin-bottom: 24px;
  }
}
</style>




