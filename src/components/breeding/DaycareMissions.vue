<script setup lang="ts">
import { useBreedingStore } from '@/stores/breeding';
import { ref } from 'vue';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import DaycarePicker from './DaycarePicker.vue';

const breedingStore = useBreedingStore() as any;

const isDeliveryPickerOpen = ref(false);
const activeMissionIndex = ref(-1);

const openDelivery = (idx: number) => {
  activeMissionIndex.value = idx;
  isDeliveryPickerOpen.value = true;
};

const handleDelivery = (pokemon: any) => {
  if (confirm(`¿Seguro que quieres entregar a ${pokemon.name}? Se irá para siempre.`)) {
    breedingStore.completeMission(activeMissionIndex.value, pokemon.uid);
    isDeliveryPickerOpen.value = false;
  }
};

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
  const placeholder = target.nextElementSibling as HTMLElement;
  if (placeholder) placeholder.style.display = 'flex';
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
        @click.stop="breedingStore.refreshMissions"
      >
        🔄 Refrescar
      </button>
    </header>

    <div class="missions-grid">
      <div 
        v-for="(mission, index) in (breedingStore.dailyMissions as any[])" 
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
            <img 
              :src="getAssetUrl(ASSET_TYPES.TRAINER, mission.trainerSprite)" 
              class="pixelated"
              @error="handleImgError"
            >
            <span
              class="avatar-placeholder"
              style="display: none;"
            >👤</span>
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
            @click.stop="openDelivery(index)"
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
@use "@/styles/core/_mixins" as *;
.daycare-missions {
  padding: 10px 0;
}

.missions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 { font-weight: 800; @include pixelated; font-size: 10px; color: Rgba(250, 204, 21, 1); }
  .refresh-count { font-size: 12px; color: Rgba(148, 163, 184, 1); }
}

.btn-refresh {
  background: Rgba(59, 130, 246, 0.1);
  border: 1px solid Rgba(59, 130, 246, 0.3);
  color: Rgba(96, 165, 250, 1);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) { background: Rgba(59, 130, 246, 0.2); transform: Scale(1.05); }
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
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color 0.3s;

  &.completed {
    border-color: Rgba(34, 197, 94, 0.4);
    background: Rgba(34, 197, 94, 0.02);
  }
}

.completed-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: Rgba(34, 197, 94, 1);
  color: $white;
  font-size: 8px;
  @include pixelated;
  padding: 4px 8px;
  border-radius: 4px;
}

.trainer-section {
  display: flex;
  gap: 12px;
  
  .trainer-avatar {
    width: 48px;
    height: 48px;
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      @include pixelated;
    }

    .pixelated { image-rendering: pixelated; }
  }
  
  .dialogue-box {
    flex: 1;
    .trainer-name { font-size: 10px; color: Rgba(148, 163, 184, 1); text-transform: uppercase; margin-bottom: 4px; display: block; }
    .dialogue { font-size: 12px; color: $white; line-height: 1.4; font-style: italic; }
  }
}

.reward-section {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-tag {
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;

  .reward-icon { font-size: 24px; }
  .reward-info {
    display: flex;
    flex-direction: column;
    .label { font-size: 8px; color: $muted; text-transform: uppercase; letter-spacing: 0.5px; }
    .val { font-size: 12px; color: Rgba(34, 197, 94, 1); font-weight: 800; }
  }
}

.btn-deliver {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  background: Linear-Gradient(135deg, #8b5cf6, #6366f1);
  color: $white;
  border: none;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  box-shadow: 0 4px 0 #4f46e5;
  transition: all 0.1s;
  
  &:active { transform: Translatey(2px); box-shadow: 0 2px 0 #4f46e5; }
}
</style>
