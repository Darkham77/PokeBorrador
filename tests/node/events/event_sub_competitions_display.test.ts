import { describe, it, expect } from 'vitest';
import {
  resolveSubCompetitionDirection,
  getSubCompTitle,
  getSubCompIcon,
  resolveAwardCategory,
  type SubCompetitionConfig
} from '@/logic/events/eventCompetitions';
import type { PendingAward } from '@/types/system/stores';
import type { Event, EventConfig } from '@/logic/events/eventEngine';

describe('Event Sub-Competitions Display & Resolution Parity', () => {
  const mockConfig: EventConfig = {
    subCompetitions: [
      {
        id: 'ivs',
        name: 'Genética Suprema (IVs Totales)',
        metric: 'total_ivs',
        order: 'max',
        prizes: {
          first: {
            type: 'mixed',
            money: 50000,
            battleCoins: 300,
            items: { goldbottlecap: 1, rarecandy: 10 }
          }
        }
      },
      {
        id: 'weight',
        name: 'Titanes y Miniaturas (Masa y Peso)',
        metric: 'weight',
        order: 'auto',
        prizes: {
          first: {
            type: 'mixed',
            money: 50000,
            battleCoins: 300,
            items: { nugget: 5, naturepatch: 1 }
          }
        }
      },
      {
        id: 'height',
        name: 'Envergadura y Altura',
        metric: 'height',
        order: 'auto',
        prizes: {
          first: {
            type: 'mixed',
            money: 50000,
            battleCoins: 300,
            items: { masterball: 1, elixirmax: 5 }
          }
        }
      }
    ]
  };

  const mockSaturdayEvent: Event = {
    id: 'gran_concurso_sabado',
    name: 'Gran Concurso Abierto del Sábado',
    description: '¡El gran campeonato de los sábados!',
    active: true,
    config: mockConfig
  };

  describe('getSubCompIcon', () => {
    it('returns the correct emoji for each metric without defaulting everything to DNA/IVs', () => {
      expect(getSubCompIcon('weight')).toBe('⚖️');
      expect(getSubCompIcon('height')).toBe('📏');
      expect(getSubCompIcon('total_ivs')).toBe('🧬');
      expect(getSubCompIcon('stat_iv')).toBe('🧬');
      expect(getSubCompIcon('level')).toBe('⭐');
      expect(getSubCompIcon('friendship')).toBe('💖');
    });
  });

  describe('resolveSubCompetitionDirection & getSubCompTitle', () => {
    it('resolves weight direction to min and produces "Menor Peso" without generic slashes', () => {
      const weightSub = (mockConfig.subCompetitions as SubCompetitionConfig[])[1]!;
      const dir = resolveSubCompetitionDirection('gran_concurso_sabado', 'weight', 'auto');
      expect(dir).toBe('min');

      const title = getSubCompTitle('gran_concurso_sabado', weightSub);
      expect(title).toBe('Menor Peso');
      expect(title).not.toContain('Mayor/Menor');
    });

    it('resolves height direction without generic slashes', () => {
      const heightSub = (mockConfig.subCompetitions as SubCompetitionConfig[])[2]!;
      const dir = resolveSubCompetitionDirection('gran_concurso_sabado', 'height', 'auto');
      const title = getSubCompTitle('gran_concurso_sabado', heightSub);

      if (dir === 'max') {
        expect(title).toBe('Mayor Altura');
      } else {
        expect(title).toBe('Menor Altura');
      }
      expect(title).not.toContain('Mayor/Menor');
    });

    it('resolves IVs direction to max and produces "Mayor IVs"', () => {
      const ivsSub = (mockConfig.subCompetitions as SubCompetitionConfig[])[0]!;
      const title = getSubCompTitle('gran_concurso_sabado', ivsSub);
      expect(title).toBe('Mayor IVs');
    });
  });

  describe('resolveAwardCategory', () => {
    it('infers weight category from award prize items (nugget + naturepatch)', () => {
      const weightAward: PendingAward = {
        id: 'award-weight-1',
        winner_id: 'user-1',
        event_id: 'gran_concurso_sabado',
        prize: JSON.stringify({
          type: 'mixed',
          money: 50000,
          battleCoins: 300,
          items: { nugget: 5, naturepatch: 1 }
        }),
        received_at: null
      };

      const resolved = resolveAwardCategory(weightAward, mockSaturdayEvent);
      expect(resolved).not.toBeNull();
      expect(resolved?.categoryId).toBe('weight');
      expect(resolved?.categoryTitle).toBe('Menor Peso');
      expect(resolved?.icon).toBe('⚖️');
    });

    it('infers IVs category from award prize items (goldbottlecap + rarecandy)', () => {
      const ivsAward: PendingAward = {
        id: 'award-ivs-1',
        winner_id: 'user-1',
        event_id: 'gran_concurso_sabado',
        prize: JSON.stringify({
          type: 'mixed',
          money: 50000,
          battleCoins: 300,
          items: { goldbottlecap: 1, rarecandy: 10 }
        }),
        received_at: null
      };

      const resolved = resolveAwardCategory(ivsAward, mockSaturdayEvent);
      expect(resolved).not.toBeNull();
      expect(resolved?.categoryId).toBe('ivs');
      expect(resolved?.categoryTitle).toBe('Mayor IVs');
      expect(resolved?.icon).toBe('🧬');
    });

    it('infers height category from award prize items (masterball + elixirmax)', () => {
      const heightAward: PendingAward = {
        id: 'award-height-1',
        winner_id: 'user-1',
        event_id: 'gran_concurso_sabado',
        prize: JSON.stringify({
          type: 'mixed',
          money: 50000,
          battleCoins: 300,
          items: { masterball: 1, elixirmax: 5 }
        }),
        received_at: null
      };

      const resolved = resolveAwardCategory(heightAward, mockSaturdayEvent);
      expect(resolved).not.toBeNull();
      expect(resolved?.categoryId).toBe('height');
      expect(resolved?.icon).toBe('📏');
      expect(resolved?.categoryTitle).not.toContain('Mayor/Menor');
    });

    it('prioritizes explicit category_id when already present on the award or prize', () => {
      const explicitAward: PendingAward = {
        id: 'award-explicit-1',
        winner_id: 'user-1',
        event_id: 'gran_concurso_sabado',
        category_id: 'weight',
        prize: JSON.stringify({
          type: 'mixed',
          money: 50000,
          battleCoins: 300,
          category_id: 'weight',
          category_name: 'Menor Peso'
        }),
        received_at: null
      };

      const resolved = resolveAwardCategory(explicitAward, mockSaturdayEvent);
      expect(resolved?.categoryId).toBe('weight');
      expect(resolved?.categoryTitle).toBe('Menor Peso');
      expect(resolved?.icon).toBe('⚖️');
    });
  });
});
