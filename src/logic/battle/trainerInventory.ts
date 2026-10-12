
import { ITEM_PRICES, INVENTORY_LEVEL_TIERS } from '../constants/items.ts';
import type { BattleDifficulty, BattleItemEffectKind } from '@/types/battle/battle';

const POKEBALL_BUDGET_HALF_RATIO = 0.5;
const CURE_PURCHASE_ROLL_THRESHOLD = 0.8;

interface PurchaseCandidate {
  id: string;
  price: number;
  type: BattleItemEffectKind;
}

function getUnlockedCandidates(maxLevel: number): PurchaseCandidate[] {
  const candidates: PurchaseCandidate[] = [
    { id: 'potion', price: ITEM_PRICES.potion!, type: 'heal' },
    { id: 'antidote', price: ITEM_PRICES.antidote!, type: 'cure' },
    { id: 'paralyzeheal', price: ITEM_PRICES.paralyzeheal!, type: 'cure' },
    { id: 'burnheal', price: ITEM_PRICES.burnheal!, type: 'cure' },
    { id: 'awakening', price: ITEM_PRICES.awakening!, type: 'cure' },
    { id: 'iceheal', price: ITEM_PRICES.iceheal!, type: 'cure' }
  ];

  if (maxLevel >= INVENTORY_LEVEL_TIERS.SUPER_TIER) {
    candidates.push(
      { id: 'superpotion', price: ITEM_PRICES.superpotion!, type: 'heal' },
      { id: 'fullheal', price: ITEM_PRICES.fullheal!, type: 'cure' }
    );
  }

  if (maxLevel >= INVENTORY_LEVEL_TIERS.HYPER_TIER) {
    candidates.push(
      { id: 'hyperpotion', price: ITEM_PRICES.hyperpotion!, type: 'heal' },
      { id: 'revive', price: ITEM_PRICES.revive!, type: 'revive' }
    );
  }

  if (maxLevel >= INVENTORY_LEVEL_TIERS.VETERAN_TIER) {
    candidates.push(
      { id: 'maxpotion', price: ITEM_PRICES.maxpotion!, type: 'heal' },
      { id: 'fullrestore', price: ITEM_PRICES.fullrestore!, type: 'heal' },
      { id: 'revivemax', price: ITEM_PRICES.revivemax!, type: 'revive' }
    );
  }

  return candidates;
}

function pickCandidateByRoll(affordable: readonly PurchaseCandidate[]): PurchaseCandidate | null {
  const roll = Math.random();
  if (roll < POKEBALL_BUDGET_HALF_RATIO) {
    return affordable.find(c => c.type === 'heal') || affordable[0] || null;
  }
  if (roll < CURE_PURCHASE_ROLL_THRESHOLD) {
    return affordable.find(c => c.type === 'cure') || affordable[0] || null;
  }
  return affordable.find(c => c.type === 'revive') || affordable[0] || null;
}

function purchaseConsumables(
  recoveryBudget: number,
  maxItems: number,
  candidates: readonly PurchaseCandidate[],
  inventory: Record<string, number>
): number {
  let currentSpent = 0;
  let itemCount = 0;
  const sortedCandidates = candidates.toSorted((a, b) => b.price - a.price);

  while (itemCount < maxItems) {
    const affordable = sortedCandidates.filter(c => (recoveryBudget - currentSpent) >= c.price);
    if (affordable.length === 0) break;

    const selected = pickCandidateByRoll(affordable);
    if (!selected) break;

    inventory[selected.id] = (inventory[selected.id] || 0) + 1;
    currentSpent += selected.price;
    itemCount++;
  }

  return currentSpent;
}

function getPokeballCandidates(maxLevel: number): { id: string; price: number }[] {
  const candidates: { id: string; price: number }[] = [
    { id: 'pokeball', price: ITEM_PRICES.pokeball! }
  ];
  if (maxLevel >= INVENTORY_LEVEL_TIERS.SUPER_TIER) {
    candidates.push({ id: 'greatball', price: ITEM_PRICES.greatball! });
  }
  if (maxLevel >= INVENTORY_LEVEL_TIERS.ULTRA_BALL_TIER) {
    candidates.push({ id: 'ultraball', price: ITEM_PRICES.ultraball! });
  }
  return candidates;
}

function purchasePokeballs(
  maxLevel: number,
  pokeballBudget: number,
  inventory: Record<string, number>
): number {
  let spentPokeball = 0;
  const sortedPBs = getPokeballCandidates(maxLevel).sort((a, b) => b.price - a.price);

  while (true) {
    const affordable = sortedPBs.filter(c => (pokeballBudget - spentPokeball) >= c.price);
    if (affordable.length === 0) break;

    const selected = affordable[0]!;
    inventory[selected.id] = (inventory[selected.id] || 0) + 1;
    spentPokeball += selected.price;
  }

  return spentPokeball;
}

