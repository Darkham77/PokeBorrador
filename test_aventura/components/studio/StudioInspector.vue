<script setup lang="ts">
import { computed } from 'vue';
import { useMapStudioStore, type StudioTool } from '../../stores/mapStudio';
import { defaultTilesRegistry } from '../../logic/map/tilesRegistry';
import type { CollisionType } from '../../logic/map/proceduralMapGenerator';

const TOOL_LABELS: Record<StudioTool, string> = {
  pointer: 'PUNTERO',
  brush: 'PINCEL',
  eraser: 'BORRADOR',
  stamp: 'ESTAMPADOR',
  collision: 'COLISIONES',
  entity: 'ENTIDADES',
  eyedropper: 'CUENTAGOTAS'
};

const store = useMapStudioStore();

const hoverInfo = computed(() => {
  const map = store.currentMap;
  const coords = store.hoverCoords;
  if (!map || !coords) return null;

  const { x, y } = coords;
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return null;

  const groundCell = map.layers.ground[y]?.[x] ?? null;
  const elevCell = map.layers.elevation[y]?.[x] ?? null;
  const decCell = map.layers.decorations[y]?.[x] ?? null;
  const col = map.collisionMatrix[y]?.[x] ?? 0;
  const warp = map.entities.warps.find((w) => w.x === x && w.y === y);
  const spawn = map.entities.spawns.find((s) => s.x === x && s.y === y);

  return {
    x,
    y,
    groundTile: groundCell?.tileId ?? 'vacío',
    elevTile: elevCell?.tileId ?? 'vacío',
    decTile: decCell?.tileId ?? 'vacío',
    collision: col,
    warp,
    spawn
  };
});

const selectedTileEntry = computed(() => {
  return defaultTilesRegistry.getTileById(store.selectedTileId);
});

const collisionTypes: readonly {
  readonly code: CollisionType;
  readonly label: string;
  readonly badgeClass: string;
}[] = [
  { code: 0, label: '0: Libre / Transitable', badgeClass: 'col-0' },
  { code: 1, label: '1: Sólido / Bloqueado', badgeClass: 'col-1' },
  { code: 2, label: '2: Agua (Surf)', badgeClass: 'col-2' },
  { code: 3, label: '3: Salto al Sur (Ledge ▼)', badgeClass: 'col-3' }
];

const COLLISION_DESCRIPTIONS: Record<CollisionType, string> = {
  0: 'Libre (0)',
  1: 'Sólido (1)',
  2: 'Agua (2)',
  3: 'Ledge (3)'
};

function getCollisionDescription(collision: number): string {
  return COLLISION_DESCRIPTIONS[collision as CollisionType] ?? `Desconocido (${collision})`;
}

function selectCollisionType(code: CollisionType): void {
  store.selectedCollisionType = code;
}
</script>

