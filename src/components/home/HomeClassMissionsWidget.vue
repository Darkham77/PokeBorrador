<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useModalStore } from '@/stores/modals'
import ProfileXpCard from '@/components/profile/ProfileXpCard.vue'
import HomeWidgetMinimizeBtn from './HomeWidgetMinimizeBtn.vue'

const classStore = usePlayerClassStore()
const modalStore = useModalStore()

const currentClass = computed(() => classStore.currentClassDef)
const classLevel = computed(() => classStore.classLevel)

const openClassSelection = () => {
  modalStore.open('ClassSelection')
}
</script>

<template>
  <div
    class="home-class-missions-widget home-section-card"
    :style="{ '--class-accent': currentClass?.color || 'var(--yellow)' }"
  >
    <!-- Header -->
    <div class="card-header-bar">
      <div class="title-wrap">
        <span class="emoji card-icon">{{ currentClass?.icon || '🎓' }}</span>
        <div class="title-text-group">
          <h3 class="card-title">
            {{ currentClass ? `ESPECIALIZACIÓN: ${currentClass.name.toUpperCase()}` : 'MAESTRÍA DE CLASE' }}
          </h3>
          <span class="class-sub">
            {{ currentClass ? `Rango Nivel ${classLevel} · Progresión y Desbloqueos de Rol` : 'Elige tu rol para desbloquear ventajas exclusivas' }}
          </span>
        </div>
      </div>

      <div class="header-actions">
        <HomeWidgetMinimizeBtn widget-id="class" />
      </div>
    </div>

    <!-- Class Info Body (when class is chosen) -->
    <div
      v-if="currentClass"
      class="class-xp-cards-layout"
    >
      <!-- 1. Nivel y Experiencia Cuenta -->
      <ProfileXpCard
        title="Nivel y Experiencia Cuenta"
        :hide-unlocks="true"
      />

      <!-- 2. Nivel y Experiencia Clase & Próximos Desbloqueos -->
      <ProfileXpCard
        v-if="classStore.playerClass && classStore.currentClassDef"
        :level="classStore.classLevel"
        :exp="classStore.classXP"
        :exp-needed="classStore.classXPNeeded"
        :class-id="classStore.playerClass"
        :class-color="classStore.currentClassDef?.color"
        :title="`Nivel y Experiencia Clase (${classStore.currentClassDef?.name})`"
      />
    </div>

    <!-- No Class Selected State -->
    <div
      v-else
      v-gsap-hover="{ scale: 1.01, y: -1 }"
      class="no-class-card"
      role="button"
      tabindex="0"
      @click.stop="openClassSelection"
      @keydown.enter.prevent="openClassSelection"
      @keydown.space.prevent="openClassSelection"
    >
      <span class="emoji no-class-icon">🎓</span>
      <div class="no-class-info">
        <span class="no-class-title">¡Elige tu Especialización de Entrenador!</span>
        <span class="no-class-sub">Selecciona entre Entrenador, Criador, Cazabichos o Equipo Rocket para desbloquear ventajas únicas.</span>
      </div>
      <button
        v-gsap-hover
        class="no-class-btn"
      >
        ELEGIR CLASE
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-class-missions-widget {
  @include home-section-card;
}

.card-header-bar {
  @include home-card-header-bar;
}

.title-wrap {
  @include home-card-title-wrap;

  .title-text-group {
    gap: 3px;
  }

  .card-title {
    @include pixelated;

    margin: 0;
    color: var(--class-accent, var(--yellow));
    font-size: 11px;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .class-sub {
    color: rgb(255 255 255 / 50%);
    font-size: 10px;
    line-height: 1.35;
  }
}

.header-actions {
  @include widget-header-actions;

  flex-shrink: 0;
  margin-left: auto;
}

.class-xp-cards-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  :deep(.profile-section-card) {
    padding: 12px 14px;
    border: 1px solid rgb(255 255 255 / 6%);
    border-radius: 10px;
    background: rgb(15 23 42 / 60%);
    box-sizing: border-box;

    &:hover {
      background: rgb(15 23 42 / 80%);
      border-color: rgb(255 255 255 / 12%);
    }
  }
}

.no-class-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px dashed rgb(250 204 21 / 30%);
  border-radius: 8px;
  background: rgb(250 204 21 / 5%);
  cursor: pointer;

  &:hover {
    background: rgb(250 204 21 / 10%);
    border-color: var(--yellow, #facc15);
  }

  .no-class-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .no-class-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;

    .no-class-title {
      @include pixelated;

      color: var(--yellow, #facc15);
      font-size: 10px;
    }

    .no-class-sub {
      color: #cbd5e1;
      font-size: 9px;
    }
  }

  .no-class-btn {
    @include pixelated;

    padding: 6px 12px;
    border: none;
    border-radius: 6px;
    background: var(--yellow, #facc15);
    color: #000;
    font-size: 8px;
    font-weight: bold;
    cursor: pointer;
    flex-shrink: 0;
  }
}
</style>
