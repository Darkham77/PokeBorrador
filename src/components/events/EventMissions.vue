<script setup lang="ts">
import { onMounted } from 'vue';
import { useBreedingStore } from '@/stores/breeding';
import { useModalStore } from '@/stores/modals';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import type { DaycareMission } from '@/types/breeding';
import type { Pokemon } from '@/types/pokemon';

const breedingStore = useBreedingStore();
const modalStore = useModalStore();
const gameStore = useGameStore();
const uiStore = useUIStore();

const getMatchingPokesForMission = (mission: DaycareMission) => {
  const team = gameStore.state.team || [];
  const box = gameStore.state.box || [];
  const allPokes = [...team, ...box].filter((p): p is Pokemon => p !== null);
  
  const targetId = mission.targetId;
  return allPokes.filter(p => {
    if (p.onMission || p.inDaycare) return false;
    if (p.id !== targetId) return false;
    
    const req = mission.requirement || { type: 'level', minLevel: 0 };
    if (req.type === 'level') return p.level >= (req.minLevel || 0);
    if (req.type === 'iv_total') {
      const total = (p.ivs?.hp || 0) + (p.ivs?.atk || 0) + (p.ivs?.def || 0) + (p.ivs?.spa || 0) + (p.ivs?.spd || 0) + (p.ivs?.spe || 0);
      return total >= (req.minIvTotal || 0);
    }
    if (req.type === 'nature') return p.nature === req.nature;
    if (req.type === 'iv_31') return p.ivs?.[req.stat31 as keyof Pokemon['ivs']] === 31;
    return true;
  });
};

const canDeliverMission = (mission: DaycareMission) => {
  if (mission.completed) return false;
  return getMatchingPokesForMission(mission).length > 0;
};

const openDelivery = (idx: number) => {
  const mission = breedingStore.dailyMissions[idx];
  if (!mission) return;
  
  const matchingPokes = getMatchingPokesForMission(mission);
  
  if (matchingPokes.length === 0) {
    uiStore.notify('No tienes ningún Pokémon que cumpla los requisitos de esta misión.', '⚠️');
    return;
  }

  const allowedIds = matchingPokes.map(p => p.uid);
  
  modalStore.open('PokemonSelection', {
    title: 'ENTREGAR POKÉMON',
    subtitle: `Elige el Pokémon para entregar a ${mission.trainerName}`,
    allowedIds,
    autoConfirm: true,
    onConfirm: (selected: Pokemon[]) => {
      const first = selected?.[0];
      if (first) {
        breedingStore.completeMission(idx, first.uid);
      }
    }
  });
};

onMounted(() => {
  breedingStore.loadDaycare();
  breedingStore.checkDailyReset();
});

const handleImgError = (e: Event) => {
  const target = e.target as HTMLImageElement;
  target.style.display = 'none';
  const placeholder = target.nextElementSibling as HTMLElement;
  if (placeholder) placeholder.style.display = 'flex';
};
</script>

<template>
  <div class="event-missions">
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
        v-for="(mission, index) in (breedingStore.dailyMissions as DaycareMission[])" 
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
              " <span v-html="mission.dialogue" /> "
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
            :disabled="!canDeliverMission(mission)"
            @click.stop="openDelivery(index)"
          >
            ENTREGAR
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;
.event-missions {
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
  background: Rgba(255, 51, 102, 0.08);
  border: 1px solid Rgba(255, 51, 102, 0.25);
  color: #ff4d88;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover:not(:disabled) { background: Rgba(255, 51, 102, 0.15); transform: Scale(1.05); }
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
  gap: 16px;
  
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

    .pixelated { @include pixelated; }
  }
  
  .dialogue-box {
    flex: 1;
    .trainer-name { 
      font-size: 8px; 
      color: Rgba(255, 255, 255, 0.4); 
      text-transform: uppercase; 
      margin-bottom: 6px; 
      display: block; 
      letter-spacing: 0.5px;
    }
    .dialogue { 
      font-size: 9px; 
      color: $white; 
      line-height: 1.8; 
      font-style: italic; 
    }
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
    gap: 4px;
    .label { font-size: 8px; color: $muted; text-transform: uppercase; letter-spacing: 0.5px; }
    .val { font-size: 9px; color: Rgba(34, 197, 94, 1); font-weight: 800; }
  }
}

.btn-deliver {
  width: 100%;
  @include btn-vicio('primary', 'sm', true);
}
</style>
