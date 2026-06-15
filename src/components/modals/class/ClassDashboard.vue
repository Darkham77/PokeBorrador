<script setup lang="ts">
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { gsap } from 'gsap'
import { type ClassDefinition } from '@/stores/playerClass'
import { useModalStore } from '@/stores/modals'
import PVTooltip from '@/components/common/PVTooltip.vue'

interface Props {
  currentClass?: ClassDefinition | null
  trainerLevel?: number
  trainerRank?: string
  classLevel?: number
}

withDefaults(defineProps<Props>(), {
  currentClass: null,
  trainerLevel: 1,
  trainerRank: 'Novato',
  classLevel: 1
})

const modalStore = useModalStore()

const emit = defineEmits<{
  (e: 'changeClass'): void
  (e: 'close'): void
}>()

const openMissionsModal = () => {
  modalStore.close('ClassMissions')
  modalStore.open('EventMissions')
}

const getTrainerSprite = (id: string | number | undefined, gender: 'h' | 'm' = 'h') => {
  return getAssetUrl(ASSET_TYPES.TRAINER, id as string, { trainerSuffix: 'front', gender });
}

const handleImageError = (e: Event) => {
  if (e.target) {
    (e.target as HTMLImageElement).style.display = 'none'
  }
}

// GSAP Hover Interactions
const onTrainerMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    scale: 1.05,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onTrainerMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    scale: 1,
    duration: 0.3,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onRankCardMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(15, 23, 42, 0.6)',
    x: 5,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onRankCardMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(15, 23, 42, 0.4)',
    x: 0,
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onAbilityMouseEnter = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(255, 255, 255, 0.06)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}

const onAbilityMouseLeave = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement
  gsap.to(target, {
    backgroundColor: 'Rgba(15, 23, 42, 0.4)',
    duration: 0.2,
    ease: 'power2.out',
    overwrite: 'auto'
  })
}
</script>

<template>
  <div class="dashboard-layout">
    <!-- Left: Identity -->
    <aside class="dashboard-sidebar">
      <div class="avatar-box">
        <div class="avatar-glow" />
        <div class="trainers-wrap">
          <img 
            :src="getTrainerSprite(currentClass?.showdownSpriteId || currentClass?.id, 'h')"
            class="trainer-big-img" 
            @mouseenter="onTrainerMouseEnter"
            @mouseleave="onTrainerMouseLeave"
            @error="handleImageError"
          >
          <img 
            :src="getTrainerSprite(currentClass?.showdownSpriteId || currentClass?.id, 'm')"
            class="trainer-big-img" 
            @mouseenter="onTrainerMouseEnter"
            @mouseleave="onTrainerMouseLeave"
            @error="handleImageError"
          >
        </div>
      </div>

      <h1 class="class-main-title">
        {{ currentClass?.name.toUpperCase() }}
      </h1>
      <p class="class-slogan">
        "{{ currentClass?.description }}"
      </p>

      <div class="rank-cards">
        <div 
          class="rank-card level"
          @mouseenter="onRankCardMouseEnter"
          @mouseleave="onRankCardMouseLeave"
        >
          <div class="card-icon">
            🎖️
          </div>
          <div class="card-text">
            <span class="label">NIVEL CUENTA</span>
            <span class="value">Nv. {{ trainerLevel }}</span>
          </div>
        </div>

        <div 
          class="rank-card level"
          @mouseenter="onRankCardMouseEnter"
          @mouseleave="onRankCardMouseLeave"
        >
          <div class="card-icon">
            🎓
          </div>
          <div class="card-text">
            <span class="label">NIVEL CLASE</span>
            <span
              class="value"
              :style="{ color: currentClass?.color || 'var(--yellow)' }"
            >Nv. {{ classLevel }}</span>
          </div>
        </div>
      </div>
    </aside>

    <!-- Right: Details -->
    <main class="dashboard-main custom-scrollbar">
      <section class="details-section">
        <div class="section-header">
          <div class="header-line" />
          <h2>HABILIDADES DE CLASE</h2>
        </div>
        
        <div class="abilities-list">
          <div 
            v-for="(bonus, idx) in currentClass?.bonuses" 
            :key="idx"
            class="ability-item"
            :class="{ locked: (currentClass?.bonusLevels?.[Number(idx)] || 1) > classLevel }"
            @mouseenter="onAbilityMouseEnter"
            @mouseleave="onAbilityMouseLeave"
          >
            <div class="ability-checkbox">
              {{ (currentClass?.bonusLevels?.[Number(idx)] || 1) <= classLevel ? '✅' : '🔒' }}
            </div>
            <div class="ability-content">
              <p :class="{ 'text-locked': (currentClass?.bonusLevels?.[Number(idx)] || 1) > classLevel }">
                {{ bonus }}
              </p>
              <span
                v-if="(currentClass?.bonusLevels?.[Number(idx)] || 1) > classLevel"
                class="req-hint"
              >
                Requiere Nivel de Clase {{ currentClass?.bonusLevels?.[Number(idx)] }}
              </span>
            </div>
            <div 
              v-if="(currentClass?.bonusLevels?.[Number(idx)] || 1) > 1" 
              class="lv-badge"
            >
              NV. {{ currentClass?.bonusLevels?.[Number(idx)] }}
            </div>
            <PVTooltip
              :description="currentClass?.technicalBonuses?.[Number(idx)] || 'Información no disponible.'"
              position="top"
              :delay="100"
              style="cursor: help;"
            >
              <span class="ability-help">❓</span>
            </PVTooltip>
          </div>
        </div>
      </section>

      <section class="details-section">
        <div class="section-header">
          <div class="header-line red" />
          <h2>LIMITACIONES</h2>
        </div>
        
        <div class="abilities-list limitations">
          <div 
            v-for="(penalty, idx) in currentClass?.penalties" 
            :key="idx"
            class="ability-item limitation"
            @mouseenter="onAbilityMouseEnter"
            @mouseleave="onAbilityMouseLeave"
          >
            <div class="ability-checkbox">
              ❌
            </div>
            <div class="ability-content">
              <p>{{ penalty }}</p>
            </div>
            <PVTooltip
              :description="currentClass?.technicalPenalties?.[Number(idx)] || 'Información no disponible.'"
              position="top"
              :delay="100"
              style="cursor: help;"
            >
              <span class="ability-help">❓</span>
            </PVTooltip>
          </div>
        </div>
      </section>

      <!-- Bottom Actions -->
      <div class="dashboard-actions">
        <button 
          class="missions-btn-wide"
          @click.stop="openMissionsModal"
        >
          <span class="icon">📋</span> MISIONES DE CLASE
        </button>

        <div class="action-footer">
          <button
            class="btn-secondary"
            @click.stop="emit('changeClass')"
          >
            <span class="icon">🔄</span>
            <div class="btn-label-stack">
              <span class="btn-label">CAMBIAR CLASE</span>
              <span class="price">10,000 BC</span>
            </div>
          </button>
          <button
            class="btn-primary"
            @click.stop="emit('close')"
          >
            <span class="icon check-icon">✓</span> ENTENDIDO
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<style src="./ClassDashboard.styles.scss" scoped lang="scss"></style>
