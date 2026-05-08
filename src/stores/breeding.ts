import { Temporal } from '@js-temporal/polyfill'
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameStore } from './game';
import { useUIStore } from './ui';
import { 
  checkCompatibility, 
  calculateInheritance, 
  inheritNature,
  inheritMoves,
  inheritAbility,
  calculateShinyChance,
} from '@/logic/breeding/breedingEngine';
import { generateMission, validateMissionPokemon } from '@/logic/breeding/missionEngine';
import { EGG_SPAWN_INTERVAL_MS } from '@/logic/breeding/breedingData';
import { POKEMON_DB } from '@/data/pokemonDB';
import { usePlayerClassStore } from './playerClass';
import { useEventStore } from './events';
import type { DaycareSlot, DaycareEgg, DaycareMission } from '@/types/breeding';
import type { Pokemon, PokemonEgg } from '@/types/pokemon';

export const useBreedingStore = defineStore('breeding', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const classStore = usePlayerClassStore();
  const eventStore = useEventStore();

  // --- STATE ---
  const slots = ref<DaycareSlot[]>([]); // [{ pokemon, slot_index, deposited_at }]
  const warehouseEggs = ref<DaycareEgg[]>([]); // Eggs waiting to be claimed
  const dailyMissions = computed<DaycareMission[]>({
    get: () => gameStore.state.daycare_missions || [],
    set: (val) => { gameStore.state.daycare_missions = val }
  });
  const missionRefreshes = computed<number>({
    get: () => gameStore.state.daycare_mission_refreshes || 0,
    set: (val) => { gameStore.state.daycare_mission_refreshes = val }
  });
  const loading = ref(false);

  // --- GETTERS ---
  const isBreeding = computed(() => slots.value.length === 2 && !!slots.value[0]?.pokemon && !!slots.value[1]?.pokemon);
  
  const compatibility = computed(() => {
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
    const interval = (EGG_SPAWN_INTERVAL_MS as any)[level];
    if (!interval) return null;
    
    if (!slots.value[0]?.deposited_at || !slots.value[1]?.deposited_at) return null;

    const depA = Temporal.Instant.fromEpochMilliseconds(slots.value[0].deposited_at).epochMilliseconds;
    const depB = Temporal.Instant.fromEpochMilliseconds(slots.value[1].deposited_at).epochMilliseconds;
    const earliest = Math.max(depA, depB);
    
    return earliest + interval;
  });

  // --- ACTIONS ---

  async function loadDaycare() {
    loading.value = true;
    try {
      // Simulate hydration
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
    
    const now = Temporal.Now.instant().toString();
    const existing = slots.value.findIndex((s) => s.slotIndex === slotIndex);
    if (existing !== -1) {
      slots.value[existing] = { pokemon, slotIndex, deposited_at: now };
    } else {
      slots.value.push({ pokemon, slotIndex, deposited_at: now });
    }

    slots.value.forEach((s) => s.deposited_at = now);

    uiStore.notify(`¡${pokemon.name} depositado en la Guardería!`, '🏡');
    gameStore.scheduleSave();
    return true;
  }

  async function checkAndGenerateEgg() {
    if (!isBreeding.value || compatibility.value.level === 0) return;
    if (!slots.value[0]?.pokemon || !slots.value[1]?.pokemon) return;
    
    const now = Temporal.Now.instant().epochMilliseconds;
    if (nextEggTime.value && now < nextEggTime.value) return;

    const pA = slots.value[0].pokemon as Pokemon;
    const pB = slots.value[1].pokemon as Pokemon;
    const compat = compatibility.value as any; // breedingEngine might need better typing too

    if ((pA.vigor || 0) <= 0 || (pB.vigor || 0) <= 0) {
      uiStore.notify('Uno de los padres no tiene vigor suficiente.', '💤');
      return;
    }

    const eggSpecies = compat.eggSpecies;
    const itemA = pA.heldItem || '';
    const itemB = pB.heldItem || '';
    const playerClass = classStore.playerClass as string;

    const abilityName = inheritAbility(pA, pB);
    const abilityIndex = abilityName ? 1 : 0; // Simplified conversion for now

    const egg: DaycareEgg = {
      id: `egg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      species: eggSpecies,
      name: 'Huevo Pokémon',
      level: 1,
      isEgg: true,
      steps: 2500,
      mother_id: compat.motherId,
      deposited_at: Temporal.Now.instant().toString(),
      ivs: calculateInheritance(pA, pB, itemA, itemB, playerClass),
      nature: inheritNature(pA, pB, itemA, itemB) || 'Serio',
      movesAtBirth: inheritMoves(pA, pB, eggSpecies),
      abilityIndex: abilityIndex,
      isShiny: Math.random() < calculateShinyChance(pA, pB, 1/4096, eventStore.globalMultipliers?.shiny || 1),
      cost: 5000
    };

    warehouseEggs.value.push(egg);
    
    const isoNow = Temporal.Now.instant().toString();
    if (slots.value[0]) slots.value[0].deposited_at = isoNow;
    if (slots.value[1]) slots.value[1].deposited_at = isoNow;

    uiStore.notify(' ¡Apareció un huevo en la Guardería!', '🥚');
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
    
    const eggForInventory: PokemonEgg = {
      uid: egg.id,
      id: egg.species,
      steps: egg.steps,
      ready: false,
      ivs: egg.ivs,
      nature: egg.nature,
      movesAtBirth: egg.movesAtBirth,
      abilitySlot: egg.abilityIndex,
      isShiny: egg.isShiny
    };
    
    const eggToPush = {
      ...eggForInventory,
      uid: `${eggForInventory.id}-${Temporal.Now.instant().epochMilliseconds}`,
      ready: false
    };
    gameStore.state.eggs.push(eggToPush as any);
    gameStore.state.money -= egg.cost;
    warehouseEggs.value.splice(eggIndex, 1);
    
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
      uiStore.notify(`¡Huevo de ${(POKEMON_DB as any)[egg.species]?.name} escaneado!`, '🔍');
      gameStore.scheduleSave();
    }
  }

  function checkDailyReset() {
    const today = Temporal.Now.instant().toString().split('T')[0] as string;
    const missions = dailyMissions.value;
    const lastDate = missions.length > 0 && missions[0] ? missions[0].date : '';

    if (lastDate !== today) {
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
    const box = gameStore.state.box || [];
    const all = [...team, ...box];
    const pokemon = all.find(p => p.uid === pokemonUid);

    if (!pokemon) return;
    if (!validateMissionPokemon(pokemon, mission as any)) {
      uiStore.notify('Este Pokémon no cumple los requisitos.', '❌');
      return;
    }

    if (team.length <= 1 && team.some((p) => p.uid === pokemonUid)) {
      uiStore.notify('No puedes entregar tu único Pokémon.', '⚠️');
      return;
    }

    if (!gameStore.removePokemon(pokemonUid)) {
      uiStore.notify('Error al procesar la entrega.', '❌');
      return;
    }

    mission.completed = true;
    const inv = gameStore.state.inventory as any;
    inv[mission.reward.name] = (inv[mission.reward.name] || 0) + mission.reward.qty;
    
    uiStore.notify(`¡Misión completada! Recibiste ${mission.reward.name} x${mission.reward.qty}`, mission.reward.icon);
    gameStore.scheduleSave();
  }

  function reduceHatchTimers(activity: 'battle' | 'capture' | 'gym') {
    const REDUCTIONS = { battle: 2 * 60000, capture: 3 * 60000, gym: 10 * 60000 };
    const reduction = REDUCTIONS[activity] || 0;
    if (reduction === 0) return;

    const eggs = gameStore.state.eggs || [];
    if (eggs.length === 0) return;

    let newlyReady = false;
    eggs.forEach((egg) => {
      if (egg.steps > 0) {
        egg.steps = Math.max(0, egg.steps - (reduction / 1000));
        if (egg.steps === 0) newlyReady = true;
      }
    });

    if (newlyReady) {
      uiStore.notify('¡Un huevo está listo para eclosionar!', '🐣');
    }
  }

  return {
    slots,
    warehouseEggs,
    dailyMissions,
    missionRefreshes,
    loading,
    isBreeding,
    compatibility,
    nextEggTime,
    loadDaycare,
    deposit,
    claimEgg,
    checkDailyReset,
    refreshMissions,
    regenerateMissions,
    completeMission,
    reduceHatchTimers,
    scanEgg,
    checkAndGenerateEgg
  };
});
