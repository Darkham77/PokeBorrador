import { describe, it, expect } from 'vitest';
import { buildCanonicalRegionMap } from '../../../src/logic/map/continent/canonicalRegionPresets.ts';

describe('Canonical Kanto Dungeons and Landmarks Architecture', () => {
  it('splits Mt. Moon into western and eastern ground-level entrances at elevation 0 with no road across summit', () => {
    const { pois, routeNetwork } = buildCanonicalRegionMap('kanto');

    const mtMoonWest = pois.find((p) => p.id === 'mtmoon_west' || p.id === 'mtmoon');
    const mtMoonEast = pois.find((p) => p.id === 'mtmoon_east');

    expect(mtMoonWest, 'Mt. Moon must have a western entrance').toBeDefined();
    expect(mtMoonEast, 'Mt. Moon must have an eastern exit/entrance').toBeDefined();

    expect(mtMoonWest!.elevation, 'Mt. Moon West entrance must be ground level (elev 0)').toBe(0);
    expect(mtMoonEast!.elevation, 'Mt. Moon East entrance must be ground level (elev 0)').toBe(0);

    // The summit of Mt. Moon (e.g. x: 114, y: 42) must NOT have pathGrid = true
    const summitPath = routeNetwork.pathGrid[42]?.[114];
    expect(summitPath, 'No road must cross the Mt. Moon mountain summit').toBe(false);
  });

  it('splits Rock Tunnel into northern and southern ground-level entrances at elevation 0', () => {
    const { pois } = buildCanonicalRegionMap('kanto');

    const rtNorth = pois.find((p) => p.id === 'rocktunnel_north' || p.id === 'rocktunnel');
    const rtSouth = pois.find((p) => p.id === 'rocktunnel_south');

    expect(rtNorth, 'Rock Tunnel must have a northern entrance').toBeDefined();
    expect(rtSouth, 'Rock Tunnel must have a southern entrance/exit').toBeDefined();

    expect(rtNorth!.elevation, 'Rock Tunnel North entrance must be ground level (elev 0)').toBe(0);
    expect(rtSouth!.elevation, 'Rock Tunnel South entrance must be ground level (elev 0)').toBe(0);
  });

  it('classifies Bill\'s House and Power Plant as landmarks, NOT route_gate', () => {
    const { pois } = buildCanonicalRegionMap('kanto');

    const bill = pois.find((p) => p.id === 'billshouse');
    const power = pois.find((p) => p.id === 'powerplant');

    expect(bill, 'Bill\'s House must exist').toBeDefined();
    expect(power, 'Power Plant must exist').toBeDefined();

    expect(bill!.type, 'Bill\'s House must not be a route_gate').not.toBe('route_gate');
    expect(power!.type, 'Power Plant must not be a route_gate').not.toBe('route_gate');
  });

  it('embeds Diglett\'s Cave against a real rock cliff', () => {
    const { pois, continent } = buildCanonicalRegionMap('kanto');

    const diglett = pois.find((p) => p.id === 'diglettcave');
    expect(diglett, 'Diglett Cave must exist').toBeDefined();

    // The cell directly to the north (y: diglett.gridY - 1 or - 2) must be an elevated rock cliff (elev >= 1)
    let hasBackingCliff = false;
    for (let dy = -3; dy <= -1; dy++) {
      for (let dx = 0; dx < diglett!.footprint.width; dx++) {
        const cy = diglett!.gridY + dy;
        const cx = diglett!.gridX + dx;
        if (continent.heightmap[cy]?.[cx] === 1) {
          hasBackingCliff = true;
          break;
        }
      }
    }

    expect(hasBackingCliff, 'Diglett\'s Cave must have a cliff wall directly backing it').toBe(true);
  });
});
