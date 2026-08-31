import { describe, it, expect } from 'vitest';
import { healStuckEventPokemon } from '@/logic/player/eventRecovery';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { CompetitionEntry } from '@/types/system/stores';
import type { Event as GameEvent } from '@/logic/events/eventEngine';

describe('healStuckEventPokemon (Tier 1 Unit Test)', () => {
  it('should clear onEvent if the pokemon is not enrolled in any active event', () => {
    const poke1 = { uid: 'poke-1', name: 'Magikarp', onEvent: true } as Pokemon;
    const poke2 = { uid: 'poke-2', name: 'Gengar', onEvent: false } as Pokemon;
    const team = [poke1, poke2];
    const box: Pokemon[] = [];

    const activeEvents: GameEvent[] = [];
    const userEntries: Record<string, CompetitionEntry> = {};

    const fixed = healStuckEventPokemon(team, box, activeEvents, userEntries);
    expect(fixed).toBe(true);
    expect(poke1.onEvent).toBe(false);
    expect(poke2.onEvent).toBe(false);
  });

  it('should keep onEvent if the pokemon is enrolled in a currently active event', () => {
    const nowIso = Temporal.Now.instant().toString();
    const futureIso = Temporal.Now.instant().add({ hours: 5 }).toString();

    const poke1 = { uid: 'poke-1', name: 'Magikarp', onEvent: true } as Pokemon;
    const team = [poke1];
    const box: Pokemon[] = [];

    const activeEvents: GameEvent[] = [
      {
        id: 'magikarp_contest',
        name: 'Concurso Magikarp',
        description: 'Mock description',
        active: true,
        start_at: nowIso,
        end_at: futureIso
      }
    ];

    const userEntries: Record<string, CompetitionEntry> = {
      'magikarp_contest:ivs': {
        id: 'magikarp_contest:ivs:user1',
        event_id: 'magikarp_contest',
        category_id: 'ivs',
        player_id: 'user1',
        pokemon_uid: 'poke-1',
        data: {} as unknown as CompetitionEntry['data'],
        submitted_at: nowIso
      }
    };

    const fixed = healStuckEventPokemon(team, box, activeEvents, userEntries);
    expect(fixed).toBe(false);
    expect(poke1.onEvent).toBe(true);
  });

  it('should clear onEvent if the enrolled event has already ended (time passed)', () => {
    const pastIsoStart = Temporal.Now.instant().subtract({ hours: 10 }).toString();
    const pastIsoEnd = Temporal.Now.instant().subtract({ hours: 2 }).toString();

    const poke1 = { uid: 'poke-1', name: 'Magikarp', onEvent: true } as Pokemon;
    const team = [poke1];
    const box: Pokemon[] = [];

    const activeEvents: GameEvent[] = [
      {
        id: 'magikarp_contest',
        name: 'Concurso Magikarp',
        description: 'Mock description',
        active: true,
        start_at: pastIsoStart,
        end_at: pastIsoEnd
      }
    ];

    const userEntries: Record<string, CompetitionEntry> = {
      'magikarp_contest:ivs': {
        id: 'magikarp_contest:ivs:user1',
        event_id: 'magikarp_contest',
        category_id: 'ivs',
        player_id: 'user1',
        pokemon_uid: 'poke-1',
        data: {} as unknown as CompetitionEntry['data'],
        submitted_at: pastIsoStart
      }
    };

    const fixed = healStuckEventPokemon(team, box, activeEvents, userEntries);
    expect(fixed).toBe(true);
    expect(poke1.onEvent).toBe(false);
  });

  it('should rehabilitate Pokémon from legacy events that no longer exist in config', () => {
    const poke1 = { uid: 'poke-legacy-1', name: 'Magikarp', onEvent: true } as Pokemon;
    const poke2 = { uid: 'poke-legacy-2', name: 'Gyarados', onEvent: true } as Pokemon;
    const team = [poke1];
    const box: Pokemon[] = [poke2];

    const activeEvents: GameEvent[] = [];
    const userEntries: Record<string, CompetitionEntry> = {
      'legacy_deleted_event:ivs': {
        id: 'legacy_deleted_event:ivs:user1',
        event_id: 'legacy_deleted_event',
        category_id: 'ivs',
        player_id: 'user1',
        pokemon_uid: 'poke-legacy-1',
        data: {} as unknown as CompetitionEntry['data'],
        submitted_at: '2026-01-01T00:00:00Z'
      }
    };

    const fixed = healStuckEventPokemon(team, box, activeEvents, userEntries);
    expect(fixed).toBe(true);
    expect(poke1.onEvent).toBe(false);
    expect(poke2.onEvent).toBe(false);
  });

  it('should rehabilitate Pokémon from events where entries were removed, claimed, or discarded', () => {
    const poke = { uid: 'poke-claimed', name: 'Magikarp', onEvent: true } as Pokemon;
    const team: Pokemon[] = [];
    const box = [poke];

    // Award claimed or discarded -> entry was deleted from competition_entries
    const activeEvents: GameEvent[] = [
      {
        id: 'magikarp_contest',
        name: 'Concurso Magikarp',
        description: 'Mock description',
        active: true,
        start_at: Temporal.Now.instant().toString(),
        end_at: Temporal.Now.instant().add({ hours: 1 }).toString()
      }
    ];
    const userEntries: Record<string, CompetitionEntry> = {};

    const fixed = healStuckEventPokemon(team, box, activeEvents, userEntries);
    expect(fixed).toBe(true);
    expect(poke.onEvent).toBe(false);
  });
});
