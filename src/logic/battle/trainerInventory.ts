
interface PurchaseCandidate {
  id: string;
  price: number;
  type: 'heal' | 'cure' | 'revive';
}

/**
 * Genera un inventario de consumibles para un NPC o Líder de Gimnasio basado en su nivel,
 * dificultad y rol.
 */
export function generateNPCInventory(
  maxLevel: number,
  difficulty: 'easy' | 'normal' | 'hard' = 'easy',
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
  candidates.push({ id: 'potion', price: 200, type: 'heal' });
  candidates.push({ id: 'antidote', price: 100, type: 'cure' });
  candidates.push({ id: 'paralyzeheal', price: 200, type: 'cure' });
  candidates.push({ id: 'burnheal', price: 250, type: 'cure' });
  candidates.push({ id: 'awakening', price: 250, type: 'cure' });
  candidates.push({ id: 'iceheal', price: 250, type: 'cure' });

  // Nivel 15+: Súper Poción y Cura Total
  if (maxLevel >= 15) {
    candidates.push({ id: 'superpotion', price: 600, type: 'heal' });
    candidates.push({ id: 'fullheal', price: 600, type: 'cure' });
  }

  // Nivel 30+: Hiper Poción y Revivir
  if (maxLevel >= 30) {
    candidates.push({ id: 'hyperpotion', price: 1500, type: 'heal' });
    candidates.push({ id: 'revive', price: 2000, type: 'revive' });
  }

  // Nivel 50+: Poción Máxima, Restaurar Todo y Revivir Máximo
  if (maxLevel >= 50) {
    candidates.push({ id: 'maxpotion', price: 2500, type: 'heal' });
    candidates.push({ id: 'fullrestore', price: 5000, type: 'heal' }); // actúa como heal/cure híbrido
    candidates.push({ id: 'revivemax', price: 3000, type: 'revive' });
  }

  // 4. Realizar compras inteligentes iterativamente hasta agotar el presupuesto o alcanzar el límite de objetos
  const inventory: Record<string, number> = {};
  let currentSpent = 0;
  let itemCount = 0;

  let pokeballBudget = Math.floor(budget * 0.5);
  // Priorizar pokebolas si no alcanza para el mínimo (200)
  if (pokeballBudget < 200 && budget >= 200) {
    pokeballBudget = 200;
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

    if (roll < 0.5) {
      selected = affordable.find(c => c.type === 'heal') || affordable[0] || null;
    } else if (roll < 0.8) {
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
    { id: 'pokeball', price: 200 }
  ];
  if (maxLevel >= 15) {
    pbCandidates.push({ id: 'greatball', price: 500 });
  }
  if (maxLevel >= 35) {
    pbCandidates.push({ id: 'ultraball', price: 1000 });
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


/**
 * Calcula el presupuesto base de un NPC según su tipo y nivel.
 */
export function calculateNPCBaseBudget(maxLevel: number, isGym: boolean, isSpecial: boolean): number {
  if (isGym) {
    return (maxLevel * 100 + 1000) * 2;
  }
  if (isSpecial) {
    return (maxLevel * 60 + 500) * 2;
  }
  return (maxLevel * 25 + 200) * 2;
}

/**
 * Calcula el presupuesto final aplicando dificultad y factor aleatorio.
 */
export function calculateNPCFinalBudget(baseBudget: number, difficulty: 'easy' | 'normal' | 'hard', randomFactor: number): number {
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
  difficulty: 'easy' | 'normal' | 'hard',
  isGym: boolean,
  isSpecial: boolean
): number {
  if (isGym) {
    return difficulty === 'hard' ? 8 : (difficulty === 'normal' ? 6 : 4);
  }
  if (isSpecial) {
    return 6;
  }
  return maxLevel > 40 ? 4 : 2;
}
