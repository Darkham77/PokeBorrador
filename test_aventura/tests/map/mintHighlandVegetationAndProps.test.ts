/**
 * tests/node/map/mintHighlandVegetationAndProps.test.ts
 *
 * TIER 1 UNIT TESTS: PATTERN 4 - MINT HIGHLAND VEGETATION & PROPS INTEGRITY
 *
 * Validates:
 *   1. Mint Highland macro-biome roadside props NEVER use poke_fern_wild_bush.png or poke_rock_stone_gray_medium.png.
 *   2. Mint Highland places poke_bush_round.png for bushes.
 *   3. Mint Highland places poke_rock_boulder_mossy_1.png for boulders.
 */

import { describe, it, expect } from 'vitest';
import { generateContinentMap } from '../../../src/logic/map/continentGenerator.ts';
import { placeRegionalPOIs } from '../../../src/logic/map/poiPlacementEngine.ts';
import { generateRouteNetwork } from '../../../src/logic/map/routeNetworkEngine.ts';
import { generateWildernessLayer } from '../../../src/logic/map/wildernessVegetationEngine.ts';

describe('Pattern 4: Mint Highland Vegetation & Prop Integrity', () => {
  it('guarantees Mint Highland does not spawn discordant ferns or broken fence post rocks', () => {
    const cont = generateContinentMap({
      seed: 42,
      width: 128,
      height: 128,
      oceanWaterPercentage: 0.35,
      mountainPercentage: 0.22,
      lakeCount: 3
    });
    const pois = placeRegionalPOIs(cont, { targetCount: 18, seed: 42 });
    const routes = generateRouteNetwork(cont, pois, { allowBridges: true });
    const wilderness = generateWildernessLayer(cont, pois, routes.pathGrid);

    // Look at props placed in the Mint Highland zone (around x: 50..65, y: 5..20 in seed 42)
    const mintBiomeProps = wilderness.props.filter((p) => {
      const mb = cont.macroBiomes?.biomeGrid?.[p.y]?.[p.x];
      return mb === 'mint_highland';
    });

    expect(mintBiomeProps.length).toBeGreaterThan(0);

    const discordantFerns = mintBiomeProps.filter((p) => p.prefabFile === 'poke_fern_wild_bush.png');
    const faultyPosts = mintBiomeProps.filter((p) => p.prefabFile === 'poke_rock_stone_gray_medium.png');

    expect(discordantFerns.length, 'Should not contain poke_fern_wild_bush in Mint Highland').toBe(0);
    expect(faultyPosts.length, 'Should not contain poke_rock_stone_gray_medium in Mint Highland').toBe(0);

    const roundBushes = mintBiomeProps.filter((p) => p.type === 'bush' && p.prefabFile === 'poke_bush_round.png');
    const mossyBoulders = mintBiomeProps.filter((p) => p.type === 'boulder' && p.prefabFile === 'poke_rock_boulder_mossy_1.png');

    expect(roundBushes.length, 'Mint Highland should spawn poke_bush_round bushes').toBeGreaterThan(0);
    expect(mossyBoulders.length, 'Mint Highland should spawn poke_rock_boulder_mossy_1 boulders').toBeGreaterThan(0);
  });
});
