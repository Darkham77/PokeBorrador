/**
 * scripts/auditors/domain_data/validate_adventure_map_data.ts
 *
 * ADVENTURE WORLD MAP DATA INTEGRITY VALIDATOR (Node.js 26+)
 * Validates integrity of rawNodes, officialMapIdMap, and connections in:
 *   - src/components/map/adventure/adventureMapData.ts
 *
 * Usage: npm run validate:map-data
 */

import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';
import {
  rawNodes,
  connections,
  officialMapIdMap
} from '../../../src/components/map/adventure/adventureMapData.ts';
import { isMapRouteId } from '../../../src/data/world/map-assets.ts';

enableCompileCache();

if (process.permission && !process.permission.has('fs.read', process.cwd())) {
  console.error(styleText('red', '\n❌ Error: Este script requiere permisos de lectura.\n'));
  process.exit(1);
}

async function main() {
  const validator = setupValidation({
    title: 'ADVENTURE WORLD MAP DATA VALIDATOR',
    requiredFiles: ['src/components/map/adventure/adventureMapData.ts']
  });

  await validator.checkFiles();

  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeKeys = Object.keys(rawNodes);
  const coordSet = new Set<string>();

  // 1. Check uniqueness and coordinates of rawNodes
  for (const [id, node] of Object.entries(rawNodes)) {
    if (!node.name || typeof node.name !== 'string') {
      errors.push(`Node [${id}] has invalid name.`);
    }
    if (typeof node.x !== 'number' || typeof node.y !== 'number') {
      errors.push(`Node [${id}] has invalid coordinates (${node.x}, ${node.y}).`);
    }

    const coordKey = `${node.x},${node.y}`;
    if (coordSet.has(coordKey)) {
      errors.push(`Duplicate coordinate (${coordKey}) found on node [${id}].`);
    } else {
      coordSet.add(coordKey);
    }
  }

  // 2. Check officialMapIdMap mappings
  const seenCityOrLeagueNames = new Set<string>();
  for (const id of nodeKeys) {
    const officialId = officialMapIdMap[id];
    if (!officialId) {
      errors.push(`Node [${id}] is missing in officialMapIdMap.`);
      continue;
    }
    if (!isMapRouteId(officialId)) {
      errors.push(`Node [${id}] mapped to invalid MapRouteId [${officialId}].`);
    }

    const node = rawNodes[id];
    if (node && (node.type === 'city' || node.type === 'league')) {
      if (seenCityOrLeagueNames.has(node.name)) {
        errors.push(`Duplicate city/league name [${node.name}] found on node [${id}].`);
      } else {
        seenCityOrLeagueNames.add(node.name);
      }
    }
  }

  // 3. Check bidirectional connections
  for (const [a, b] of connections) {
    if (!rawNodes[a]) {
      errors.push(`Connection references undefined start node [${a}].`);
    }
    if (!rawNodes[b]) {
      errors.push(`Connection references undefined end node [${b}].`);
    }
  }

  await validator.finish(
    {
      'Map Nodes scanned': nodeKeys.length,
      'Road Connections': connections.length
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Fatal error: ${(err as Error).message}`));
  process.exit(1);
});