<template>
  <div class="studio-inspector">
    <div class="panel-header">
      <span class="header-icon">🔍</span>
      <h4 class="panel-title">INSPECTOR DE MAPA</h4>
    </div>

    <!-- Active Tool Properties -->
    <div class="inspector-section">
      <span class="section-title">Herramienta: {{ TOOL_LABELS[store.activeTool] }}</span>

      <!-- Collision Brush Selector -->
      <div v-if="store.activeTool === 'collision'" class="tool-options">
        <span class="field-label">Código de Colisión:</span>
        <div class="col-buttons">
          <button
            v-for="c in collisionTypes"
            :id="'btn-col-type-' + c.code"
            :key="c.code"
            class="col-btn"
            :class="[c.badgeClass, { active: store.selectedCollisionType === c.code }]"
            @click="selectCollisionType(c.code)"
          >
            {{ c.label }}
          </button>
        </div>
      </div>

      <!-- Structure Stamper Selector -->
      <div v-else-if="store.activeTool === 'stamp'" class="tool-options">
        <span class="field-label">Estructura a Estampar:</span>
        <select
          id="inspector-select-structure"
          v-model="store.selectedStructureId"
          aria-label="Estructura a estampar"
          class="retro-select"
        >
          <option v-for="s in Object.values(store.availableStructures)" :key="s.id" :value="s.id">
            {{ s.name }} ({{ s.footprint.width }}x{{ s.footprint.height }})
          </option>
        </select>
        <div v-if="store.selectedStructure" class="structure-details">
          <span>Interior: {{ store.selectedStructure.interiorMapId ?? 'Ninguno' }}</span>
          <span
            >Huella: {{ store.selectedStructure.footprint.width }}x{{
              store.selectedStructure.footprint.height
            }}
            tiles</span
          >
        </div>
      </div>

      <!-- Tile Brush Preview -->
      <div v-else-if="store.activeTool === 'brush'" class="tool-options">
        <span class="field-label">Tile Activo:</span>
        <div class="tile-preview-box">
          <img
            v-if="selectedTileEntry"
            :src="selectedTileEntry.file_path"
            alt="Tile Activo"
            class="tile-img"
            width="32"
            height="32"
          />
          <div class="tile-details">
            <span class="tile-id">{{ store.selectedTileId }}</span>
            <span class="tile-cat">{{ selectedTileEntry?.category ?? 'Desconocida' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-divider" />

    <!-- Cursor Coordinates & Cell Information -->
    <div class="inspector-section">
      <span class="section-title">Coordenadas del Cursor</span>
      <div v-if="hoverInfo" class="coords-card">
        <div class="coord-header">
          <span class="coord-badge">X: {{ hoverInfo.x }}</span>
          <span class="coord-badge">Y: {{ hoverInfo.y }}</span>
        </div>
        <div class="cell-data-list">
          <div class="cell-row">
            <span class="cell-label">Ground:</span>
            <span class="cell-val">{{ hoverInfo.groundTile }}</span>
          </div>
          <div class="cell-row">
            <span class="cell-label">Elevation:</span>
            <span class="cell-val">{{ hoverInfo.elevTile }}</span>
          </div>
          <div class="cell-row">
            <span class="cell-label">Decorations:</span>
            <span class="cell-val">{{ hoverInfo.decTile }}</span>
          </div>
          <div class="cell-row">
            <span class="cell-label">Colisión:</span>
            <span class="cell-col-val" :class="'col-' + hoverInfo.collision">
              {{ getCollisionDescription(hoverInfo.collision) }}
            </span>
          </div>
          <div v-if="hoverInfo.warp" class="cell-row text-warp">
            <span class="cell-label">Warp:</span>
            <span class="cell-val">{{ hoverInfo.warp.targetMapId }}</span>
          </div>
          <div v-if="hoverInfo.spawn" class="cell-row text-spawn">
            <span class="cell-label">Spawn:</span>
            <span class="cell-val">{{ hoverInfo.spawn.id }}</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-coords">Pasa el cursor sobre el lienzo...</div>
    </div>

    <div class="panel-divider" />

    <!-- Map General Metadata -->
    <div v-if="store.currentMap" class="inspector-section">
      <span class="section-title">Datos del Mapa</span>
      <div class="map-stats">
        <div class="stat-row">
          <span>Tamaño:</span>
          <b>{{ store.currentMap.width }} x {{ store.currentMap.height }}</b>
        </div>
        <div class="stat-row">
          <span>Tema:</span>
          <b>{{ store.currentMap.theme }}</b>
        </div>
        <div class="stat-row">
          <span>Modo:</span>
          <b>{{ store.currentMap.type }}</b>
        </div>
        <div class="stat-row">
          <span>Tiles Colocados:</span>
          <b>{{ store.currentMap.totalTilesPlaced }}</b>
        </div>
        <div class="stat-row">
          <span>Warps Registrados:</span>
          <b>{{ store.currentMap.entities.warps.length }}</b>
        </div>
        <div class="stat-row">
          <span>Spawns Registrados:</span>
          <b>{{ store.currentMap.entities.spawns.length }}</b>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.studio-inspector {
  display: flex;
  flex-direction: column;
  gap: $spacing-md-alt;
  padding: 10px;
  border: 1px solid var(--slate-800);
  border-radius: $radius-md;
  background: var(--slate-900);
  font-family: $font-family-mono;
  user-select: none;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  border-bottom: 1px solid var(--slate-800);
  padding-bottom: 6px;

  .header-icon {
    font-size: var(--font-13);
  }

  .panel-title {
    margin: 0;
    color: var(--sky);
    font-size: var(--font-11);
    font-weight: bold;
    letter-spacing: 0.5px;
  }
}

.inspector-section {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;

  .section-title {
    color: var(--slate-500);
    font-size: var(--font-10);
    font-weight: bold;
    text-transform: uppercase;
  }

  .field-label {
    display: block;
    color: var(--slate-400);
    font-size: var(--font-10);
    margin-bottom: 4px;
  }
}

.panel-divider {
  height: 1px;
  background: var(--slate-800);
}

.tool-options {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;

  .retro-select {
    padding: 4px 6px;
    border: 1px solid var(--slate-700);
    border-radius: $radius-sm;
    background: var(--slate-800);
    color: var(--slate-100);
    font-size: var(--font-11);
    cursor: pointer;
  }

  .structure-details {
    display: flex;
    flex-direction: column;
    padding: 4px 6px;
    border-radius: $radius-sm;
    background: var(--slate-900);
    color: var(--slate-400);
    font-size: var(--font-10);
  }
}

.col-buttons {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;

  .col-btn {
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: $radius-sm;
    font-size: var(--font-10);
    font-weight: 600;
    text-align: left;
    cursor: pointer;

    &.col-0 {
      background: Rgb(34 197 94 / 15%);
      color: var(--green-light);
      &.active {
        background: Rgb(34 197 94 / 35%);
        border-color: var(--emerald);
      }
    }

    &.col-1 {
      background: Rgb(239 68 68 / 15%);
      color: var(--rose);
      &.active {
        background: Rgb(239 68 68 / 35%);
        border-color: var(--red-light);
      }
    }

    &.col-2 {
      background: Rgb(59 130 246 / 15%);
      color: var(--blue-400);
      &.active {
        background: Rgb(59 130 246 / 35%);
        border-color: var(--blue-500);
      }
    }

    &.col-3 {
      background: Rgb(234 179 8 / 15%);
      color: var(--amber-300);
      &.active {
        background: Rgb(234 179 8 / 35%);
        border-color: var(--amber-dark);
      }
    }
  }
}

.tile-preview-box {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 6px;
  border: 1px solid var(--slate-800);
  border-radius: $radius-sm;
  background: var(--slate-900);

  .tile-img {
    width: 32px;
    height: 32px;
    border: 1px solid var(--sky);
    border-radius: $radius-xs;
    image-rendering: pixelated;
  }

  .tile-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .tile-id {
      color: var(--sky);
      font-size: var(--font-10);
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tile-cat {
      color: var(--slate-500);
      font-size: var(--font-9);
    }
  }
}

.coords-card {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm-alt;
  padding: 6px;
  border: 1px solid var(--slate-800);
  border-radius: $radius-sm;
  background: var(--slate-900);

  .coord-header {
    display: flex;
    gap: $spacing-sm-alt;

    .coord-badge {
      padding: 2px 6px;
      border-radius: $radius-xs-alt;
      background: var(--slate-800);
      color: var(--sky);
      font-size: var(--font-10);
      font-weight: bold;
    }
  }

  .cell-data-list {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs-alt;
    font-size: var(--font-10);

    .cell-row {
      display: flex;
      justify-content: space-between;

      .cell-label {
        color: var(--slate-500);
      }
      .cell-val {
        max-width: 140px;
        color: var(--slate-100);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .cell-col-val {
        font-weight: bold;
        &.col-0 {
          color: var(--green-light);
        }
        &.col-1 {
          color: var(--rose);
        }
        &.col-2 {
          color: var(--blue-400);
        }
        &.col-3 {
          color: var(--amber-300);
        }
      }

      &.text-warp .cell-val {
        color: var(--amber-400);
        font-weight: bold;
      }
      &.text-spawn .cell-val {
        color: var(--cyan);
        font-weight: bold;
      }
    }
  }
}

.empty-coords {
  padding: 8px;
  color: var(--slate-600);
  font-size: var(--font-10);
  text-align: center;
  font-style: italic;
}

.map-stats {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  font-size: var(--font-10);

  .stat-row {
    display: flex;
    justify-content: space-between;
    color: var(--slate-400);

    b {
      color: var(--slate-100);
    }
  }
}
</style>
