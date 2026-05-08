import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useGameStore } from './game';
import { useAuthStore } from './auth';
import { useUIStore } from './ui';
import { supabase } from '@/logic/supabase';
import { logger } from '@/logic/utils/logger';
import type { GameStore, AuthStore, UIStore } from '@/types/stores';

export const usePassivePvpStore = defineStore('passivePvp', () => {
  const gameStore = useGameStore() as unknown as GameStore;
  const authStore = useAuthStore() as unknown as AuthStore;
  const uiStore = useUIStore() as unknown as UIStore;

  const isPassiveActive = ref(false);
  const lastKnownElo = ref(1000);
  const watcherInterval = ref<ReturnType<typeof setInterval> | null>(null);

  /**
   * Carga el estado inicial del equipo pasivo desde la DB.
   */
  async function loadStatus() {
    if (!authStore.user) return;

    try {
      const { data, error } = await supabase
        .from('passive_teams')
        .select('is_active')
        .eq('user_id', authStore.user.id)
        .maybeSingle() as unknown as { data: { is_active: boolean } | null, error: { message: string } | null };

      if (!error && data) {
        isPassiveActive.value = data.is_active;
      }
    } catch (e) {
      logger.error('PassivePvP', `Error loading status: ${(e as Error).message}`);
    }
  }

  /**
   * Inicia el monitoreo de ELO en segundo plano.
   */
  function startWatcher() {
    if (watcherInterval.value || !authStore.user) return;

    lastKnownElo.value = gameStore.state.eloRating || 1000;

    watcherInterval.value = setInterval(async () => {
      if (!authStore.user || authStore.sessionMode === 'offline') return;

      try {
        interface ProfileStats {
          elo_rating: number;
          pvp_wins: number;
          pvp_losses: number;
          pvp_draws: number;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('elo_rating, pvp_wins, pvp_losses, pvp_draws')
          .eq('id', authStore.user.id)
          .single() as unknown as { data: ProfileStats | null, error: { message: string } | null };

        if (!error && data) {
          const newElo = data.elo_rating || 1000;

          if (newElo !== lastKnownElo.value) {
            const delta = newElo - lastKnownElo.value;
            const won = delta > 0 || (data.pvp_wins || 0) > ((gameStore.state.pvpStats as { wins: number })?.wins || 0);

            // Notificar si no estamos en una batalla activa para evitar distracciones
            if (!(gameStore.state as unknown as { activeBattle: unknown }).activeBattle) {
              uiStore.notify(
                `🛡️ Defensa Pasiva: ${won ? '¡Victoria!' : 'Derrota.'} (${delta > 0 ? '+' : ''}${delta} ELO)`,
                won ? '⚔️' : '💀'
              );
            }

            // Sincronizar stats en gameStore
            gameStore.state.eloRating = newElo;
            gameStore.state.pvpStats = {
              wins: data.pvp_wins || 0,
              losses: data.pvp_losses || 0,
              draws: data.pvp_draws || 0
            };

            lastKnownElo.value = newElo;
            gameStore.save(false); // Guardado silencioso de la metadata
          }
        }
      } catch (e) {
        logger.warn('PassivePvP', `Watcher error: ${(e as Error).message}`);
      }
    }, 30000); // Cada 30 segundos
  }

  function stopWatcher() {
    if (watcherInterval.value) {
      clearInterval(watcherInterval.value);
      watcherInterval.value = null;
    }
  }

  return {
    isPassiveActive,
    loadStatus,
    startWatcher,
    stopWatcher
  };
});