/**
 * Generates consumable inventory for an NPC or Gym Leader based on their level,
 * difficulty, and role.
 */
export function generateNPCInventory(
  maxLevel: number,
  difficulty: BattleDifficulty = 'easy',
  isGym = false,
  isRival = false,
  archetype?: string
): { inventory: Record<string, number>; remainingMoney: number } {
  // 1. Determine money budget
  const isSpecial = isRival || archetype === 'policeman' || archetype === 'rocket';
  const baseBudget = calculateNPCBaseBudget(maxLevel, { isGym, isSpecial });
  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  const budget = calculateNPCFinalBudget(baseBudget, difficulty, randomFactor);

  // 2. Determine maximum item purchase limit
  const maxItems = calculateNPCMaxItems(maxLevel, difficulty, { isGym, isSpecial });

  // 3. Define purchase candidates unlocked by level
  const candidates = getUnlockedCandidates(maxLevel);

  // 4. Perform smart iterative purchases
  const inventory: Record<string, number> = {};
  let pokeballBudget = Math.floor(budget * 0.5);
  if (pokeballBudget < ITEM_PRICES.pokeball! && budget >= ITEM_PRICES.pokeball!) {
    pokeballBudget = ITEM_PRICES.pokeball!;
  }
  const recoveryBudget = budget - pokeballBudget;

  const currentSpent = purchaseConsumables(recoveryBudget, maxItems, candidates, inventory);
  const spentPokeball = purchasePokeballs(maxLevel, pokeballBudget, inventory);

  return { inventory, remainingMoney: budget - currentSpent - spentPokeball };
}


export const NPC_BUDGET_CONFIG = {
  GYM_LEVEL_MULT: 100,
  GYM_BASE_BONUS: 1000,
  SPECIAL_LEVEL_MULT: 60,
  SPECIAL_BASE_BONUS: 500,
  STANDARD_LEVEL_MULT: 25,
  STANDARD_BASE_BONUS: 200,
  LEVEL_CAP_HIGH: 40,
  DIFFICULTY_MULT_NORMAL: 1.5,
  GYM_MAX_ITEMS_HARD: 8,
  GYM_MAX_ITEMS_NORMAL: 6,
  SPECIAL_MAX_ITEMS: 6
} as const;

export interface NPCBudgetOptions {
  isGym?: boolean;
  isSpecial?: boolean;
}

/**
 * Calculates base budget for an NPC based on their type and level.
 */
export function calculateNPCBaseBudget(maxLevel: number, options: NPCBudgetOptions = {}): number {
  const { isGym = false, isSpecial = false } = options;
  if (isGym) {
    return (maxLevel * NPC_BUDGET_CONFIG.GYM_LEVEL_MULT + NPC_BUDGET_CONFIG.GYM_BASE_BONUS) * 2;
  }
  if (isSpecial) {
    return (maxLevel * NPC_BUDGET_CONFIG.SPECIAL_LEVEL_MULT + NPC_BUDGET_CONFIG.SPECIAL_BASE_BONUS) * 2;
  }
  return (maxLevel * NPC_BUDGET_CONFIG.STANDARD_LEVEL_MULT + NPC_BUDGET_CONFIG.STANDARD_BASE_BONUS) * 2;
}

/**
 * Calculates final budget applying difficulty and random factor.
 */
export function calculateNPCFinalBudget(baseBudget: number, difficulty: BattleDifficulty, randomFactor: number): number {
  let difficultyMult = 1.0;
  if (difficulty === 'normal') difficultyMult = NPC_BUDGET_CONFIG.DIFFICULTY_MULT_NORMAL;
  if (difficulty === 'hard') difficultyMult = 3.0;
  return Math.floor(baseBudget * difficultyMult * randomFactor);
}

/**
 * Calculates maximum item quantity an NPC can purchase.
 */
export function calculateNPCMaxItems(
  maxLevel: number,
  difficulty: BattleDifficulty,
  options: NPCBudgetOptions = {}
): number {
  const { isGym = false, isSpecial = false } = options;
  if (isGym) {
    return difficulty === 'hard' ? NPC_BUDGET_CONFIG.GYM_MAX_ITEMS_HARD : (difficulty === 'normal' ? NPC_BUDGET_CONFIG.GYM_MAX_ITEMS_NORMAL : 4);
  }
  if (isSpecial) {
    return NPC_BUDGET_CONFIG.SPECIAL_MAX_ITEMS;
  }
  return maxLevel > NPC_BUDGET_CONFIG.LEVEL_CAP_HIGH ? 4 : 2;
}
