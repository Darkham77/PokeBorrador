import { describe, it, expect } from 'vitest';
import {
  evaluateCapturedPokemonForEvents,
  computeOptimalAutoFillAssignments
} from '@/logic/events/eventAutoEnrollHelper';
import type { Event } from '@/logic/events/eventEngine';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { CompetitionEntry } from '@/types/system/stores';
import { makePokemon } from '@/logic/pokemon/pokemonFactory';

describe('Event Auto-Enrollment & Greedy Auto-Fill Engine', () => {
  const mockSubCompetitions = [
    {
      id: 'ivs',
      name: 'Genética Suprema',
      metric: 'total_ivs' as const,
      order: 'max' as const
    },
    {
      id: 'weight',
      name: 'Peso Máximo',
      metric: 'weight' as const,
      order: 'max' as const
    },
    {
      id: 'height',
      name: 'Altura Máxima',
      metric: 'height' as const,
      order: 'max' as const
    }
  ];

  const mockCompetitionEvent: Event = {
    id: 'saturday_open_comp',
    name: 'Gran Torneo Abierto',
    type: 'competition',
    icon: '🏆',
    description: 'Competición de IVs, peso y altura',
    manual: false,
    active: true,
    config: {
      subCompetitions: mockSubCompetitions
    }
  };

  const createTestPokemon = (id: string, ivTotal: number, weight = 10, height = 1, uid = `uid-${id}`): Pokemon => {
    const poke = makePokemon(id as never, 50);
    if (!poke) throw new Error(`Failed to create test pokemon: ${id}`);
    poke.uid = uid;
    poke.ivs = {
      hp: Math.min(31, Math.floor(ivTotal / 6)),
      atk: Math.min(31, Math.floor(ivTotal / 6)),
      def: Math.min(31, Math.floor(ivTotal / 6)),
      spa: Math.min(31, Math.floor(ivTotal / 6)),
      spd: Math.min(31, Math.floor(ivTotal / 6)),
      spe: ivTotal - (Math.min(31, Math.floor(ivTotal / 6)) * 5)
    };
    poke.weight = weight;
    poke.height = height;
    poke.obtainedAt = 1700000000000;
    return poke;
  };

  describe('evaluateCapturedPokemonForEvents', () => {
    it('returns empty array when there are no active competition events', () => {
      const poke = createTestPokemon('pikachu', 150);
      const candidates = evaluateCapturedPokemonForEvents(poke, [], {});
      expect(candidates).toEqual([]);
    });

    it('returns first-entry candidates for all categories when user has no entries', () => {
      const poke = createTestPokemon('snorlax', 160, 460, 2.1);
      const candidates = evaluateCapturedPokemonForEvents(
        poke,
        [mockCompetitionEvent],
        {}
      );

      expect(candidates.length).toBe(3);
      expect(candidates.map(c => c.categoryId)).toEqual(['ivs', 'weight', 'height']);
      expect(candidates.every(c => c.isFirstEntry)).toBe(true);
    });

    it('identifies improvement when captured pokemon has higher IVs than existing record', () => {
      const existingEntries: Record<string, CompetitionEntry> = {
        'saturday_open_comp:ivs': {
          id: 'entry-1',
          event_id: 'saturday_open_comp',
          category_id: 'ivs',
          player_id: 'player-1',
          player_name: 'Trainer',
          pokemon_uid: 'old-poke-uid',
          data: {
            score: 120,
            total_ivs: 120
          },
          submitted_at: '2026-09-01T00:00:00Z'
        },
        'saturday_open_comp:weight': {
          id: 'entry-2',
          event_id: 'saturday_open_comp',
          category_id: 'weight',
          player_id: 'player-1',
          player_name: 'Trainer',
          pokemon_uid: 'heavy-mon-uid',
          data: {
            score: 500
          },
          submitted_at: '2026-09-01T00:00:00Z'
        }
      };

      const highIvPoke = createTestPokemon('alakazam', 170, 48, 1.5);
      const candidates = evaluateCapturedPokemonForEvents(
        highIvPoke,
        [mockCompetitionEvent],
        existingEntries
      );

      // Beats IVs (170 > 120) and height (first entry in height), but does NOT beat weight (48 < 500)
      const ivCandidate = candidates.find(c => c.categoryId === 'ivs');
      expect(ivCandidate).toBeDefined();
      expect(ivCandidate?.newScore).toBe(170);
      expect(ivCandidate?.previousScore).toBe(120);
      expect(ivCandidate?.isFirstEntry).toBe(false);

      const weightCandidate = candidates.find(c => c.categoryId === 'weight');
      expect(weightCandidate).toBeUndefined();

      const heightCandidate = candidates.find(c => c.categoryId === 'height');
      expect(heightCandidate).toBeDefined();
      expect(heightCandidate?.isFirstEntry).toBe(true);
    });

    it('returns empty array when captured pokemon is strictly worse than existing records', () => {
      const existingEntries: Record<string, CompetitionEntry> = {
        'saturday_open_comp:ivs': {
          id: 'entry-1',
          event_id: 'saturday_open_comp',
          category_id: 'ivs',
          player_id: 'player-1',
          player_name: 'Trainer',
          pokemon_uid: 'perfect-poke',
          data: { score: 186 },
          submitted_at: '2026-09-01T00:00:00Z'
        },
        'saturday_open_comp:weight': {
          id: 'entry-2',
          event_id: 'saturday_open_comp',
          category_id: 'weight',
          player_id: 'player-1',
          player_name: 'Trainer',
          pokemon_uid: 'heavy-mon',
          data: { score: 500 },
          submitted_at: '2026-09-01T00:00:00Z'
        },
        'saturday_open_comp:height': {
          id: 'entry-3',
          event_id: 'saturday_open_comp',
          category_id: 'height',
          player_id: 'player-1',
          player_name: 'Trainer',
          pokemon_uid: 'tall-mon',
          data: { score: 10 },
          submitted_at: '2026-09-01T00:00:00Z'
        }
      };

      const mediocrePoke = createTestPokemon('rattata', 80, 3.5, 0.3);
      const candidates = evaluateCapturedPokemonForEvents(
        mediocrePoke,
        [mockCompetitionEvent],
        existingEntries
      );

      expect(candidates).toEqual([]);
    });
  });

  describe('computeOptimalAutoFillAssignments', () => {
    it('greedily assigns best available Pokémon without cross-enrolling the same Pokémon', () => {
      const pokeA = createTestPokemon('snorlax', 180, 500, 2.5, 'uid-snorlax'); // Best in weight AND IVs
      const pokeB = createTestPokemon('onix', 150, 210, 8.8, 'uid-onix');      // Best in height
      const pokeC = createTestPokemon('alakazam', 175, 48, 1.5, 'uid-alakazam'); // 2nd best in IVs

      const assignments = computeOptimalAutoFillAssignments(
        mockCompetitionEvent,
        [pokeA, pokeB, pokeC],
        {}
      );

      expect(assignments.length).toBe(3);

      const assignedUids = assignments.map(a => a.pokemon.uid);
      const uniqueUids = new Set(assignedUids);
      // Absolute guarantee: zero cross-enrollment duplication
      expect(uniqueUids.size).toBe(3);

      // Height should be assigned to onix (8.8m)
      const heightAssignment = assignments.find(a => a.subComp.id === 'height');
      expect(heightAssignment?.pokemon.uid).toBe('uid-onix');
    });

    it('marks isImprovement as false if assigned score does not improve existing entry', () => {
      const singleCompEvent: Event = {
        ...mockCompetitionEvent,
        config: {
          subCompetitions: [mockSubCompetitions[0]!]
        }
      };

      const existingEntries: Record<string, CompetitionEntry> = {
        'saturday_open_comp:ivs': {
          id: 'entry-1',
          event_id: 'saturday_open_comp',
          category_id: 'ivs',
          player_id: 'player-1',
          player_name: 'Trainer',
          pokemon_uid: 'old-uid',
          data: { score: 186 }, // Max possible IVs
          submitted_at: '2026-09-01T00:00:00Z'
        }
      };

      const lowerIvPoke = createTestPokemon('pidgey', 100, 1.8, 0.3, 'uid-pidgey');
      const assignments = computeOptimalAutoFillAssignments(
        singleCompEvent,
        [lowerIvPoke],
        existingEntries
      );

      const ivAssignment = assignments.find(a => a.subComp.id === 'ivs');
      expect(ivAssignment).toBeDefined();
      expect(ivAssignment?.isImprovement).toBe(false);
    });
  });
});
