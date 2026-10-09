<script setup lang="ts">
import { ref, computed } from 'vue';
import { useContinentStudioStore } from '../../stores/continentStudio';
import type { ContinentNode } from '../../types/map/continentTypes';

const store = useContinentStudioStore();
const nodesList = computed<ContinentNode[]>(() => Object.values(store.activeProject.nodes));

const viewportRef = ref<HTMLDivElement | null>(null);

// Pan & Drag state
const isPanning = ref(false);
const panStart = ref({ x: 0, y: 0 });
const panOrigin = ref({ x: 0, y: 0 });

// Dragging Node state
const draggedNodeId = ref<string | null>(null);
const dragStartMouse = ref({ x: 0, y: 0 });
const dragStartNodePos = ref({ x: 0, y: 0 });

// Connection creation tool state
const connectStartNodeId = ref<string | null>(null);
const mouseWorldPos = ref({ x: 0, y: 0 });

const worldWidth = computed(() => store.activeProject.config.dimensions.width);
const worldHeight = computed(() => store.activeProject.config.dimensions.height);

const transformStyle = computed(() => ({
  transform: `translate3d(${store.panX}px, ${store.panY}px, 0) scale(${store.zoom})`,
  transformOrigin: '0 0'
}));

function screenToWorld(clientX: number, clientY: number) {
  if (!viewportRef.value) return { x: 0, y: 0 };
  const rect = viewportRef.value.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  const x = (screenX - store.panX) / store.zoom;
  const y = (screenY - store.panY) / store.zoom;
  return {
    x: Math.max(0, Math.min(worldWidth.value, x)),
    y: Math.max(0, Math.min(worldHeight.value, y))
  };
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  if (!viewportRef.value) return;
  const rect = viewportRef.value.getBoundingClientRect();
  const cursorX = e.clientX - rect.left;
  const cursorY = e.clientY - rect.top;

  const currentZoom = store.zoom;
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const nextZoom = Math.max(0.2, Math.min(3.0, currentZoom * zoomFactor));

  const newPanX = cursorX - (cursorX - store.panX) * (nextZoom / currentZoom);
  const newPanY = cursorY - (cursorY - store.panY) * (nextZoom / currentZoom);

  store.setZoom(nextZoom);
  store.setPan(newPanX, newPanY);
}

function handleViewportPointerDown(e: PointerEvent) {
  if (e.button === 1 || (e.button === 0 && store.activeTool === 'pointer' && !draggedNodeId.value)) {
    isPanning.value = true;
    panStart.value = { x: e.clientX, y: e.clientY };
    panOrigin.value = { x: store.panX, y: store.panY };
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }
}

function handleViewportPointerMove(e: PointerEvent) {
  const world = screenToWorld(e.clientX, e.clientY);
  mouseWorldPos.value = world;

  if (draggedNodeId.value) {
    const dx = (e.clientX - dragStartMouse.value.x) / store.zoom;
    const dy = (e.clientY - dragStartMouse.value.y) / store.zoom;
    const newX = Math.round(dragStartNodePos.value.x + dx);
    const newY = Math.round(dragStartNodePos.value.y + dy);
    store.moveNode(draggedNodeId.value, newX, newY);
    return;
  }

  if (isPanning.value) {
    const dx = e.clientX - panStart.value.x;
    const dy = e.clientY - panStart.value.y;
    store.setPan(panOrigin.value.x + dx, panOrigin.value.y + dy);
  }
}

function handleViewportPointerUp(e: PointerEvent) {
  if (draggedNodeId.value) {
    draggedNodeId.value = null;
    store.pushHistory();
  }
  if (isPanning.value) {
    isPanning.value = false;
  }
  try {
    (e.currentTarget as HTMLElement)?.releasePointerCapture(e.pointerId);
  } catch {
    // ignore
  }
}

