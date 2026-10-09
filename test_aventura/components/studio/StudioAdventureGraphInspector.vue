<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMapAdventureStudioStore } from '../../stores/mapAdventureStudio';
import type { MapNode } from '../../logic/adventure/mapData';
import { CELL_BIOME, type CellBiomeType } from '../../logic/map/kantoRegionalGenerator';
import { STAMPING_PREFABS_CATALOG } from '../../logic/map/regionRegistry';
import type { StampingPrefabDefinition, UrbanScale } from '../../types/map/adventureWorldTypes';

const store = useMapAdventureStudioStore();

type CoordAxis = 'x' | 'y';

// --- 1. Graph Mode Inspector State ---
const selectedNode = computed<MapNode | null>(() => {
  if (!store.selectedNodeId) return null;
  return store.nodes[store.selectedNodeId] || null;
});

const nodeTypes = [
  { value: 'city', label: '🏙️ Ciudad' },
  { value: 'route', label: '🌾 Ruta Terrestre' },
  { value: 'route_water', label: '🌊 Ruta Acuática' },
  { value: 'poi', label: '⛰️ Punto de Interés (POI)' },
  { value: 'league', label: '🏆 Liga Pokémon' }
] as const;

const urbanScales = [
  { value: 'metropolis', label: '👑 Metrópolis (Capital / Silph)', desc: 'Silph Co., Centro, Tienda, Gimnasio Oro, Casas, Farolas y Bancos' },
  { value: 'city', label: '🏙️ Ciudad (Gimnasio Oficial)', desc: 'Gimnasio, Centro, Tienda, Casas, Farolas y Buzones' },
  { value: 'town', label: '🏘️ Pueblo (Centro + Tienda)', desc: 'Centro Pokémon, Tienda, Casas, Farolas y Flores' },
  { value: 'village', label: '🏡 Aldea (Asentamiento)', desc: 'Centro Pokémon, Casas y Buzón' },
  { value: 'hamlet', label: '🌾 Caserío / Villa Inicial', desc: 'Laboratorio de Oak, Casas y Flores' }
] as const;

const moOptions = [
  { value: '', label: 'Ninguno (Libre)' },
  { value: 'Corte', label: 'Corte' },
  { value: 'Vuelo', label: 'Vuelo' },
  { value: 'Surf', label: 'Surf' },
  { value: 'Fuerza', label: 'Fuerza' },
  { value: 'Cascada', label: 'Cascada' },
  { value: 'Torbellino', label: 'Torbellino' },
  { value: 'Flauta', label: 'Flauta Pokémon' },
  { value: 'Medallas', label: 'Medallas de Gimnasio' }
] as const;

const kantoLocations: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'pallet', label: '🏡 Pueblo Paleta' },
  { id: 'viridian', label: '🌳 Ciudad Verde' },
  { id: 'pewter', label: '🗿 Cd. Plateada' },
  { id: 'mtmoon', label: '⛰️ Mt. Moon' },
  { id: 'cerulean', label: '💧 Cd. Celeste' },
  { id: 'saffron', label: '🏢 Cd. Azafrán' },
  { id: 'vermilion', label: '⚡ Cd. Carmín' },
  { id: 'lavender', label: '👻 P. Lavanda' },
  { id: 'celadon', label: '🌈 Cd. Azulona' },
  { id: 'fuchsia', label: '🌸 Cd. Fucsia' },
  { id: 'cinnabar', label: '🌋 Isla Canela' },
  { id: 'indigo', label: '🏰 Meseta Añil' }
];

const johtoLocations: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'newbark', label: '🌱 P. Primavera' },
  { id: 'cherrygrove', label: '🌸 Cd. Cerezo' },
  { id: 'violet', label: '🔔 Cd. Malvalona' },
  { id: 'azalea', label: '🌿 P. Azalea' },
  { id: 'goldenrod', label: '📻 Cd. Trigal' },
  { id: 'ecruteak', label: '🏮 Cd. Iris' },
  { id: 'olivine', label: '⚓ Cd. Olivo' },
  { id: 'cianwood', label: '🌊 Cd. Orquídea' },
  { id: 'mahogany', label: '❄️ P. Caoba' },
  { id: 'lakeofrage', label: '🐉 Lago Furia' },
  { id: 'blackthorn', label: '⛰️ Cd. Endrino' },
  { id: 'mtsilver', label: '🏔️ Mt. Plateado' }
];

