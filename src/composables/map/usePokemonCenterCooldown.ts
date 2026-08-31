/**
 * src/composables/map/usePokemonCenterCooldown.ts
 *
 * Composable to manage Pokemon Center cooldown timers and state.
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';
import { gsap } from 'gsap';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { calculatePokemonCenterRemainingSeconds } from '@/logic/economy/economyFormulas';

export function usePokemonCenterCooldown() {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  const cooldownSecondsLeft = ref(0);
  let cooldownTween: gsap.core.Tween | null = null;

  const updateCooldown = () => {
    cooldownSecondsLeft.value = calculatePokemonCenterRemainingSeconds(
      gameStore.state.lastPokemonCenterHeal || 0,
      gameStore.state.trainerLevel || 1
    );
  };

  const tickCooldown = () => {
    updateCooldown();
    cooldownTween = gsap.delayedCall(1, tickCooldown);
  };

  const handleCooldownClick = () => {
    uiStore.notify(`El Centro Pokémon está cerrado por mantenimiento. Reabre en ${cooldownFormatted.value}.`, '🏥');
  };

  const cooldownFormatted = computed(() => {
    const totalSecs = cooldownSecondsLeft.value;
    if (totalSecs <= 0) return '';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  });

  onMounted(() => {
    updateCooldown();
    if (cooldownSecondsLeft.value > 0) {
      tickCooldown();
    }
  });

  onUnmounted(() => {
    if (cooldownTween) {
      cooldownTween.kill();
      cooldownTween = null;
    }
  });

  return {
    cooldownSecondsLeft,
    cooldownFormatted,
    updateCooldown,
    handleCooldownClick
  };
}
