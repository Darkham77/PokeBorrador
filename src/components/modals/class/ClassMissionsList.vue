<script setup lang="ts">
import { type ClassDefinition, type ActiveMission } from '@/stores/playerClass'

interface ClassMission {
  id: string
  durationHs: number
  reqLv: number
  name: string
  color: string
}

interface Props {
  currentClass?: ClassDefinition | null
  activeMission?: ActiveMission | null
  missions?: ClassMission[]
  trainerLevel?: number
  missionProgress?: number
  isMissionDone?: boolean
}

withDefaults(defineProps<Props>(), {
  currentClass: null,
  activeMission: null,
  missions: () => [],
  trainerLevel: 1,
  missionProgress: 0,
  isMissionDone: false
})

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'startMission', missionId: string): void
  (e: 'collectReward'): void
}>()

function getMissionDesc(_mId: string, clsId: string | undefined) {
  if (clsId === 'cazabichos') return 'Recolecta néctar y captura especímenes con IVs garantizados.'
  if (clsId === 'rocket') return 'Exportación de especímenes al mercado negro por altos dividendos.'
  if (clsId === 'entrenador') return 'Gimnasio de alto rendimiento para potenciar la experiencia.'
  if (clsId === 'criador') return 'Entrenamiento genético intensivo para mejorar estadísticas base.'
  return 'Realiza tareas especiales de clase.'
}
</script>

<template>
  <div class="missions-layout">
    <header class="missions-header">
      <button
        class="back-btn"
        @click.stop="emit('back')"
      >
        ← VOLVER
      </button>
      <h1>DESPLIEGUES DE {{ currentClass?.name.toUpperCase() }}</h1>
    </header>

    <div class="missions-content custom-scrollbar">
      <!-- Active Mission Banner -->
      <div
        v-if="activeMission"
        class="active-mission-banner"
      >
        <div class="banner-info">
          <h3>{{ isMissionDone ? 'OPERACIÓN COMPLETADA' : 'OPERACIÓN EN CURSO' }}</h3>
          <p class="m-name">
            {{ missions.find(m => m.id === (activeMission?.id))?.name }}
          </p>
          <div class="mission-progress-bar">
            <div
              class="progress-fill"
              :style="{ width: missionProgress + '%' }"
            />
          </div>
        </div>
        <button
          v-if="isMissionDone"
          class="collect-btn"
          @click.stop="emit('collectReward')"
        >
          RECLAMAR
        </button>
        <div
          v-else
          class="timer-dot"
        />
      </div>

      <div class="missions-grid">
        <div 
          v-for="m in missions" 
          :key="m.id" 
          class="mission-card"
          :class="{ locked: trainerLevel < m.reqLv, active: activeMission?.id === m.id }"
        >
          <div class="m-header">
            <span class="m-dur">{{ m.durationHs }}H</span>
            <span class="m-req">LVL {{ m.reqLv }}</span>
          </div>
          <h3 class="m-title">
            {{ m.name }}
          </h3>
          <p class="m-desc">
            {{ getMissionDesc(m.id, currentClass?.id) }}
          </p>
          
          <button 
            class="start-btn" 
            :disabled="trainerLevel < m.reqLv || !!activeMission"
            @click.stop="emit('startMission', m.id)"
          >
            {{ activeMission?.id === m.id ? 'EN CURSO' : (activeMission ? 'BLOQUEADO' : 'DESPLEGAR') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
@use "@/styles/core/tools" as *;

.missions-layout {
  padding: 48px;
  display: flex;
  flex-direction: column;
  height: 600px;
  gap: 32px;
}

.missions-header {
  display: flex;
  align-items: center;
  gap: 24px;
  h1 { 
    @include pixelated; 
    font-size: 16px; 
    color: var(--cls-color); 
    margin: 0;
    @include pixelated;
  }
  .back-btn {
    background: none; border: none; color: Rgba(255,255,255,0.4);
    @include pixelated; font-size: 9px; cursor: pointer;
    @include pixelated;
    &:hover { color: var(--white); }
  }
}

.missions-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-right: 12px;
}

.active-mission-banner {
  background: Rgba(34, 197, 94, 0.1);
  border: 1px solid Rgba(34, 197, 94, 0.3);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  gap: 24px;

  .banner-info {
    flex: 1;
    h3 { @include pixelated; font-size: 10px; color: Rgba(34, 197, 94, 1); margin-bottom: 8px; }
    .m-name { font-size: 14px; color: var(--white); font-weight: 700; margin-bottom: 12px; }
  }

  .mission-progress-bar {
    height: 8px; background: Rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;
    .progress-fill { height: 100%; background: Rgba(34, 197, 94, 1); transition: width 0.3s; }
  }

  .collect-btn {
    padding: 14px 24px; background: Rgba(34, 197, 94, 1); color: var(--white); border: none; border-radius: 12px;
    @include pixelated; font-size: 10px; cursor: pointer;
    box-shadow: 0 0 20px Rgba(34, 197, 94, 0.4);
    &:hover { transform: Translatey(-2px); will-change: transform, filter, opacity;
  will-change: transform, filter, opacity;
  filter: Brightness(1.1); }
  }
}

.missions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.mission-card {
  background: Rgba(255,255,255,0.03);
  border: 1px solid Rgba(255,255,255,0.05);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;

  &:hover:not(.locked) { border-color: var(--cls-color); background: Rgba(255,255,255,0.05); }
  
  .m-header { 
    display: flex; justify-content: space-between; 
    @include pixelated; font-size: 8px; color: Rgba(255,255,255,0.3); 
  }
  
  .m-title { margin: 0; font-size: 16px; color: var(--white); font-weight: 800; }
  .m-desc { font-size: 12px; color: Rgba(255,255,255,0.4); line-height: 1.5; margin-bottom: 8px; }
  
  .start-btn {
    margin-top: auto;
    padding: 14px; border-radius: 10px; border: none; 
    background: Rgba(255,255,255,0.05);
    color: Rgba(203, 213, 225, 1); @include pixelated; font-size: 8px; cursor: pointer;
    transition: all 0.2s;
    &:hover:not(:disabled) { background: var(--cls-color); color: var(--white); }
    &:disabled { opacity: 0.3; cursor: not-allowed; }
  }

  &.active { border-color: var(--cls-color); }
  &.locked { opacity: 0.5; }
}

@media (max-width: 950px) {
  .missions-layout {
    padding: 24px 20px;
    height: auto;
    gap: 24px;
    overflow: visible;
  }

  .missions-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    
    h1 {
      font-size: 14px;
    }
  }

  .active-mission-banner {
    flex-direction: column;
    padding: 20px;
    gap: 16px;
    text-align: center;

    .collect-btn {
      width: 100%;
    }
  }

  .missions-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .mission-card {
    padding: 20px;
  }
}

</style>
