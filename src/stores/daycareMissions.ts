import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useGameStore } from '@/stores/game.ts';
import { useUIStore } from '@/stores/ui.ts';
import { generateMission, validateMissionPokemon, isPokemonEligibleForMission } from '@/logic/breeding/missionEngine';
import { getItemById, isItemId } from '@/data/inventory/items';
import { incrementRecordKey } from '@/logic/utils/mapUtils';
import { logger } from '@/logic/utils/logger';
import { getGMT3Date } from '@/logic/utils/timeUtils';
import type { DaycareMission } from '@/types/breeding/breeding';

function isValidDaycareMission(m: unknown): m is DaycareMission {
  if (!m || typeof m !== 'object') return false;
  const mission = m as Record<string, unknown>; // open-record: Generic key-value data dictionary container
  const reward = (mission.reward && typeof mission.reward === 'object') ? mission.reward as Record<string, unknown> : null; // open-record: Generic key-value data dictionary container
  return (
    typeof mission.date === 'string' &&
    typeof mission.targetId === 'string' &&
    typeof mission.trainerSprite === 'string' &&
    mission.trainerSprite.length > 0 &&
    typeof mission.trainerName === 'string' &&
    typeof mission.dialogue === 'string' &&
    typeof mission.reqText === 'string' &&
    typeof mission.completed === 'boolean' &&
    reward !== null &&
    isItemId(reward.id) &&
    typeof reward.qty === 'number' &&
    reward.qty > 0
  );
}

export const useDaycareMissionsStore = defineStore('daycareMissions', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();

  const dailyMissions = computed<DaycareMission[]>({
    get: () => gameStore.state.daycare_missions || [],
    set: (val) => { gameStore.state.daycare_missions = val; }
  });

  const missionRefreshes = computed<number>({
    get: () => gameStore.state.daycare_mission_refreshes || 0,
    set: (val) => { gameStore.state.daycare_mission_refreshes = val }
  });

  const fulfillableMissionsCount = computed(() => {
    const missions = dailyMissions.value.filter(m => !m.completed);
    if (missions.length === 0) return 0;

    const team = gameStore.state.team || [];
    const box = gameStore.state.box || [];

    function hasEligiblePokemon(mission: DaycareMission): boolean {
      for (const p of team) {
        if (p && isPokemonEligibleForMission(p, mission)) return true;
      }
      for (const p of box) {
        if (p && isPokemonEligibleForMission(p, mission)) return true;
      }
      return false;
    }

    return missions.filter(hasEligiblePokemon).length;
  });

  function checkDailyReset() {
    const today = getGMT3Date().toPlainDate().toString();
    const missions = dailyMissions.value;
    const lastDate = missions.length > 0 && missions[0] ? missions[0].date : '';
    const hasCorrupted = missions.length === 0 || missions.some(m => !isValidDaycareMission(m));

    if (lastDate !== today || hasCorrupted) {
      if (hasCorrupted && missions.length > 0) {
        logger.warn('daycareMissions', 'Corrupted daycare mission detected in daily reset. Regenerating fresh missions.');
      }
      regenerateMissions(today);
      missionRefreshes.value = 3;
    }
  }

  function regenerateMissions(dateStr: string) {
    const level = gameStore.state.trainerLevel || 1;
    const m1 = generateMission(level, dateStr) as DaycareMission;
    let m2 = generateMission(level, dateStr) as DaycareMission;

    while (m2.targetId === m1.targetId) {
      m2 = generateMission(level, dateStr) as DaycareMission;
    }

    dailyMissions.value = [m1, m2];
    gameStore.scheduleSave();
  }

  function refreshMissions() {
    if (missionRefreshes.value <= 0) {
      uiStore.notify('No te quedan refrescos por hoy.', '⚠️');
      return;
    }

    missionRefreshes.value--;
    const today = Temporal.Now.instant().toString().split('T')[0] as string;
    regenerateMissions(today);
    uiStore.notify('Misiones actualizadas.', '🔄');
  }

  function completeMission(missionIndex: number, pokemonUid: string) {
    const mission = dailyMissions.value[missionIndex];
    if (!mission || mission.completed) return;

    const team = gameStore.state.team || [];
    const pokemon = gameStore.getPokemonByUid(pokemonUid);

    if (!pokemon) return;
    if (!validateMissionPokemon(pokemon, mission)) {
      uiStore.notify('Este Pokémon no cumple los requisitos.', '❌');
      return;
    }

    if (team.length <= 1 && team[0]?.uid === pokemonUid) {
      uiStore.notify('No puedes entregar tu único Pokémon.', '⚠️');
      return;
    }

    if (!gameStore.removePokemon(pokemonUid)) {
      uiStore.notify('Error al procesar la entrega.', '❌');
      return;
    }

    mission.completed = true;
    incrementRecordKey(gameStore.state.inventory, mission.reward.id, mission.reward.qty)
    
    const itemData = getItemById(mission.reward.id);
    uiStore.notify(`¡Misión completada! Recibiste ${itemData.name} x${mission.reward.qty}`, itemData.icon || '🎁');
    gameStore.scheduleSave();
  }

  return {
    dailyMissions,
    missionRefreshes,
    fulfillableMissionsCount,
    checkDailyReset,
    regenerateMissions,
    refreshMissions,
    completeMission
  };
});
