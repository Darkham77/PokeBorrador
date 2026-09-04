import { describe, it, expect, vi } from 'vitest';
import { ref } from 'vue';
import { submitCompetitionEntry } from '@/stores/events/eventEnrollmentActions';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { CompetitionEntry } from '@/logic/events/eventCompetitions';

describe('Tier 1: Participant Replacement in submitCompetitionEntry', () => {
  it('releases onEvent from previous Pokemon when replacing slot with a new Pokemon', async () => {
    const pokeA: Pokemon = {
      uid: 'poke-a-uid',
      id: 'shellder',
      name: 'Shellder',
      level: 25,
      hp: 100,
      maxHp: 100,
      obtainedAt: 1700000000000,
      onEvent: true,
      ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 }
    } as unknown as Pokemon;

    const pokeB: Pokemon = {
      uid: 'poke-b-uid',
      id: 'horsea',
      name: 'Horsea',
      level: 28,
      hp: 100,
      maxHp: 100,
      obtainedAt: 1700000000000,
      onEvent: false,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
    } as unknown as Pokemon;

    const pokes = [pokeA, pokeB];

    const initialEntry: CompetitionEntry = {
      id: 'entry-1',
      event_id: 'torneo_pesca',
      category_id: 'ivs',
      player_id: 'user-123',
      player_name: 'Player',
      player_email: 'p@test.com',
      pokemon_uid: 'poke-a-uid',
      data: { score: 120 } as any,
      submitted_at: '2026-08-11T18:00:00Z'
    };

    const userEntries = ref<Record<string, CompetitionEntry>>({
      'torneo_pesca:ivs': initialEntry,
      'torneo_pesca': initialEntry
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'entry-1' }, error: null })
          })
        })
      })
    };

    const mockGameStore = {
      db: mockDb,
      state: { team: pokes, box: [], stats: {} },
      allPokemonList: pokes,
      getPokemonByUid: (uid: string) => pokes.find(p => p.uid === uid) || null,
      scheduleSave: vi.fn().mockResolvedValue(undefined)
    };

    const mockAuthStore = {
      user: {
        id: 'user-123',
        email: 'p@test.com',
        user_metadata: { username: 'Player' }
      }
    };

    const mockUiStore = {
      notify: vi.fn()
    };

    const allEvents = ref([
      { id: 'torneo_pesca', config: JSON.stringify({ subCompetitions: [{ id: 'ivs', metric: 'total_ivs' }] }) }
    ]);

    const ctx = {
      gameStore: mockGameStore as any,
      authStore: mockAuthStore as any,
      uiStore: mockUiStore as any,
      allEvents: allEvents as any,
      userEntries
    };

    // Replace pokeA with pokeB in category 'ivs'
    await submitCompetitionEntry(ctx, 'torneo_pesca', 'ivs', 'poke-b-uid');

    // New Pokemon must be enrolled
    expect(pokeB.onEvent).toBe(true);

    // Old Pokemon must be released since it is no longer enrolled anywhere
    expect(pokeA.onEvent).toBe(false);
  });
});
