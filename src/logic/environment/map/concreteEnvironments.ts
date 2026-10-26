import { BaseMapEnvironment, type MapEnvironmentBoundaries } from './baseMapEnvironment.ts';

/**
 * Outdoor route or open city environment.
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class OutdoorEnvironment extends BaseMapEnvironment {
  public readonly environmentKind = 'outdoor' as const;

  public constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}

/**
 * Cave and subterranean cavern environment.
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class SubterraneanCaveEnvironment extends BaseMapEnvironment {
  public readonly environmentKind = 'cave' as const;

  public constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}

/**
 * Interior facility or building environment.
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class InteriorFacilityEnvironment extends BaseMapEnvironment {
  public readonly environmentKind = 'indoor' as const;

  public constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}

/**
 * Stadium and official combat arena environment (e.g. universal generic stadium).
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class StadiumEnvironment extends BaseMapEnvironment {
  public readonly environmentKind = 'stadium' as const;

  public constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}
