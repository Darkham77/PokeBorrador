import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameStore } from './game';
import { useUIStore } from './ui';
import { useEvolutionStore } from './evolution';
import { getSellPrice, filterInventoryByCategory } from '@/logic/inventory/inventoryEngine';
import { checkStoneEvolution } from '@/logic/evolutionLogic';

export const useInventoryStore = defineStore('inventory', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();

  // --- UI STATE ---
  const activeCategory = ref('todos');
  const searchQuery = ref('');
  const sellMode = ref(false);
  const sellSelected = ref({}); // { itemName: quantity }

  // --- GETTERS ---
  const masterInventory = computed(() => gameStore.state.inventory || {});

  const filteredItems = computed(() => {
    let items = filterInventoryByCategory(masterInventory.value, activeCategory.value);
    
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      items = items.filter(([name]) => name.toLowerCase().includes(q));
    }
    
    return items;
  });

  const totalSellGain = computed(() => {
    let total = 0;
    Object.entries(sellSelected.value).forEach(([name, qty]) => {
      total += getSellPrice(name) * qty;
    });
    return total;
  });

  // --- ACTIONS ---
  function setCategory(cat) {
    activeCategory.value = cat;
  }

  function toggleSellMode() {
    sellMode.value = !sellMode.value;
    sellSelected.value = {};
  }

  function toggleSellSelection(itemName) {
    if (sellSelected.value[itemName]) {
      delete sellSelected.value[itemName];
    } else {
      sellSelected.value[itemName] = masterInventory.value[itemName] || 1;
    }
  }

  function updateSellQty(itemName, qty) {
    const max = masterInventory.value[itemName] || 0;
    let finalQty = Math.max(1, Math.min(qty, max));
    sellSelected.value[itemName] = finalQty;
  }

  async function performSell() {
    const entries = Object.entries(sellSelected.value);
    if (entries.length === 0) return;

    let total = 0;
    entries.forEach(([name, qty]) => {
      const price = getSellPrice(name);
      total += price * qty;
      
      gameStore.state.inventory[name] -= qty;
      if (gameStore.state.inventory[name] <= 0) {
        delete gameStore.state.inventory[name];
      }
    });

    gameStore.state.money += total;
    uiStore.notify(`¡Vendiste objetos por ₽${total.toLocaleString()}! 💰`, '💰');
    
    sellMode.value = false;
    sellSelected.value = {};
    gameStore.save();
  }

  function useItem(itemName, target = null) {
    if (!target) {
      uiStore.notify(`Selecciona un Pokémon para usar ${itemName}.`, '🎒');
      return;
    }

    // 1. Check if it's an evolution stone
    const targetSpecies = checkStoneEvolution(target, itemName);
    if (targetSpecies) {
      const evolutionStore = useEvolutionStore();
      evolutionStore.startEvolution(target, targetSpecies);
      
      // Consume item
      gameStore.state.inventory[itemName]--;
      if (gameStore.state.inventory[itemName] <= 0) {
        delete gameStore.state.inventory[itemName];
      }
      return;
    }

    // 2. Fallback for other items (healing, etc.)
    if (gameStore.state.inventory[itemName] > 0) {
      uiStore.notify(`¡${target.name} no puede usar este objeto ahora!`, '🎒');
    }
  }

  return {
    activeCategory,
    searchQuery,
    sellMode,
    sellSelected,
    masterInventory,
    filteredItems,
    totalSellGain,
    setCategory,
    toggleSellMode,
    toggleSellSelection,
    updateSellQty,
    performSell,
    useItem
  };
});