const canonicalLocations = computed(() => {
  if (store.activeProject?.archetype === 'johto') return johtoLocations;
  return kantoLocations;
});

function handleTeleport(targetId: string) {
  const node = store.nodes[targetId];
  if (node) {
    store.selectedNodeId = targetId;
    store.teleportTo(node.x * 2.5, node.y * 2.5);
  }
}

const connectedNeighbors = computed<string[]>(() => {
  const currentId = store.selectedNodeId;
  if (!currentId) return [];
  const neighbors: string[] = []; // no-domain: Estructura o identificador procedural de aventura
  for (const [a, b] of store.connections) {
    if (a === currentId && !neighbors.includes(b)) neighbors.push(b);
    if (b === currentId && !neighbors.includes(a)) neighbors.push(a);
  }
  return neighbors;
});

function handleCoordNudge(axis: CoordAxis, delta: number) {
  if (!store.selectedNodeId || !selectedNode.value) return;
  const currentX = selectedNode.value.x;
  const currentY = selectedNode.value.y;
  if (axis === 'x') {
    store.moveNode(store.selectedNodeId, currentX + delta, currentY);
  } else {
    store.moveNode(store.selectedNodeId, currentX, currentY + delta);
  }
  store.triggerRebake();
}

function handleStartConnect() {
  if (!store.selectedNodeId) return;
  store.activeTool = 'connect';
  store.connectSourceNodeId = store.selectedNodeId;
}

function handleDisconnect(neighborId: string) {
  if (!store.selectedNodeId) return;
  store.toggleConnection(store.selectedNodeId, neighborId);
  store.triggerRebake();
}

// --- 2. Terrain Mode State ---
const biomeOptions: readonly { readonly biome: CellBiomeType; readonly label: string; readonly color: string }[] = [
  { biome: CELL_BIOME.GRASS, label: 'Césped Llano', color: '#318236' },
  { biome: CELL_BIOME.DIRT_PATH, label: 'Sendero de Tierra', color: '#bc9052' },
  { biome: CELL_BIOME.WATER, label: 'Agua / Río / Mar', color: '#12759e' },
  { biome: CELL_BIOME.TALL_GRASS, label: 'Hierba Alta', color: '#1e5822' },
  { biome: CELL_BIOME.MOUNTAIN_DIRT, label: 'Roca Montañosa', color: '#8e6642' },
  { biome: CELL_BIOME.PLAZA_STONE, label: 'Adoquines Plaza', color: '#64748b' },
  { biome: CELL_BIOME.LAVA, label: 'Lava Volcánica', color: '#f9623f' }
];

// --- 3. Structures Mode State ---
const structureFilter = ref<'all' | 'buildings' | 'props'>('all');

const filteredPrefabs = computed(() => {
  if (structureFilter.value === 'all') return STAMPING_PREFABS_CATALOG;
  return STAMPING_PREFABS_CATALOG.filter((p) => p.category === structureFilter.value);
});

const selectedStructure = computed(() => {
  if (store.selectedStructureIndex === null) return null;
  return store.customStructures[store.selectedStructureIndex] || null;
});

function handleSelectStampingPrefab(prefab: StampingPrefabDefinition) {
  store.stampingPrefab = prefab;
}

function handleStructureCoordNudge(axis: CoordAxis, delta: number) {
  if (store.selectedStructureIndex === null || !selectedStructure.value) return;
  const s = selectedStructure.value;
  store.moveStructure(
    store.selectedStructureIndex,
    axis === 'x' ? s.x + delta : s.x,
    axis === 'y' ? s.y + delta : s.y
  );
}
</script>

