<script setup>

const props = defineProps({
  currentClass: Object,
  activeMission: Object,
  missions: Array,
  trainerLevel: Number,
  missionProgress: Number,
  isMissionDone: Boolean
})

const emit = defineEmits(['back', 'startMission', 'collectReward'])

function getMissionDesc(mId, clsId) {
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
        @click="emit('back')"
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
            {{ missions.find(m => m.id === activeMission.id)?.name }}
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
          @click="emit('collectReward')"
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
            @click="emit('startMission', m.id)"
          >
            {{ activeMission?.id === m.id ? 'EN CURSO' : (activeMission ? 'BLOQUEADO' : 'DESPLEGAR') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
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
    font-family: 'Press Start 2P', cursive; 
    font-size: 16px; 
    color: var(--cls-color); 
    margin: 0;
    @include pixelated;
  }
  .back-btn {
    background: none; border: none; color: rgba(255,255,255,0.4);
    font-family: 'Press Start 2P', cursive; font-size: 9px; cursor: pointer;
    @include pixelated;
    &:hover { color: #fff; }
  }
}

.missions-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 12px;
}

.active-mission-banner {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  gap: 24px;

  .banner-info {
    flex: 1;
    h3 { font-family: 'Press Start 2P', cursive; font-size: 10px; color: #22c55e; margin-bottom: 8px; }
    .m-name { font-size: 14px; color: #fff; font-weight: 700; margin-bottom: 12px; }
  }

  .mission-progress-bar {
    height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden;
    .progress-fill { height: 100%; background: #22c55e; transition: width 0.3s; }
  }

  .collect-btn {
    padding: 14px 24px; background: #22c55e; color: #fff; border: none; border-radius: 12px;
    font-family: 'Press Start 2P', cursive; font-size: 10px; cursor: pointer;
    box-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
    &:hover { transform: translateY(-2px); filter: brightness(1.1); }
  }
}

.missions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.mission-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s;

  &:hover:not(.locked) { border-color: var(--cls-color); background: rgba(255,255,255,0.05); }
  
  .m-header { 
    display: flex; justify-content: space-between; 
    font-family: 'Press Start 2P', cursive; font-size: 8px; color: rgba(255,255,255,0.3); 
  }
  
  .m-title { margin: 0; font-size: 16px; color: #fff; font-weight: 800; }
  .m-desc { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.5; margin-bottom: 8px; }
  
  .start-btn {
    margin-top: auto;
    padding: 14px; border-radius: 10px; border: none; 
    background: rgba(255,255,255,0.05);
    color: #cbd5e1; font-family: 'Press Start 2P', cursive; font-size: 8px; cursor: pointer;
    transition: all 0.2s;
    &:hover:not(:disabled) { background: var(--cls-color); color: #fff; }
    &:disabled { opacity: 0.3; cursor: not-allowed; }
  }

  &.active { border-color: var(--cls-color); }
  &.locked { opacity: 0.5; }
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
</style>
