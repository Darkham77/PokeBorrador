
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameStore } from './game.ts';
import { useUIStore } from './ui.ts';
import { useAuthStore } from './auth.ts';
import gsap from 'gsap';
import { 
  checkCompatibility, 
  calculateInheritance, 
  inheritNature,
  inheritMoves,
  inheritAbility,
  calculateShinyChance,
} from '@/logic/breeding/breedingEngine';
import { eggFactory } from '@/logic/breeding/eggFactory';
import { EGG_SPAWN_INTERVAL_MS } from '@/logic/breeding/breedingData';
import { POKEMON_DB } from '@/data/pokemonDB';
import { usePlayerClassStore } from './playerClass.ts';
import { useEventStore } from './events.ts';
import { useDaycareMissionsStore } from './daycareMissions.ts';
import type { DaycareSlot, DaycareEgg, DaycareMission } from '@/types/breeding';
import type { Pokemon, PokemonIVs } from '@/types/pokemon';

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
  const dailyMissions = computed<DaycareMission[]>({
    get: () => daycareMissionsStore.dailyMissions,
    set: (val) => { daycareMissionsStore.dailyMissions = val }
  });
  const missionRefreshes = computed<number>({
    get: () => daycareMissionsStore.missionRefreshes,
    set: (val) => { daycareMissionsStore.missionRefreshes = val }
  });
  const loading = ref(false);

  // --- HELPERS & PERSISTENCE ---

  function calculateBreedingCost(pA: Pokemon, pB: Pokemon): number {
    const countPerfect = (p: Pokemon) => {
      if (!p.ivs) return 0;
      return Object.values(p.ivs).filter(val => val === 30 || val === 31).length;
    };
    const totalPerfect = countPerfect(pA) + countPerfect(pB);
    if (totalPerfect <= 2) return 2000;
    if (totalPerfect <= 5) return 5000;
    if (totalPerfect <= 8) return 12000;
    return 25000;
  }

  function saveWarehouseEggs() {
    const userId = authStore.user?.id || 'default';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`daycare_warehouse_eggs_${userId}`, JSON.stringify(warehouseEggs.value));
    }
  }

  // --- GETTERS ---
  const fulfillableMissionsCount = computed(() => daycareMissionsStore.fulfillableMissionsCount);

  const isBreeding = computed(() => slots.value.length === 2 && !!slots.value[0]?.pokemon && !!slots.value[1]?.pokemon);
  
  const compatibility = computed(() => {
    if (!isBreeding.value) {
      return { level: 0, reason: 'Deposita 2 Pokémon', sharedGroups: [], eggSpecies: '' };
    }
    const p1 = slots.value[0]?.pokemon;
    const p2 = slots.value[1]?.pokemon;
    if (!p1 || !p2) return { level: 0, reason: 'Deposita 2 Pokémon', sharedGroups: [], eggSpecies: '' };
    return checkCompatibility(p1, p2);
  });
  
  const nextEggTime = computed(() => {
    const level = compatibility.value.level;
    if (level === 0) return null;
    const interval = (EGG_SPAWN_INTERVAL_MS as Record<number, number>)[level];
    if (!interval) return null;
    
    if (!slots.value[0]?.deposited_at || !slots.value[1]?.deposited_at) return null;

    const pA = slots.value[0]?.pokemon;
    const pB = slots.value[1]?.pokemon;
    if (!pA || !pB || (pA.vigor || 0) <= 0 || (pB.vigor || 0) <= 0) return null;

    const depA = Temporal.Instant.from(slots.value[0].deposited_at).epochMilliseconds;
    const depB = Temporal.Instant.from(slots.value[1].deposited_at).epochMilliseconds;
    const earliest = Math.max(depA, depB);
    
    return earliest + interval;
  });

  // --- ACTIONS ---

  async function loadDaycare() {
    loading.value = true;
    try {
      slots.value = [
        { pokemon: null, slotIndex: 0, deposited_at: null },
        { pokemon: null, slotIndex: 1, deposited_at: null }
      ];

      // Restore eggs from LocalStorage
      const userId = authStore.user?.id || 'default';
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(`daycare_warehouse_eggs_${userId}`) : null;
      warehouseEggs.value = stored ? JSON.parse(stored) : [];

      const team = gameStore.state.team || [];
      const box = gameStore.state.box || [];
      const all = [...team, ...box];
      const deposited = all.filter(p => p && p.inDaycare);
      
      let needsSave = false;
      deposited.forEach(p => {
        let idx = typeof p.daycareSlot === 'number' ? p.daycareSlot : -1;
        if (idx === -1) {
          idx = slots.value.findIndex(s => s.pokemon === null);
          if (idx === -1) idx = 0;
          p.daycareSlot = idx;
          needsSave = true;
        }
        // If daycareDepositedAt is missing (save predates this feature),
        // assign it now and mark for save so it persists on future loads
        if (!p.daycareDepositedAt) {
          p.daycareDepositedAt = Temporal.Now.instant().toString();
          needsSave = true;
        }
        slots.value[idx] = {
          pokemon: p,
          slotIndex: idx,
          deposited_at: p.daycareDepositedAt
        };
      });

      if (needsSave) {
        gameStore.scheduleSave();
      }

      // Capa 1: Check retroactively if a new egg should be generated
      await checkAndGenerateEgg();
    } finally {
      loading.value = false;
    }
  }

  async function deposit(pokemon: Pokemon, slotIndex: number) {
    if (pokemon.onMission || pokemon.onDefense) {
      uiStore.notify('Este Pokémon está ocupado.', '⚠️');
      return false;
    }

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
    const team = gameStore.state.team || [];
    const box = gameStore.state.box || [];
    const found = [...team, ...box].find(p => p && p.uid === pokemonUid);
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
    if (!isBreeding.value || compatibility.value.level === 0) return;
    if (!slots.value[0]?.pokemon || !slots.value[1]?.pokemon) return;
    if (!nextEggTime.value) return;
    
    const now = Temporal.Now.instant().epochMilliseconds;
    if (now < nextEggTime.value) return;

    const pA = slots.value[0].pokemon as Pokemon;
    const pB = slots.value[1].pokemon as Pokemon;
    const compat = compatibility.value;

    if ((pA.vigor || 0) <= 0 || (pB.vigor || 0) <= 0) {
      return;
    }

    const eggSpecies = compat.eggSpecies || '';
    const itemA = pA.heldItem || '';
    const itemB = pB.heldItem || '';
    const playerClass = classStore.playerClass as string;

    const abilityName = inheritAbility(pA, pB);
    const abilityIndex = abilityName ? 1 : 0;

    const breedingCost = calculateBreedingCost(pA, pB);

    const egg = eggFactory.createDaycareEgg({
      species: eggSpecies,
      motherId: compat.motherId,
      ivs: calculateInheritance(pA, pB, itemA, itemB, playerClass),
      nature: inheritNature(pA, pB, itemA, itemB) || 'Serio',
      movesAtBirth: inheritMoves(pA, pB, eggSpecies),
      abilityIndex: abilityIndex,
      isShiny: Math.random() < calculateShinyChance(pA, pB, 1/4096, eventStore.globalMultipliers?.shiny || 1),
      cost: breedingCost
    });

    // Consume parent vigor by 1 point
    pA.vigor = Math.max(0, (pA.vigor || 0) - 1);
    pB.vigor = Math.max(0, (pB.vigor || 0) - 1);

    warehouseEggs.value.push(egg);
    saveWarehouseEggs();
    
    const isoNow = Temporal.Now.instant().toString();
    if (slots.value[0]) {
      slots.value[0].deposited_at = isoNow;
      pA.daycareDepositedAt = isoNow;
    }
    if (slots.value[1]) {
      slots.value[1].deposited_at = isoNow;
      pB.daycareDepositedAt = isoNow;
    }

    uiStore.notify(' ¡Apareció un huevo en la Guardería!', '🥚');
    if ((pA.vigor || 0) <= 0 || (pB.vigor || 0) <= 0) {
      uiStore.notify('¡Uno de los padres se ha quedado sin vigor! Consigue Caramelos de vigor o Restauradores de vigor para continuar criando.', '💤');
    }
    gameStore.scheduleSave();
  }

  function claimEgg(eggId: string) {
    const eggIndex = warehouseEggs.value.findIndex((e) => e.id === eggId);
    if (eggIndex === -1) return;
    
    const egg = warehouseEggs.value[eggIndex];
    if (!egg) return;

    if (gameStore.state.money < egg.cost) {
      uiStore.notify(`No tienes suficiente dinero ($${egg.cost.toLocaleString()}).`, '💰');
      return;
    }

    if (!gameStore.state.eggs) gameStore.state.eggs = [];
    
    const eggToPush = eggFactory.createPokemonEgg({
      species: egg.species,
      steps: egg.steps,
      ivs: egg.ivs,
      nature: egg.nature,
      movesAtBirth: egg.movesAtBirth,
      abilitySlot: egg.abilityIndex,
      isShiny: egg.isShiny,
      tint: egg.tint
    });
    gameStore.state.eggs.push(eggToPush);
    gameStore.state.money -= egg.cost;
    warehouseEggs.value.splice(eggIndex, 1);
    saveWarehouseEggs();
    
    uiStore.notify('¡Huevo recogido! Camina para eclosionarlo.', '🥚');
    gameStore.scheduleSave();
  }

  function scanEgg(eggId: string) {
    if (classStore.playerClass !== 'criador') {
      uiStore.notify('Solo los Criadores pueden escanear huevos.', '🔒');
      return;
    }
    
    const egg = warehouseEggs.value.find((e) => e.id === eggId);
    if (!egg) return;

    if (egg.ivs) {
      if (!egg.inherited_ivs) egg.inherited_ivs = { };
      egg.inherited_ivs._scanned = true;
      saveWarehouseEggs();
      uiStore.notify(`¡Huevo de ${POKEMON_DB[egg.species as keyof typeof POKEMON_DB]?.name} escaneado!`, '🔍');
      gameStore.scheduleSave();
    }
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

  function reduceHatchTimers(activity: 'battle' | 'capture' | 'gym') {
    const REDUCTIONS = { battle: 2 * 60000, capture: 3 * 60000, gym: 10 * 60000 };
    const reduction = REDUCTIONS[activity] || 0;
    if (reduction === 0) return;

    const eggs = gameStore.state.eggs || [];
    if (eggs.length === 0) return;

    let newlyReady = false;
    eggs.forEach((egg) => {
      if (!egg.ready && egg.steps > 0) {
        egg.steps = Math.max(0, egg.steps - (reduction / 1000));
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

  function updateEggIvs(eggId: string, ivs: Partial<PokemonIVs>) {
    const egg = warehouseEggs.value.find(e => e.id === eggId);
    if (egg) {
      egg.ivs = { ...egg.ivs, ...ivs } as PokemonIVs;
      saveWarehouseEggs();
      gameStore.scheduleSave();
    }
  }

  function deleteEgg(eggId: string) {
    const idx = warehouseEggs.value.findIndex(e => e.id === eggId);
    if (idx !== -1) {
      warehouseEggs.value.splice(idx, 1);
      saveWarehouseEggs();
      gameStore.scheduleSave();
    }
  }

  let bgPoller: gsap.core.Tween | null = null;

  function initBackgroundPoller() {
    if (bgPoller) bgPoller.kill();

    const poll = async () => {
      if (isBreeding.value && nextEggTime.value) {
        const nowMs = Temporal.Now.instant().epochMilliseconds;
        if (nowMs >= nextEggTime.value) {
          await checkAndGenerateEgg();
        }
      }
      bgPoller = gsap.delayedCall(10, poll);
    };
    bgPoller = gsap.delayedCall(10, poll);
  }

  function cleanupBackgroundPoller() {
    if (bgPoller) {
      bgPoller.kill();
      bgPoller = null;
    }
  }

  return {
    slots,
    warehouseEggs,
    dailyMissions,
    fulfillableMissionsCount,
    missionRefreshes,
    loading,
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
    updateEggIvs,
    deleteEgg,
    initBackgroundPoller,
    cleanupBackgroundPoller,
    saveWarehouseEggs,
    eggs: computed(() => warehouseEggs.value)
  };
});
