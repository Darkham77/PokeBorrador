// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HomePassiveDefenseWidget from '@/components/home/HomePassiveDefenseWidget.vue';
import HomeRankedWidget from '@/components/home/HomeRankedWidget.vue';
import ArenaPassivePanel from '@/components/modals/ArenaPassivePanel.vue';
import { usePvPStore } from '@/stores/pvp';
import { useLivePvPStore } from '@/stores/livePvP';
import { useGameStore } from '@/stores/game';
import { useUIStore } from '@/stores/ui';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Home PvP Widgets Suite', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  describe('HomePassiveDefenseWidget.vue', () => {
    it('renders passive defense header, toggle button, and status', () => {
      const pvpStore = usePvPStore();
      pvpStore.passiveTeamActive = true;

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      });

      expect(wrapper.text()).toContain('DEFENSA PASIVA');
      expect(wrapper.text()).toContain('Tu equipo actual defenderá tu posición');
      expect(wrapper.text()).toContain('ACTIVADO');
      expect(wrapper.text()).toContain('¡Tu equipo de defensa está protegiendo tu ELO en la Arena!');
    });

    it('toggles passive defense status on button click', async () => {
      const pvpStore = usePvPStore();
      pvpStore.passiveTeamActive = false;
      const toggleSpy = vi.fn(() => {
        pvpStore.passiveTeamActive = !pvpStore.passiveTeamActive;
        return Promise.resolve();
      });
      pvpStore.togglePassiveTeam = toggleSpy;

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      });

      expect(wrapper.text()).toContain('DESACTIVADO');
      const toggleBtn = wrapper.find('.toggle-btn');
      expect(toggleBtn.exists()).toBe(true);

      await toggleBtn.trigger('click');
      expect(toggleSpy).toHaveBeenCalled();
    });

    it('renders defending pokemon team and recent defense reports', () => {
      const gameStore = useGameStore();
      const pvpStore = usePvPStore();

      const mockPokemon: Partial<Pokemon> = {
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100
      };
      gameStore.state.team = [mockPokemon as Pokemon];

      pvpStore.defenseReports = [
        {
          id: 'rep-1',
          user_id: 'user-1',
          opponent_id: 'rival-1',
          result: 'victory',
          created_at: '2026-04-13T20:01:00Z',
          report_data: {
            opponent: 'Rival Franco',
            playerClass: 'Entrenador',
            turns: 5,
            deltaElo: 15
          }
        }
      ];

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      });

      expect(wrapper.text()).toContain('EQUIPO DEFENSOR ACTUAL');
      expect(wrapper.text()).toContain('HISTORIAL DE DEFENSAS RECIENTES');
      expect(wrapper.text()).toContain('Rival Franco');
      expect(wrapper.text()).toContain('VICTORIA');
      expect(wrapper.text()).toContain('+15 ELO');
    });

    it('does not render redundant COLISEO button in header', () => {
      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      });

      expect(wrapper.find('.card-header-bar').text()).not.toContain('COLISEO');
      expect(wrapper.find('.toggle-btn').exists()).toBe(true);
    });

    it('opens TeamManagement modal when clicking CAMBIAR EQUIPO button', async () => {
      const uiStore = useUIStore();
      const toggleTeamSpy = vi.fn();
      uiStore.toggleTeamManagement = toggleTeamSpy;

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      });

      const buttons = wrapper.findAll('.card-action-btn');
      const changeTeamBtn = buttons.find(b => b.text().includes('CAMBIAR EQUIPO'));
      expect(changeTeamBtn?.exists()).toBe(true);
      await changeTeamBtn!.trigger('click');

      expect(toggleTeamSpy).toHaveBeenCalledWith('pvp6');
    });

    it('opens Pokemon detail when clicking a defending pokemon card', async () => {
      const gameStore = useGameStore();
      const uiStore = useUIStore();
      const openDetailSpy = vi.fn();
      uiStore.openPokemonDetail = openDetailSpy;

      const mockPokemon: Partial<Pokemon> = {
        id: 'pikachu',
        uid: 'pika-1',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100
      };
      gameStore.state.team = [mockPokemon as Pokemon];

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: {
              props: ['pokemon', 'index'],
              template: '<div class="stub-box-card" @click="$emit(\'click\')">{{ pokemon.name }}</div>'
            },
            TrainerAvatar: true
          }
        }
      });

      const card = wrapper.find('.stub-box-card');
      expect(card.exists()).toBe(true);
      await card.trigger('click');
      expect(openDetailSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Pikachu' }), 0, 'defense');
    });

    it('renders opponent profile name and opens TrainerProfile modal on click', async () => {
      const pvpStore = usePvPStore();
      const uiStore = useUIStore();
      const openSpy = vi.fn();
      uiStore.open = openSpy;

      pvpStore.defenseReports = [
        {
          id: 'rep-2',
          user_id: 'user-1',
          opponent_id: 'rival-uuid-123',
          opponent_profile: {
            id: 'rival-uuid-123',
            username: 'RedChampion',
            playerClass: 'Líder de Gimnasio',
            avatar: 'red'
          },
          result: 'defeat',
          created_at: '2026-04-13T20:01:00Z',
          report_data: {
            opponent: 'Rival',
            playerClass: 'Entrenador',
            turns: 3,
            deltaElo: -12
          }
        }
      ];

      const wrapper = mount(HomePassiveDefenseWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: {
              props: ['profile', 'playerClass', 'size'],
              template: '<div class="stub-avatar" :data-username="profile?.username" :data-class="playerClass"></div>'
            }
          }
        }
      });

      expect(wrapper.text()).toContain('RedChampion');
      expect(wrapper.text()).toContain('SIN BANDO');
      expect(wrapper.text()).toContain('DERROTA');

      const avatarStub = wrapper.find('.stub-avatar');
      expect(avatarStub.attributes('data-username')).toBe('RedChampion');
      expect(avatarStub.attributes('data-class')).toBe('Líder de Gimnasio');

      const historyRow = wrapper.find('.history-row');
      await historyRow.trigger('click');
      expect(openSpy).toHaveBeenCalledWith('TrainerProfile', { userId: 'rival-uuid-123' });
    });

    it('hides COLISEO button and applies in-modal class when inModal is true', () => {
      const wrapper = mount(HomePassiveDefenseWidget, {
        props: {
          inModal: true
        },
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      });

      expect(wrapper.classes()).toContain('in-modal');
      expect(wrapper.classes()).not.toContain('home-section-card');
      expect(wrapper.text()).not.toContain('COLISEO');
    });

    it('renders ArenaPassivePanel as a modular wrapper of HomePassiveDefenseWidget', () => {
      const wrapper = mount(ArenaPassivePanel, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            BoxPokemonCard: true,
            TrainerAvatar: true
          }
        }
      });

      expect(wrapper.findComponent(HomePassiveDefenseWidget).exists()).toBe(true);
      expect(wrapper.find('.home-passive-defense-widget').classes()).toContain('in-modal');
      expect(wrapper.text()).toContain('DEFENSA PASIVA');
    });
  });

  describe('HomeRankedWidget.vue', () => {
    it('renders active tournament summary, rank medal, and stats side-by-side', () => {
      const pvpStore = usePvPStore();
      pvpStore.elo = 1250;
      pvpStore.stats = { wins: 15, losses: 10, draws: 0 };

      const wrapper = mount(HomeRankedWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            PokemonTypeTag: true
          }
        }
      });

      expect(wrapper.text()).toContain('ARENA CLASIFICATORIA');
      expect(wrapper.text()).toContain('TORNEO DE TEMPORADA');
      expect(wrapper.text()).toContain('RANGO ACTUAL');
      expect(wrapper.text()).toContain('1250 ELO');
      expect(wrapper.text()).toContain('VICTORIAS');
      expect(wrapper.text()).toContain('15');
      expect(wrapper.text()).toContain('DERROTAS');
      expect(wrapper.text()).toContain('10');
      expect(wrapper.text()).toContain('WIN RATE');
      expect(wrapper.text()).toContain('60.0%');
    });

    it('does NOT contain redundant "Salón de la Fama" button', () => {
      const wrapper = mount(HomeRankedWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            PokemonTypeTag: true
          }
        }
      });

      expect(wrapper.text()).not.toContain('VER SALÓN DE LA FAMA');
      expect(wrapper.text()).not.toContain('SALÓN DE LA FAMA');
    });

    it('renders single primary search button and toggles searching state', async () => {
      const livePvPStore = useLivePvPStore();
      const pvpStore = usePvPStore();
      const gameStore = useGameStore();

      const mockPokemon: Partial<Pokemon> = {
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100,
        type: 'electric'
      };
      gameStore.state.team = [mockPokemon as Pokemon];
      gameStore.state.starterChosen = true;
      livePvPStore.resolvePvpTeam = vi.fn(() => [mockPokemon as Pokemon]);

      pvpStore.currentSeasonRules = {
        name: 'Test Season',
        levelCap: 50,
        maxPokemon: 6,
        startDate: '2026-01-01T00:00:00',
        endDate: '2026-12-31T23:59:59'
      };

      const startSpy = vi.fn();
      livePvPStore.startSearch = startSpy;

      const wrapper = mount(HomeRankedWidget, {
        global: {
          plugins: [pinia],
          directives: {
            'gsap-hover': {}
          },
          stubs: {
            PokemonTypeTag: true
          }
        }
      });

      const searchBtn = wrapper.find('.search-btn');
      expect(searchBtn.exists()).toBe(true);
      expect(searchBtn.text()).toContain('BUSCAR PARTIDA RANKED');

      await searchBtn.trigger('click');
      expect(startSpy).toHaveBeenCalled();
    });
  });
});
