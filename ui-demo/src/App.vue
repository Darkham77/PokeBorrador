<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { updatePixelScale, setCornerModel, type CornerModelId } from './logic/pixelEngine.ts'

import Sec1NavigationTabs from './sections/Sec1NavigationTabs.vue'
import Sec2FormControls from './sections/Sec2FormControls.vue'
import Sec3InventorySlots from './sections/Sec3InventorySlots.vue'
import Sec4ActionButtons from './sections/Sec4ActionButtons.vue'
import Sec5DialogsModals from './sections/Sec5DialogsModals.vue'
import Sec6CombatHud from './sections/Sec6CombatHud.vue'
import Sec7ElementalPills from './sections/Sec7ElementalPills.vue'
import Sec8LoginDemo from './sections/Sec8LoginDemo.vue'
import Sec9TeamCards from './sections/Sec9TeamCards.vue'
import Sec10SelectionModal from './sections/Sec10SelectionModal.vue'
import Sec11BattleDock from './sections/Sec11BattleDock.vue'
import Sec12PokemonDetail from './sections/Sec12PokemonDetail.vue'
import Sec13InventoryModal from './sections/Sec13InventoryModal.vue'
import Sec14InputsShowcase from './sections/Sec14InputsShowcase.vue'
import Sec15LiveInspector from './sections/Sec15LiveInspector.vue'

const _UI_DEMO_THEMES = ['theme-vicio-dark', 'theme-wingull-light', 'theme-cyber-neon'] as const
type UiDemoThemeId = typeof _UI_DEMO_THEMES[number]

const currentTheme = ref<UiDemoThemeId>('theme-vicio-dark')
const currentPixelSize = ref<number>(3)
const currentCornerModel = ref<CornerModelId>('bresenham')

const cornerModels = [
  { id: 'bresenham', label: 'Curva' },
  { id: 'chamfer', label: 'Chaflán' },
  { id: 'wide', label: 'Curva Amplia' }
] as const

const isSelectionModalOpen = ref(false)
const isInventoryModalOpen = ref(false)

const themes: readonly { id: UiDemoThemeId; name: string }[] = [
  { id: 'theme-vicio-dark', name: 'Vicio Dark' },
  { id: 'theme-wingull-light', name: 'Wingull GBA Light' },
  { id: 'theme-cyber-neon', name: 'Cyber Neon' }
] as const

const pixelSizes = [
  { px: 2, label: '2px' },
  { px: 3, label: '3px (Canónico)' },
  { px: 4, label: '4px' }
] as const

const navSections = [
  { id: 'sec-1', label: '1. Pestañas' },
  { id: 'sec-2', label: '2. Formularios' },
  { id: 'sec-3', label: '3. Inventario' },
  { id: 'sec-4', label: '4. Botones' },
  { id: 'sec-5', label: '5. Diálogos' },
  { id: 'sec-6', label: '6. HUD' },
  { id: 'sec-7', label: '7. Tipos' },
  { id: 'sec-8', label: '8. Login' },
  { id: 'sec-9', label: '9. Equipo' },
  { id: 'sec-10', label: '10. Selección' },
  { id: 'sec-11', label: '11. Combate' },
  { id: 'sec-12', label: '12. Detalle' },
  { id: 'sec-13', label: '13. Mochila' },
  { id: 'sec-14', label: '14. Inputs' },
  { id: 'sec-15', label: '15. Inspector' }
] as const

function setTheme(theme: UiDemoThemeId) {
  currentTheme.value = theme
  if (typeof document !== 'undefined') {
    document.body.className = theme
  }
}

function setPixelScale(px: number) {
  currentPixelSize.value = px
  updatePixelScale(px, currentCornerModel.value)
}

function onSelectCornerModel(m: CornerModelId) {
  currentCornerModel.value = m
  setCornerModel(m)
}

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}

function openSelectionModal() {
  isSelectionModalOpen.value = true
}

function closeSelectionModal() {
  isSelectionModalOpen.value = false
}

function openInventoryModal() {
  isInventoryModalOpen.value = true
}

function closeInventoryModal() {
  isInventoryModalOpen.value = false
}

const sec12Ref = ref<InstanceType<typeof Sec12PokemonDetail> | null>(null)

function onSelectPokemon(uid: string) {
  if (uid.includes('pika')) {
    sec12Ref.value?.openDetailFor({ id: 25, name: 'PIKACHU' })
  } else if (uid.includes('char')) {
    sec12Ref.value?.openDetailFor({ id: 6, name: 'CHARIZARD' })
  } else if (uid.includes('gengar')) {
    sec12Ref.value?.openDetailFor({ id: 94, name: 'GENGAR' })
  } else {
    sec12Ref.value?.openDetailFor({ id: 25, name: 'PIKACHU' })
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeSelectionModal()
    closeInventoryModal()
  }
}

