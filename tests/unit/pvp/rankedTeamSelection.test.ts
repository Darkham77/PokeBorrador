// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HomeRankedWidget from '@/components/home/HomeRankedWidget.vue';
import { usePvPStore } from '@/stores/pvp';
import { useLivePvPStore } from '@/stores/livePvP';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex';

describe('Ranked Format and Team Selection Protocol', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  const createPoke = (species: string, uid: string): Pokemon => {
    const p = makePokemon(requirePokemonSpeciesId(species), 50, { bypassWhitelist: true })!;
    p.uid = uid;
    return p;
  };

  it('selects 3v3 team when season rules specify maxPokemon <= 3', async () => {
    const pvpStore = usePvPStore();
    const livePvPStore = useLivePvPStore();
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    pvpStore.currentSeasonRules = {
      name: 'Torneo 3v3',
      levelCap: 50,
      maxPokemon: 3,
      seasonStartDate: '2026-01-01T00:00:00',
      seasonEndDate: '2026-12-31T23:59:59'
    };

    const team3 = [createPoke('gengar', 'u-1'), createPoke('dragonite', 'u-2'), createPoke('nidorino', 'u-3')];
    gameStore.state.team = team3;
    gameStore.state.pvpTeam = ['u-1', 'u-2', 'u-3'];
    gameStore.state.starterChosen = true;

    const startSearchSpy = vi.fn();
    livePvPStore.startSearch = startSearchSpy;

    const wrapper = mount(HomeRankedWidget, {
      global: {
        plugins: [pinia],
        directives: { 'gsap-hover': {} },
        stubs: { PokemonTypeTag: true }
      }
    });

    const searchBtn = wrapper.find('.search-btn');
    await searchBtn.trigger('click');

    expect(notifySpy).not.toHaveBeenCalledWith('Máximo 3 Pokémon permitidos.', '⚠️');
    expect(startSearchSpy).toHaveBeenCalled();
  });

  it('selects 6v6 team when season rules specify maxPokemon: 6 (canonical)', async () => {
    const pvpStore = usePvPStore();
    const livePvPStore = useLivePvPStore();
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    const notifySpy = vi.spyOn(uiStore, 'notify');

    pvpStore.currentSeasonRules = {
      name: 'Frontera Kanto & Johto',
      levelCap: 50,
      maxPokemon: 6,
      seasonStartDate: '2026-01-01T00:00:00',
      seasonEndDate: '2026-12-31T23:59:59'
    };

    const team6 = [
      createPoke('snorlax', 'u-1'),
      createPoke('lapras', 'u-2'),
      createPoke('charizard', 'u-3'),
      createPoke('blastoise', 'u-4'),
      createPoke('venusaur', 'u-5'),
      createPoke('pikachu', 'u-6')
    ];
    gameStore.state.team = team6;
    gameStore.state.pvpTeam6 = ['u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6'];
    gameStore.state.starterChosen = true;

    const startSearchSpy = vi.fn();
    livePvPStore.startSearch = startSearchSpy;

    const wrapper = mount(HomeRankedWidget, {
      global: {
        plugins: [pinia],
        directives: { 'gsap-hover': {} },
        stubs: { PokemonTypeTag: true }
      }
    });

    const searchBtn = wrapper.find('.search-btn');
    await searchBtn.trigger('click');

    expect(notifySpy).not.toHaveBeenCalledWith(expect.stringContaining('Máximo'), '⚠️');
    expect(startSearchSpy).toHaveBeenCalled();
  });

  it('ignores expired database rules from a past season and falls back to canonical 6v6 month theme', async () => {
    const pvpStore = usePvPStore();
    const gameStore = useGameStore();
    const authStore = useAuthStore();
    authStore.user = { id: 'test-user', email: 'test@example.com' } as any;

    gameStore.db = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { elo_rating: 1200, pvp_wins: 5, pvp_losses: 2, pvp_draws: 0 }
                })
              }))
            }))
          };
        }
        if (table === 'ranked_rules_config') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'current',
                    season_name: 'TEMPORADA 1',
                    config: {
                      levelCap: 50,
                      maxPokemon: 3,
                      seasonStartDate: '2026-04-10',
                      seasonEndDate: '2026-05-10',
                      bannedPokemonIds: ['articuno', 'zapdos']
                    }
                  }
                })
              }))
            }))
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [] })
              }))
            }))
          }))
        };
      })
    } as any;

    await pvpStore.loadPvPData();

    // The expired 3v3 rules from May 2026 MUST NOT be applied to current season in September 2026
    expect(pvpStore.currentSeasonRules?.maxPokemon).toBe(6);
    expect(pvpStore.currentSeasonRules?.name).toBe('Frontera Kanto & Johto');
  });
});
