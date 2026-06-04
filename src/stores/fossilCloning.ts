import { defineStore } from 'pinia';
import { useGameStore } from './game.ts';
import { useUIStore } from './ui.ts';
import { useInventoryStore } from './inventory.ts';
import { useBreedingStore } from './breeding.ts';
import { calculateCloningCost, calculateCloningRerolls, calculateCloningShinyChance } from '@/logic/minigames/minigameMath';
import { eggFactory } from '@/logic/breeding/eggFactory';
import { POKEMON_DB } from '@/data/pokemonDB';
import type { PokemonIVs } from '@/types/pokemon';

export const useFossilCloningStore = defineStore('fossilCloning', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const inventoryStore = useInventoryStore();
  const breedingStore = useBreedingStore();

  function cloneFossil(fossilName: string, extraQty: number) {
    if (breedingStore.warehouseEggs.length >= 30) {
      uiStore.notify('El almacén de huevos está lleno.', '❌');
      return;
    }

    const count = gameStore.state.inventory[fossilName] || 0;
    const requiredFossils = 1 + extraQty;

    if (count < requiredFossils) {
      uiStore.notify(`No tienes suficientes fósiles. Requieres ${requiredFossils} y tienes ${count}.`, '❌');
      return;
    }

    const totalCost = calculateCloningCost(extraQty);
    if (gameStore.state.money < totalCost) {
      uiStore.notify(`No tienes suficiente dinero. Requieres ₽${totalCost.toLocaleString()} y tienes ₽${gameStore.state.money.toLocaleString()}.`, '💰');
      return;
    }

    const FOSSIL_SPECIES_MAP: Record<string, string> = {
      'Fósil Domo': 'kabuto',
      'Fósil Hélix': 'omanyte',
      'Ámbar Viejo': 'aerodactyl'
    };
    const speciesId = FOSSIL_SPECIES_MAP[fossilName];
    if (!speciesId) {
      uiStore.notify('Fósil no reconocido para clonar.', '❌');
      return;
    }

    const rolls = calculateCloningRerolls(extraQty);
    const rollIVs = (): PokemonIVs => ({
      hp: Math.floor(Math.random() * 32),
      atk: Math.floor(Math.random() * 32),
      def: Math.floor(Math.random() * 32),
      spa: Math.floor(Math.random() * 32),
      spd: Math.floor(Math.random() * 32),
      spe: Math.floor(Math.random() * 32)
    });

    let bestIVs = rollIVs();
    let bestSum = bestIVs.hp + bestIVs.atk + bestIVs.def + bestIVs.spa + bestIVs.spd + bestIVs.spe;
    for (let i = 1; i < rolls; i++) {
      const currentIVs = rollIVs();
      const currentSum = currentIVs.hp + currentIVs.atk + currentIVs.def + currentIVs.spa + currentIVs.spd + currentIVs.spe;
      if (currentSum > bestSum) {
        bestIVs = currentIVs;
        bestSum = currentSum;
      }
    }

    const shinyChance = calculateCloningShinyChance(extraQty);
    const isShiny = Math.random() < shinyChance;

    inventoryStore.removeItem(fossilName, requiredFossils);
    gameStore.state.money -= totalCost;

    const egg = eggFactory.createDaycareEgg({
      species: speciesId,
      ivs: bestIVs,
      nature: 'Serio',
      movesAtBirth: [],
      abilityIndex: 0,
      isShiny,
      cost: 0, // Paid upfront
      tint: 'rgba(139, 90, 43, 0.7)',
      isAncestral: true,
      steps: 2500
    });

    breedingStore.warehouseEggs.push(egg);
    breedingStore.saveWarehouseEggs();

    uiStore.notify(`¡Clonación exitosa! Huevo Ancestral de ${POKEMON_DB[speciesId as keyof typeof POKEMON_DB]?.name} creado.`, '🥚');
    gameStore.scheduleSave();
  }

  return {
    cloneFossil
  };
});
