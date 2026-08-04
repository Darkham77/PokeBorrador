import { useGameStore } from '@/stores/game.ts';
import { useUIStore } from '@/stores/ui.ts';
import { useInventoryStore } from '@/stores/inventory/inventory.ts';
import { requireItemId, type ItemId } from '@/data/inventory/items';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { eggFactory } from '@/logic/breeding/eggFactory';
import { POKEMON_DB } from '@/data/pokemon/pokemonDB';
import { calculateCloningCost, calculateCloningRerolls, calculateCloningShinyChance } from '@/logic/minigames/minigameMath';
import { generateRandomIVs } from '@/logic/pokemon/pokemonUtils';
import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon';
import type { Ref } from 'vue';
import type { DaycareEgg } from '@/types/breeding/breeding';

export function calculateBreedingCost(pA: Pokemon, pB: Pokemon): number {
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

export function executeCloneFossil(
  fossilId: string,
  extraQty: number,
  warehouseEggs: Ref<DaycareEgg[]>,
  saveWarehouseEggs: () => void
): boolean {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const inventoryStore = useInventoryStore();

  if (warehouseEggs.value.length >= 30) {
    uiStore.notify('El almacén de huevos está lleno.', '❌');
    return false;
  }

  const count = gameStore.state.inventory[fossilId] || 0;
  const requiredFossils = 1 + extraQty;

  if (count < requiredFossils) {
    uiStore.notify(`No tienes suficientes fósiles. Requieres ${requiredFossils} y tienes ${count}.`, '❌');
    return false;
  }

  const totalCost = calculateCloningCost(extraQty);
  if (gameStore.state.money < totalCost) {
    uiStore.notify(`No tienes suficiente dinero. Requieres ₽${totalCost.toLocaleString()} y tienes ₽${gameStore.state.money.toLocaleString()}.`, '💰');
    return false;
  }

  const FOSSIL_SPECIES_MAP: Record<ItemId, PokemonSpeciesId> = {
    domefossil: 'kabuto',
    helixfossil: 'omanyte',
    oldamber: 'aerodactyl'
  } satisfies Partial<Record<ItemId, PokemonSpeciesId>>;
  
  const validFossilId = requireItemId(fossilId);
  const speciesId = FOSSIL_SPECIES_MAP[validFossilId];
  if (!speciesId) {
    uiStore.notify('Fósil no reconocido para clonar.', '❌');
    return false;
  }

  // Consume resources first
  inventoryStore.removeItem(fossilId, requiredFossils);
  gameStore.state.money -= totalCost;

  // Roll success (5% per fossil consumed)
  const successChance = 0.05 * requiredFossils;
  const isSuccess = Math.random() < successChance;

  if (!isSuccess) {
    uiStore.notify('La extracción de ADN del fósil ha fallado.', '⚠️');
    gameStore.scheduleSave();
    return false;
  }

  const rolls = calculateCloningRerolls(extraQty);
  const rollIVs = (): PokemonIVs => generateRandomIVs();

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

  const egg = eggFactory.createDaycareEgg({
    species: speciesId,
    ivs: bestIVs,
    nature: 'Serio',
    movesAtBirth: [],
    abilityIndex: 0,
    isShiny,
    cost: 0, // Paid upfront
    tint: 'rgba(139, 90, 43, 0.7)',
    isAncestral: true
  });

  warehouseEggs.value.push(egg);
  saveWarehouseEggs();

  uiStore.notify(`¡Clonación exitosa! Huevo Ancestral de ${POKEMON_DB[speciesId]?.name} creado.`, '🥚');
  gameStore.scheduleSave();
  return true;
}
