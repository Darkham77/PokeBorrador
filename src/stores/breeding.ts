import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/game.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useAuthStore } from '@/stores/auth.ts';
import { useEventStore } from '@/stores/events.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import { checkCompatibility } from '@/logic/breeding/breedingEngine';
import { eggFactory } from '@/logic/breeding/eggFactory';
import type { BreedingActivitySource } from '@/types/breeding/breeding';
import { usePlayerClassStore } from '@/stores/player/playerClass.ts';
import { useDaycareMissionsStore } from '@/stores/daycareMissions.ts';
import { getHatchSpeedMultiplier } from '@/logic/pokemon/pokemonFieldAbilities';
import { HATCH_STEP_REDUCTION_CRIADOR } from '@/logic/player/classDeploymentEngine';
import { executeCloneFossil } from '@/stores/breedingActions.ts';
import type { ItemId } from '@/data/inventory/items';
import type { DaycareSlot, DaycareEgg, DaycareMission } from '@/types/breeding/breeding';
import type { BreedingCompatibility, Pokemon } from '@/types/pokemon/pokemon';
import { MAX_CARRIED_EGGS, MAX_POKEMON_VIGOR } from '@/logic/constants/gameplay';
import {
  calculateNextEggTime,
  restoreWarehouseEggs,
  restoreDaycareSlots,
  validateDaycareDeposit,
  movePokemonFromTeamToBoxIfPresent,
  canGenerateEgg,
  isEggSpeciesEligible,
  checkParentVigorDepleted,
  buildDaycareEgg,
  applyEggGenerationSideEffects,
  validateEggScanEligibility,
  executeEggScan
} from './breeding/breedingStoreHelpers.ts';

