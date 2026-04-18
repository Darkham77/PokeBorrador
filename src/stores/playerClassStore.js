import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useGameStore } from './game';
import { useUIStore } from './ui';
import { PLAYER_CLASSES } from '@/logic/playerClasses';

export const usePlayerClassStore = defineStore('playerClass', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();

  // --- GETTERS ---
  const activeClass = computed(() => {
    const classId = gameStore.state.playerClass;
    return classId ? PLAYER_CLASSES[classId] : null;
  });

  const classData = computed(() => gameStore.state.classData || {});
  const classLevel = computed(() => gameStore.state.classLevel || 1);
  const reputation = computed(() => classData.value.reputation || 0);
  const criminality = computed(() => classData.value.criminality || 0);

  // --- ACTIONS ---

  /**
   * Selects or changes the player's class.
   */
  async function selectClass(classId) {
    const cls = PLAYER_CLASSES[classId];
    if (!cls) return;

    const alreadyHasClass = !!gameStore.state.playerClass;
    const COST = 10000;

    if (alreadyHasClass) {
      if (gameStore.state.battleCoins < COST) {
        uiStore.notify(`Necesitás ${COST.toLocaleString()} Battle Coins para cambiar de clase.`, '🔒');
        return false;
      }
      gameStore.state.battleCoins -= COST;
      uiStore.notify(`Cambiaste a ${cls.name}. Costó ${COST.toLocaleString()} Battle Coins.`, cls.icon);
    } else {
      uiStore.notify(`¡Elegiste ser ${cls.name}! ${cls.description.split('.')[0]}.`, cls.icon);
    }

    // Reset class data for the new path
    gameStore.state.playerClass = classId;
    gameStore.state.classLevel = 1;
    gameStore.state.classXP = 0;
    gameStore.state.classData = {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      extortedRouteId: null,
      officialRouteId: null,
      kitCaptures: 0,
      blackMarketDaily: { date: '', items: [], purchased: [] }
    };

    // Release any pokemon on missions (if applicable in future)
    [...gameStore.state.team, ...gameStore.state.box].forEach(p => {
      if (p.onMission) p.onMission = false;
    });

    uiStore.isClassSelectionOpen = false;
    await gameStore.save(false);
    return true;
  }

  /**
   * Adds experience to the class (synced with trainer exp in this version).
   */
  function addClassExperience(amount) {
    if (!gameStore.state.playerClass) return;
    // In this architecture, class XP follows trainer level milestones
    // but we can track it separately if needed.
    gameStore.state.classXP += amount;
  }

  /**
   * Updates criminality for Rocket class.
   */
  function updateCriminality(amount) {
    if (gameStore.state.playerClass !== 'rocket') return;
    const current = gameStore.state.classData.criminality || 0;
    gameStore.state.classData.criminality = Math.max(0, Math.min(100, current + amount));
  }

  /**
   * Updates reputation for Trainer class.
   */
  function addReputation(amount) {
    if (gameStore.state.playerClass !== 'entrenador') return;
    gameStore.state.classData.reputation = (gameStore.state.classData.reputation || 0) + amount;
  }

  return {
    activeClass,
    classData,
    classLevel,
    reputation,
    criminality,
    selectClass,
    addClassExperience,
    updateCriminality,
    addReputation
  };
});
