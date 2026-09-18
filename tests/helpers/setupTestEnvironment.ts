import path from 'node:path';
import { registerTeamGeneratorHandler } from '@/logic/battle/showdownWorkerClient';
import { TrainerTeamGenerator, RivalTeamGenerator } from '@/logic/battle/engine/rivalTeamGenerator';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';

// Ensure active Node binary directory is in process.env.PATH for tests spawning child processes
if (process.execPath) {
  const nodeDir = path.dirname(process.execPath);
  if (!process.env.PATH?.includes(nodeDir)) {
    process.env.PATH = `${nodeDir}${path.delimiter}${process.env.PATH || ''}`;
  }
}

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
    const timeZoneId = () => (typeof originalNow?.timeZoneId === 'function' ? originalNow.timeZoneId() : 'UTC');
    const mockedNow = Object.create(originalNow);
    mockedNow.timeZoneId = timeZoneId;
    mockedNow.instant = () => globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now());
    mockedNow.zonedDateTimeISO = (tz?: string) => {
      const instant = globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now());
      return instant.toZonedDateTimeISO(tz || timeZoneId());
    };
    mockedNow.plainDateTimeISO = (tz?: string) => {
      const instant = globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now());
      return instant.toZonedDateTimeISO(tz || timeZoneId()).toPlainDateTime();
    };
    mockedNow.plainDateISO = (tz?: string) => {
      const instant = globalThis.Temporal.Instant.fromEpochMilliseconds(Date.now());
      return instant.toZonedDateTimeISO(tz || timeZoneId()).toPlainDate();
    };
    Object.defineProperty(globalThis.Temporal, 'Now', {
      value: mockedNow,
      writable: true,
      configurable: true
    });
  }
}
