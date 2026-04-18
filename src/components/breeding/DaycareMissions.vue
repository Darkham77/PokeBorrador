<script setup>
import { useBreedingStore } from '@/stores/breeding';
import { useUIStore } from '@/stores/ui';
import { ref } from 'vue';
import DaycarePicker from './DaycarePicker.vue';

const breedingStore = useBreedingStore();
const uiStore = useUIStore();

const isDeliveryPickerOpen = ref(false);
const activeMissionIndex = ref(-1);

const openDelivery = (idx) => {
  activeMissionIndex.value = idx;
  isDeliveryPickerOpen.value = true;
};

const handleDelivery = (pokemon) => {
  if (confirm(`¿Seguro que quieres entregar a ${pokemon.name}? Se irá para siempre.`)) {
    breedingStore.completeMission(activeMissionIndex.value, pokemon.uid);
    isDeliveryPickerOpen.value = false;
  }
};
</script>

<template>
  <div class="daycare-missions">
    <header class="missions-header">
      <div class="title-wrap">
        <h3>Misiones Diarias</h3>
        <span class="refresh-count">Refrescos: {{ breedingStore.missionRefreshes }}/3</span>
      </div>
      <button 
        class="btn-refresh" 
        :disabled="breedingStore.missionRefreshes <= 0"
        @click="breedingStore.refreshMissions"
      >
        🔄 Refrescar
      </button>
    </header>

    <div class="missions-grid">
      <div 
        v-for="(mission, index) in breedingStore.dailyMissions" 
        :key="index"
        class="mission-card"
        :class="{ completed: mission.completed }"
      >
        <div
          v-if="mission.completed"
          class="completed-badge"
        >
          ✓ COMPLETADA
        </div>
        
        <div class="trainer-section">
          <div class="trainer-avatar">
            <!-- In a real app, these would be local assets or dynamic URLs -->
            <span class="avatar-placeholder">👤</span>
          </div>
          <div class="dialogue-box">
            <span class="trainer-name">{{ mission.trainerName }} dice:</span>
            <p class="dialogue">
              "{{ mission.dialogue }}"
            </p>
          </div>
        </div>

        <div class="reward-section">
          <div class="reward-tag">
            <span class="reward-icon">{{ mission.reward.icon }}</span>
            <div class="reward-info">
              <span class="label">Recompensa</span>
              <span class="val">{{ mission.reward.name }} x{{ mission.reward.qty }}</span>
            </div>
          </div>
          <button 
            v-if="!mission.completed" 
            class="btn-deliver"
            @click="openDelivery(index)"
          >
            ENTREGAR
          </button>
        </div>
      </div>
    </div>

    <!-- Specialized Picker for Delivery -->
    <DaycarePicker
      v-if="isDeliveryPickerOpen"
      :slot-index="-1"
      mode="delivery"
      :mission="breedingStore.dailyMissions[activeMissionIndex]"
      @select="handleDelivery"
      @close="isDeliveryPickerOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
.daycare-missions {
  padding: 10px 0;
}

.missions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 { font-size: 14px; font-weight: 800; color: #f8fafc; font-family: 'Press Start 2P', cursive; font-size: 10px; color: #facc15; }
  .refresh-count { font-size: 12px; color: #94a3b8; }
}

.btn-refresh {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) { background: rgba(59, 130, 246, 0.2); transform: Scale(1.05); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.missions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  
  @media (min-width: 640px) {
    grid-template-columns: 1fr 1fr;
  }
}

.mission-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.3s;

  &.completed {
    border-color: rgba(34, 197, 94, 0.4);
    background: rgba(34, 197, 94, 0.02);
  }
}

.completed-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #22c55e;
  color: #fff;
  font-size: 8px;
  font-family: 'Press Start 2P', cursive;
  padding: 4px 8px;
  border-radius: 4px;
}

.trainer-section {
  display: flex;
  gap: 12px;
  
  .trainer-avatar {
    width: 48px;
    height: 48px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  
  .dialogue-box {
    flex: 1;
    .trainer-name { font-size: 10px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; display: block; }
    .dialogue { font-size: 12px; color: #fff; line-height: 1.4; font-style: italic; }
  }
}

.reward-section {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-tag {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;

  .reward-icon { font-size: 24px; }
  .reward-info {
    display: flex;
    flex-direction: column;
    .label { font-size: 8px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .val { font-size: 12px; color: #22c55e; font-weight: 800; }
  }
}

.btn-deliver {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: #fff;
  border: none;
  font-family: 'Press Start 2P', cursive;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 4px 0 #4f46e5;
  transition: all 0.1s;
  
  &:active { transform: translateY(2px); box-shadow: 0 2px 0 #4f46e5; }
}
</style>
