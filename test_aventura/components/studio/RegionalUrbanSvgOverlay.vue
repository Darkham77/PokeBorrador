<script setup lang="ts">
/**
 * src/components/map/RegionalUrbanSvgOverlay.vue
 *
 * 60 FPS INTERACTIVE SVG OVERLAY FOR SELECTED SETTLEMENT ARCHITECTURE
 *
 * Provides:
 *   1. City footprint boundary & gateway indicators.
 *   2. Snapped 32px drag & drop for buildings and urban props.
 *   3. Real-time collision detection (green on valid spot, red on overlap/blocking).
 *   4. Instant synchronization with continentStudioStore and canvas re-render.
 */

import { ref, computed } from 'vue';
import { useRegionalContinentStudioStore } from '../../stores/continentStudioStore.ts';
import type {
  UrbanBuildingPlacement,
  UrbanBuildingType,
  UrbanPropPlacement,
  UrbanPropType,
  UrbanElementType
} from '../../types/map/poiTypes.ts';
import { checkBuildingCollision } from '../../logic/map/settlementPlacementHelper.ts';

const store = useRegionalContinentStudioStore();
const svgRef = ref<SVGSVGElement | null>(null);

const currentPoi = computed(() => store.selectedPOI);

interface ActiveDragElement {
  readonly type: UrbanElementType;
  readonly id: string;
  readonly initialGridX: number;
  readonly initialGridY: number;
  currentGridX: number;
  currentGridY: number;
  readonly width: number;
  readonly height: number;
  readonly pointerOffset: { readonly x: number; readonly y: number };
}

const isDragging = ref<boolean>(false);
const activeDrag = ref<ActiveDragElement | null>(null);
const isCurrentlyColliding = ref<boolean>(false);

