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
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
import { screenToSvgCoords as transformScreenToSvg } from '../../logic/utils/svgCoordinateUtils.ts';

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
  return transformScreenToSvg(e as PointerEvent, svgRef.value, {
    width: store.widthPx,
    height: store.heightPx
  });
}

function getBuildingTitle(type: UrbanBuildingType): string {
  switch (type) {
    case 'pokecenter':
      return 'Centro Pokémon';
    case 'pokemart':
      return 'PokéMart';
    case 'gym':
      return 'Gimnasio';
    case 'lab':
      return 'Laboratorio';
    case 'tower':
      return 'Torre';
    case 'condo':
      return 'Condominio';
    case 'house':
      return 'Casa';
    default:
      return 'Edificio';
  }
}

function getPropEmoji(type: UrbanPropType): string {
  switch (type) {
    case 'lamp':
      return '💡';
    case 'bench':
      return '🪑';
    case 'flower':
      return '🌸';
    case 'fountain':
      return '⛲';
    case 'statue':
      return '🗿';
    case 'bush':
      return '🪵';
    case 'tree':
      return '🌲';
    case 'fence_h':
    case 'fence_v':
      return '🚧';
    default:
      return '✨';
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
      x: svgPt.x - b.x * CANVAS_TILE_SIZE,
      y: svgPt.y - b.y * CANVAS_TILE_SIZE
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
      x: svgPt.x - p.x * CANVAS_TILE_SIZE,
      y: svgPt.y - p.y * CANVAS_TILE_SIZE
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
  const rawTargetX = Math.round((svgPt.x - activeDrag.value.pointerOffset.x) / CANVAS_TILE_SIZE);
  const rawTargetY = Math.round((svgPt.y - activeDrag.value.pointerOffset.y) / CANVAS_TILE_SIZE);

  const maxX = Math.floor(store.widthPx / CANVAS_TILE_SIZE) - activeDrag.value.width;
  const maxY = Math.floor(store.heightPx / CANVAS_TILE_SIZE) - activeDrag.value.height;

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

  const { type, id, currentGridX, currentGridY, initialGridX, initialGridY, width, height } =
    activeDrag.value;
  const poiId = currentPoi.value.id;

  const hasMoved = currentGridX !== initialGridX || currentGridY !== initialGridY;

  if (hasMoved) {
    const isInvalid = checkBuildingCollision(
      currentPoi.value,
      id,
      currentGridX,
      currentGridY,
      width,
      height
    );

    if (isInvalid) {
      // Revert if colliding
      console.warn(
        `[RegionalUrbanSvgOverlay] Posición (${currentGridX}, ${currentGridY}) no válida por colisión.`
      );
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

const HALF_TILE_SIZE = 16;
const PERIMETER_LABEL_OFFSET = 8;
const DOOR_ICON_Y_OFFSET = 20;
const BUILDING_SUBTITLE_Y_OFFSET = 28;
const COLLISION_LABEL_Y_OFFSET = 42;
const PROP_ICON_Y_OFFSET = 22;

const poiPerimeterBounds = computed(() => {
  if (!currentPoi.value) return null;
  const poi = currentPoi.value;
  return {
    x: poi.gridX * CANVAS_TILE_SIZE,
    y: poi.gridY * CANVAS_TILE_SIZE,
    width: poi.footprint.width * CANVAS_TILE_SIZE,
    height: poi.footprint.height * CANVAS_TILE_SIZE,
    textX: poi.gridX * CANVAS_TILE_SIZE + PERIMETER_LABEL_OFFSET,
    textY: poi.gridY * CANVAS_TILE_SIZE - PERIMETER_LABEL_OFFSET
  };
});

function getBuildingX(b: UrbanBuildingPlacement): number {
  const gridX =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridX : b.x;
  return gridX * CANVAS_TILE_SIZE + (b.pixelOffsetX ?? 0);
}

function getBuildingY(b: UrbanBuildingPlacement): number {
  const gridY =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridY : b.y;
  return gridY * CANVAS_TILE_SIZE + (b.pixelOffsetY ?? 0);
}

function getBuildingWidth(b: UrbanBuildingPlacement): number {
  return b.width * CANVAS_TILE_SIZE;
}

function getBuildingHeight(b: UrbanBuildingPlacement): number {
  return b.height * CANVAS_TILE_SIZE;
}

function getBuildingDoorX(b: UrbanBuildingPlacement): number {
  const gridX =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridX : b.x;
  return (gridX + (b.doorX - b.x)) * CANVAS_TILE_SIZE + HALF_TILE_SIZE + (b.pixelOffsetX ?? 0);
}

function getBuildingDoorY(b: UrbanBuildingPlacement): number {
  const gridY =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridY : b.y;
  return (gridY + (b.doorY - b.y)) * CANVAS_TILE_SIZE + HALF_TILE_SIZE + (b.pixelOffsetY ?? 0);
}

function getBuildingDoorIconY(b: UrbanBuildingPlacement): number {
  const gridY =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridY : b.y;
  return (gridY + (b.doorY - b.y)) * CANVAS_TILE_SIZE + DOOR_ICON_Y_OFFSET + (b.pixelOffsetY ?? 0);
}

function getBuildingCenterX(b: UrbanBuildingPlacement): number {
  const gridX =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridX : b.x;
  return (gridX + b.width / 2) * CANVAS_TILE_SIZE + (b.pixelOffsetX ?? 0);
}

function getBuildingLabelY(b: UrbanBuildingPlacement): number {
  const gridY =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridY : b.y;
  return gridY * CANVAS_TILE_SIZE + HALF_TILE_SIZE + (b.pixelOffsetY ?? 0);
}

function getBuildingCoordsCenterX(b: UrbanBuildingPlacement): number {
  const gridX =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridX : b.x;
  return (gridX + b.width / 2) * CANVAS_TILE_SIZE;
}

function getBuildingCoordsY(b: UrbanBuildingPlacement): number {
  const gridY =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridY : b.y;
  return gridY * CANVAS_TILE_SIZE + BUILDING_SUBTITLE_Y_OFFSET;
}

function getBuildingCollisionLabelY(b: UrbanBuildingPlacement): number {
  const gridY =
    isDragging.value && activeDrag.value?.id === b.id ? activeDrag.value.currentGridY : b.y;
  return gridY * CANVAS_TILE_SIZE + COLLISION_LABEL_Y_OFFSET;
}

function getPropX(p: UrbanPropPlacement): number {
  const isTarget = isDragging.value && activeDrag.value?.id === `prop_${p.x}_${p.y}`;
  const gridX = isTarget ? (activeDrag.value?.currentGridX ?? p.x) : p.x;
  return gridX * CANVAS_TILE_SIZE;
}

function getPropY(p: UrbanPropPlacement): number {
  const isTarget = isDragging.value && activeDrag.value?.id === `prop_${p.x}_${p.y}`;
  const gridY = isTarget ? (activeDrag.value?.currentGridY ?? p.y) : p.y;
  return gridY * CANVAS_TILE_SIZE;
}

function getPropIconX(p: UrbanPropPlacement): number {
  return getPropX(p) + HALF_TILE_SIZE;
}

function getPropIconY(p: UrbanPropPlacement): number {
  return getPropY(p) + PROP_ICON_Y_OFFSET;
}
</script>

<template>
  <svg
    v-if="currentPoi && poiPerimeterBounds && store.displayMode !== 'pokégear'"
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
        :x="poiPerimeterBounds.x"
        :y="poiPerimeterBounds.y"
        :width="poiPerimeterBounds.width"
        :height="poiPerimeterBounds.height"
        class="perimeter-rect"
      />
      <text
        :x="poiPerimeterBounds.textX"
        :y="poiPerimeterBounds.textY"
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
          :x="getBuildingX(b)"
          :y="getBuildingY(b)"
          :width="getBuildingWidth(b)"
          :height="getBuildingHeight(b)"
          rx="6"
          class="building-rect"
        />

        <!-- Door Indicator -->
        <circle
          :cx="getBuildingDoorX(b)"
          :cy="getBuildingDoorY(b)"
          r="6"
          class="building-door-marker"
        />
        <text
          :x="getBuildingDoorX(b)"
          :y="getBuildingDoorIconY(b)"
          text-anchor="middle"
          class="door-icon"
        >
          🚪
        </text>

        <!-- Building Label -->
        <text
          :x="getBuildingCenterX(b)"
          :y="getBuildingLabelY(b)"
          text-anchor="middle"
          class="building-title-label"
        >
          {{ getBuildingTitle(b.type) }}
        </text>

        <!-- Coordinates Subtitle -->
        <text
          :x="getBuildingCoordsCenterX(b)"
          :y="getBuildingCoordsY(b)"
          text-anchor="middle"
          class="building-coords-label"
        >
          ({{ isDragging && activeDrag?.id === b.id ? activeDrag.currentGridX : b.x }},
          {{ isDragging && activeDrag?.id === b.id ? activeDrag.currentGridY : b.y }})
        </text>

        <!-- Dynamic Collision Warning -->
        <text
          v-if="isDragging && activeDrag?.id === b.id && isCurrentlyColliding"
          :x="getBuildingCoordsCenterX(b)"
          :y="getBuildingCollisionLabelY(b)"
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
          'is-colliding':
            isDragging && activeDrag?.id === `prop_${p.x}_${p.y}` && isCurrentlyColliding
        }"
        @pointerdown="startDragProp($event, p)"
      >
        <rect :x="getPropX(p)" :y="getPropY(p)" width="32" height="32" rx="4" class="prop-rect" />
        <text :x="getPropIconX(p)" :y="getPropIconY(p)" text-anchor="middle" class="prop-icon">
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
  z-index: var(--z-modal-step);
  pointer-events: none;
}

.urban-interactive-element {
  pointer-events: auto;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.perimeter-rect {
  fill: Rgb(56 189 248 / 4%);
  stroke: var(--sky);
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

.perimeter-name-badge {
  font-size: var(--font-11);
  font-weight: 700;
  fill: var(--sky);
  letter-spacing: 0.5px;
}

.building-group {
  .building-rect {
    fill: Rgb(30 41 59 / 70%);
    stroke: var(--sky-dark);
    stroke-width: 2;
    stroke-dasharray: 4 2;
  }

  .building-door-marker {
    fill: var(--amber-dark);
    stroke: var(--white);
    stroke-width: 1.5;
  }

  .door-icon {
    font-size: var(--font-10);
    pointer-events: none;
  }

  .building-title-label {
    font-size: var(--font-10);
    font-weight: 700;
    fill: var(--slate-50);
    pointer-events: none;
  }

  .building-coords-label {
    font-size: var(--font-9);
    font-weight: 600;
    fill: var(--slate-400);
    pointer-events: none;
  }

  .building-collision-label {
    font-size: var(--font-9);
    font-weight: 700;
    fill: var(--red-light);
    pointer-events: none;
  }

  &.is-selected {
    .building-rect {
      stroke: var(--amber);
      stroke-width: 2.5;
      stroke-dasharray: none;
      fill: Rgb(245 158 11 / 25%);
    }
  }

  &.is-dragging {
    opacity: 0.9;
    .building-rect {
      stroke: var(--emerald);
      stroke-width: 2.5;
      fill: Rgb(34 197 94 / 30%);
    }

    &.is-colliding {
      .building-rect {
        stroke: var(--red-light);
        stroke-width: 3;
        fill: Rgb(239 68 68 / 45%);
      }
    }
  }
}

.prop-group {
  .prop-rect {
    fill: Rgb(255 255 255 / 8%);
    stroke: Rgb(255 255 255 / 30%);
    stroke-width: 1;
    stroke-dasharray: 2 2;
  }

  .prop-icon {
    font-size: var(--font-14);
    pointer-events: none;
  }

  &.is-selected {
    .prop-rect {
      stroke: var(--amber);
      stroke-width: 2;
      stroke-dasharray: none;
      fill: Rgb(245 158 11 / 30%);
    }
  }

  &.is-dragging {
    .prop-rect {
      stroke: var(--emerald);
      stroke-width: 2;
      fill: Rgb(34 197 94 / 40%);
    }

    &.is-colliding {
      .prop-rect {
        stroke: var(--red-light);
        stroke-width: 2.5;
        fill: Rgb(239 68 68 / 50%);
      }
    }
  }
}
</style>
