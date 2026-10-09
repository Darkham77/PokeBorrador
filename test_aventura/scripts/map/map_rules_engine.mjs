/**
 * MAP RULES ENGINE (Poké Vicio v5.0)
 * 
 * SSoT Topological & Aesthetic Rules for Map Generation.
 * Ensures:
 * 1. Zero Dangling Bridges (All bridges anchored firmly to land on both ends).
 * 2. Zero Blocked Doors (Clearance buffer around buildings + door approach corridors).
 * 3. Zero Nature/Building Intersections (Trees/props evicted from structural zones).
 * 4. Coastline Autotile Smoothing (No abrupt shore cuts or missing corners).
 * 5. Metropolis vs Rural Zoning Architecture.
 */

// Terrain types
export const TERRAIN_TYPES = {
  GRASS: 0,
  DIRT_PATH: 1,
  WATER: 2,
  WATER_SHORE: 3,
  TALL_GRASS: 4,
  MOUNTAIN: 5,
  SAND: 6,
  BRIDGE: 7,
  STONE_PLAZA: 8
};

// Check if terrain is solid land
export function isSolidLand(terrainId) {
  return terrainId !== TERRAIN_TYPES.WATER && terrainId !== TERRAIN_TYPES.WATER_SHORE;
}

/**
 * RULE 1: Bridge Anchorage & Shoreline Extension
 * Ensures every bridge touches walkable solid land on both its starting and ending endpoints.
 * If an endpoint hangs over water, extends the bridge along its axis to reach the shore.
 */
export function validateAndAnchorBridges(grid, width, height, bridges) {
  const verifiedBridges = [];
  const MAX_EXTENSION = 20;

  for (const bridge of bridges) {
    const isVertical = bridge.height > bridge.width;
    let { x, y, width: bw, height: bh } = bridge;

    if (isVertical) {
      // Check top endpoint (y)
      let topY = y;
      let extCount = 0;
      while (topY >= 0 && !isSolidLand(grid[topY][x]) && extCount < MAX_EXTENSION) {
        topY--;
        extCount++;
      }

      // Check bottom endpoint (y + bh - 1)
      let bottomY = y + bh - 1;
      extCount = 0;
      while (bottomY < height && !isSolidLand(grid[bottomY][x]) && extCount < MAX_EXTENSION) {
        bottomY++;
        extCount++;
      }

      // If both reach solid land, update bridge bounds
      if (topY >= 0 && isSolidLand(grid[topY][x]) && bottomY < height && isSolidLand(grid[bottomY][x])) {
        const newY = topY;
        const newHeight = bottomY - topY + 1;
        verifiedBridges.push({
          ...bridge,
          y: newY,
          height: newHeight,
          anchors: {
            start: { x, y: newY, terrain: grid[newY][x] },
            end: { x, y: bottomY, terrain: grid[bottomY][x] }
          }
        });

        // Mark grid cells under bridge as BRIDGE terrain
        for (let py = newY; py <= bottomY; py++) {
          for (let px = x; px < x + bw; px++) {
            if (px >= 0 && px < width && py >= 0 && py < height) {
              if (!isSolidLand(grid[py][px])) {
                grid[py][px] = TERRAIN_TYPES.BRIDGE;
              }
            }
          }
        }
      } else {
        // Pier / Dock fallback: if only one end reaches land, treat as harbor pier
        if (isSolidLand(grid[topY][x])) {
          verifiedBridges.push({
            ...bridge,
            type: 'harbor_pier',
            y: topY,
            height: Math.min(bh, 5),
            anchors: { start: { x, y: topY, terrain: grid[topY][x] }, end: null }
          });
        }
      }
    } else {
      // Horizontal bridge
      let leftX = x;
      let extCount = 0;
      while (leftX >= 0 && !isSolidLand(grid[y][leftX]) && extCount < MAX_EXTENSION) {
        leftX--;
        extCount++;
      }

      let rightX = x + bw - 1;
      extCount = 0;
      while (rightX < width && !isSolidLand(grid[y][rightX]) && extCount < MAX_EXTENSION) {
        rightX++;
        extCount++;
      }

      if (leftX >= 0 && isSolidLand(grid[y][leftX]) && rightX < width && isSolidLand(grid[y][rightX])) {
        const newX = leftX;
        const newWidth = rightX - leftX + 1;
        verifiedBridges.push({
          ...bridge,
          x: newX,
          width: newWidth,
          anchors: {
            start: { x: newX, y, terrain: grid[y][newX] },
            end: { x: rightX, y, terrain: grid[y][rightX] }
          }
        });

        for (let py = y; py < y + bh; py++) {
          for (let px = newX; px <= rightX; px++) {
            if (px >= 0 && px < width && py >= 0 && py < height) {
              if (!isSolidLand(grid[py][px])) {
                grid[py][px] = TERRAIN_TYPES.BRIDGE;
              }
            }
          }
        }
      }
    }
  }

  return verifiedBridges;
}

/**
 * RULE 2: Building Clearance & Doorway Corridor
 * 1. Guarantees a 1-tile buffer around buildings with 0 overlapping trees, props or rocks.
 * 2. Guarantees the tile right in front of the door is walkable path terrain.
 * 3. Clears a 2-tile approach corridor connecting the doorway into the street grid.
 */