<template>
  <aside
    id="studio-adventure-inspector"
    class="adventure-inspector"
  >
    <!-- ========================================== -->
    <!-- MODE 1: GRAFO (Paradas y Rutas Vectoriales) -->
    <!-- ========================================== -->
    <div
      v-if="store.activeMode === 'graph'"
      class="mode-content"
    >
      <!-- Teleport Bar -->
      <section class="inspector-section section-teleport">
        <h4 class="section-title">
          <span class="icon">📍</span> SALTAR A UBICACIÓN
        </h4>
        <div class="teleport-grid">
          <button
            v-for="loc in canonicalLocations"
            :id="'btn-teleport-' + loc.id"
            :key="loc.id"
            class="teleport-btn"
            :class="{ active: store.selectedNodeId === loc.id }"
            @click="handleTeleport(loc.id)"
          >
            {{ loc.label }}
          </button>
        </div>
      </section>

      <!-- Selected Node Properties -->
      <section
        v-if="selectedNode && store.selectedNodeId"
        class="inspector-section section-node-details"
      >
        <div class="node-header">
          <span
            class="type-badge"
            :class="selectedNode.type"
          >{{ selectedNode.type }}</span>
          <span class="node-id">ID: {{ store.selectedNodeId }}</span>
        </div>

        <h3 class="node-name-display">
          {{ selectedNode.name }}
        </h3>

        <!-- Urban Scale Selector (Maqueta Urbana de la Parada) -->
        <div class="urban-scale-box">
          <label
            for="select-urban-scale"
            class="form-label"
          >
            <span class="emoji-inline">🏛️</span> Maqueta Urbana (Escala)
          </label>
          <select
            id="select-urban-scale"
            :value="selectedNode.urbanScale || 'town'"
            class="form-select urban-scale-select"
            @change="(e) => {
              if (store.selectedNodeId) {
                store.setNodeUrbanScale(store.selectedNodeId, (e.target as HTMLSelectElement).value as UrbanScale);
              }
            }"
          >
            <option
              v-for="s in urbanScales"
              :key="s.value"
              :value="s.value"
            >
              {{ s.label }}
            </option>
          </select>
          <div class="urban-scale-desc">
            {{ urbanScales.find(s => s.value === (selectedNode?.urbanScale || 'town'))?.desc }}
          </div>
        </div>

        <!-- Form fields -->
        <div class="form-group">
          <label
            for="input-node-name"
            class="form-label"
          >Nombre Visible</label>
          <input
            id="input-node-name"
            v-model="selectedNode.name"
            type="text"
            class="form-input"
            @change="store.triggerRebake"
          >
        </div>

        <div class="form-group">
          <label
            for="select-node-type"
            class="form-label"
          >Tipo de Parada</label>
          <select
            id="select-node-type"
            v-model="selectedNode.type"
            class="form-select"
            @change="store.triggerRebake"
          >
            <option
              v-for="t in nodeTypes"
              :key="t.value"
              :value="t.value"
            >
              {{ t.label }}
            </option>
          </select>
        </div>

        <!-- Coordinates with fine-tuning -->
        <div class="form-group coords-group">
          <label class="form-label">Coordenadas canónicas ({{ selectedNode.x }}, {{ selectedNode.y }})</label>
          <div class="nudge-controls">
            <span class="axis-label">X:</span>
            <button
              id="btn-nudge-x-m10"
              class="nudge-btn"
              @click="handleCoordNudge('x', -10)"
            >
              -10
            </button>
            <button
              id="btn-nudge-x-m1"
              class="nudge-btn"
              @click="handleCoordNudge('x', -1)"
            >
              -1
            </button>
            <button
              id="btn-nudge-x-p1"
              class="nudge-btn"
              @click="handleCoordNudge('x', 1)"
            >
              +1
            </button>
            <button
              id="btn-nudge-x-p10"
              class="nudge-btn"
              @click="handleCoordNudge('x', 10)"
            >
              +10
            </button>
          </div>
          <div class="nudge-controls">
            <span class="axis-label">Y:</span>
            <button
              id="btn-nudge-y-m10"
              class="nudge-btn"
              @click="handleCoordNudge('y', -10)"
            >
              -10
            </button>
            <button
              id="btn-nudge-y-m1"
              class="nudge-btn"
              @click="handleCoordNudge('y', -1)"
            >
              -1
            </button>
            <button
              id="btn-nudge-y-p1"
              class="nudge-btn"
              @click="handleCoordNudge('y', 1)"
            >
              +1
            </button>
            <button
              id="btn-nudge-y-p10"
              class="nudge-btn"
              @click="handleCoordNudge('y', 10)"
            >
              +10
            </button>
          </div>
        </div>

        <!-- Services & MO -->
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input
              id="check-has-center"
              v-model="selectedNode.hasCenter"
              type="checkbox"
              class="form-checkbox"
              @change="store.triggerRebake"
            >
            <span><span class="icon">❤️</span> Centro Pokémon</span>
          </label>
        </div>

        <div class="form-group">
          <label
            for="select-node-mo"
            class="form-label"
          >Requisito de MO / Bloqueo</label>
          <select
            id="select-node-mo"
            v-model="selectedNode.requiresMO"
            class="form-select"
            @change="store.triggerRebake"
          >
            <option
              v-for="mo in moOptions"
              :key="mo.value"
              :value="mo.value"
            >
              {{ mo.label }}
            </option>
          </select>
        </div>

        <!-- Connected Routes -->
        <div
          v-if="connectedNeighbors.length > 0"
          class="form-group connections-group"
        >
          <label class="form-label">Rutas Conectadas ({{ connectedNeighbors.length }})</label>
          <div class="connected-list">
            <div
              v-for="neighborId in connectedNeighbors"
              :key="neighborId"
              class="connected-item"
            >
              <span class="connected-name">{{ store.nodes[neighborId]?.name || neighborId }}</span>
              <button
                class="btn-disconnect-sm"
                title="Desconectar ruta"
                @click="handleDisconnect(neighborId)"
              >
                <span class="icon">✕</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="node-actions-grid">
          <button
            id="btn-node-connect"
            class="btn-action btn-connect"
            @click="handleStartConnect"
          >
            <span class="icon">🔗</span> Conectar Ruta
          </button>
          <button
            id="btn-node-delete"
            class="btn-action btn-delete"
            @click="store.deleteNode(store.selectedNodeId)"
          >
            <span class="icon">🗑️</span> Eliminar Parada
          </button>
        </div>
      </section>

      <!-- Empty Selection Overview -->
      <section
        v-else
        class="inspector-section empty-selection"
      >
        <div class="overview-badge">
          <span class="icon text-3xl">🌍</span>
          <h3 class="overview-title">
            {{ store.activeProject?.name || 'Región' }}
          </h3>
          <p class="overview-desc">
            Haz clic o arrastra cualquier parada en el mapa para editar sus atributos, o salta directamente con los botones superiores.
          </p>
        </div>

        <div class="stats-card">
          <div class="stat-row">
            <span class="stat-label">Total de Paradas:</span>
            <span class="stat-val">{{ Object.keys(store.nodes).length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Conexiones SVG:</span>
            <span class="stat-val">{{ store.connections.length }}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Semilla Activa:</span>
            <span class="stat-val">#{{ store.seed }}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- ========================================== -->
    <!-- MODE 2: TERRENO (Pinceles de Biomas)       -->
    <!-- ========================================== -->
    <div
      v-else-if="store.activeMode === 'terrain'"
      class="mode-content"
    >
      <section class="inspector-section">
        <h4 class="section-title">
          <span class="icon">🖌️</span> PINCELES DE TERRENO
        </h4>
        <p class="mode-help-text">
          Selecciona un bioma y tamaño de brocha. Pinta arrastrando con el mouse directamente sobre el mapa.
        </p>

        <!-- Biomes Selection -->
        <div class="biomes-list">
          <button
            v-for="b in biomeOptions"
            :id="`btn-select-biome-${b.biome}`"
            :key="b.biome"
            type="button"
            class="biome-pick-btn"
            :class="{ 'is-selected': store.selectedBiome === b.biome }"
            @click="store.selectedBiome = b.biome"
          >
            <span
              class="biome-color-swatch"
              :style="{ background: b.color }"
            />
            <span class="biome-label">{{ b.label }}</span>
          </button>
        </div>

        <!-- Brush Sizes -->
        <div class="form-group mt-4">
          <label class="form-label">Tamaño de Brocha Cuadrada</label>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="bs in ([1, 2, 4, 8] as const)"
              :id="`btn-inspector-brush-${bs}`"
              :key="bs"
              type="button"
              class="brush-size-tile"
              :class="{ 'is-active': store.brushSize === bs }"
              @click="store.brushSize = bs"
            >
              <span class="brush-size-val">
                {{ bs }}x{{ bs }}
              </span>
              <span class="brush-px">
                {{ bs * 32 }}px
              </span>
            </button>
          </div>
        </div>

        <div class="autotile-info-box mt-4">
          <span class="text-emerald-400 font-bold"><span class="icon">✨</span> Autotiling Inteligente:</span>
          Los bordes y esquinas de 8 vecinos se recalculan dinámicamente con cada pincelada, manteniendo la matriz de colisión sincronizada.
        </div>
      </section>
    </div>

    <!-- ========================================== -->
    <!-- MODE 3: ESTRUCTURAS (Edificios & Props)    -->
    <!-- ========================================== -->
    <div
      v-else-if="store.activeMode === 'structures'"
      class="mode-content"
    >
      <!-- If a structure is selected -->
      <section
        v-if="selectedStructure && store.selectedStructureIndex !== null"
        class="inspector-section"
      >
        <div class="flex items-center justify-between pb-2 border-b border-slate-700">
          <span class="text-amber-400 font-bold text-xs uppercase">Estructura #{{ store.selectedStructureIndex + 1 }}</span>
          <button
            class="btn-close-sm"
            @click="store.selectedStructureIndex = null"
          >
            <span class="icon">✕</span>
          </button>
        </div>

        <h3 class="text-sm font-bold text-slate-100 mt-2">
          {{ selectedStructure.style }}
        </h3>
        <p class="text-[11px] text-slate-400">
          Dimensiones: {{ selectedStructure.w || 80 }} x {{ selectedStructure.h || 60 }} px
        </p>

        <!-- Coordinates fine tuning -->
        <div class="form-group coords-group mt-3">
          <label class="form-label">Posición Pixel ({{ selectedStructure.x }}, {{ selectedStructure.y }})</label>
          <div class="nudge-controls">
            <span class="axis-label">X:</span>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('x', -10)"
            >
              -10
            </button>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('x', -1)"
            >
              -1
            </button>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('x', 1)"
            >
              +1
            </button>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('x', 10)"
            >
              +10
            </button>
          </div>
          <div class="nudge-controls">
            <span class="axis-label">Y:</span>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('y', -10)"
            >
              -10
            </button>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('y', -1)"
            >
              -1
            </button>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('y', 1)"
            >
              +1
            </button>
            <button
              class="nudge-btn"
              @click="handleStructureCoordNudge('y', 10)"
            >
              +10
            </button>
          </div>
        </div>

        <button
          id="btn-delete-structure"
          class="btn-action btn-delete mt-4"
          @click="store.deleteStructure(store.selectedStructureIndex)"
        >
          <span class="icon">🗑️</span> Eliminar del Mapa
        </button>
      </section>

      <!-- Stamping Palette -->
      <section class="inspector-section">
        <h4 class="section-title">
          <span class="icon">🏛️</span> PALETA DE ESTAMPADO GBA
        </h4>

        <!-- Category filter -->
        <div class="flex gap-1 mb-3">
          <button
            v-for="cat in (['all', 'buildings', 'props'] as const)"
            :key="cat"
            class="filter-tab-btn"
            :class="{ active: structureFilter === cat }"
            @click="structureFilter = cat"
          >
            {{ cat === 'all' ? 'Todos' : cat === 'buildings' ? 'Edificios' : 'Props' }}
          </button>
        </div>

        <!-- Prefabs Grid -->
        <div class="prefabs-grid">
          <button
            v-for="p in filteredPrefabs"
            :id="`btn-stamp-${p.id}`"
            :key="p.id"
            type="button"
            class="prefab-card-btn"
            :class="{ 'is-stamping': store.stampingPrefab?.id === p.id }"
            @click="handleSelectStampingPrefab(p)"
          >
            <span class="prefab-name">{{ p.name }}</span>
            <span class="prefab-dim">{{ p.width }}x{{ p.height }}px</span>
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>

<style src="./StudioAdventureGraphInspector.styles.scss" scoped lang="scss"></style>
