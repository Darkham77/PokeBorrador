import { ACTIVE_GENERATION } from '@/data/system/constants.ts';
import type { MapRouteId } from '@/data/world/map-assets.ts';
import { mapVisualToOfficialWeather } from '@/logic/weather/weatherGenerationProvider.ts';
import type { WeatherId } from '@/logic/weather/weatherRegistry.ts';
import { requireWeatherId } from '@/logic/weather/weatherRegistry.ts';
import type { BattleWeather } from '@/types/battle/battle.ts';
import type { DayPhase } from '@/types/system/time.ts';

export const MAP_ENVIRONMENT_TYPES = ['outdoor', 'cave', 'indoor', 'stadium'] as const;
export type MapEnvironmentType = (typeof MAP_ENVIRONMENT_TYPES)[number];

const NEUTRAL_WEATHER_VALUES = ['none', 'clear', 'null'] as const;
type NeutralWeatherValue = (typeof NEUTRAL_WEATHER_VALUES)[number];
const NEUTRAL_WEATHERS: ReadonlySet<NeutralWeatherValue> = new Set<NeutralWeatherValue>(
  NEUTRAL_WEATHER_VALUES
);
function isNeutralWeather(weatherId: string | null | undefined): boolean {
  return weatherId ? NEUTRAL_WEATHERS.has(weatherId as NeutralWeatherValue) : false;
}

export interface MapEnvironmentBoundaries {
  readonly id: MapRouteId;
  readonly name: string;
  readonly weatherEnabled: boolean;
  readonly allowedWeathers: ReadonlySet<WeatherId>;
  readonly supportedCycles: readonly DayPhase[];
  readonly fixedCycle?: DayPhase;
  readonly fixedWeather?: WeatherId;
  readonly isCave: boolean;
  readonly isIndoors: boolean;
}

/**
 * Base abstract class encapsulating all immutable environmental, climate,
 * and lighting rules for a map location in Poké Vicio.
 * All rules and boundaries are derived 100% from the map definition in FIRE_RED_MAPS.
 */
export abstract class BaseMapEnvironment {
  public readonly boundaries: MapEnvironmentBoundaries;

  public constructor(boundaries: MapEnvironmentBoundaries) {
    this.boundaries = Object.freeze(boundaries);
  }

  public get id(): MapRouteId {
    return this.boundaries.id;
  }

  public get name(): string {
    return this.boundaries.name;
  }

  /**
   * Governs whether natural map weather can exist in this environment.
   * If false, ambient natural weather is strictly forbidden.
   */
  public isWeatherAllowed(): boolean {
    return this.boundaries.weatherEnabled;
  }

  /**
   * Returns true if the specific weather type is permitted by this map's boundaries.
   */
  public isWeatherTypeAllowed(weatherId: WeatherId): boolean {
    if (!this.boundaries.weatherEnabled) {
      return isNeutralWeather(weatherId);
    }
    if (isNeutralWeather(weatherId)) {
      return true;
    }
    return this.boundaries.allowedWeathers.has(weatherId);
  }

  /**
   * Asserts that a given weather type is permitted by the map's boundaries.
   * Fails loudly with a descriptive error if violated (Zero Error Suppression).
   */
  public assertWeatherAllowed(weatherId: WeatherId): void {
    if (!this.isWeatherTypeAllowed(weatherId)) {
      throw new Error(
        `[MapEnvironment] Violación de límites: El clima "${weatherId}" no está permitido en el mapa "${this.id}" (${this.name}). ` +
          `Clima habilitado: ${this.boundaries.weatherEnabled}. Climas permitidos: [${Array.from(this.boundaries.allowedWeathers).join(', ')}].`
      );
    }
  }

  /**
   * Resolves the initial combat weather for battle initialization.
   * Closed environments (such as stadiums with weatherEnabled: false) return { type: 'none', visual: 'clear', turns: -1 }.
   * If incoming weather violates boundaries, it throws a loud descriptive error.
   */
  public resolveCombatWeather(incomingWeather?: WeatherId | null): BattleWeather {
    if (this.boundaries.fixedWeather) {
      const clean = requireWeatherId(this.boundaries.fixedWeather);
      const official = mapVisualToOfficialWeather(clean, ACTIVE_GENERATION);
      return { type: requireWeatherId(official), visual: clean, turns: -1 };
    }

    if (!this.boundaries.weatherEnabled) {
      if (incomingWeather && !isNeutralWeather(incomingWeather)) {
        throw new Error(
          `[MapEnvironment] Violación de límites: El mapa "${this.id}" (${this.name}) tiene weatherEnabled: false, pero se intentó inyectar el clima "${incomingWeather}".`
        );
      }
      return { type: 'none', visual: 'clear', turns: -1 };
    }

    if (!incomingWeather || isNeutralWeather(incomingWeather)) {
      return { type: 'none', visual: 'clear', turns: -1 };
    }

    const clean = requireWeatherId(incomingWeather);
    this.assertWeatherAllowed(clean);

    const official = mapVisualToOfficialWeather(clean, ACTIVE_GENERATION);
    return { type: requireWeatherId(official), visual: clean, turns: -1 };
  }

  /**
   * Resolves the effective day/night cycle for this environment.
   */
  public resolveEffectiveLighting(worldCycle: DayPhase): DayPhase {
    if (this.boundaries.fixedCycle) return this.boundaries.fixedCycle;
    if (this.boundaries.supportedCycles.includes(worldCycle)) return worldCycle;
    return this.boundaries.supportedCycles[0] || 'day';
  }

  /**
   * Helper indicating if the environment is a subterranean cave.
   */
  public isCave(): boolean {
    return this.boundaries.isCave;
  }

  /**
   * Helper indicating if the environment is an indoor facility.
   */
  public isIndoors(): boolean {
    return this.boundaries.isIndoors;
  }

  public abstract readonly environmentKind: MapEnvironmentType;
}
