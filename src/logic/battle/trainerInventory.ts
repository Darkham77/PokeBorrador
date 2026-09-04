
import { ITEM_PRICES, INVENTORY_LEVEL_TIERS } from '../constants/items.ts';
import type { BattleDifficulty, BattleItemEffectKind } from '@/types/battle/battle';

const POKEBALL_BUDGET_HALF_RATIO = 0.5;
const CURE_PURCHASE_ROLL_THRESHOLD = 0.8;

interface PurchaseCandidate {
  id: string;
  price: number;
  type: BattleItemEffectKind;
}

/**
 * Genera un inventario de consumibles para un NPC o Líder de Gimnasio basado en su nivel,
 * dificultad y rol.
 */
export function generateNPCInventory(
  maxLevel: number,
  difficulty: BattleDifficulty = 'easy',
  isGym = false,
  isRival = false,
  archetype?: string
): { inventory: Record<string, number>; remainingMoney: number } {
  // 1. Determinar el presupuesto (money budget)
  const isSpecial = isRival || archetype === 'policeman' || archetype === 'rocket';
  const baseBudget = calculateNPCBaseBudget(maxLevel, isGym, isSpecial);
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 a 1.2
  const budget = calculateNPCFinalBudget(baseBudget, difficulty, randomFactor);

  // 2. Determinar el límite máximo de objetos comprados
  const maxItems = calculateNPCMaxItems(maxLevel, difficulty, isGym, isSpecial);

  // 3. Definir candidatos de compra desbloqueados por nivel
  const candidates: PurchaseCandidate[] = [];

  // Nivel 1+: Poción común y curas de estado específicas
  candidates.push({ id: 'potion', price: ITEM_PRICES.potion!, type: 'heal' });
  candidates.push({ id: 'antidote', price: ITEM_PRICES.antidote!, type: 'cure' });
  candidates.push({ id: 'paralyzeheal', price: ITEM_PRICES.paralyzeheal!, type: 'cure' });
  candidates.push({ id: 'burnheal', price: ITEM_PRICES.burnheal!, type: 'cure' });
  candidates.push({ id: 'awakening', price: ITEM_PRICES.awakening!, type: 'cure' });
  candidates.push({ id: 'iceheal', price: ITEM_PRICES.iceheal!, type: 'cure' });

  // Nivel 15+: Súper Poción y Cura Total
  if (maxLevel >= INVENTORY_LEVEL_TIERS.SUPER_TIER) {
    candidates.push({ id: 'superpotion', price: ITEM_PRICES.superpotion!, type: 'heal' });
    candidates.push({ id: 'fullheal', price: ITEM_PRICES.fullheal!, type: 'cure' });
  }

  // Nivel 30+: Hiper Poción y Revivir
  if (maxLevel >= INVENTORY_LEVEL_TIERS.HYPER_TIER) {
    candidates.push({ id: 'hyperpotion', price: ITEM_PRICES.hyperpotion!, type: 'heal' });
    candidates.push({ id: 'revive', price: ITEM_PRICES.revive!, type: 'revive' });
  }

  // Nivel 50+: Poción Máxima, Restaurar Todo y Revivir Máximo
  if (maxLevel >= INVENTORY_LEVEL_TIERS.VETERAN_TIER) {
    candidates.push({ id: 'maxpotion', price: ITEM_PRICES.maxpotion!, type: 'heal' });
    candidates.push({ id: 'fullrestore', price: ITEM_PRICES.fullrestore!, type: 'heal' }); // actúa como heal/cure híbrido
    candidates.push({ id: 'revivemax', price: ITEM_PRICES.revivemax!, type: 'revive' });
  }

  // 4. Realizar compras inteligentes iterativamente hasta agotar el presupuesto o alcanzar el límite de objetos
  const inventory: Record<string, number> = {};
  let currentSpent = 0;
  let itemCount = 0;

  let pokeballBudget = Math.floor(budget * 0.5);
  // Priorizar pokebolas si no alcanza para el mínimo (200)
  if (pokeballBudget < ITEM_PRICES.pokeball! && budget >= ITEM_PRICES.pokeball!) {
    pokeballBudget = ITEM_PRICES.pokeball!;
  }
  const recoveryBudget = budget - pokeballBudget;

  // Ordenar candidatos por precio descendente para intentar comprar la mejor calidad posible primero (Greedy)
  const sortedCandidates = [...candidates].sort((a, b) => b.price - a.price);

  while (itemCount < maxItems) {
    // Encontrar el mejor candidato que podamos pagar
    const affordable = sortedCandidates.filter(c => (recoveryBudget - currentSpent) >= c.price);
    if (affordable.length === 0) break;

    // Decisión de compra priorizada:
    // 50% de chance de comprar un curativo, 30% cura de estado (si no tiene full_heal), 20% revivir (si es alto nivel)
    const roll = Math.random();
    let selected: PurchaseCandidate | null = null;

    if (roll < POKEBALL_BUDGET_HALF_RATIO) {
      selected = affordable.find(c => c.type === 'heal') || affordable[0] || null;
    } else if (roll < CURE_PURCHASE_ROLL_THRESHOLD) {
      selected = affordable.find(c => c.type === 'cure') || affordable[0] || null;
    } else {
      selected = affordable.find(c => c.type === 'revive') || affordable[0] || null;
    }

    if (selected) {
      inventory[selected.id] = (inventory[selected.id] || 0) + 1;
      currentSpent += selected.price;
      itemCount++;
    } else {
      break;
    }
  }

  // 5. Comprar Pokéballs usando la otra mitad del presupuesto
  let spentPokeball = 0;
  const pbCandidates: { id: string; price: number }[] = [
    { id: 'pokeball', price: ITEM_PRICES.pokeball! }
  ];
  if (maxLevel >= INVENTORY_LEVEL_TIERS.SUPER_TIER) {
    pbCandidates.push({ id: 'greatball', price: ITEM_PRICES.greatball! });
  }
  if (maxLevel >= INVENTORY_LEVEL_TIERS.ULTRA_BALL_TIER) {
    pbCandidates.push({ id: 'ultraball', price: ITEM_PRICES.ultraball! });
  }

  const sortedPBs = pbCandidates.sort((a, b) => b.price - a.price);

  while (true) {
    const affordable = sortedPBs.filter(c => (pokeballBudget - spentPokeball) >= c.price);
    if (affordable.length === 0) break;

    const selected = affordable[0]!;
    inventory[selected.id] = (inventory[selected.id] || 0) + 1;
    spentPokeball += selected.price;
  }

  return { inventory, remainingMoney: budget - currentSpent - spentPokeball };
}


