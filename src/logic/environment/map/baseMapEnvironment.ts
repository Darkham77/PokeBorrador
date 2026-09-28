import type { WeatherId } from '@/logic/weather/weatherRegistry.ts';
import { requireWeatherId } from '@/logic/weather/weatherRegistry.ts';
import { mapVisualToOfficialWeather } from '@/logic/weather/weatherGenerationProvider.ts';
import { ACTIVE_GENERATION } from '@/data/system/constants.ts';
import type { BattleWeather } from '@/types/battle/battle.ts';
import type { DayPhase } from '@/types/system/time.ts';
import type { MapRouteId } from '@/data/world/map-assets.ts';

export const MAP_ENVIRONMENT_TYPES = ['outdoor', 'cave', 'indoor', 'stadium'] as const;
export type MapEnvironmentType = (typeof MAP_ENVIRONMENT_TYPES)[number];

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
  readonly boundaries: MapEnvironmentBoundaries;

  constructor(boundaries: MapEnvironmentBoundaries) {
    this.boundaries = Object.freeze(boundaries);
  }

  get id(): MapRouteId {
    return this.boundaries.id;
  }

  get name(): string {
    return this.boundaries.name;
  }

  /**
   * Governs whether natural map weather can exist in this environment.
   * If false, ambient natural weather is strictly forbidden.
   */
  isWeatherAllowed(): boolean {
    return this.boundaries.weatherEnabled;
  }

  /**
   * Returns true if the specific weather type is permitted by this map's boundaries.
   */
  isWeatherTypeAllowed(weatherId: WeatherId): boolean {
    if (!this.boundaries.weatherEnabled) {
      return weatherId === 'none' || weatherId === 'clear' || weatherId === 'null';
    }
    if (weatherId === 'none' || weatherId === 'clear' || weatherId === 'null') {
      return true;
    }
    return this.boundaries.allowedWeathers.has(weatherId);
  }

  /**
   * Asserts that a given weather type is permitted by the map's boundaries.
   * Fails loudly with a descriptive error if violated (Zero Error Suppression).
   */
  assertWeatherAllowed(weatherId: WeatherId): void {
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
  resolveCombatWeather(incomingWeather?: WeatherId | null): BattleWeather {
    if (this.boundaries.fixedWeather) {
      const clean = requireWeatherId(this.boundaries.fixedWeather);
      const official = mapVisualToOfficialWeather(clean, ACTIVE_GENERATION);
      return { type: requireWeatherId(official), visual: clean, turns: -1 };
    }

    if (!this.boundaries.weatherEnabled) {
      if (incomingWeather && incomingWeather !== 'none' && incomingWeather !== 'clear' && incomingWeather !== 'null') {
        throw new Error(
          `[MapEnvironment] Violación de límites: El mapa "${this.id}" (${this.name}) tiene weatherEnabled: false, pero se intentó inyectar el clima "${incomingWeather}".`
        );
      }
      return { type: 'none', visual: 'clear', turns: -1 };
    }

    if (!incomingWeather || incomingWeather === 'none' || incomingWeather === 'clear' || incomingWeather === 'null') {
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
  resolveEffectiveLighting(worldCycle: DayPhase): DayPhase {
    if (this.boundaries.fixedCycle) return this.boundaries.fixedCycle;
    if (this.boundaries.supportedCycles.includes(worldCycle)) return worldCycle;
    return this.boundaries.supportedCycles[0] || 'day';
  }

  /**
   * Helper indicating if the environment is a subterranean cave.
   */
  isCave(): boolean {
    return this.boundaries.isCave;
  }

  /**
   * Helper indicating if the environment is an indoor facility.
   */
  isIndoors(): boolean {
    return this.boundaries.isIndoors;
  }

  abstract readonly environmentKind: MapEnvironmentType;
}
