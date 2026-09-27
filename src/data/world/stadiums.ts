import type { DayPhase } from '@/types/system/time.ts';
import type { WeatherId } from '@/logic/weather/weatherRegistry.ts';

export const STADIUM_IDS = ['gym', 'pvp'] as const;
export type StadiumId = (typeof STADIUM_IDS)[number];
export const STADIUM_IDS_SET: ReadonlySet<string> = new Set(STADIUM_IDS);

export interface StadiumDefinition {
  readonly id: StadiumId;
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly weatherEnabled?: boolean;
  readonly fixedWeather?: WeatherId;
  readonly fixedCycle?: DayPhase;
  readonly isIndoors?: boolean;
  readonly supportedCycles?: readonly DayPhase[];
}

/**
 * Catálogo canónico de estadios de combate y coliseos.
 * Permite configurar reglas de clima, iluminación fija o dinámica, e interiores por estadio.
 */
export const STADIUMS: readonly StadiumDefinition[] = [
  {
    id: 'gym',
    name: 'Estadio Pokémon',
    weatherEnabled: false,
    fixedCycle: 'day',
    isIndoors: true,
    supportedCycles: ['day']
  },
  {
    id: 'pvp',
    name: 'Estadio Pokémon',
    weatherEnabled: false,
    fixedCycle: 'day',
    isIndoors: true,
    supportedCycles: ['day']
  }
] as const;

export const STADIUMS_BY_ID: Readonly<Record<StadiumId, StadiumDefinition>> = Object.freeze(
  Object.fromEntries(STADIUMS.map(s => [s.id, s])) as Record<StadiumId, StadiumDefinition>
);

export function isStadiumId(value: string): value is StadiumId {
  return STADIUM_IDS_SET.has(value);
}
