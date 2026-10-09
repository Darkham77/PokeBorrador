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
import type { POINode, RouteEdge } from '../../types/map/poiTypes.ts';

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
    x: node.gridX * 32 + node.footprint.width * 16,
    y: node.gridY * 32 + node.footprint.height * 16
  };
}

/**
 * Transforms screen client coordinates into SVG viewBox pixel coordinates.
 */
function screenToSvgCoords(e: PointerEvent): { x: number; y: number } {
  if (!svgRef.value) return { x: 0, y: 0 };
  const svg = svgRef.value;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svg.getScreenCTM();
  if (ctm) {
    const inverted = pt.matrixTransform(ctm.inverse());
    return {
      x: Math.max(0, Math.min(store.widthPx, inverted.x)),
      y: Math.max(0, Math.min(store.heightPx, inverted.y))
    };
  }
  const rect = svg.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(store.widthPx, ((e.clientX - rect.left) / rect.width) * store.widthPx)),
    y: Math.max(0, Math.min(store.heightPx, ((e.clientY - rect.top) / rect.height) * store.heightPx))
  };
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
    const ctrlX = midX - dy * 0.08;
    const ctrlY = midY + dx * 0.08;
    return `M ${centerA.x.toFixed(1)} ${centerA.y.toFixed(1)} Q ${ctrlX.toFixed(1)} ${ctrlY.toFixed(1)} ${centerB.x.toFixed(1)} ${centerB.y.toFixed(1)}`;
  }

  // Hybrid mode: Path follows A* waypoints in pixel coordinates
  const pts: string[] = [`M ${centerA.x.toFixed(1)} ${centerA.y.toFixed(1)}`]; // no-domain: Estructura o identificador procedural de aventura
  for (const wp of edge.waypoints) {
    pts.push(`L ${(wp.x * 32 + 16).toFixed(1)} ${(wp.y * 32 + 16).toFixed(1)}`);
  }
  pts.push(`L ${centerB.x.toFixed(1)} ${centerB.y.toFixed(1)}`);
  return pts.join(' ');
}

/**
 * Returns distinct badge styling for each heterogeneous POI type.
 */
function getPoiBadgeTheme(type: string): { color: string; radius: number; label: string } {
  switch (type) {
    case 'metropolis':
      return { color: '#f59e0b', radius: 26, label: '★' };
    case 'city':
      return { color: '#ef4444', radius: 20, label: '◆' };
    case 'town':
      return { color: '#3b82f6', radius: 16, label: '●' };
    case 'cave_entrance':
      return { color: '#8b5cf6', radius: 15, label: '▲' };
    case 'port_dock':
      return { color: '#06b6d4', radius: 15, label: '⚓' };
    case 'route_gate':
      return { color: '#64748b', radius: 13, label: '▮' };
    case 'dungeon_forest':
      return { color: '#10b981', radius: 17, label: '♣' };
    case 'water_landmark':
      return { color: '#6366f1', radius: 16, label: '✦' };
    default:
      return { color: '#94a3b8', radius: 14, label: '•' };
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
    // Ignored if pointer was lost
  }

  isDragging.value = false;
  const currentSvg = screenToSvgCoords(e);
  const targetX = currentSvg.x - dragPointerOffset.value.x;
  const targetY = currentSvg.y - dragPointerOffset.value.y;

  // Convert SVG pixel coordinates back to grid coordinates
  const newGridX = Math.max(
    2,
    Math.min(
      (store.continentMap?.width ?? 128) - poi.footprint.width - 2,
      Math.round((targetX - poi.footprint.width * 16) / 32)
    )
  );
  const newGridY = Math.max(
    2,
    Math.min(
      (store.continentMap?.height ?? 128) - poi.footprint.height - 2,
      Math.round((targetY - poi.footprint.height * 16) / 32)
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
  transition: opacity 0.2s ease;

  .route-stroke {
    stroke-width: 6;
    transition: stroke-width 0.2s ease, stroke 0.2s ease;

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

  &:hover,
  &.is-active,
  &.is-incident {
    .route-halo {
      stroke: Rgba(255, 255, 255, 0.4);
      stroke-width: 16;
    }
    .route-stroke {
      stroke-width: 9;
    }
  }
}

.poi-node-item {
  pointer-events: auto;
  cursor: grab;

  &:active,
  &.is-dragged {
    cursor: grabbing;
  }

  .poi-pulse-ring {
    opacity: 0;
    transition: opacity 0.2s ease, r 0.2s ease;
  }

  &:hover,
  &.is-selected,
  &.is-dragged {
    .poi-pulse-ring {
      opacity: 1;
      animation: pulse-ring 1.8s infinite ease-out;
    }
  }

  .poi-label-group,
  .poi-label-bg,
  .poi-label-text {
    font-size: 11px;
    font-weight: 700;
    font-family: inherit;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px Rgba(0, 0, 0, 0.8);
    pointer-events: none !important;
  }
}

@keyframes pulse-ring {
  0% {
    r: 22px;
    opacity: 0.6;
  }
  100% {
    r: 42px;
    opacity: 0;
  }
}
</style>
