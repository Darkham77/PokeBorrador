// [PureVue-Ignore-Length]
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/game.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useAuthStore } from '@/stores/auth.ts';
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
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality';
import { usePlayerClassStore } from '@/stores/player/playerClass.ts';
import { useEventStore } from '@/stores/events.ts';
import { useDaycareMissionsStore } from '@/stores/daycareMissions.ts';
import {
  isBabyPokemonSpeciesId,
  isFossilPokemonSpeciesId,
  isLegendaryPokemonSpeciesId,
  requirePokemonSpeciesId,
} from '@/data/pokemon/pokedex';
import { calculateBreedingCost, executeCloneFossil } from '@/stores/breedingActions.ts';
import type { ItemId } from '@/data/inventory/items';
import type { DaycareSlot, DaycareEgg, DaycareMission } from '@/types/breeding/breeding';
import type { BreedingCompatibility, Pokemon } from '@/types/pokemon/pokemon';
import { BASE_SHINY_DENOMINATOR, EGG_SCANNER_MIN_CLASS_LEVEL, EGG_POLLER_INTERVAL_SEC, MAX_CARRIED_EGGS } from '@/logic/constants/gameplay';

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

  // --- HELPERS & PERSISTENCE ---



  function saveWarehouseEggs() {
    const userId = authStore.user?.id || 'default';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`daycare_warehouse_eggs_${userId}`, JSON.stringify(warehouseEggs.value));
    }
  }

  // --- GETTERS ---
  const fulfillableMissionsCount = computed(() => daycareMissionsStore.fulfillableMissionsCount);

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
    slots.value = [
      { pokemon: null, slotIndex: 0, deposited_at: null },
      { pokemon: null, slotIndex: 1, deposited_at: null }
    ];

    // Restore eggs from LocalStorage
    const userId = authStore.user?.id || 'default';
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(`daycare_warehouse_eggs_${userId}`) : null;
    warehouseEggs.value = stored ? JSON.parse(stored) as DaycareEgg[] : [];

    const team = gameStore.state.team || [];
    const box = gameStore.state.box || [];
    const all = [...team, ...box];
    const deposited = all.filter((p): p is Pokemon => p != null && !!p.inDaycare);
    
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
  }

  async function deposit(pokemon: Pokemon, slotIndex: number) {
    if (pokemon.hp <= 0) {
      uiStore.notify('No puedes depositar un Pokémon debilitado en la Guardería.', '⚠️');
      return false;
    }

    const isFossil = isFossilPokemonSpeciesId(pokemon.id);
    const isLegendary = isLegendaryPokemonSpeciesId(pokemon.id);
    const isBaby = isBabyPokemonSpeciesId(pokemon.id);
    const maxVig = pokemon.maxVigor !== undefined ? pokemon.maxVigor : 10;
    
    if (maxVig <= 0 || isFossil || isLegendary) {
      uiStore.notify('Este Pokémon no tiene vigor y no puede reproducirse en la Guardería.', '⚠️');
      return false;
    }

    if (isBaby) {
      uiStore.notify('Los Pokémon bebé no pueden reproducirse en la Guardería.', '⚠️');
      return false;
    }

    if (pokemon.isIllegal || !checkPokemonLegality(pokemon).isLegal) {
      pokemon.isIllegal = true;
      uiStore.notify('No puedes depositar un Pokémon ilegal en la Guardería.', '⚠️');
      return false;
    }

    if (pokemon.onMission || pokemon.onDefense) {
      uiStore.notify('Este Pokémon está ocupado.', '⚠️');
      return false;
    }

    // Move to box if it was in the active team
    const teamIdx = gameStore.state.team.findIndex((p: Pokemon | null) => p && p.uid === pokemon.uid);
    if (teamIdx !== -1) {
      if (gameStore.state.team.length <= 1) {
        uiStore.notify('No puedes depositar a tu único Pokémon del equipo.', '⚠️');
        return false;
      }
      const p = gameStore.state.team.splice(teamIdx, 1)[0];
      if (p) {
        gameStore.state.box.push(p);
        gameStore.autoFillPvpTeam();
      }
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

    if (!compat.eggSpecies) {
      throw new Error('[breeding] Cannot generate an egg without a valid egg species.');
    }
    const eggSpecies = compat.eggSpecies;
    const itemA = pA.heldItem || '';
    const itemB = pB.heldItem || '';
    const playerClass = classStore.playerClass as string;

    const abilityName = inheritAbility(pA, pB);
    const abilityIndex = abilityName ? 1 : 0;

    const breedingCost = calculateBreedingCost(pA, pB);

    const egg = eggFactory.createDaycareEgg({
      species: eggSpecies,
      motherId: compat.motherId ? requirePokemonSpeciesId(compat.motherId) : eggSpecies,
      ivs: calculateInheritance(pA, pB, itemA, itemB, playerClass),
      nature: inheritNature(pA, pB, itemA, itemB) || 'serious',
      movesAtBirth: inheritMoves(pA, pB, eggSpecies),
      abilityIndex: abilityIndex,
      isShiny: Math.random() < calculateShinyChance(pA, pB, 1/BASE_SHINY_DENOMINATOR, eventStore.globalMultipliers?.shiny || 1),
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
    if (classStore.playerClass !== 'criador') {
      uiStore.notify('Solo los Criadores pueden escanear huevos.', '🔒');
      return;
    }
    if ((gameStore.state.classLevel || 1) < EGG_SCANNER_MIN_CLASS_LEVEL) {
      uiStore.notify(`Necesitas nivel ${EGG_SCANNER_MIN_CLASS_LEVEL} de Criador para usar el escáner.`, '🔒');
      return;
    }
    
    // Cooldown diario
    const lastScan = gameStore.state.classData?.lastEggScanDate;
    const todayStr = Temporal.Now.instant().toString().split('T')[0] || '';
    if (lastScan && lastScan.startsWith(todayStr)) {
      uiStore.notify('Ya has usado el escáner de IVs hoy.', '⚠️');
      return;
    }
    
    const egg = warehouseEggs.value.find((e) => e.id === eggId);
    if (!egg) return;

    if (egg.ivs) {
      if (!egg.inherited_ivs) egg.inherited_ivs = { };
      egg.inherited_ivs._scanned = true;
      
      if (!gameStore.state.classData) {
        gameStore.state.classData = {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0,
          blackMarketDaily: { date: '', items: [], purchased: [] }
        };
      }
      gameStore.state.classData.lastEggScanDate = Temporal.Now.instant().toString();
      
      saveWarehouseEggs();
      const name = POKEMON_DB[egg.species]?.name || 'Huevo';
      uiStore.notify(`¡Huevo de ${name} escaneado!`, '🔍');
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

  function reduceHatchTimers(activity: 'battle' | 'capture' | 'gym' | 'minigame') {
    const REDUCTIONS = { battle: 2, capture: 3, gym: 10, minigame: 1 };
    const reduction = REDUCTIONS[activity] || 0;
    if (reduction === 0) return;

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
      bgPoller = gsap.delayedCall(EGG_POLLER_INTERVAL_SEC, poll);
    };
    bgPoller = gsap.delayedCall(EGG_POLLER_INTERVAL_SEC, poll);
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
    initBackgroundPoller,
    cleanupBackgroundPoller,
    saveWarehouseEggs
  };
});

if (typeof window !== 'undefined') {
  window.__VITE_DEBUG_BREEDING_STORE_RESOLVER__ = () => useBreedingStore();
}
