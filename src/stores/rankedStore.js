import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase } from '@/logic/supabase';

export const RANKED_TIER_ORDER = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante', 'Maestro'];

export const RANKED_REWARD_TIER_MARKS = [
  { name: 'Bronce', elo: 1000, color: '#c8a060' },
  { name: 'Plata', elo: 1200, color: '#9E9E9E' },
  { name: 'Oro', elo: 1600, color: '#FFB800' },
  { name: 'Platino', elo: 2100, color: '#E5C100' },
  { name: 'Diamante', elo: 2700, color: '#89CFF0' },
  { name: 'Maestro', elo: 3400, color: '#FFD700' }
];

export const RANKED_REWARD_MILESTONES = [
  { id: 'bronce_1000', tier: 'Bronce', elo: 1000, rewards: { 'Parche de naturaleza': 1 } },
  { id: 'bronce_1100', tier: 'Bronce', elo: 1100, rewards: { 'Parche de naturaleza': 1 } },
  { id: 'plata_1200', tier: 'Plata', elo: 1200, rewards: { 'Parche de naturaleza': 1, 'Caramelo de vigor': 1 } },
  { id: 'plata_1400', tier: 'Plata', elo: 1400, rewards: { 'Parche de naturaleza': 2 } },
  { id: 'oro_1600', tier: 'Oro', elo: 1600, rewards: { 'Caramelo de vigor': 2 } },
  { id: 'oro_1800', tier: 'Oro', elo: 1800, rewards: { 'Parche de naturaleza': 2, 'Caramelo de vigor': 1 } },
  { id: 'oro_2000', tier: 'Oro', elo: 2000, rewards: { 'Parche de naturaleza': 2 } },
  { id: 'platino_2100', tier: 'Platino', elo: 2100, rewards: { 'Parche de naturaleza': 1, 'Caramelo de vigor': 2 } },
  { id: 'platino_2400', tier: 'Platino', elo: 2400, rewards: { 'Parche de naturaleza': 2, 'Caramelo de vigor': 2 } },
  { id: 'diamante_2700', tier: 'Diamante', elo: 2700, rewards: { 'Píldora de cambio de habilidad': 1, 'Caramelo de vigor': 2 } },
  { id: 'diamante_3000', tier: 'Diamante', elo: 3000, rewards: { 'Parche de naturaleza': 3, 'Caramelo de vigor': 2 } },
  { id: 'diamante_3300', tier: 'Diamante', elo: 3300, rewards: { 'Píldora de cambio de habilidad': 1 } },
  { id: 'maestro_3400', tier: 'Maestro', elo: 3400, rewards: { 'Píldora de cambio de habilidad': 2, 'Parche de naturaleza': 3, 'Caramelo de vigor': 3 } }
];

export const useRankedStore = defineStore('ranked', () => {
  const rules = ref({
    seasonName: 'TEMPORADA ACTUAL',
    seasonStartDate: '',
    seasonEndDate: '',
    maxPokemon: 6,
    levelCap: 100,
    allowedTypes: [],
    bannedPokemonIds: []
  });

  const leaderboard = ref([]);
  const lastSyncAt = ref(0);
  const isLoading = ref(false);
  const error = ref('');

  // Getters
  const currentTier = (elo) => {
    if (elo >= 3400) return { name: 'Maestro',  icon: '👑', color: '#FFD700' };
    if (elo >= 2700) return { name: 'Diamante', icon: '💎', color: '#89CFF0' };
    if (elo >= 2100) return { name: 'Platino',  icon: '🔶', color: '#E5C100' };
    if (elo >= 1600) return { name: 'Oro',      icon: '🥇', color: '#FFB800' };
    if (elo >= 1200) return { name: 'Plata',    icon: '🥈', color: '#9E9E9E' };
    return                  { name: 'Bronce',   icon: '🥉', color: '#c8a060' };
  };

  const getTierIndex = (elo) => {
    const tier = currentTier(elo);
    return RANKED_TIER_ORDER.indexOf(tier.name);
  };

  // Actions
  async function fetchRules() {
    try {
      const { data, error: err } = await supabase
        .from('ranked_rules_config')
        .select('season_name, config')
        .eq('id', 'current')
        .maybeSingle();

      if (err) throw err;
      if (data) {
        rules.value = {
          seasonName: data.season_name,
          ...data.config
        };
      }
    } catch (e) {
      console.error('[RankedStore] Error fetching rules:', e);
    }
  }

  async function fetchLeaderboard(force = false) {
    if (!force && lastSyncAt.value && (Date.now() - lastSyncAt.value < 1800000)) {
      return; // 30 min cache
    }

    isLoading.value = true;
    error.value = '';

    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, username, elo_rating, trainer_level, player_class, nick_style, avatar_style')
        .not('username', 'is', null)
        .order('elo_rating', { ascending: false })
        .limit(100);

      if (err) throw err;
      leaderboard.value = data || [];
      lastSyncAt.value = Date.now();
    } catch (e) {
      error.value = 'No se pudo cargar el ranking global.';
      console.error('[RankedStore] Leaderboard error:', e);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    rules,
    leaderboard,
    lastSyncAt,
    isLoading,
    error,
    currentTier,
    getTierIndex,
    fetchRules,
    fetchLeaderboard
  };
});
