<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useModalStore } from '@/stores/modals'
import ProfileXpCard from '@/components/profile/ProfileXpCard.vue'

const classStore = usePlayerClassStore()
const modalStore = useModalStore()

const currentClass = computed(() => classStore.currentClassDef)
const classLevel = computed(() => classStore.classLevel)

const openClassManagement = () => {
  modalStore.open('ClassMissions')
}

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
        <button
          v-if="currentClass"
          id="home-class-change-btn"
          v-gsap-hover
          class="card-action-btn"
          @click.stop="openClassSelection"
        >
          <span class="emoji">🔄</span>
          CAMBIAR
        </button>
        <button
          v-if="currentClass"
          id="home-class-missions-open-btn"
          v-gsap-hover
          class="card-action-btn primary"
          @click.stop="openClassManagement"
        >
          <span class="emoji">📋</span>
          DETALLES
        </button>
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
      @click.stop="openClassSelection"
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
  gap: 8px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;

  .card-icon {
    font-size: 20px;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .title-text-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .card-title {
    @include pixelated;
    font-size: 11px;
    color: var(--class-accent, var(--yellow));
    margin: 0;
    line-height: 1.35;
    letter-spacing: 0.5px;
  }

  .class-sub {
    font-size: 10px;
    line-height: 1.35;
    color: Rgba(255, 255, 255, 0.5);
  }
}

.header-actions {
  display: flex;
  gap: 6px;
}

.card-action-btn {
  @include widget-action-btn;

  &.primary {
    background: Rgba(250, 204, 21, 0.15);
    border-color: Rgba(250, 204, 21, 0.4);
    color: var(--yellow, #facc15);

    &:hover {
      background: Rgba(250, 204, 21, 0.25);
      border-color: var(--yellow, #facc15);
    }
  }
}

.class-xp-cards-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;

  :deep(.profile-section-card) {
    background: Rgba(15, 23, 42, 0.6);
    border: 1px solid Rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 12px 14px;
    box-sizing: border-box;

    &:hover {
      border-color: Rgba(255, 255, 255, 0.12);
      background: Rgba(15, 23, 42, 0.8);
    }
  }
}

.no-class-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: Rgba(250, 204, 21, 0.05);
  border: 1px dashed Rgba(250, 204, 21, 0.3);
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: Rgba(250, 204, 21, 0.1);
    border-color: var(--yellow, #facc15);
  }

  .no-class-icon {
    font-size: 24px;
    flex-shrink: 0;
  }

  .no-class-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;

    .no-class-title {
      @include pixelated;
      font-size: 10px;
      color: var(--yellow, #facc15);
    }

    .no-class-sub {
      font-size: 9px;
      color: #cbd5e1;
    }
  }

  .no-class-btn {
    @include pixelated;
    font-size: 8px;
    padding: 6px 12px;
    background: var(--yellow, #facc15);
    color: #000000;
    font-weight: bold;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
  }
}
</style>
