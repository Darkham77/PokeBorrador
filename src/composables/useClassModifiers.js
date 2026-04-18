import { computed } from 'vue';
import { useGameStore } from '@/stores/game';
import { useBattleStore } from '@/stores/battle';

/**
 * Composable to access class-based multipliers and bonuses.
 */
export function useClassModifiers() {
  const gameStore = useGameStore();
  const battleStore = useBattleStore();

  const isPvP = computed(() => battleStore.isBattleActive && battleStore.isPvP);
  const playerClass = computed(() => gameStore.state.playerClass);

  /**
   * Generic function to get a modifier.
   * Returns 1.0 (no change) if not applicable or in PvP.
   */
  const getModifier = (type, context = {}) => {
    // PvP Balance: No class advantages allowed in competitive matches
    if (isPvP.value) {
      if (type === 'shopDiscount') return 0;
      return 1.0;
    }

    if (!playerClass.value) return 1.0;

    // We can't easily import the PLAYER_CLASSES object here to avoid circular dependencies
    // if the logic file imports the store. We'll use the reactive state directly or
    // raw values for critical performance.
    
    switch (playerClass.value) {
      case 'rocket':
        if (type === 'expMult') return 1.0;
        if (type === 'bcMult') return 0.90;
        if (type === 'healCostMult') return 2.0;
        if (type === 'shopDiscount') return 0.20; // Private Black Market discount
        break;

      case 'cazabichos':
        if (type === 'expMult') {
          return context.isTrainer ? 0.80 : 1.0;
        }
        if (type === 'bcMult') return 0.85;
        if (type === 'daycareCostMult') return 1.5;
        break;

      case 'entrenador':
        if (type === 'expMult') return 1.10;
        if (type === 'bcMult') return context.isGym ? 1.30 : 1.0;
        if (type === 'daycareCostMult') return 1.5;
        break;

      case 'criador':
        if (type === 'expMult') return 0.90;
        if (type === 'hatchStepsMult') return 0.75;
        break;
    }

    return 1.0;
  };

  const expMultiplier = computed(() => (context = {}) => getModifier('expMult', context));
  const moneyMultiplier = computed(() => (context = {}) => getModifier('bcMult', context));
  const shopDiscount = computed(() => getModifier('shopDiscount'));
  
  return {
    getModifier,
    expMultiplier,
    moneyMultiplier,
    shopDiscount
  };
}