onMounted(() => {
  setTheme(currentTheme.value)
  setPixelScale(currentPixelSize.value)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="ui-demo-root">
    <!-- TOOLBAR SUPERIOR FIJA -->
    <header class="lab-header">
      <div class="lab-badge">
        <span class="emoji">🕹️</span>
        <span class="title-text">POKÉ VICIO PIXEL LAB (ALGORITMO UNIVERSAL)</span>
      </div>

      <div class="lab-group">
        <span class="group-label">Tema:</span>
        <button
          v-for="t in themes"
          :id="'btn-theme-' + t.id"
          :key="t.id"
          type="button"
          class="lab-btn"
          :class="{ active: currentTheme === t.id }"
          @click="setTheme(t.id)"
        >
          {{ t.name }}
        </button>
      </div>

      <div class="lab-group">
        <span class="group-label">Tamaño Píxel:</span>
        <button
          v-for="s in pixelSizes"
          :id="'btn-pixelsize-' + s.px"
          :key="s.px"
          type="button"
          class="lab-btn"
          :class="{ active: currentPixelSize === s.px }"
          @click="setPixelScale(s.px)"
        >
          {{ s.label }}
        </button>
      </div>

      <div class="lab-group">
        <span class="group-label">Esquinas:</span>
        <button
          v-for="m in cornerModels"
          :id="'btn-cornermodel-' + m.id"
          :key="m.id"
          type="button"
          class="lab-btn"
          :class="{ active: currentCornerModel === m.id }"
          @click="onSelectCornerModel(m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- LANZADORES RÁPIDOS DE MODALES INTERACTIVOS -->
      <div class="lab-group">
        <span class="group-label">Modales Flotantes:</span>
        <button
          id="btn-launcher-selection"
          type="button"
          class="lab-btn modal-trigger-btn"
          @click="openSelectionModal"
        >
          <span class="emoji">⚡</span> <span>Selector</span>
        </button>
        <button
          id="btn-launcher-inventory"
          type="button"
          class="lab-btn modal-trigger-btn"
          @click="openInventoryModal"
        >
          <span class="emoji">🎒</span> <span>Mochila</span>
        </button>
      </div>

      <nav class="lab-nav-links">
        <button
          v-for="sec in navSections"
          :id="'btn-nav-' + sec.id"
          :key="sec.id"
          type="button"
          class="nav-link-btn"
          @click="scrollTo(sec.id)"
        >
          {{ sec.label }}
        </button>
      </nav>
    </header>

    <!-- CONTENEDOR PRINCIPAL DEL CATÁLOGO -->
    <main class="catalog-container">
      <div
        id="sec-1"
        class="demo-section-wrapper"
      >
        <Sec1NavigationTabs />
      </div>
      <div
        id="sec-2"
        class="demo-section-wrapper"
      >
        <Sec2FormControls />
      </div>
      <div
        id="sec-3"
        class="demo-section-wrapper"
      >
        <Sec3InventorySlots />
      </div>
      <div
        id="sec-4"
        class="demo-section-wrapper"
      >
        <Sec4ActionButtons />
      </div>
      <div
        id="sec-5"
        class="demo-section-wrapper"
      >
        <Sec5DialogsModals />
      </div>
      <div
        id="sec-6"
        class="demo-section-wrapper"
      >
        <Sec6CombatHud />
      </div>
      <div
        id="sec-7"
        class="demo-section-wrapper"
      >
        <Sec7ElementalPills />
      </div>
      <div
        id="sec-8"
        class="demo-section-wrapper"
      >
        <Sec8LoginDemo />
      </div>
      <div
        id="sec-9"
        class="demo-section-wrapper"
      >
        <Sec9TeamCards
          @open-selection="openSelectionModal"
          @open-inventory="openInventoryModal"
          @select-pokemon="onSelectPokemon"
        />
      </div>
      <div
        id="sec-10"
        class="demo-section-wrapper"
      >
        <Sec10SelectionModal @open-floating="openSelectionModal" />
      </div>
      <div
        id="sec-11"
        class="demo-section-wrapper"
      >
        <Sec11BattleDock />
      </div>
      <div
        id="sec-12"
        class="demo-section-wrapper"
      >
        <Sec12PokemonDetail ref="sec12Ref" />
      </div>
      <div
        id="sec-13"
        class="demo-section-wrapper"
      >
        <Sec13InventoryModal @open-floating="openInventoryModal" />
      </div>
      <div
        id="sec-14"
        class="demo-section-wrapper"
      >
        <Sec14InputsShowcase />
      </div>
      <div
        id="sec-15"
        class="demo-section-wrapper"
      >
        <Sec15LiveInspector />
      </div>
    </main>

    <!-- MODAL FLOTANTE: SELECTOR DE POKÉMON -->
    <div
      v-if="isSelectionModalOpen"
      class="pv-modal-backdrop"
      @click.self="closeSelectionModal"
    >
      <div class="pv-floating-modal-dialog">
        <Sec10SelectionModal
          :is-floating="true"
          @close="closeSelectionModal"
          @confirm="closeSelectionModal"
        />
      </div>
    </div>

    <!-- MODAL FLOTANTE: MOCHILA / INVENTARIO -->
    <div
      v-if="isInventoryModalOpen"
      class="pv-modal-backdrop"
      @click.self="closeInventoryModal"
    >
      <div class="pv-floating-modal-dialog">
        <Sec13InventoryModal
          :is-floating="true"
          @close="closeInventoryModal"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/* Estilos principales encapsulados modularmente en _app_layout.scss */
</style>
