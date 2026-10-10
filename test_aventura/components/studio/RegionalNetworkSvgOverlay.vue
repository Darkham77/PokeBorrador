<script setup lang="ts">
/**
 * src/components/map/RegionalNetworkSvgOverlay.vue
 *
 * INTERACTIVE BIDIRECTIONAL SVG ROUTE & POI OVERLAY
 *
 * Enforces User Directives:
 *   1. Unified Coordinate Space: Shares exact viewBox with canvas pixel resolution (viewBox="0 0 widthPx heightPx").
 *      POIs anchor at (gridX * 32 + footprintWidth * 16, gridY * 32 + footprintHeight * 16) for geometric centering.
 *   3. Optimized Drag & Drop: 60 FPS transient visual repositioning on pointermove,
 *      dispatches targeted incident A* recomputation only on pointerup.
 */

import { ref, computed } from 'vue';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import { CANVAS_TILE_SIZE, STUDIO_TILE_SIZE } from '../../config/studioConstants.ts';
import type { POINode, RouteEdge } from '../../types/map/poiTypes.ts';
import { screenToSvgCoords as transformScreenToSvg } from '../../logic/utils/svgCoordinateUtils.ts';

const SCHEMATIC_CURVE_BOW_FACTOR = 0.08;
const DEFAULT_CONTINENT_GRID_DIMENSION = 128;

const store = useRegionalContinentStudioStore();
const svgRef = ref<SVGSVGElement | null>(null);

// Local dragging state
const isDragging = ref<boolean>(false);
const activeDragNodeId = ref<string | null>(null);
const dragPointerOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 });

/**
 * Computes exact center coordinates in SVG pixel space for a POI node.
 * Directiva 1: (gridX * 32 + footprintWidth * 16, gridY * 32 + footprintHeight * 16)
 */
function getNodeCenter(node: POINode): { x: number; y: number } {
  // If actively being dragged, return transient 60 FPS visual position
  const override = store.dragVisualPositions[node.id];
  if (override) {
    return override;
  }
  return {
    x: node.gridX * CANVAS_TILE_SIZE + node.footprint.width * STUDIO_TILE_SIZE,
    y: node.gridY * CANVAS_TILE_SIZE + node.footprint.height * STUDIO_TILE_SIZE
  };
}

/**
 * Transforms screen client coordinates into SVG viewBox pixel coordinates.
 */
function screenToSvgCoords(e: PointerEvent): { x: number; y: number } {
  return transformScreenToSvg(e, svgRef.value, { width: store.widthPx, height: store.heightPx });
}

/**
 * Generates an SVG path data string for a route edge.
 */
function getRoutePathD(edge: RouteEdge): string {
  const nodeA = store.pois.find((p) => p.id === edge.fromNodeId);
  const nodeB = store.pois.find((p) => p.id === edge.toNodeId);
  if (!nodeA || !nodeB) return '';

  const centerA = getNodeCenter(nodeA);
  const centerB = getNodeCenter(nodeB);

  if (store.displayMode === 'pokégear' || edge.waypoints.length === 0) {
    // Smooth schematic quadratic curve between node centers for Pokégear view
    const midX = (centerA.x + centerB.x) / 2;
    const midY = (centerA.y + centerB.y) / 2;
    const dx = centerB.x - centerA.x;
    const dy = centerB.y - centerA.y;
    const ctrlX = midX - dy * SCHEMATIC_CURVE_BOW_FACTOR;
    const ctrlY = midY + dx * SCHEMATIC_CURVE_BOW_FACTOR;
    return `M ${centerA.x.toFixed(1)} ${centerA.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${centerB.x.toFixed(1)} ${centerB.y.toFixed(1)}`;
  }

  // Hybrid mode: Path follows A* waypoints in pixel coordinates
  const pts: string[] = [`M ${centerA.x.toFixed(1)} ${centerA.y.toFixed(1)}`]; // no-domain: Estructura o identificador procedural de aventura
  for (const wp of edge.waypoints) {
    pts.push(`L ${(wp.x * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE).toFixed(1)} ${(wp.y * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE).toFixed(1)}`);
  }
  pts.push(`L ${centerB.x.toFixed(1)} ${centerB.y.toFixed(1)}`);
  return pts.join(' ');
}

const POI_BADGE_RADII = {
  METROPOLIS: 26,
  CITY: 20,
  TOWN: 16,
  CAVE_ENTRANCE: 15,
  PORT_DOCK: 15,
  ROUTE_GATE: 13,
  DUNGEON_FOREST: 17,
  WATER_LANDMARK: 16,
  DEFAULT: 14
} as const;

/**
 * Returns distinct badge styling for each heterogeneous POI type.
 */