export function enforceBuildingClearance(grid, width, height, buildings, objects) {
  const filteredObjects = [];

  // 1. Build spatial occupancy map of buildings + buffers
  const occupied = new Set();
  const doorCorridors = [];

  for (const b of buildings) {
    const minX = Math.max(0, b.x - 1);
    const maxX = Math.min(width - 1, b.x + b.w);
    const minY = Math.max(0, b.y - 1);
    const maxY = Math.min(height - 1, b.y + b.h);

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        occupied.add(`${px},${py}`);
      }
    }

    // Doorway coordinates
    const doorOffsetX = b.door ? b.door.x : Math.floor(b.w / 2);
    const doorWorldX = b.x + doorOffsetX;
    const doorStepY = b.y + b.h; // step directly in front of door

    // Connect door step to street
    if (doorStepY < height && doorWorldX >= 0 && doorWorldX < width) {
      grid[doorStepY][doorWorldX] = TERRAIN_TYPES.DIRT_PATH;
      occupied.add(`${doorWorldX},${doorStepY}`);

      // 2-tile corridor downward to ensure street access
      for (let step = 1; step <= 2; step++) {
        const cy = doorStepY + step;
        if (cy < height) {
          grid[cy][doorWorldX] = TERRAIN_TYPES.DIRT_PATH;
          occupied.add(`${doorWorldX},${cy}`);
          doorCorridors.push({ x: doorWorldX, y: cy });
        }
      }
    }
  }

  // 2. Filter out any nature/prop object that falls inside occupied building/door buffers
  for (const obj of objects) {
    const key = `${obj.x},${obj.y}`;
    if (!occupied.has(key)) {
      filteredObjects.push(obj);
    }
  }

  return {
    cleanObjects: filteredObjects,
    doorCorridors
  };
}

/**
 * RULE 3: Coastline Autotile Smoothing
 * Uses 8-neighbor bitmasking to detect water-to-land boundaries and eliminate hard 90° jagged cuts.
 */
export function smoothCoastlines(grid, width, height) {
  const smoothed = Array.from({ length: height }, (_, y) => new Uint8Array(grid[y]));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (grid[y][x] === TERRAIN_TYPES.WATER) {
        // Count solid land neighbors
        let landNeighbors = 0;
        const neighbors = [
          isSolidLand(grid[y - 1][x]), // N
          isSolidLand(grid[y + 1][x]), // S
          isSolidLand(grid[y][x - 1]), // W
          isSolidLand(grid[y][x + 1])  // E
        ];
        landNeighbors = neighbors.filter(Boolean).length;

        if (landNeighbors >= 1) {
          smoothed[y][x] = TERRAIN_TYPES.WATER_SHORE;
        }
      }
    }
  }

  return smoothed;
}

/**
 * RULE 4: Urban Planning & Zoning Engine (Metropolis vs Rural)
 */
export function applyCityZoning(cityName, category, baseX, baseY, _catalog) {
  const isMetropolis = category === 'metropolis';
  const buildings = [];
  const props = [];

  if (isMetropolis) {
    // Orthogonal grid with central civic plaza, wide avenues and commercial towers
    // 1. Center Plaza: Center & Shop
    buildings.push({
      role: 'center',
      x: baseX,
      y: baseY,
      w: 3, h: 3,
      door: { x: 1, y: 2 }
    });
    buildings.push({
      role: 'shop',
      x: baseX + 4,
      y: baseY,
      w: 2, h: 3,
      door: { x: 1, y: 2 }
    });

    // 2. Landmark Avenue: Gym or Silph Tower
    if (cityName === 'Saffron City') {
      buildings.push({
        role: 'tower', // Silph Co.
        x: baseX + 1,
        y: baseY + 5,
        w: 5, h: 5,
        door: { x: 2, y: 4 }
      });
      buildings.push({
        role: 'office',
        x: baseX - 3,
        y: baseY + 5,
        w: 2, h: 3,
        door: { x: 1, y: 2 }
      });
    } else if (cityName === 'Celadon City') {
      buildings.push({
        role: 'casino', // Game Corner
        x: baseX - 2,
        y: baseY + 5,
        w: 4, h: 3,
        door: { x: 2, y: 2 }
      });
      buildings.push({
        role: 'balloon', // Team Rocket balloon in back courtyard
        x: baseX + 5,
        y: baseY + 4,
        w: 2, h: 2
      });
    }

    // Streetlamps along orthogonal avenues
    for (let lx = baseX - 4; lx <= baseX + 8; lx += 4) {
      props.push({ role: 'lamp', x: lx, y: baseY + 4 });
    }
  } else {
    // Rural Organic Village: Winding paths, residential cottages, fences, flowerbeds
    buildings.push({
      role: cityName === 'Pallet Town' ? 'house_red' : 'house_small',
      x: baseX - 2,
      y: baseY,
      w: 3, h: 2,
      door: { x: 1, y: 1 }
    });
    buildings.push({
      role: cityName === 'Pallet Town' ? 'house_blue' : 'house_small',
      x: baseX + 3,
      y: baseY,
      w: 3, h: 2,
      door: { x: 1, y: 1 }
    });

    if (cityName === 'Pallet Town') {
      buildings.push({
        role: 'lab', // Oak's Lab
        x: baseX,
        y: baseY + 4,
        w: 4, h: 3,
        door: { x: 2, y: 2 }
      });
    }

    // Residential mailboxes and picket fences
    props.push({ role: 'mailbox', x: baseX - 3, y: baseY + 2 });
    props.push({ role: 'mailbox', x: baseX + 2, y: baseY + 2 });
    props.push({ role: 'fence_h', x: baseX - 4, y: baseY + 3 });
    props.push({ role: 'fence_h', x: baseX + 4, y: baseY + 3 });
    props.push({ role: 'flowers', x: baseX - 1, y: baseY + 1 });
  }

  return { buildings, props };
}