function screenToSvgCoords(e: PointerEvent | MouseEvent): { x: number; y: number } {
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

function getBuildingTitle(type: UrbanBuildingType): string {
  switch (type) {
    case 'pokecenter': return 'Centro Pokémon';
    case 'pokemart': return 'PokéMart';
    case 'gym': return 'Gimnasio';
    case 'lab': return 'Laboratorio';
    case 'tower': return 'Torre';
    case 'condo': return 'Condominio';
    case 'house': return 'Casa';
    default: return 'Edificio';
  }
}

function getPropEmoji(type: UrbanPropType): string {
  switch (type) {
    case 'lamp': return '💡';
    case 'bench': return '🪑';
    case 'flower': return '🌸';
    case 'fountain': return '⛲';
    case 'statue': return '🗿';
    case 'bush': return '🪵';
    case 'tree': return '🌲';
    case 'fence_h':
    case 'fence_v': return '🚧';
    default: return '✨';
  }
}

function startDragBuilding(e: PointerEvent, b: UrbanBuildingPlacement): void {
  if (e.button !== 0) return;
  e.stopPropagation();

  store.selectUrbanElement({ type: 'building', id: b.id });
  const svgPt = screenToSvgCoords(e);

  activeDrag.value = {
    type: 'building',
    id: b.id,
    initialGridX: b.x,
    initialGridY: b.y,
    currentGridX: b.x,
    currentGridY: b.y,
    width: b.width,
    height: b.height,
    pointerOffset: {
      x: svgPt.x - b.x * 32,
      y: svgPt.y - b.y * 32
    }
  };
  isDragging.value = true;
  isCurrentlyColliding.value = false;

  const targetEl = e.currentTarget as Element | null;
  targetEl?.setPointerCapture?.(e.pointerId);
}

function startDragProp(e: PointerEvent, p: UrbanPropPlacement): void {
  if (e.button !== 0) return;
  e.stopPropagation();

  const propId = p.id ?? `prop_${p.x}_${p.y}`;
  store.selectUrbanElement({ type: 'prop', id: propId });
  const svgPt = screenToSvgCoords(e);

  activeDrag.value = {
    type: 'prop',
    id: propId,
    initialGridX: p.x,
    initialGridY: p.y,
    currentGridX: p.x,
    currentGridY: p.y,
    width: 1,
    height: 1,
    pointerOffset: {
      x: svgPt.x - p.x * 32,
      y: svgPt.y - p.y * 32
    }
  };
  isDragging.value = true;
  isCurrentlyColliding.value = false;

  const targetEl = e.currentTarget as Element | null;
  targetEl?.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e: PointerEvent): void {
  if (!isDragging.value || !activeDrag.value || !currentPoi.value) return;

  const svgPt = screenToSvgCoords(e);
  const rawTargetX = Math.round((svgPt.x - activeDrag.value.pointerOffset.x) / 32);
  const rawTargetY = Math.round((svgPt.y - activeDrag.value.pointerOffset.y) / 32);

  const maxX = Math.floor(store.widthPx / 32) - activeDrag.value.width;
  const maxY = Math.floor(store.heightPx / 32) - activeDrag.value.height;

  const boundedX = Math.max(0, Math.min(maxX, rawTargetX));
  const boundedY = Math.max(0, Math.min(maxY, rawTargetY));

  activeDrag.value.currentGridX = boundedX;
  activeDrag.value.currentGridY = boundedY;

  isCurrentlyColliding.value = checkBuildingCollision(
    currentPoi.value,
    activeDrag.value.id,
    boundedX,
    boundedY,
    activeDrag.value.width,
    activeDrag.value.height
  );
}

function onPointerUp(): void {
  if (!isDragging.value || !activeDrag.value || !currentPoi.value) {
    isDragging.value = false;
    activeDrag.value = null;
    isCurrentlyColliding.value = false;
    return;
  }

  const { type, id, currentGridX, currentGridY, initialGridX, initialGridY, width, height } = activeDrag.value;
  const poiId = currentPoi.value.id;

  const hasMoved = currentGridX !== initialGridX || currentGridY !== initialGridY;

  if (hasMoved) {
    const isInvalid = checkBuildingCollision(currentPoi.value, id, currentGridX, currentGridY, width, height);

    if (isInvalid) {
      // Revert if colliding
      console.warn(`[RegionalUrbanSvgOverlay] Posición (${currentGridX}, ${currentGridY}) no válida por colisión.`);
    } else if (type === 'building') {
      store.moveBuildingInPOI(poiId, id, currentGridX, currentGridY);
    } else {
      store.movePropInPOI(poiId, id, currentGridX, currentGridY);
    }
  }

  isDragging.value = false;
  activeDrag.value = null;
  isCurrentlyColliding.value = false;
}
</script>

<template>
  <svg
    v-if="currentPoi && store.displayMode !== 'pokégear'"
    ref="svgRef"
    class="regional-urban-svg-overlay"
    :viewBox="`0 0 ${store.widthPx} ${store.heightPx}`"
    :width="store.widthPx"
    :height="store.heightPx"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <!-- 1. Settlement Footprint Perimeter -->
    <g class="settlement-perimeter-group">
      <rect
        :x="currentPoi.gridX * 32"
        :y="currentPoi.gridY * 32"
        :width="currentPoi.footprint.width * 32"
        :height="currentPoi.footprint.height * 32"
        class="perimeter-rect"
      />
      <text
        :x="currentPoi.gridX * 32 + 8"
        :y="currentPoi.gridY * 32 - 8"
        class="perimeter-name-badge perimeter-name-icon"
      >
        🏙️ {{ currentPoi.name }} (Límites Urbanos)
      </text>
    </g>

    <!-- 2. Buildings -->
    <g class="buildings-layer">
      <g
        v-for="b in currentPoi.urbanLayout?.buildings ?? []"
        :key="b.id"
        class="urban-interactive-element building-group"
        :class="{
          'is-selected': store.selectedUrbanElement?.id === b.id,
          'is-dragging': isDragging && activeDrag?.id === b.id,
          'is-colliding': isDragging && activeDrag?.id === b.id && isCurrentlyColliding
        }"
        @pointerdown="startDragBuilding($event, b)"
      >
        <!-- Bounding Box -->
        <rect
          :x="(isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x) * 32 + (b.pixelOffsetX ?? 0)"
          :y="(isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y) * 32 + (b.pixelOffsetY ?? 0)"
          :width="b.width * 32"
          :height="b.height * 32"
          rx="6"
          class="building-rect"
        />

        <!-- Door Indicator -->
        <circle
          :cx="((isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x) + (b.doorX - b.x)) * 32 + 16 + (b.pixelOffsetX ?? 0)"
          :cy="((isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y) + (b.doorY - b.y)) * 32 + 16 + (b.pixelOffsetY ?? 0)"
          r="6"
          class="building-door-marker"
        />
        <text
          :x="((isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x) + (b.doorX - b.x)) * 32 + 16 + (b.pixelOffsetX ?? 0)"
          :y="((isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y) + (b.doorY - b.y)) * 32 + 20 + (b.pixelOffsetY ?? 0)"
          text-anchor="middle"
          class="door-icon"
        >
          🚪
        </text>

        <!-- Building Label -->
        <text
          :x="((isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x) + b.width / 2) * 32 + (b.pixelOffsetX ?? 0)"
          :y="(isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y) * 32 + 16 + (b.pixelOffsetY ?? 0)"
          text-anchor="middle"
          class="building-title-label"
        >
          {{ getBuildingTitle(b.type) }}
        </text>

        <!-- Coordinates Subtitle -->
        <text
          :x="((isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x) + b.width / 2) * 32"
          :y="(isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y) * 32 + 28"
          text-anchor="middle"
          class="building-coords-label"
        >
          ({{ isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x }}, {{ isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y }})
        </text>

        <!-- Dynamic Collision Warning -->
        <text
          v-if="isDragging && activeDrag?.id === b.id && isCurrentlyColliding"
          :x="((isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x) + b.width / 2) * 32"
          :y="(isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y) * 32 + 42"
          text-anchor="middle"
          class="building-collision-label building-collision-icon"
        >
          ⚠️ Colisión / Bloqueo
        </text>
      </g>
    </g>

    <!-- 3. Props (Decorations & Furniture) -->
    <g class="props-layer">
      <g
        v-for="p in currentPoi.urbanLayout?.props ?? []"
        :key="`prop_${p.x}_${p.y}`"
        class="urban-interactive-element prop-group"
        :class="{
          'is-selected': store.selectedUrbanElement?.id === `prop_${p.x}_${p.y}`,
          'is-dragging': isDragging && activeDrag?.id === `prop_${p.x}_${p.y}`,
          'is-colliding': isDragging && activeDrag?.id === `prop_${p.x}_${p.y}` && isCurrentlyColliding
        }"
        @pointerdown="startDragProp($event, p)"
      >
        <rect
          :x="(isDragging && activeDrag?.id === `prop_${p.x}_${p.y}` ? (activeDrag?.currentGridX ?? p.x) : p.x) * 32"
          :y="(isDragging && activeDrag?.id === `prop_${p.x}_${p.y}` ? (activeDrag?.currentGridY ?? p.y) : p.y) * 32"
          width="32"
          height="32"
          rx="4"
          class="prop-rect"
        />
        <text
          :x="(isDragging && activeDrag?.id === `prop_${p.x}_${p.y}` ? (activeDrag?.currentGridX ?? p.x) : p.x) * 32 + 16"
          :y="(isDragging && activeDrag?.id === `prop_${p.x}_${p.y}` ? (activeDrag?.currentGridY ?? p.y) : p.y) * 32 + 22"
          text-anchor="middle"
          class="prop-icon"
        >
          {{ getPropEmoji(p.type) }}
        </text>
      </g>
    </g>
  </svg>
