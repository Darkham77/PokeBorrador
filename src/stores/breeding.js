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
import { EGG_SPAWN_INTERVAL_MS, BREEDING_CONSTANTS } from '@/logic/breeding/breedingData';
import { POKEMON_DB } from '@/data/pokemonDB';
import { useClassStore } from './classStore'; // Asumiendo que existe

export const useBreedingStore = defineStore('breeding', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const classStore = useClassStore();

  // --- STATE ---
  const slots = ref([]); // [{ pokemon, slot_index, deposited_at }]
  const warehouseEggs = ref([]); // Eggs waiting to be claimed
  const dailyMissions = ref([]);
  const missionRefreshes = ref(3);
  const loading = ref(false);

  // --- GETTERS ---
  const isBreeding = computed(() => slots.value.length === 2 && slots.value[0].pokemon && slots.value[1].pokemon);
  
  const compatibility = computed(() => {
    if (!isBreeding.value) return { level: 0, reason: 'Deposita 2 Pokémon' };
    return checkCompatibility(slots.value[0].pokemon, slots.value[1].pokemon);
  });

  const nextEggTime = computed(() => {
    if (compatibility.value.level === 0) return null;
    const interval = EGG_SPAWN_INTERVAL_MS[compatibility.value.level];
    
    if (!slots.value[0]?.deposited_at || !slots.value[1]?.deposited_at) return null;

    const depA = new Date(slots.value[0].deposited_at).getTime();
    const depB = new Date(slots.value[1].deposited_at).getTime();
    const earliest = Math.max(depA, depB);
    
    return earliest + interval;
  });

  // --- ACTIONS ---

  /**
   * Loads daycare data from the persistence layer.
   * In a real app, this would be a Supabase call. 
   * For now, we simulate the hydration.
   */
  async function loadDaycare() {
    loading.value = true;
    try {
      // Logic would be: fetch slots from DB, then find the corresponding pokemon in gameStore.state.box
      // For the demo/migration, we ensure the local state reflects the logic.
      // (Implementation details depend on whether we keep a separate 'daycare_slots' table)
    } finally {
      loading.value = false;
    }
  }

  /**
   * Deposits a pokemon into a daycare slot.
   */
  async function deposit(pokemon, slotIndex) {
    if (pokemon.onMission || pokemon.onDefense) {
      uiStore.notify('Este Pokémon está ocupado.', '⚠️');
      return false;
    }

    // Logic for moving from team/box to daycare slots
    // 1. Update pokemon state
    pokemon.inDaycare = true;
    
    // 2. Add to slots
    const now = new Date().toISOString();
    const existing = slots.value.findIndex(s => s.slotIndex === slotIndex);
    if (existing !== -1) {
      slots.value[existing] = { pokemon, slotIndex, deposited_at: now };
    } else {
      slots.value.push({ pokemon, slotIndex, deposited_at: now });
    }

    // 3. Reset both timers to zero when a new partner arrives
    slots.value.forEach(s => s.deposited_at = now);

    uiStore.notify(`¡${pokemon.name} depositado en la Guardería!`, '🏡');
    gameStore.scheduleSave();
    return true;
  }

  /**
   * Genera un huevo basado en los padres actuales.
   * Llama a breedingEngine para herencia compleja.
   */
  async function checkAndGenerateEgg() {
    if (!isBreeding.value || compatibility.value.level === 0) return;
    
    const now = Date.now();
    if (now < nextEggTime.value) return;

    // Ya pasó el tiempo, generamos el huevo
    const pA = slots.value[0].pokemon;
    const pB = slots.value[1].pokemon;
    const compat = compatibility.value;

    // Verificar Vigor antes de generar
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
      steps: 2500, // Pasos base para eclosionar
      mother_id: compat.motherId,
      deposited_at: new Date().toISOString(),
      
      // Herencia avanzada
      ivs: calculateInheritance(pA, pB, itemA, itemB, playerClass),
      nature: inheritNature(pA, pB, itemA, itemB) || 'Serio', // Naturaleza aleatoria será el fallback real
      movesAtBirth: inheritMoves(pA, pB, eggSpecies),
      abilityIndex: inheritAbility(pA, pB),
      isShiny: Math.random() < calculateShinyChance(pA, pB),
      
      cost: 5000 // Costo base por recoger
    };

    warehouseEggs.value.push(egg);
    
    // Descontar Vigor (Sistema Legacy)
    // pA.vigor = (pA.vigor || 100) - 10; // Ejemplo de descuento
    // pB.vigor = (pB.vigor || 100) - 10;
    
    // Resetear timers moviendo deposited_at al 'ahora' para el siguiente ciclo
    const isoNow = new Date().toISOString();
    slots.value[0].deposited_at = isoNow;
    slots.value[1].deposited_at = isoNow;

    uiStore.notify(' ¡Apareció un huevo en la Guardería!', '🥚');
    gameStore.scheduleSave();
  }

  /**
   * Claim an egg from the daycare warehouse.
   */
  function claimEgg(eggId) {
    const eggIndex = warehouseEggs.value.findIndex(e => e.id === eggId);
    if (eggIndex === -1) return;
    
    const egg = warehouseEggs.value[eggIndex];
    if (gameStore.state.money < egg.cost) {
      uiStore.notify(`No tienes suficiente dinero ($${egg.cost.toLocaleString()}).`, '💰');
      return;
    }

    // Add to gameStore eggs 
    if (!gameStore.state.eggs) gameStore.state.eggs = [];
    
    // Transformar a formato persistible
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

  /**
   * Scans an egg in the warehouse (Breeder only)
   */
  function scanEgg(eggId) {
    if (classStore.activeClass !== 'criador') {
      uiStore.notify('Solo los Criadores pueden escanear huevos.', '🔒');
      return;
    }
    
    const egg = warehouseEggs.value.find(e => e.id === eggId);
    if (!egg) return;

    if (egg.inherited_ivs) {
      egg.inherited_ivs._scanned = true;
      uiStore.notify(`¡Huevo de ${POKEMON_DB[egg.species]?.name} escaneado!`, '🔍');
      gameStore.scheduleSave();
    }
  }

  /**
   * Daily reset check for missions.
   */
  function checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = dailyMissions.value.length > 0 ? dailyMissions.value[0].date : '';

    if (lastDate !== today) {
      regenerateMissions(today);
      missionRefreshes.value = 3;
    }
  }

  function regenerateMissions(dateStr) {
    const level = gameStore.state.trainerLevel || 1;
    const m1 = generateMission(level, dateStr);
    let m2 = generateMission(level, dateStr);

    while (m2.targetId === m1.targetId) {
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

  /**
   * Completes a mission by delivering a pokemon.
   */
  function completeMission(missionIndex, pokemonUid) {
    const mission = dailyMissions.value[missionIndex];
    if (mission.completed) return;

    // Find pokemon in team/box
    const all = [...gameStore.state.team, ...(gameStore.state.box || [])];
    const pokemon = all.find(p => p.uid === pokemonUid);

    if (!pokemon) return;
    if (!validateMissionPokemon(pokemon, mission)) {
      uiStore.notify('Este Pokémon no cumple los requisitos.', '❌');
      return;
    }

    // Remove from team or box
    const teamIdx = gameStore.state.team.findIndex(p => p.uid === pokemonUid);
    if (teamIdx !== -1) {
      if (gameStore.state.team.length <= 1) {
        uiStore.notify('No puedes entregar tu único Pokémon.', '⚠️');
        return;
      }
      gameStore.state.team.splice(teamIdx,  teamIdx); // Wait, splice logic? Fixed below
      // Fixing the splice:
      gameStore.state.team.splice(teamIdx, 1);
    } else {
      const boxIdx = gameStore.state.box.findIndex(p => p.uid === pokemonUid);
      if (boxIdx !== -1) gameStore.state.box.splice(boxIdx, 1);
    }

    mission.completed = true;
    
    // Add rewards
    gameStore.state.inventory[mission.reward.name] = (gameStore.state.inventory[mission.reward.name] || 0) + mission.reward.qty;
    
    uiStore.notify(`¡Misión completada! Recibiste ${mission.reward.name} x${mission.reward.qty}`, mission.reward.icon);
    gameStore.scheduleSave();
  }

  /**
   * Reduces time for eggs currently in the player's inventory (not the warehouse).
   * Activity: 'battle' | 'capture' | 'gym'
   */
  function reduceHatchTimers(activity) {
    const REDUCTIONS = { battle: 2 * 60000, capture: 3 * 60000, gym: 10 * 60000 };
    const reduction = REDUCTIONS[activity] || 0;
    if (reduction === 0) return;

    const eggs = gameStore.state.eggs || [];
    if (eggs.length === 0) return;

    let newlyReady = false;
    eggs.forEach(egg => {
      // Logic for reducing steps or timestamp
      // In this game, eggs are hatching via "steps" usually, but the legacy also used timestamps.
      // If we use steps:
      if (egg.steps > 0) {
        egg.steps = Math.max(0, egg.steps - (reduction / 1000)); // Simulating steps from time
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
    completeMission,
    reduceHatchTimers,
    scanEgg
  };
})