export const NPC_BUDGET_CONFIG = { // no-magic: Explicit mathematical constant or threshold value
  GYM_LEVEL_MULT: 100,
  GYM_BASE_BONUS: 1000,
  SPECIAL_LEVEL_MULT: 60,
  SPECIAL_BASE_BONUS: 500,
  STANDARD_LEVEL_MULT: 25,
  STANDARD_BASE_BONUS: 200,
  LEVEL_CAP_HIGH: 40
} as const;

/**
 * Calcula el presupuesto base de un NPC según su tipo y nivel.
 */
export function calculateNPCBaseBudget(maxLevel: number, isGym: boolean, isSpecial: boolean): number {
  if (isGym) {
    return (maxLevel * NPC_BUDGET_CONFIG.GYM_LEVEL_MULT + NPC_BUDGET_CONFIG.GYM_BASE_BONUS) * 2;
  }
  if (isSpecial) {
    return (maxLevel * NPC_BUDGET_CONFIG.SPECIAL_LEVEL_MULT + NPC_BUDGET_CONFIG.SPECIAL_BASE_BONUS) * 2;
  }
  return (maxLevel * NPC_BUDGET_CONFIG.STANDARD_LEVEL_MULT + NPC_BUDGET_CONFIG.STANDARD_BASE_BONUS) * 2;
}

/**
 * Calcula el presupuesto final aplicando dificultad y factor aleatorio.
 */
export function calculateNPCFinalBudget(baseBudget: number, difficulty: BattleDifficulty, randomFactor: number): number {
  let difficultyMult = 1.0;
  if (difficulty === 'normal') difficultyMult = 1.5;
  if (difficulty === 'hard') difficultyMult = 3.0;
  return Math.floor(baseBudget * difficultyMult * randomFactor);
}

/**
 * Calcula la cantidad máxima de items que un NPC puede comprar.
 */
export function calculateNPCMaxItems(
  maxLevel: number,
  difficulty: BattleDifficulty,
  isGym: boolean,
  isSpecial: boolean
): number {
  if (isGym) {
    return difficulty === 'hard' ? 8 : (difficulty === 'normal' ? 6 : 4);
  }
  if (isSpecial) {
    return 6;
  }
  return maxLevel > NPC_BUDGET_CONFIG.LEVEL_CAP_HIGH ? 4 : 2;
}