function handleNodePointerDown(e: PointerEvent, nodeId: string) {
  e.stopPropagation();

  if (store.activeTool === 'delete') {
    store.deleteNode(nodeId);
    return;
  }

  if (store.activeTool === 'connect') {
    if (!connectStartNodeId.value) {
      connectStartNodeId.value = nodeId;
    } else if (connectStartNodeId.value !== nodeId) {
      store.addConnection(connectStartNodeId.value, nodeId);
      connectStartNodeId.value = null;
    }
    return;
  }

  // Pointer / Drag Tool
  store.selectedNodeId = nodeId;
  const node = store.activeProject.nodes[nodeId];
  if (node) {
    draggedNodeId.value = nodeId;
    dragStartMouse.value = { x: e.clientX, y: e.clientY };
    dragStartNodePos.value = { x: node.x, y: node.y };
    (e.currentTarget as HTMLElement)?.setPointerCapture(e.pointerId);
  }
}

function handleNodeDblClick(e: MouseEvent, nodeId: string) {
  e.stopPropagation();
  const node = store.activeProject.nodes[nodeId];
  if (!node) return;
  const newName = prompt('Editar nombre de la ciudad:', node.name);
  if (newName && newName.trim()) {
    store.renameNode(nodeId, newName.trim());
  }
}

function handleRouteClick(e: MouseEvent, u: string, v: string) {
  e.stopPropagation();
  if (store.activeTool === 'delete') {
    store.removeConnection(u, v);
  }
}

function handleCanvasClick(e: MouseEvent) {
  if (store.activeTool === 'add_node') {
    const world = screenToWorld(e.clientX, e.clientY);
    const name = prompt('Nombre de la nueva población:', 'Nueva Ciudad');
    if (name && name.trim()) {
      store.addNode(name.trim(), world.x, world.y);
      store.activeTool = 'pointer';
    }
    return;
  }

  if (connectStartNodeId.value) {
    connectStartNodeId.value = null;
  }
}
</script>

