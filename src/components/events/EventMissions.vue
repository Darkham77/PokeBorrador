<script setup lang="ts">
import { onMounted } from 'vue';
import { useBreedingStore } from '@/stores/breeding';
import { useModalStore } from '@/stores/modals';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { getItemById } from '@/data/inventory/items';
import MissionCard from './MissionCard.vue';
import EventMissionsHeaderBar from './EventMissionsHeaderBar.vue';
import EventClassMissionsSection from './EventClassMissionsSection.vue';
import { isPokemonEligibleForMission } from '@/logic/breeding/missionEngine';
import type { DaycareMission } from '@/types/breeding/breeding';
import type { Pokemon } from '@/types/pokemon/pokemon';

interface Props {
  hideRefresh?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  hideRefresh: false
});

const breedingStore = useBreedingStore();
const modalStore = useModalStore();
const gameStore = useGameStore();
const uiStore = useUIStore();

const getMatchingPokesForMission = (mission: DaycareMission) => {
  const allPokes = gameStore.allPokemonList;
  return allPokes.filter(p => isPokemonEligibleForMission(p, mission));
};

const canDeliverMission = (mission: DaycareMission) => {
  if (mission.completed) return false;
  return getMatchingPokesForMission(mission).length > 0;
};

const getDailyMissionBtnText = (mission: DaycareMission): string => {
  if (mission.completed) return 'ENTREGADA';
  return canDeliverMission(mission) ? 'ENTREGAR' : 'NO DISPONIBLE';
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

const getDailyMissionUnmetText = (mission: DaycareMission) => {
  if (mission.completed) return '';
  if (canDeliverMission(mission)) return '';
  return `Requisito no cumplido: ${mission.reqText || 'Pokémon no encontrado en Equipo o Caja'}`;
};

const getDailyMissionAvailableText = (mission: DaycareMission) => {
  if (mission.completed) return '';
  if (canDeliverMission(mission)) return '¡Tienes el Pokémon listo para entregar!';
  return '';
};

const getMissionRewardItem = (mission: DaycareMission) => {
  return getItemById(mission.reward.id);
};
</script>

<template>
  <div class="event-missions">
    <EventMissionsHeaderBar 
      :hide-refresh="props.hideRefresh"
      :refresh-count="breedingStore.missionRefreshes"
      @refresh="breedingStore.refreshMissions"
    />

    <div class="missions-grid">
      <MissionCard
        v-for="(mission, index) in (breedingStore.dailyMissions as DaycareMission[])"
        :id="'daily-' + index"
        :key="index"
        :avatar="getAssetUrl(ASSET_TYPES.TRAINER, mission.trainerSprite)"
        is-avatar-url
        :title="mission.trainerName + ' dice:'"
        :dialogue="mission.dialogue"
        :reward-icon="getMissionRewardItem(mission).icon || '🎁'"
        reward-label="Recompensa"
        :reward-val="getMissionRewardItem(mission).name + ' x' + mission.reward.qty"
        :reward-id="mission.reward.id"
        :btn-text="getDailyMissionBtnText(mission)"
        :btn-disabled="!canDeliverMission(mission)"
        :is-completed="mission.completed"
        :is-available="canDeliverMission(mission)"
        :unmet-requirement="getDailyMissionUnmetText(mission)"
        :available-requirement="getDailyMissionAvailableText(mission)"
        completed-badge-text="COMPLETADA"
        @action="openDelivery(index)"
      />
    </div>

    <!-- Class Missions Section -->
    <EventClassMissionsSection />
  </div>
</template>

<style scoped lang="scss">
.event-missions {
  padding: 10px 0;
}

.missions-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  
  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
  
  @media (min-width: 950px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
}
</style>
