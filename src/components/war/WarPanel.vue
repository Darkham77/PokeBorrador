<script setup>
import { computed, onMounted } from 'vue'
import { useMapStore } from '@/stores/map'
import { useUIStore } from '@/stores/ui'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import WarMapCard from './WarMapCard.vue'

const mapStore = useMapStore()
const uiStore = useUIStore()

onMounted(() => {
  mapStore.fetchWarStatus()
})

const dominance = computed(() => mapStore.warStatus || { union: 0, poder: 0, contested: 0 })
const totalPoints = computed(() => dominance.value.union + dominance.value.poder + dominance.value.contested || 1)

const getWidth = (val) => (val / totalPoints.value * 100) + '%'

const close = () => {
  uiStore.isWarPanelOpen = false
}

const getFactionIcon = (faction) => {
  return getAssetUrl(ASSET_TYPES.FACTION, faction)
}
</script>

<template>
  <Transition name="slide-up">
    <div
      v-if="uiStore.isWarPanelOpen"
      class="war-overlay"
    >
      <div class="war-panel-premium">
        <header class="war-header">
          <button
            class="close-btn"
            @click.stop="close"
          >
            ✕
          </button>
          <div class="header-title">
            <span class="glitch-text">GUERRA DE DOMINANCIA</span>
            <p>CONQUISTA KANTO PARA TU EQUIPO</p>
          </div>
        </header>

        <section class="global-dominance">
          <div class="progress-labels">
            <div class="faction-info union">
              <img
                :src="getFactionIcon('union')"
                class="faction-icon"
                @error="e => e.target.style.display = 'none'"
              >
              <span>TEAM UNIÓN</span>
              <span class="points">{{ dominance.union }} Puntos</span>
            </div>
            <div class="faction-info poder">
              <span class="points">{{ dominance.poder }} Puntos</span>
              <span>TEAM PODER</span>
              <img
                :src="getFactionIcon('poder')"
                class="faction-icon"
                @error="e => e.target.style.display = 'none'"
              >
            </div>
          </div>
          
          <div class="dominance-bar">
            <div
              class="segment union"
              :style="{ width: getWidth(dominance.union) }"
            />
            <div
              class="segment contested"
              :style="{ width: getWidth(dominance.contested) }"
            />
            <div
              class="segment poder"
              :style="{ width: getWidth(dominance.poder) }"
            />
          </div>
          <div class="bar-labels">
            <span>{{ Math.round(dominance.union / totalPoints * 100) }}%</span>
            <span>DISPUTA</span>
            <span>{{ Math.round(dominance.poder / totalPoints * 100) }}%</span>
          </div>
        </section>

        <section class="war-content scrollbar">
          <div class="section-label">
            PUNTOS ESTRATÉGICOS
          </div>
          <div class="map-grid">
            <WarMapCard
              v-for="m in mapStore.maps.filter(x => x.war)"
              :key="m.id"
              :map="m"
            />
          </div>
        </section>

        <footer class="war-footer">
          <div class="rule-box">
            <span class="icon">⚔️</span>
            <p>Vence a entrenadores del bando rival en estas rutas para ganar puntos de dominancia.</p>
          </div>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.war-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: Rgba(0, 0, 0, 0.9);
  -webkit-backdrop-filter: Blur(10px); -webkit-backdrop-filter: Blur(10px); backdrop-filter: Blur(10px);
  -webkit-backdrop-filter: Blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  transform: translateZ(0);
}

.war-panel-premium {
  width: 100%;
  max-width: 900px;
  height: 90vh;
  background: Rgba(10, 10, 11, 1);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 50px 100px Rgba(0,0,0,0.8);
}

.war-header {
  padding: 40px;
  position: relative;
  text-align: center;
  background: Linear-Gradient(to bottom, Rgba(255,255,255,0.02), transparent);
}

.close-btn {
  position: absolute;
  top: 30px;
  right: 30px;
  background: none;
  border: none;
  color: var(--gray);
  font-size: 24px;
  cursor: pointer;
  transition: color 0.2s;
  &:hover { color: white; }
}

.header-title {
  .glitch-text {
    @include pixelated;
    font-size: 24px;
    color: var(--yellow);
    display: block;
    margin-bottom: 10px;
  }
  p {
    color: var(--gray);
    font-size: 12px;
    letter-spacing: 4px;
    font-weight: 800;
  }
}

.global-dominance {
  padding: 0 40px 40px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.faction-info {
  display: flex;
  align-items: center;
  gap: 15px;
  @include pixelated;
  font-size: 10px;

  &.union { color: Rgba(59, 130, 246, 1); }
  &.poder { color: Rgba(239, 68, 68, 1); }

  .faction-icon {
    width: 32px;
    height: 32px;
    object-fit: contain;
  }

  .points {
    font-size: 14px;
    color: white;
    opacity: 0.8;
  }
}

.dominance-bar {
  height: 12px;
  background: Rgba(255,255,255,0.05);
  border-radius: 6px;
  display: flex;
  overflow: hidden;
  margin-bottom: 10px;

  .segment {
    height: 100%;
    transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
    &.union { background: Rgba(59, 130, 246, 1); box-shadow: 0 0 20px Rgba(59, 130, 246, 0.4); }
    &.contested { background: Rgba(68, 68, 68, 1); }
    &.poder { background: Rgba(239, 68, 68, 1); box-shadow: 0 0 20px Rgba(239, 68, 68, 0.4); }
  }
}

.bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 800;
  color: Rgba(85, 85, 85, 1);
}

.war-content {
  flex: 1;
  padding: 0 40px;
  overflow-y: auto;
  min-height: 0;
}

.section-label {
  @include pixelated;
  font-size: 8px;
  color: var(--gray);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  &:after { content: ''; flex: 1; height: 1px; background: Rgba(255,255,255,0.05); }
}

.map-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  padding-bottom: 40px;
}

.war-footer {
  padding: 30px 40px;
  background: Rgba(0,0,0,0.3);
  border-top: 1px solid Rgba(255,255,255,0.05);
}

.rule-box {
  display: flex;
  align-items: center;
  gap: 15px;
  color: var(--gray);
  font-size: 13px;
  .icon { font-size: 20px; }
}

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }
</style>