function getPoiBadgeTheme(type: string): { color: string; radius: number; label: string } {
  switch (type) {
    case 'metropolis':
      return { color: '#f59e0b', radius: POI_BADGE_RADII.METROPOLIS, label: '★' };
    case 'city':
      return { color: '#ef4444', radius: POI_BADGE_RADII.CITY, label: '◆' };
    case 'town':
      return { color: '#3b82f6', radius: POI_BADGE_RADII.TOWN, label: '●' };
    case 'cave_entrance':
      return { color: '#8b5cf6', radius: POI_BADGE_RADII.CAVE_ENTRANCE, label: '▲' };
    case 'port_dock':
      return { color: '#06b6d4', radius: POI_BADGE_RADII.PORT_DOCK, label: '⚓' };
    case 'route_gate':
      return { color: '#64748b', radius: POI_BADGE_RADII.ROUTE_GATE, label: '▮' };
    case 'dungeon_forest':
      return { color: '#10b981', radius: POI_BADGE_RADII.DUNGEON_FOREST, label: '♣' };
    case 'water_landmark':
      return { color: '#6366f1', radius: POI_BADGE_RADII.WATER_LANDMARK, label: '✦' };
    default:
      return { color: '#94a3b8', radius: POI_BADGE_RADII.DEFAULT, label: '•' };
  }
}

// ---------------------------------------------------------------------------
// Pointer Drag & Drop Event Handlers (Directive 3)
// ---------------------------------------------------------------------------
function handlePointerDown(poi: POINode, e: PointerEvent): void {
  e.stopPropagation();
  (e.target as Element).setPointerCapture(e.pointerId);

  isDragging.value = true;
  activeDragNodeId.value = poi.id;
  store.draggedNodeId = poi.id;
  store.selectPOI(poi.id);

  const center = getNodeCenter(poi);
  const clickSvg = screenToSvgCoords(e);
  dragPointerOffset.value = {
    x: clickSvg.x - center.x,
    y: clickSvg.y - center.y
  };
}

function handlePointerMove(e: PointerEvent): void {
  if (!isDragging.value || !activeDragNodeId.value) return;

  const currentSvg = screenToSvgCoords(e);
  const rawX = currentSvg.x - dragPointerOffset.value.x;
  const rawY = currentSvg.y - dragPointerOffset.value.y;

  // Directiva 3: 60 FPS transient visual update without heavy computation
  store.updateNodeDragVisualPosition(activeDragNodeId.value, rawX, rawY);
}

function handlePointerUp(poi: POINode, e: PointerEvent): void {
  if (!isDragging.value || activeDragNodeId.value !== poi.id) return;
  try {
    (e.target as Element).releasePointerCapture(e.pointerId);
  } catch {
    // catch-ok: Pointer capture release fails gracefully if pointer was already lost
  }

  isDragging.value = false;
  const currentSvg = screenToSvgCoords(e);
  const targetX = currentSvg.x - dragPointerOffset.value.x;
  const targetY = currentSvg.y - dragPointerOffset.value.y;

  // Convert SVG pixel coordinates back to grid coordinates
  const newGridX = Math.max(
    2,
    Math.min(
      (store.continentMap?.width ?? DEFAULT_CONTINENT_GRID_DIMENSION) - poi.footprint.width - 2,
      Math.round((targetX - poi.footprint.width * STUDIO_TILE_SIZE) / CANVAS_TILE_SIZE)
    )
  );
  const newGridY = Math.max(
    2,
    Math.min(
      (store.continentMap?.height ?? DEFAULT_CONTINENT_GRID_DIMENSION) - poi.footprint.height - 2,
      Math.round((targetY - poi.footprint.height * STUDIO_TILE_SIZE) / CANVAS_TILE_SIZE)
    )
  );

  // Directiva 3: Dispatches targeted incident A* recalculation on pointerup
  store.handleNodeDragEnd(poi.id, newGridX, newGridY);
  activeDragNodeId.value = null;
}

const viewBoxAttr = computed(() => `0 0 ${store.widthPx} ${store.heightPx}`);
</script>