<template>
  <div
    ref="viewportRef"
    class="connections-viewport-container"
    @wheel="handleWheel"
    @pointerdown="handleViewportPointerDown"
    @pointermove="handleViewportPointerMove"
    @pointerup="handleViewportPointerUp"
    @click="handleCanvasClick"
  >
    <div
      class="svg-world-wrapper"
      :style="transformStyle"
    >
      <svg
        :viewBox="`0 0 ${worldWidth} ${worldHeight}`"
        :width="worldWidth"
        :height="worldHeight"
        class="connections-svg-canvas"
      >
        <!-- Grid pattern background -->
        <defs>
          <pattern
            id="conn-subgrid"
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 64 0 L 0 0 0 64"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              stroke-width="1"
            />
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#conn-subgrid)"
        />

        <!-- Route Lines -->
        <g class="routes-group">
          <template
            v-for="[u, v] in store.activeProject.connections"
            :key="`${u}:${v}`"
          >
            <!-- Background click hitbox -->
            <line
              v-if="store.activeProject.nodes[u] && store.activeProject.nodes[v]"
              :id="`route-hitbox-${u}-${v}`"
              :x1="store.activeProject.nodes[u]!.x"
              :y1="store.activeProject.nodes[u]!.y"
              :x2="store.activeProject.nodes[v]!.x"
              :y2="store.activeProject.nodes[v]!.y"
              stroke="transparent"
              stroke-width="20"
              stroke-linecap="round"
              class="route-hitbox"
              @click="(e) => handleRouteClick(e, u, v)"
            />
            <!-- Outer border -->
            <line
              v-if="store.activeProject.nodes[u] && store.activeProject.nodes[v]"
              :x1="store.activeProject.nodes[u]!.x"
              :y1="store.activeProject.nodes[u]!.y"
              :x2="store.activeProject.nodes[v]!.x"
              :y2="store.activeProject.nodes[v]!.y"
              stroke="#0f172a"
              stroke-width="12"
              stroke-linecap="round"
            />
            <!-- Inner road surface -->
            <line
              v-if="store.activeProject.nodes[u] && store.activeProject.nodes[v]"
              :x1="store.activeProject.nodes[u]!.x"
              :y1="store.activeProject.nodes[u]!.y"
              :x2="store.activeProject.nodes[v]!.x"
              :y2="store.activeProject.nodes[v]!.y"
              stroke="#fde047"
              stroke-width="6"
              stroke-linecap="round"
              class="route-line"
            />
          </template>

          <!-- Elastic Connection Line while connecting -->
          <line
            v-if="connectStartNodeId && store.activeProject.nodes[connectStartNodeId]"
            :x1="store.activeProject.nodes[connectStartNodeId]!.x"
            :y1="store.activeProject.nodes[connectStartNodeId]!.y"
            :x2="mouseWorldPos.x"
            :y2="mouseWorldPos.y"
            stroke="#38bdf8"
            stroke-width="4"
            stroke-dasharray="6 4"
          />
        </g>

        <!-- Cities Nodes -->
        <g class="cities-group">
          <g
            v-for="node in nodesList"
            :id="`svg-node-${node.id}`"
            :key="node.id"
            class="city-node-group"
            :class="{
              selected: store.selectedNodeId === node.id,
              connecting: connectStartNodeId === node.id
            }"
            @pointerdown="(e) => handleNodePointerDown(e, node.id)"
            @dblclick="(e) => handleNodeDblClick(e, node.id)"
          >
            <!-- Selection / Connection aura -->
            <circle
              v-if="store.selectedNodeId === node.id || connectStartNodeId === node.id"
              :cx="node.x"
              :cy="node.y"
              r="24"
              fill="rgba(56, 189, 248, 0.3)"
              stroke="#38bdf8"
              stroke-width="2"
              stroke-dasharray="4 2"
            />

            <!-- Core Node Circle -->
            <circle
              :cx="node.x"
              :cy="node.y"
              :r="node.scale === 'metropolis' ? 18 : node.scale === 'city' ? 14 : 11"
              :fill="node.amenities.includes('gym') ? '#eab308' : '#ef4444'"
              stroke="#ffffff"
              stroke-width="3"
              class="node-circle"
            />

            <!-- Amenity indicator icon -->
            <text
              :x="node.x"
              :y="node.y + 4"
              text-anchor="middle"
              font-size="10"
              fill="#ffffff"
              font-weight="bold"
            >
              {{ node.amenities.includes('gym') ? '★' : 'P' }}
            </text>

            <!-- City Label -->
            <text
              :x="node.x"
              :y="node.y - 20"
              text-anchor="middle"
              class="node-label"
            >
              {{ node.name }}
            </text>
          </g>
        </g>
      </svg>
    </div>

    <!-- Viewport Info Overlay -->
    <div class="viewport-hud">
      <span class="badge">🔗 Vista Conexiones (SVG)</span>
      <span class="badge">{{ Object.keys(store.activeProject.nodes).length }} Ciudades</span>
      <span class="badge">{{ store.activeProject.connections.length }} Rutas</span>
      <span class="badge">Doble-clic: Renombrar</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.connections-viewport-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #060911;
  user-select: none;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.svg-world-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.connections-svg-canvas {
  display: block;
  box-shadow: 0 8px 32px Rgba(0, 0, 0, 0.7);
  border: 1px solid Rgba(255, 255, 255, 0.08);
}

.route-hitbox {
  cursor: pointer;
}

.route-line {
  pointer-events: none;
}

.city-node-group {
  cursor: pointer;
  transition: transform 0.15s ease-out;

  &:hover .node-circle {
    filter: Drop-Shadow(0 0 8px Rgba(255, 255, 255, 0.6));
  }
}

.node-label {
  font-family: sans-serif;
  font-size: 13px;
  font-weight: 700;
  fill: #ffffff;
  text-shadow: 0 2px 4px Rgba(0, 0, 0, 0.9);
  pointer-events: none;
}

.viewport-hud {
  position: absolute;
  bottom: 16px;
  left: 16px;
  display: flex;
  gap: 8px;
  z-index: var(--z-modal-step);
  pointer-events: none;

  .badge {
    background: Rgba(15, 23, 42, 0.85);
    border: 1px solid Rgba(255, 255, 255, 0.12);
    color: #f8fafc;
    font-size: 11px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 6px;
    backdrop-filter: Blur(6px);
  }
}
</style>
