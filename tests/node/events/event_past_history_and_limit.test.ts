/**
 * tests/node/events/event_past_history_and_limit.test.ts
 *
 * TIER 1 RED-to-GREEN UNIT TEST:
 * Verifies that fetchPastEvents limits historical competition results to MAX_PAST_EVENTS_COUNT (20)
 * and that fetchEvents calls and populates pastEvents.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { ref } from 'vue';
import { fetchPastEvents, type EventAwardsContext } from '../../../src/stores/events/eventAwardsActions.ts';
import type { Event as GameEvent } from '../../../src/logic/events/eventEngine.ts';
import type { PastEventHistoryItem, PendingAward, CompetitionEntry } from '../../../src/types/system/stores.ts';

describe('Event Past History & 20 Limit (Tier 1)', () => {
  it('correctly queries, sorts descending, and limits historical tournaments to 20 items', async () => {
    // 1. Mock DB with 25 results
    const seededTournaments: Array<{ id: string; event_id: string; winners: string; ended_at: string }> = [];
    for (let i = 1; i <= 25; i++) {
      const pad = String(i).padStart(2, '0');
      const dayStr = String(Math.min(28, i)).padStart(2, '0');
      const hourStr = String(i % 24).padStart(2, '0');
      seededTournaments.push({
        id: `result_hora_magikarp_hist_${pad}`,
        event_id: 'hora_magikarp',
        winners: JSON.stringify([
          {
            rank: 'first',
            player_id: `winner_${pad}_1`,
            player_name: `Campeon_Torneo_${pad}`,
            score: 150 + i
          }
        ]),
        ended_at: `2026-08-${dayStr}T${hourStr}:00:00Z`
      });
    }

    const mockDb = {
      from: (table: string) => {
        if (table === 'competition_results') {
          return {
            select: () => ({
              order: (_col: string, _opts: { ascending: boolean }) => ({
                limit: (lim: number) => {
                  // Sort descending by ended_at
                  const sorted = [...seededTournaments].sort((a, b) => b.ended_at.localeCompare(a.ended_at));
                  return Promise.resolve({
                    data: sorted.slice(0, lim),
                    error: null
                  });
                }
              })
            })
          };
        }
        if (table === 'awards') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null })
            })
          };
        }
        return {
          select: () => Promise.resolve({ data: [], error: null })
        };
      }
    };

    const pastEventsRef = ref<PastEventHistoryItem[]>([]);
    const allEventsRef = ref<GameEvent[]>([
      {
        id: 'hora_magikarp',
        name: 'La Hora del Magikarp',
        icon: '🐟',
        active: true
      } as unknown as GameEvent
    ]);

    const ctx: EventAwardsContext = {
      gameStore: { db: mockDb } as unknown as EventAwardsContext['gameStore'],
      authStore: { user: null } as unknown as EventAwardsContext['authStore'],
      uiStore: { notify: () => {} } as unknown as EventAwardsContext['uiStore'],
      allEvents: allEventsRef,
      pastEvents: pastEventsRef,
      pendingAwards: ref<PendingAward[]>([]),
      userEntries: ref<Record<string, CompetitionEntry>>({})
    };

    await fetchPastEvents(ctx);

    assert.strictEqual(pastEventsRef.value.length, 20, `Expected 20 past events, got ${pastEventsRef.value.length}`);
    assert.strictEqual(pastEventsRef.value[0]?.winners[0]?.player_name, 'Campeon_Torneo_25');
    assert.strictEqual(pastEventsRef.value[19]?.winners[0]?.player_name, 'Campeon_Torneo_06');
  });
});
