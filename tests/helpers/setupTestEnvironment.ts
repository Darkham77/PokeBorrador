import { registerTeamGeneratorHandler } from '@/logic/battle/showdownWorkerClient'
import { TrainerTeamGenerator, RivalTeamGenerator } from '@/logic/battle/engine/rivalTeamGenerator'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'

/**
 * Registers battle team generator handlers for unit and integration testing.
 */
export function setupTestTeamGenerators(): void {
  registerTeamGeneratorHandler(async (type, payload) => {
    if (type === 'TRAINER') {
      const opts = payload as { level: number; teamSize: number; allowedSpecies: Iterable<string>; aceSpeciesId?: string };
      return TrainerTeamGenerator.generateTeam({
        level: opts.level,
        teamSize: opts.teamSize,
        allowedSpecies: new Set(opts.allowedSpecies as PokemonSpeciesId[]),
        aceSpeciesId: opts.aceSpeciesId as PokemonSpeciesId | undefined
      });
    } else {
      const opts = payload as { level: number; teamSize: number; aceSpeciesId: string; allowedSpecies?: Iterable<string> };
      return RivalTeamGenerator.generateTeam({
        level: opts.level,
        teamSize: opts.teamSize,
        aceSpeciesId: opts.aceSpeciesId as PokemonSpeciesId,
        allowedSpecies: opts.allowedSpecies ? new Set(opts.allowedSpecies as PokemonSpeciesId[]) : undefined
      });
    }
  });
}

/**
 * Mocks Temporal.Now to sync with Vitest fake timers (which mock Date.now).
 */
export function setupTemporalMock(): void {
  if (typeof globalThis.Temporal !== 'undefined') {
    const originalNow = globalThis.Temporal.Now;
    const mockedNow = {
      ...originalNow,
      instant: () => globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now()),
      zonedDateTimeISO: (tz?: string) => {
        const instant = globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now());
        return instant.toZonedDateTimeISO(tz || 'UTC');
      },
      plainDateTimeISO: (tz?: string) => {
        const instant = globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now());
        return instant.toZonedDateTimeISO(tz || 'UTC').toPlainDateTime();
      },
      plainDateISO: (tz?: string) => {
        const instant = globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now());
        return instant.toZonedDateTimeISO(tz || 'UTC').toPlainDate();
      }
    };
    Object.defineProperty(globalThis.Temporal, 'Now', {
      value: mockedNow,
      writable: true,
      configurable: true
    });
  }
}
