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

export const useBreedingStore = defineStore('breeding', () => {
  const gameStore = useGameStore() as any;
  const uiStore = useUIStore() as any;
  const classStore = usePlayerClassStore() as any;
  const eventStore = useEventStore() as any;

  // --- STATE ---
  const slots = ref([]) as any; // [{ pokemon, slot_index, deposited_at }]
  const warehouseEggs = ref([]) as any; // Eggs waiting to be claimed
  const dailyMissions = computed({
    get: () => gameStore.state.daycare_missions || [],
    set: (val) => { gameStore.state.daycare_missions = val }
  });
  const missionRefreshes = computed({
    get: () => gameStore.state.daycare_mission_refreshes || 0,
    set: (val) => { gameStore.state.daycare_mission_refreshes = val }
  });
  const loading = ref(false);

  // --- GETTERS ---
  const isBreeding = computed(() => slots.value.length === 2 && slots.value[0].pokemon && slots.value[1].pokemon);
  
  const compatibility = computed(() => {
    if (!isBreeding.value) return { level: 0, reason: 'Deposita 2 Pokémon' };
    return checkCompatibility(slots.value[0].pokemon, slots.value[1].pokemon);
  });

  const nextEggTime = computed(() => {
    if ((compatibility.value as any).level === 0) return null;
    const interval = EGG_SPAWN_INTERVAL_MS[(compatibility.value as any).level];
    
    if (!slots.value[0]?.deposited_at || !slots.value[1]?.deposited_at) return null;

    const depA = new Date(slots.value[0].deposited_at).getTime();
    const depB = new Date(slots.value[1].deposited_at).getTime();
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

  async function deposit(pokemon: any, slotIndex: any) {
    if (pokemon.onMission || pokemon.onDefense) {
      uiStore.notify('Este Pokémon está ocupado.', '⚠️');
      return false;
    }

    pokemon.inDaycare = true;
    
    const now = new Date().toISOString();
    const existing = slots.value.findIndex((s: any) => s.slotIndex === slotIndex);
    if (existing !== -1) {
      slots.value[existing] = { pokemon, slotIndex, deposited_at: now };
    } else {
      slots.value.push({ pokemon, slotIndex, deposited_at: now });
    }

    slots.value.forEach((s: any) => s.deposited_at = now);

    uiStore.notify(`¡${pokemon.name} depositado en la Guardería!`, '🏡');
    gameStore.scheduleSave();
    return true;
  }

  // @ts-ignore
  async function _checkAndGenerateEgg() {
    if (!isBreeding.value || (compatibility.value as any).level === 0) return;
    
    const now = Date.now();
    if (nextEggTime.value && now < nextEggTime.value) return;

    const pA = slots.value[0].pokemon;
    const pB = slots.value[1].pokemon;
    const compat = compatibility.value as any;

    if ((pA.vigor || 0) <= 0 || (pB.vigor || 0) <= 0) {
      uiStore.notify('Uno de los padres no tiene vigor suficiente.', '💤');
      return;
    }

    const eggSpecies = compat.eggSpecies;
    const itemA = pA.heldItem || '';
    const itemB = pB.heldItem || '';
    const playerClass = classStore.activeClass;

    const egg = {
      id: `egg_${now}_${Math.random().toString(36).substr(2, 5)}`,
      species: eggSpecies,
      name: 'Huevo Pokémon',
      level: 1,
      isEgg: true,
      steps: 2500,
      mother_id: compat.motherId,
      deposited_at: new Date().toISOString(),
      ivs: calculateInheritance(pA, pB, itemA, itemB, playerClass),
      nature: inheritNature(pA, pB, itemA, itemB) || 'Serio',
      movesAtBirth: inheritMoves(pA, pB, eggSpecies),
      abilityIndex: inheritAbility(pA, pB),
      isShiny: Math.random() < calculateShinyChance(pA, pB, 1/4096, eventStore.globalMultipliers?.shiny || 1),
      cost: 5000
    };

    warehouseEggs.value.push(egg);
    
    const isoNow = new Date().toISOString();
    slots.value[0].deposited_at = isoNow;
    slots.value[1].deposited_at = isoNow;

    uiStore.notify(' ¡Apareció un huevo en la Guardería!', '🥚');
    gameStore.scheduleSave();
  }

  function claimEgg(eggId: any) {
    const eggIndex = warehouseEggs.value.findIndex((e: any) => e.id === eggId);
    if (eggIndex === -1) return;
    
    const egg = warehouseEggs.value[eggIndex];
    if (gameStore.state.money < egg.cost) {
      uiStore.notify(`No tienes suficiente dinero ($${egg.cost.toLocaleString()}).`, '💰');
      return;
    }

    if (!gameStore.state.eggs) gameStore.state.eggs = [];
    
    const eggForInventory = {
      uid: egg.id,
      id: egg.species,
      name: 'Huevo Pokémon',
      isEgg: true,
      steps: egg.steps,
      ivs: egg.ivs,
      nature: egg.nature,
      movesAtBirth: egg.movesAtBirth,
      abilitySlot: egg.abilityIndex,
      isShiny: egg.isShiny
    };
    
    gameStore.state.eggs.push(eggForInventory);
    gameStore.state.money -= egg.cost;
    warehouseEggs.value.splice(eggIndex, 1);
    
    uiStore.notify('¡Huevo recogido! Camina para eclosionarlo.', '🥚');
    gameStore.scheduleSave();
  }

  function scanEgg(eggId: any) {
    if (classStore.activeClass !== 'criador') {
      uiStore.notify('Solo los Criadores pueden escanear huevos.', '🔒');
      return;
    }
    
    const egg = warehouseEggs.value.find((e: any) => e.id === eggId);
    if (!egg) return;

    if (egg.inherited_ivs) {
      egg.inherited_ivs._scanned = true;
      uiStore.notify(`¡Huevo de ${(POKEMON_DB as any)[egg.species]?.name} escaneado!`, '🔍');
      gameStore.scheduleSave();
    }
  }

  function checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = dailyMissions.value.length > 0 ? dailyMissions.value[0].date : '';

    if (lastDate !== today) {
      regenerateMissions(today);
      missionRefreshes.value = 3;
    }
  }

  function regenerateMissions(dateStr: any) {
    const level = gameStore.state.trainerLevel || 1;
    const m1 = generateMission(level, dateStr);
    let m2 = generateMission(level, dateStr);

    while ((m2 as any).targetId === (m1 as any).targetId) {
      m2 = generateMission(level, dateStr);
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
    const today = new Date().toISOString().split('T')[0];
    regenerateMissions(today);
    uiStore.notify('Misiones actualizadas.', '🔄');
  }

  function completeMission(missionIndex: any, pokemonUid: any) {
    const mission = dailyMissions.value[missionIndex];
    if (mission.completed) return;

    const all = [...gameStore.state.team, ...(gameStore.state.box || [])];
    const pokemon = all.find(p => p.uid === pokemonUid);

    if (!pokemon) return;
    if (!validateMissionPokemon(pokemon, mission)) {
      uiStore.notify('Este Pokémon no cumple los requisitos.', '❌');
      return;
    }

    if (gameStore.state.team.length <= 1 && gameStore.state.team.some((p: any) => p.uid === pokemonUid)) {
      uiStore.notify('No puedes entregar tu único Pokémon.', '⚠️');
      return;
    }

    if (!gameStore.removePokemon(pokemonUid)) {
      uiStore.notify('Error al procesar la entrega.', '❌');
      return;
    }

    mission.completed = true;
    gameStore.state.inventory[mission.reward.name] = (gameStore.state.inventory[mission.reward.name] || 0) + mission.reward.qty;
    
    uiStore.notify(`¡Misión completada! Recibiste ${mission.reward.name} x${mission.reward.qty}`, mission.reward.icon);
    gameStore.scheduleSave();
  }

  function reduceHatchTimers(activity: any) {
    const REDUCTIONS = { battle: 2 * 60000, capture: 3 * 60000, gym: 10 * 60000 } as any;
    const reduction = REDUCTIONS[activity] || 0;
    if (reduction === 0) return;

    const eggs = gameStore.state.eggs || [];
    if (eggs.length === 0) return;

    let newlyReady = false;
    eggs.forEach((egg: any) => {
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
    scanEgg
  };
});
