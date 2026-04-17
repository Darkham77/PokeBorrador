import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameStore } from './game';
import { useUIStore } from './ui';
import { getPokemonTier } from '@/logic/pokemon/tierEngine';

export const useBoxStore = defineStore('box', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();

  // --- UI STATE ---
  const currentBoxIndex = ref(0);
  const releaseMode = ref(false);
  const releaseSelected = ref(new Set());
  const rocketMode = ref(false);
  const rocketSelected = ref(new Set());

  // --- GETTERS ---
  const box = computed(() => gameStore.state.box || []);
  const boxCount = computed(() => gameStore.state.boxCount || 4);
  const boxCapacity = computed(() => boxCount.value * 50);
  const isFull = computed(() => box.value.length >= boxCapacity.value);

  const getBoxBuyCost = computed(() => {
    const count = boxCount.value;
    if (count < 4) return 500000;
    if (count === 4) return 500000;
    if (count === 5) return 1000000;
    return 1000000 * Math.pow(2, count - 5);
  });

  // --- ACTIONS ---
  function switchBox(index) {
    if (index >= 0 && index < boxCount.value) {
      currentBoxIndex.value = index;
    }
  }

  async function buyNewBox() {
    const cost = getBoxBuyCost.value;
    const maxBoxes = 10;
    
    if (boxCount.value >= maxBoxes) {
      uiStore.notify('Ya alcanzaste el máximo de 10 cajas.', '⚠️');
      return false;
    }
    
    if (gameStore.state.money < cost) {
      uiStore.notify(`Dinero insuficiente. Necesitás ₽${cost.toLocaleString()}.`, '❌');
      return false;
    }

    // Confirmation logic should be in UI, but action here
    gameStore.state.money -= cost;
    gameStore.state.boxCount = (gameStore.state.boxCount || 4) + 1;
    
    uiStore.notify(`¡Compraste la Caja ${gameStore.state.boxCount}! 📦`, '💰');
    gameStore.save(false);
    return true;
  }

  function toggleReleaseMode() {
    releaseMode.value = !releaseMode.value;
    releaseSelected.value.clear();
    rocketMode.value = false; // Mutually exclusive
  }

  function toggleRocketMode() {
    if (gameStore.state.playerClass !== 'rocket') return;
    rocketMode.value = !rocketMode.value;
    rocketSelected.value.clear();
    releaseMode.value = false; // Mutually exclusive
  }

  function toggleSelection(index) {
    const set = releaseMode.value ? releaseSelected.value : rocketSelected.value;
    if (set.has(index)) {
      set.delete(index);
    } else {
      set.add(index);
    }
  }

  function moveBoxToTeam(boxIndex) {
    if (gameStore.state.team.length >= 6) {
      uiStore.notify('Tu equipo está lleno (máx. 6).', '⚠️');
      return;
    }

    const p = box.value[boxIndex];
    if (!p) return;

    if (p.onMission) return uiStore.notify(`¡${p.name} está en misión!`, '📋');
    if (p.inDaycare) return uiStore.notify(`¡${p.name} está en la Guardería!`, '🏡');
    if (p.onDefense) return uiStore.notify(`¡${p.name} está defendiendo!`, '🛡️');

    gameStore.state.box.splice(boxIndex, 1);
    gameStore.state.team.push(p);
    
    uiStore.notify(`¡${p.name} se unió a tu equipo!`, '➕');
    gameStore.save(false);
  }

  function swapBoxWithTeam(boxIndex, teamIndex) {
    const boxPoke = box.value[boxIndex];
    const teamPoke = gameStore.state.team[teamIndex];
    
    if (!boxPoke || !teamPoke) return;
    if (boxPoke.onMission || boxPoke.inDaycare || boxPoke.onDefense) {
      uiStore.notify(`¡${boxPoke.name} no puede moverse ahora!`, '⚠️');
      return;
    }

    // Curar al que va a la caja (legacy rule)
    teamPoke.hp = teamPoke.maxHp;
    teamPoke.status = null;
    if (teamPoke.moves) {
      teamPoke.moves.forEach(m => { m.pp = m.maxPP; });
    }

    gameStore.state.box.splice(boxIndex, 1, teamPoke);
    gameStore.state.team.splice(teamIndex, 1, boxPoke);

    uiStore.notify(`¡Intercambio realizado! 🔄`, '✨');
    gameStore.save(false);
  }

  async function performMassRelease() {
    if (releaseSelected.value.size === 0) return;
    
    const indices = [...releaseSelected.value].sort((a, b) => b - a);
    indices.forEach(i => {
      const p = gameStore.state.box[i];
      // Return held item logic could be added here
      gameStore.state.box.splice(i, 1);
    });

    uiStore.notify(`¡${indices.length} Pokémon liberados! 🌿`, '🌿');
    releaseMode.value = false;
    releaseSelected.value.clear();
    gameStore.save();
  }

  async function performRocketSell() {
    if (rocketSelected.value.size === 0) return;

    let totalGain = 0;
    const indices = [...rocketSelected.value].sort((a, b) => b - a);
    
    indices.forEach(i => {
      const p = gameStore.state.box[i];
      const tier = getPokemonTier(p);
      const price = Math.floor((p.level * 50 + (tier.total / 186) * 500) * 0.8);
      totalGain += price;
      gameStore.state.box.splice(i, 1);
    });

    gameStore.state.money += totalGain;
    gameStore.state.classData.blackMarketSales = (gameStore.state.classData.blackMarketSales || 0) + indices.length;
    
    // Criminalidad (15 por cada uno)
    if (typeof window.addCriminality === 'function') {
      window.addCriminality(indices.length * 15);
    }

    uiStore.notify(`¡Venta realizada por ₽${totalGain.toLocaleString()}! 💰`, '🚀');
    rocketMode.value = false;
    rocketSelected.value.clear();
    gameStore.save();
  }

  return {
    currentBoxIndex,
    releaseMode,
    releaseSelected,
    rocketMode,
    rocketSelected,
    box,
    boxCount,
    boxCapacity,
    isFull,
    getBoxBuyCost,
    switchBox,
    buyNewBox,
    toggleReleaseMode,
    toggleRocketMode,
    toggleSelection,
    moveBoxToTeam,
    swapBoxWithTeam,
    performMassRelease,
    performRocketSell
  };
});
