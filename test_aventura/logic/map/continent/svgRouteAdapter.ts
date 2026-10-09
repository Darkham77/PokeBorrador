/**
 * src/logic/map/continent/svgRouteAdapter.ts
 *
 * BIDIRECTIONAL SVG ROUTE ADAPTER & ADAPTIVE GEOGRAPHY REGENERATOR
 * Serializes continental route networks into semantic vector SVG and parses external/modified
 * SVG files back into graph nodes, adaptively reconstructing continental landmasses and paths.
 */

import type {
  ContinentNode,
  ContinentConnection,
  ContinentGenConfig,
  SvgImportResult,
  UrbanScale
} from '../../../types/map/continentTypes';
import {
  generateContinent,
  type GeneratedContinentResult
} from './continentalEngine.ts';
import type {
  EmbeddedTopologyGraph,
  EnrichedCorridorProperties
} from '../../../types/map/pokemonGraphTypes.ts';
import type { ProgressionResult } from '../progressionBarrierEngine.ts';

export interface ExportSvgOptions {
  readonly width: number;
  readonly height: number;
  readonly nodes: Record<string, ContinentNode>;
  readonly connections: readonly ContinentConnection[];
}

/**
 * Serializes nodes and connections into standard, semantic SVG vector XML.
 */
export function exportRoutesToSvg(options: ExportSvgOptions): string {
  const { width, height, nodes, connections } = options;

  let routesMarkup = '';
  for (const [u, v] of connections) {
    const nodeA = nodes[u];
    const nodeB = nodes[v];
    if (!nodeA || !nodeB) continue;

    routesMarkup += `    <line id="route_${u}_${v}" class="route" x1="${nodeA.x}" y1="${nodeA.y}" x2="${nodeB.x}" y2="${nodeB.y}" data-from="${u}" data-to="${v}" stroke="#fde047" stroke-width="6" stroke-linecap="round" />\n`;
  }

  let citiesMarkup = '';
  for (const node of Object.values(nodes)) {
    const r = node.scale === 'metropolis' ? 18 : node.scale === 'city' ? 14 : 10;
    const fill = node.amenities.includes('gym') ? '#eab308' : '#ef4444';

    citiesMarkup += `    <g id="${node.id}" class="city-node" data-id="${node.id}" data-name="${node.name}" data-scale="${node.scale}">\n`;
    citiesMarkup += `      <circle cx="${node.x}" cy="${node.y}" r="${r}" fill="${fill}" stroke="#ffffff" stroke-width="3" />\n`;
    citiesMarkup += `      <text x="${node.x}" y="${node.y - r - 4}" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#ffffff">${node.name}</text>\n`;
    citiesMarkup += `    </g>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      .route { stroke: #fde047; stroke-width: 6px; stroke-linecap: round; }
      .city-node circle { transition: transform 0.2s; cursor: pointer; }
      .city-node text { text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
    </style>
  </defs>
  <g id="routes">
${routesMarkup}  </g>
  <g id="cities">
${citiesMarkup}  </g>
</svg>`;
}

/**
 * Parses SVG XML content into a structured SvgImportResult.
 * Handles both our canonical semantic SVG attributes and generic external SVGs.
 */
export function importRoutesFromSvg(svgContent: string): SvgImportResult {
  // 1. Extract Dimensions from viewBox or width/height
  let width = 2000;
  let height = 2000;

  const viewBoxMatch = svgContent.match(/viewBox=["']\s*([-\d.]+)\s+([-\d.]+)\s+([\d.]+)\s+([\d.]+)\s*["']/i);
  if (viewBoxMatch?.[3] && viewBoxMatch[4]) {
    width = parseFloat(viewBoxMatch[3]);
    height = parseFloat(viewBoxMatch[4]);
  } else {
    const widthMatch = svgContent.match(/width=["']([\d.]+)["']/i);
    const heightMatch = svgContent.match(/height=["']([\d.]+)["']/i);
    if (widthMatch?.[1]) width = parseFloat(widthMatch[1]);
    if (heightMatch?.[1]) height = parseFloat(heightMatch[1]);
  }

  const nodes: Record<string, ContinentNode> = {};

  // 2. Extract Cities / Nodes
  // Strategy A: Look for <g class="city-node" ...> or <g id="..." data-name="...">
  const groupNodeRegex = /<g\b([^>]*\b(?:city-node|data-name)[^>]*)>([\s\S]*?)<\/g>/gi;
  let gMatch: RegExpExecArray | null;

  while ((gMatch = groupNodeRegex.exec(svgContent)) !== null) {
    const attrs = gMatch[1]!;
    const inner = gMatch[2]!;

    const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const nameMatch = attrs.match(/\bdata-name=["']([^"']+)["']/i);
    const scaleMatch = attrs.match(/\bdata-scale=["']([^"']+)["']/i);

    // Extract cx, cy from nested circle
    const circleMatch = inner.match(/<circle\b[^>]*\bcx=["']([\d.]+)["'][^>]*\bcy=["']([\d.]+)["']/i);
    if (circleMatch?.[1] && circleMatch[2]) {
      const cx = parseFloat(circleMatch[1]);
      const cy = parseFloat(circleMatch[2]);
      const id = idMatch?.[1] ?? `node_${Object.keys(nodes).length + 1}`;
      const name = nameMatch?.[1] ?? id;
      const scale = (scaleMatch?.[1] as UrbanScale) || 'town';

      nodes[id] = {
        id,
        name,
        x: cx,
        y: cy,
        scale,
        amenities: ['center', 'mart']
      };
    }
  }

  // Strategy B: If no group nodes were matched, match raw <circle> elements
  if (Object.keys(nodes).length === 0) {
    const circleRegex = /<circle\b([^>]*)\/?>/gi;
    let cMatch: RegExpExecArray | null;
    let fallbackIdx = 1;

    while ((cMatch = circleRegex.exec(svgContent)) !== null) {
      const attrs = cMatch[1]!;
      const cxMatch = attrs.match(/\bcx=["']([\d.]+)["']/i);
      const cyMatch = attrs.match(/\bcy=["']([\d.]+)["']/i);
      const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
      const nameMatch = attrs.match(/\bdata-name=["']([^"']+)["']/i);

      if (cxMatch?.[1] && cyMatch?.[1]) {
        const id = idMatch?.[1] ?? `node_${fallbackIdx++}`;
        const name = nameMatch?.[1] ?? `Punto ${id}`;
        nodes[id] = {
          id,
          name,
          x: parseFloat(cxMatch[1]),
          y: parseFloat(cyMatch[1]),
          scale: 'town',
          amenities: ['center']
        };
      }
    }
  }

  // 3. Extract Routes / Connections
  const connections: [string, string][] = [];
  const nodeEntries = Object.values(nodes);

  // Match <line> tags
  const lineRegex = /<line\b([^>]*)\/?>/gi;
  let lMatch: RegExpExecArray | null;

  while ((lMatch = lineRegex.exec(svgContent)) !== null) {
    const attrs = lMatch[1]!;
    const fromMatch = attrs.match(/\bdata-from=["']([^"']+)["']/i);
    const toMatch = attrs.match(/\bdata-to=["']([^"']+)["']/i);

    if (fromMatch?.[1] && toMatch?.[1] && nodes[fromMatch[1]] && nodes[toMatch[1]]) {
      connections.push([fromMatch[1], toMatch[1]]);
    } else {
      // Geometric proximity fallback: find closest nodes to (x1, y1) and (x2, y2)
      const x1Match = attrs.match(/\bx1=["']([\d.]+)["']/i);
      const y1Match = attrs.match(/\by1=["']([\d.]+)["']/i);
      const x2Match = attrs.match(/\bx2=["']([\d.]+)["']/i);
      const y2Match = attrs.match(/\by2=["']([\d.]+)["']/i);

      if (x1Match?.[1] && y1Match?.[1] && x2Match?.[1] && y2Match?.[1]) {
        const p1x = parseFloat(x1Match[1]);
        const p1y = parseFloat(y1Match[1]);
        const p2x = parseFloat(x2Match[1]);
        const p2y = parseFloat(y2Match[1]);

        let closestA: string | null = null;
        let minDistA = Infinity;
        let closestB: string | null = null;
        let minDistB = Infinity;

        for (const n of nodeEntries) {
          const distA = Math.hypot(n.x - p1x, n.y - p1y);
          if (distA < minDistA) {
            minDistA = distA;
            closestA = n.id;
          }
          const distB = Math.hypot(n.x - p2x, n.y - p2y);
          if (distB < minDistB) {
            minDistB = distB;
            closestB = n.id;
          }
        }

        if (closestA && closestB && closestA !== closestB) {
          connections.push([closestA, closestB]);
        }
      }
    }
  }

  // Deduplicate connections
  const uniqueConnections: [string, string][] = [];
  const seenPairs = new Set<string>();

  for (const [u, v] of connections) {
    const key = u < v ? `${u}:${v}` : `${v}:${u}`;
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      uniqueConnections.push([u, v]);
    }
  }

  return {
    nodes,
    connections: uniqueConnections,
    dimensions: { width, height }
  };
}

/**
 * Regenerates continental geography around the imported graph nodes and connections.
 */
export function regenerateGeographyFromGraph(
  graph: SvgImportResult,
  baseConfig: ContinentGenConfig
): GeneratedContinentResult {
  const { nodes, connections, dimensions: svgDims } = graph;

  const width = svgDims?.width ?? baseConfig.dimensions.width;
  const height = svgDims?.height ?? baseConfig.dimensions.height;

  const adjustedConfig: ContinentGenConfig = {
    ...baseConfig,
    dimensions: {
      ...baseConfig.dimensions,
      width,
      height
    }
  };

  // Run base procedural generator for natural continent noise
  const baseResult = generateContinent(adjustedConfig);
  const { gridWidth, gridHeight, dimensions } = baseResult;
  const tileSize = dimensions.tileSize;

  // Clone biome grid to apply custom adaptive edits
  const biomeGrid = baseResult.biomeGrid.map((row) => [...row]);

  // 1. Ensure all imported node locations are habitable land (grass)
  for (const node of Object.values(nodes)) {
    const cx = Math.floor(node.x / tileSize);
    const cy = Math.floor(node.y / tileSize);

    // Place a 3x3 grass foundation around the settlement
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx;
        const gy = cy + dy;
        if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
          biomeGrid[gy]![gx] = 'grass';
        }
      }
    }
  }

  // 2. Carve roads for all imported connections
  const roads = new Set<string>();

  for (const [uId, vId] of connections) {
    const nA = nodes[uId];
    const nB = nodes[vId];
    if (!nA || !nB) continue;

    const x0 = Math.floor(nA.x / tileSize);
    const y0 = Math.floor(nA.y / tileSize);
    const x1 = Math.floor(nB.x / tileSize);
    const y1 = Math.floor(nB.y / tileSize);

    let currX = x0;
    let currY = y0;
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (currX >= 0 && currX < gridWidth && currY >= 0 && currY < gridHeight) {
        roads.add(`${currX},${currY}`);
        const currentBiome = biomeGrid[currY]![currX];
        if (currentBiome !== 'ocean') {
          biomeGrid[currY]![currX] = 'path';
        }
      }

      if (currX === x1 && currY === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
    }
  }

  return {
    dimensions,
    gridWidth,
    gridHeight,
    biomeGrid,
    nodes,
    connections,
    roads
  };
}

// ---------------------------------------------------------------------------
// Phase 6: Export Pokémon Topology to Semantic SVG (T6.2)
// ---------------------------------------------------------------------------

export interface ExportPokemonTopologySvgOptions {
  readonly embedded: EmbeddedTopologyGraph;
  readonly properties?: readonly EnrichedCorridorProperties[];
  readonly progression?: ProgressionResult;
  readonly tileScale?: number; // default: 16 pixels per tile
}

/**
 * Serializes the complete Pokémon topology graph (embedded nodes, orthogonal corridors,
 * surf routes, wormhole tunnels, HM barriers, and gatehouse checkpoints) into semantic SVG.
 */
export function exportPokemonTopologyToSvg(
  options: ExportPokemonTopologySvgOptions
): string {
  const { embedded, properties, progression: _progression, tileScale = 16 } = options;
  const svgW = embedded.width * tileScale;
  const svgH = embedded.height * tileScale;

  // 1. Render Corridors & Routes
  let corridorsMarkup = '';
  const nodeMap = new Map(embedded.nodes.map((n) => [n.id, n]));
  const propMap = new Map(properties?.map((p) => [p.corridorId, p]) ?? []);

  for (const corr of embedded.corridors) {
    const fromNode = nodeMap.get(corr.fromId);
    const toNode = nodeMap.get(corr.toId);
    if (!fromNode || !toNode) continue;

    const prop = propMap.get(corr.id);

    // Case A: Wormhole Tunnel
    if (corr.kind === 'wormhole_tunnel') {
      const x1 = fromNode.centerX * tileScale;
      const y1 = fromNode.centerY * tileScale;
      const x2 = toNode.centerX * tileScale;
      const y2 = toNode.centerY * tileScale;
      corridorsMarkup += `    <line id="${corr.id}" class="wormhole-tunnel" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c084fc" stroke-width="4" stroke-dasharray="6,8" opacity="0.85" />\n`;
      corridorsMarkup += `    <text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" text-anchor="middle" font-size="11" font-family="sans-serif" font-weight="bold" fill="#d8b4fe">[Cueva/Túnel Subterráneo]</text>\n`;
      continue;
    }

    // Case B: Surface Orthogonal Corridor
    const pts = corr.waypoints.map((p) => `${p.x * tileScale},${p.y * tileScale}`).join(' ');
    const isSurf = corr.kind === 'surf_route';
    const isCycle = corr.kind === 'cycle';
    const strokeColor = isSurf ? '#38bdf8' : isCycle ? '#f59e0b' : '#fbbf24';
    const strokeWidth = prop ? Math.max(4, prop.width * (tileScale / 12)) : 6;
    const dashArray = isSurf ? 'stroke-dasharray="8,6"' : isCycle ? 'stroke-dasharray="10,5"' : '';

    corridorsMarkup += `    <polyline id="${corr.id}" class="corridor ${corr.kind}" points="${pts}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" ${dashArray} />\n`;

    // Render Gatehouse Checkpoints
    if (prop && prop.gatehouses.length > 0) {
      for (const g of prop.gatehouses) {
        const gx = g.x * tileScale - 8;
        const gy = g.y * tileScale - 8;
        corridorsMarkup += `    <rect class="gatehouse-checkpoint" x="${gx}" y="${gy}" width="16" height="16" fill="#f97316" stroke="#ffffff" stroke-width="2" rx="3" />\n`;
        corridorsMarkup += `    <text x="${gx + 8}" y="${gy + 12}" text-anchor="middle" font-size="10" font-family="sans-serif" fill="#ffffff">🏛️</text>\n`;
      }
    }

    // Render Progression Barrier Badge
    if (corr.barrier) {
      const midIdx = Math.floor(corr.waypoints.length / 2);
      const midPoint = corr.waypoints[midIdx] ?? { x: fromNode.centerX, y: fromNode.centerY };
      const bx = midPoint.x * tileScale;
      const by = midPoint.y * tileScale;
      const barrierLabel =
        corr.barrier === 'barrier_surf'
          ? '🌊 SURF'
          : corr.barrier === 'barrier_cut'
            ? '✂️ CORTE'
            : corr.barrier === 'barrier_strength'
              ? '🪨 FUERZA'
              : '⚡ FLASH';

      corridorsMarkup += `    <g class="barrier-badge" transform="translate(${bx}, ${by})">\n`;
      corridorsMarkup += `      <rect x="-35" y="-12" width="70" height="24" rx="12" fill="#dc2626" stroke="#ffffff" stroke-width="2" />\n`;
      corridorsMarkup += `      <text x="0" y="4" text-anchor="middle" font-size="10" font-family="sans-serif" font-weight="bold" fill="#ffffff">${barrierLabel}</text>\n`;
      corridorsMarkup += `    </g>\n`;
    }
  }

  // 2. Render Settlement Nodes
  let nodesMarkup = '';
  for (const node of embedded.nodes) {
    const cx = node.centerX * tileScale;
    const cy = node.centerY * tileScale;

    let fill = '#94a3b8'; // secondary default
    let r = 14;
    let label: string = node.role;

    if (node.role === 'starter') {
      fill = '#22c55e';
      r = 16;
      label = '🏠 Pueblo Inicial';
    } else if (node.role === 'league') {
      fill = '#a855f7';
      r = 22;
      label = '🏆 Liga Pokémon';
    } else if (node.role === 'gym_city') {
      fill = '#eab308';
      r = 18;
      label = `🏛️ Gimnasio #${node.gymNumber ?? ''}`;
    }

    if (node.hasPort) {
      label += ' ⚓';
    }

    nodesMarkup += `    <g id="${node.id}" class="topology-node ${node.role}" data-id="${node.id}" data-role="${node.role}">\n`;
    nodesMarkup += `      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="#ffffff" stroke-width="3" />\n`;
    if (node.hasPort) {
      nodesMarkup += `      <circle cx="${cx + r - 4}" cy="${cy - r + 4}" r="8" fill="#0284c7" stroke="#ffffff" stroke-width="1.5" />\n`;
      nodesMarkup += `      <text x="${cx + r - 4}" y="${cy - r + 8}" text-anchor="middle" font-size="10" fill="#ffffff">⚓</text>\n`;
    }
    nodesMarkup += `      <text x="${cx}" y="${cy - r - 6}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#ffffff">${label}</text>\n`;
    nodesMarkup += `    </g>\n`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgW} ${svgH}" width="${svgW}" height="${svgH}">
  <defs>
    <style>
      .corridor { stroke-linecap: round; stroke-linejoin: round; }
      .topology-node circle { transition: transform 0.2s; cursor: pointer; }
      .topology-node text { text-shadow: 0 1px 4px rgba(0,0,0,0.9); }
      .barrier-badge text { text-shadow: 0 1px 2px rgba(0,0,0,0.6); }
    </style>
  </defs>
  <g id="corridors">
${corridorsMarkup}  </g>
  <g id="nodes">
${nodesMarkup}  </g>
</svg>`;
}