</template>

<style scoped lang="scss">
.regional-urban-svg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: var(--z-modal-step);
}

.urban-interactive-element {
  pointer-events: auto;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.perimeter-rect {
  fill: Rgba(56, 189, 248, 0.04);
  stroke: #38bdf8;
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.perimeter-name-badge {
  font-size: 11px;
  font-weight: 700;
  fill: #38bdf8;
  letter-spacing: 0.5px;
}

.building-group {
  .building-rect {
    fill: Rgba(30, 41, 59, 0.7);
    stroke: #0284c7;
    stroke-width: 2;
    stroke-dasharray: 4 2;
    transition: fill 0.1s ease, stroke 0.1s ease;
  }

  .building-door-marker {
    fill: #f59e0b;
    stroke: #ffffff;
    stroke-width: 1.5;
  }

  .door-icon {
    font-size: 10px;
    pointer-events: none;
  }

  .building-title-label {
    font-size: 10px;
    font-weight: 700;
    fill: #f8fafc;
    pointer-events: none;
  }

  .building-coords-label {
    font-size: 9px;
    font-weight: 600;
    fill: #94a3b8;
    pointer-events: none;
  }

  .building-collision-label {
    font-size: 9px;
    font-weight: 700;
    fill: #ef4444;
    pointer-events: none;
  }

  &.is-selected {
    .building-rect {
      stroke: #fbbf24;
      stroke-width: 2.5;
      stroke-dasharray: none;
      fill: Rgba(245, 158, 11, 0.25);
    }
  }

  &.is-dragging {
    opacity: 0.9;
    .building-rect {
      stroke: #22c55e;
      stroke-width: 2.5;
      fill: Rgba(34, 197, 94, 0.3);
    }

    &.is-colliding {
      .building-rect {
        stroke: #ef4444;
        stroke-width: 3;
        fill: Rgba(239, 68, 68, 0.45);
      }
    }
  }
}

.prop-group {
  .prop-rect {
    fill: Rgba(255, 255, 255, 0.08);
    stroke: Rgba(255, 255, 255, 0.3);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }

  .prop-icon {
    font-size: 14px;
    pointer-events: none;
  }

  &.is-selected {
    .prop-rect {
      stroke: #fbbf24;
      stroke-width: 2;
      stroke-dasharray: none;
      fill: Rgba(245, 158, 11, 0.3);
    }
  }

  &.is-dragging {
    .prop-rect {
      stroke: #22c55e;
      stroke-width: 2;
      fill: Rgba(34, 197, 94, 0.4);
    }

    &.is-colliding {
      .prop-rect {
        stroke: #ef4444;
        stroke-width: 2.5;
        fill: Rgba(239, 68, 68, 0.5);
      }
    }
  }
}
</style>