<template>
  <svg
    ref="svgRef"
    class="regional-network-svg"
    :viewBox="viewBoxAttr"
    preserveAspectRatio="xMidYMid meet"
    @pointermove="handlePointerMove"
  >
    <!-- Background grid in Pokégear mode -->
    <defs>
      <pattern
        id="pokegear-grid"
        width="64"
        height="64"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 64 0 L 0 0 0 64"
          fill="none"
          stroke="rgba(56, 189, 248, 0.08)"
          stroke-width="1"
        />
      </pattern>
      <filter
        id="badge-glow"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
      >
        <feGaussianBlur
          stdDeviation="6"
          result="blur"
        />
        <feComposite
          in="SourceGraphic"
          in2="blur"
          operator="over"
        />
      </filter>
    </defs>

    <rect
      v-if="store.displayMode === 'pokégear'"
      width="100%"
      height="100%"
      fill="#0c1322"
    />
    <rect
      v-if="store.displayMode === 'pokégear'"
      width="100%"
      height="100%"
      fill="url(#pokegear-grid)"
    />

    <!-- Route Edges Group -->
    <g
      v-if="store.displayMode !== 'tiles_only'"
      class="route-edges-layer"
    >
      <g
        v-for="edge in store.routes"
        id="regional-network-svg-overlay-g-store-selectroute"
        :key="edge.id"
        class="route-edge-item"
        :class="{
          'is-active': store.selectedRouteId === edge.id,
          'is-incident':
            store.selectedPOIId === edge.fromNodeId || store.selectedPOIId === edge.toNodeId
        }"
        @click="store.selectRoute(edge.id)"
      >
        <!-- Route outline/shadow for high visibility -->
        <path
          :d="getRoutePathD(edge)"
          class="route-halo"
          fill="none"
          stroke="rgba(15, 23, 42, 0.85)"
          stroke-width="12"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Primary Route Stroke -->
        <path
          :d="getRoutePathD(edge)"
          class="route-stroke"
          :class="edge.routeType"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
    </g>

    <!-- POI Nodes Group -->
    <g
      v-if="store.displayMode !== 'tiles_only'"
      class="poi-nodes-layer"
    >
      <g
        v-for="poi in store.pois"
        :key="poi.id"
        class="poi-node-item"
        :class="{
          'is-selected': store.selectedPOIId === poi.id,
          'is-hovered': store.hoveredPOIId === poi.id,
          'is-dragged': activeDragNodeId === poi.id
        }"
        :transform="`translate(${getNodeCenter(poi).x}, ${getNodeCenter(poi).y})`"
        @pointerdown="(e) => handlePointerDown(poi, e)"
        @pointerup="(e) => handlePointerUp(poi, e)"
        @mouseenter="store.setHoveredPOI(poi.id)"
        @mouseleave="store.setHoveredPOI(null)"
      >
        <!-- Outer Glowing Ring -->
        <circle
          v-gsap-loop="{ effect: 'pulse', active: store.selectedPOIId === poi.id || store.hoveredPOIId === poi.id || activeDragNodeId === poi.id }"
          class="poi-pulse-ring"
          r="32"
          :fill="getPoiBadgeTheme(poi.type).color"
          fill-opacity="0.25"
        />

        <!-- Base Pin Circle -->
        <circle
          class="poi-pin-badge"
          :r="getPoiBadgeTheme(poi.type).radius"
          :fill="getPoiBadgeTheme(poi.type).color"
          stroke="#ffffff"
          stroke-width="3.5"
          filter="url(#badge-glow)"
        />

        <!-- Center Icon/Symbol -->
        <text
          class="poi-symbol"
          text-anchor="middle"
          dominant-baseline="central"
          fill="#ffffff"
          font-weight="bold"
          font-size="14"
        >
          {{ getPoiBadgeTheme(poi.type).label }}
        </text>

        <!-- Settlement Name Pill -->
        <g
          class="poi-label-group"
          :transform="`translate(0, ${-getPoiBadgeTheme(poi.type).radius - 20})`"
        >
          <rect
            class="poi-label-bg"
            x="-75"
            y="-14"
            width="150"
            height="24"
            rx="6"
            fill="#0f172a"
            fill-opacity="0.9"
            stroke="rgba(255, 255, 255, 0.2)"
            stroke-width="1.5"
          />
          <text
            class="poi-label-text"
            text-anchor="middle"
            dominant-baseline="central"
            fill="#f8fafc"
          >
            {{ poi.name }}
          </text>
        </g>
      </g>
    </g>
  </svg>
</template>

<style scoped lang="scss">
.regional-network-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  user-select: none;
  touch-action: none;
}

.route-edge-item {
  pointer-events: none;

  &:hover,
  &.is-active,
  &.is-incident {
    .route-halo {
      stroke: Rgb(255 255 255 / 40%);
      stroke-width: 16;
    }
    .route-stroke {
      stroke-width: 9;
    }
  }

  .route-stroke {
    stroke-width: 6;

    &.road {
      stroke: #f1c40f;
    }
    &.mountain_pass {
      stroke: #b08968;
      stroke-dasharray: 8, 6;
    }
    &.water_crossing {
      stroke: #00d2d3;
    }
    &.forest_path {
      stroke: #2ecc71;
    }
  }
}

.poi-node-item {
  pointer-events: auto;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  &:hover {
    .poi-pulse-ring {
      opacity: 1;
    }
  }

  &.is-selected {
    .poi-pulse-ring {
      opacity: 1;
    }
  }

  &.is-dragged {
    cursor: grabbing;

    .poi-pulse-ring {
      opacity: 1;
    }
  }

  .poi-pulse-ring {
    opacity: 0;
  }

  .poi-label-group,
  .poi-label-bg,
  .poi-label-text {
    font-family: inherit;
    font-size: var(--font-11);
    font-weight: 700;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px Rgb(0 0 0 / 80%);
    pointer-events: none !important;
  }
}
</style>