export const useBreedingStore = defineStore('breeding', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const classStore = usePlayerClassStore();
  const eventStore = useEventStore();
  const authStore = useAuthStore();
  const daycareMissionsStore = useDaycareMissionsStore();

  const slots = ref<DaycareSlot[]>([
    { pokemon: null, slotIndex: 0, deposited_at: null },
    { pokemon: null, slotIndex: 1, deposited_at: null }
  ]); // [{ pokemon, slot_index, deposited_at }]
  const warehouseEggs = ref<DaycareEgg[]>([]); // Eggs waiting to be claimed
  const isLoaded = ref(false);
  let inFlightPromise: Promise<void> | null = null;
  const dailyMissions = computed<DaycareMission[]>({
    get: () => daycareMissionsStore.dailyMissions,
    set: (val) => { daycareMissionsStore.dailyMissions = val }
  });
  const missionRefreshes = computed<number>({
    get: () => daycareMissionsStore.missionRefreshes,
    set: (val) => { daycareMissionsStore.missionRefreshes = val }
  });

  // --- HELPERS & PERSISTENCE ---



  function saveWarehouseEggs() {
    const userId = authStore.user?.id || 'default';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`daycare_warehouse_eggs_${userId}`, JSON.stringify(warehouseEggs.value));
    }
    gameStore.state.daycareWarehouse = [...warehouseEggs.value];
    gameStore.scheduleSave();
  }

  // --- GETTERS ---
  const isBreeding = computed(() => slots.value.length === 2 && !!slots.value[0]?.pokemon && !!slots.value[1]?.pokemon);
  
  const compatibility = computed<BreedingCompatibility>(() => {
    if (!isBreeding.value) {
      return { level: 0, reason: 'Deposita 2 Pokémon', sharedGroups: [] };
    }
    const p1 = slots.value[0]?.pokemon;
    const p2 = slots.value[1]?.pokemon;
    if (!p1 || !p2) return { level: 0, reason: 'Deposita 2 Pokémon', sharedGroups: [] };
    return checkCompatibility(p1, p2);
  });
  
  const nextEggTime = computed(() => {
    return calculateNextEggTime(compatibility.value.level, slots.value[0], slots.value[1]);
  });

  // --- ACTIONS ---

  async function loadDaycare(force = false) {
    if (!force && isLoaded.value) return;
    if (inFlightPromise) return inFlightPromise;

    inFlightPromise = (async () => {
      try {
        slots.value = [
          { pokemon: null, slotIndex: 0, deposited_at: null },
          { pokemon: null, slotIndex: 1, deposited_at: null }
        ];

        const userId = authStore.user?.id || 'default';
        warehouseEggs.value = restoreWarehouseEggs(gameStore.state.daycareWarehouse, userId);
        if (gameStore.state.daycareWarehouse?.length !== warehouseEggs.value.length) {
          gameStore.state.daycareWarehouse = [...warehouseEggs.value];
          gameStore.scheduleSave();
        }

        const needsSave = restoreDaycareSlots(gameStore.state.team || [], gameStore.state.box || [], slots.value);
        if (needsSave) {
          gameStore.scheduleSave();
        }

        // Capa 1: Check retroactively if a new egg should be generated
        await checkAndGenerateEgg();
        isLoaded.value = true;
      } finally {
        inFlightPromise = null;
      }
    })();
    return inFlightPromise;
  }

  async function deposit(pokemon: Pokemon, slotIndex: number) {
    const isDebugMode = typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__ || window.location?.search?.includes('debug'));
    const validation = validateDaycareDeposit(pokemon, isDebugMode);
    if (!validation.canDeposit) {
      uiStore.notify(validation.reason!, validation.icon || '⚠️');
      return false;
    }

    const moveResult = movePokemonFromTeamToBoxIfPresent(gameStore.state.team, gameStore.state.box, pokemon.uid);
    if (!moveResult.success) {
      uiStore.notify(moveResult.errorReason!, '⚠️');
      return false;
    }
    gameStore.autoFillPvpTeam();

    pokemon.inDaycare = true;
    pokemon.daycareSlot = slotIndex;
    // Preserve deposited_at from the first deposit so the egg timer never resets
    if (!pokemon.daycareDepositedAt) {
      pokemon.daycareDepositedAt = Temporal.Now.instant().toString();
    }
    const now = pokemon.daycareDepositedAt;
    slots.value[slotIndex] = { pokemon, slotIndex, deposited_at: now };

    uiStore.notify(`¡${pokemon.name} depositado en la Guardería!`, '🏡');
    gameStore.scheduleSave();
    return true;
  }

  function withdraw(slotIndex: number) {
    const slot = slots.value[slotIndex];
    if (!slot || !slot.pokemon) return false;

    const pokemonUid = slot.pokemon.uid;
    const found = gameStore.getPokemonByUid(pokemonUid);
    if (found) {
      found.inDaycare = false;
      found.daycareSlot = undefined;
      found.daycareDepositedAt = undefined;
    } else {
      slot.pokemon.inDaycare = false;
      slot.pokemon.daycareSlot = undefined;
      slot.pokemon.daycareDepositedAt = undefined;
    }

    slots.value[slotIndex] = { pokemon: null, slotIndex, deposited_at: null };
    uiStore.notify(`¡${slot.pokemon.name} retirado de la Guardería!`, '🏡');
    gameStore.scheduleSave();
    return true;
  }

  async function checkAndGenerateEgg() {
    const nowEpoch = Temporal.Now.instant().epochMilliseconds;
    if (!canGenerateEgg(isBreeding.value, compatibility.value.level, slots.value[0], slots.value[1], nextEggTime.value, nowEpoch)) {
      return;
    }

    const pA = slots.value[0]!.pokemon as Pokemon;
    const pB = slots.value[1]!.pokemon as Pokemon;
    const compat = compatibility.value;

    if (!compat.eggSpecies) {
      throw new Error('[breeding] Cannot generate an egg without a valid egg species.');
    }

    if (!isEggSpeciesEligible(compat.eggSpecies)) {
      return;
    }

    const egg = buildDaycareEgg({
      pA,
      pB,
      compat,
      playerClass: classStore.playerClass as string,
      shinyMultiplier: eventStore.globalMultipliers?.shiny ?? 1
    });

    warehouseEggs.value.push(egg);
    saveWarehouseEggs();

    const isoNow = Temporal.Now.instant().toString();
    applyEggGenerationSideEffects(pA, pB, slots.value[0]!, slots.value[1]!, isoNow);

    uiStore.notify(' ¡Apareció un huevo en la Guardería!', '🥚');
    if (checkParentVigorDepleted(pA, pB)) {
      uiStore.notify('¡Uno de los padres se ha quedado sin vigor! Consigue Caramelos de vigor o Restauradores de vigor para continuar criando.', '💤');
    }
    gameStore.scheduleSave();
  }

  function claimEgg(eggId: string) {
    const eggIndex = warehouseEggs.value.findIndex((e) => e.id === eggId);
    if (eggIndex === -1) return;
    
    const egg = warehouseEggs.value[eggIndex];
    if (!egg) return;

    if (!gameStore.state.eggs) gameStore.state.eggs = [];

    // Slot limit: max 6 regular eggs. Slot 7 is reserved for NPC quest eggs only.
    const regularEggs = gameStore.state.eggs.filter(e => !e.isNpc);
    if (regularEggs.length >= MAX_CARRIED_EGGS) {
      uiStore.notify(`Tu incubadora está llena. Puedes llevar un máximo de ${MAX_CARRIED_EGGS} huevos.`, '🥚');
      return;
    }

    if (gameStore.state.money < egg.cost) {
      uiStore.notify(`No tienes suficiente dinero ($${egg.cost.toLocaleString()}).`, '💰');
      return;
    }
    
    const eggToPush = eggFactory.createPokemonEgg({
      species: egg.species,
      steps: egg.steps,
      ivs: egg.ivs,
      nature: egg.nature,
      movesAtBirth: egg.movesAtBirth,
      abilitySlot: egg.abilityIndex,
      isShiny: egg.isShiny,
      tint: egg.tint,
      isAncestral: egg.isAncestral
    });
    gameStore.state.eggs.push(eggToPush);
    gameStore.state.money -= egg.cost;
    warehouseEggs.value.splice(eggIndex, 1);
    saveWarehouseEggs();
    
    uiStore.notify('¡Huevo recogido! Camina para eclosionarlo.', '🥚');
    gameStore.scheduleSave();
  }

  function scanEgg(eggId: string) {
    const classLevel = gameStore.state.classLevel ?? 1;
    const validation = validateEggScanEligibility(
      classStore.playerClass,
      classLevel,
      gameStore.state.classData?.lastEggScanDate
    );
    if (!validation.canScan) {
      uiStore.notify(validation.reason ?? '', validation.icon ?? '🔒');
      return;
    }

    const egg = warehouseEggs.value.find((e) => e.id === eggId);
    if (!egg || !egg.ivs) return;

    const { speciesName, updatedClassData } = executeEggScan(egg, gameStore.state.classData);
    gameStore.state.classData = updatedClassData;

    saveWarehouseEggs();
    uiStore.notify(`¡Huevo de ${speciesName} escaneado!`, '🔍');
    gameStore.scheduleSave();
  }

  function checkDailyReset() {
    daycareMissionsStore.checkDailyReset();
  }

  function regenerateMissions(dateStr: string) {
    daycareMissionsStore.regenerateMissions(dateStr);
  }

  function refreshMissions() {
    daycareMissionsStore.refreshMissions();
  }

  function completeMission(missionIndex: number, pokemonUid: string) {
    daycareMissionsStore.completeMission(missionIndex, pokemonUid);
  }

  function reduceHatchTimers(activity: BreedingActivitySource) {
    const REDUCTIONS: Record<BreedingActivitySource, number> = { battle: 2, capture: 3, gym: 10, minigame: 1 };
    const baseReduction = REDUCTIONS[activity] || 0;
    if (baseReduction === 0) return;

    const hatchMult = getHatchSpeedMultiplier(gameStore.state.team);
    const criadorBonus = gameStore.state.playerClass === 'criador' ? (1 / (1 - HATCH_STEP_REDUCTION_CRIADOR)) : 1;
    const reduction = baseReduction * hatchMult * criadorBonus;

    const eggs = gameStore.state.eggs || [];
    if (eggs.length === 0) return;

    let newlyReady = false;
    eggs.forEach((egg) => {
      if (!egg.ready && egg.steps > 0) {
        egg.steps = Math.max(0, egg.steps - reduction);
        if (egg.steps === 0) {
          egg.ready = true;
          newlyReady = true;
        }
      }
    });

    if (newlyReady) {
      uiStore.notify('¡Un Huevo Pokémon está listo para eclosionar!', '🐣');
    }
    gameStore.scheduleSave();
  }


  function deleteEgg(eggId: string) {
    const idx = warehouseEggs.value.findIndex(e => e.id === eggId);
    if (idx !== -1) {
      warehouseEggs.value.splice(idx, 1);
      saveWarehouseEggs();
      gameStore.scheduleSave();
    }
  }

  function cloneFossil(fossilId: ItemId, extraQty: number) {
    return executeCloneFossil(fossilId, extraQty, warehouseEggs, saveWarehouseEggs);
  }

  const handleCriadorVigor = () => {
    const healthyParents = slots.value.filter(s => s && s.pokemon);
    if (healthyParents.length > 0) {
      const chosenSlot = healthyParents[Math.floor(Math.random() * healthyParents.length)];
      if (chosenSlot && chosenSlot.pokemon) {
        const parent = chosenSlot.pokemon;
        const prevVigor = parent.vigor ?? MAX_POKEMON_VIGOR;
        const VIGOR_RECOVERY_BONUS = 5;
        parent.vigor = Math.min(MAX_POKEMON_VIGOR, prevVigor + VIGOR_RECOVERY_BONUS);
        useUIStore().notify(`¡Eclosión Vigorosa! Su progenitor ${parent.name} recuperó +${VIGOR_RECOVERY_BONUS} de vigor.`, '❤️');
      }
    }
  };
  gameBus.on('CRIADOR_ECLOSION_VIGOR', handleCriadorVigor);

  return {
    slots,
    warehouseEggs,
    dailyMissions,
    missionRefreshes,
    isBreeding,
    compatibility,
    nextEggTime,
    loadDaycare,
    deposit,
    withdraw,
    claimEgg,
    checkDailyReset,
    refreshMissions,
    regenerateMissions,
    completeMission,
    reduceHatchTimers,
    scanEgg,
    checkAndGenerateEgg,
    deleteEgg,
    cloneFossil,
    saveWarehouseEggs
  };
});

if (typeof window !== 'undefined') {
  window.__VITE_DEBUG_BREEDING_STORE_RESOLVER__ = () => useBreedingStore();
}
