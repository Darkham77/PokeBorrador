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
  const warp = map.entities.warps.find(w => w.x === x && w.y === y);
  const spawn = map.entities.spawns.find(s => s.x === x && s.y === y);

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

const collisionTypes: readonly { readonly code: CollisionType; readonly label: string; readonly badgeClass: string }[] = [
  { code: 0, label: '0: Libre / Transitable', badgeClass: 'col-0' },
  { code: 1, label: '1: Sólido / Bloqueado', badgeClass: 'col-1' },
  { code: 2, label: '2: Agua (Surf)', badgeClass: 'col-2' },
  { code: 3, label: '3: Salto al Sur (Ledge ▼)', badgeClass: 'col-3' }
];

function selectCollisionType(code: CollisionType): void {
  store.selectedCollisionType = code;
}
</script>

<template>
  <div class="studio-inspector">
    <div class="panel-header">
      <span class="header-icon">🔍</span>
      <h4 class="panel-title">
        INSPECTOR DE MAPA
      </h4>
    </div>

    <!-- Active Tool Properties -->
    <div class="inspector-section">
      <span class="section-title">Herramienta: {{ TOOL_LABELS[store.activeTool] }}</span>

      <!-- Collision Brush Selector -->
      <div
        v-if="store.activeTool === 'collision'"
        class="tool-options"
      >
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
      <div
        v-else-if="store.activeTool === 'stamp'"
        class="tool-options"
      >
        <span class="field-label">Estructura a Estampar:</span>
        <select
          id="inspector-select-structure"
          v-model="store.selectedStructureId"
          class="retro-select"
        >
          <option
            v-for="s in Object.values(store.availableStructures)"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }} ({{ s.footprint.width }}x{{ s.footprint.height }})
          </option>
        </select>
        <div
          v-if="store.selectedStructure"
          class="structure-details"
        >
          <span>Interior: {{ store.selectedStructure.interiorMapId ?? 'Ninguno' }}</span>
          <span>Huella: {{ store.selectedStructure.footprint.width }}x{{ store.selectedStructure.footprint.height }} tiles</span>
        </div>
      </div>

      <!-- Tile Brush Preview -->
      <div
        v-else-if="store.activeTool === 'brush'"
        class="tool-options"
      >
        <span class="field-label">Tile Activo:</span>
        <div class="tile-preview-box">
          <img
            v-if="selectedTileEntry"
            :src="selectedTileEntry.file_path"
            alt="Tile Activo"
            class="tile-img"
          >
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
      <div
        v-if="hoverInfo"
        class="coords-card"
      >
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
            <span
              class="cell-col-val"
              :class="'col-' + hoverInfo.collision"
            >
              {{ hoverInfo.collision === 0 ? 'Libre (0)' : hoverInfo.collision === 1 ? 'Sólido (1)' : hoverInfo.collision === 2 ? 'Agua (2)' : 'Ledge (3)' }}
            </span>
          </div>
          <div
            v-if="hoverInfo.warp"
            class="cell-row text-warp"
          >
            <span class="cell-label">Warp:</span>
            <span class="cell-val">{{ hoverInfo.warp.targetMapId }}</span>
          </div>
          <div
            v-if="hoverInfo.spawn"
            class="cell-row text-spawn"
          >
            <span class="cell-label">Spawn:</span>
            <span class="cell-val">{{ hoverInfo.spawn.id }}</span>
          </div>
        </div>
      </div>
      <div
        v-else
        class="empty-coords"
      >
        Pasa el cursor sobre el lienzo...
      </div>
    </div>

    <div class="panel-divider" />

    <!-- Map General Metadata -->
    <div
      v-if="store.currentMap"
      class="inspector-section"
    >
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
@use "@/styles/core/tools" as *;

.studio-inspector {
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 6px;
  padding: 10px;
  gap: 10px;
  font-family: monospace, sans-serif;
  user-select: none;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid #1e293b;
  padding-bottom: 6px;

  .header-icon {
    font-size: 13px;
  }

  .panel-title {
    font-size: 11px;
    font-weight: bold;
    color: #38bdf8;
    margin: 0;
    letter-spacing: 0.5px;
  }
}

.inspector-section {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .section-title {
    font-size: 10px;
    font-weight: bold;
    color: #64748b;
    text-transform: uppercase;
  }

  .field-label {
    font-size: 10px;
    color: #94a3b8;
    margin-bottom: 4px;
    display: block;
  }
}

.panel-divider {
  height: 1px;
  background: #1e293b;
}

.tool-options {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .retro-select {
    background: #1e293b;
    border: 1px solid #334155;
    color: #f1f5f9;
    font-size: 11px;
    padding: 4px 6px;
    border-radius: 4px;
    cursor: pointer;
  }

  .structure-details {
    display: flex;
    flex-direction: column;
    font-size: 10px;
    color: #94a3b8;
    background: #090d16;
    padding: 4px 6px;
    border-radius: 4px;
  }
}

.col-buttons {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .col-btn {
    text-align: left;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 600;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;

    &.col-0 {
      background: Rgba(34, 197, 94, 0.15);
      color: #4ade80;
      &.active { border-color: #22c55e; background: Rgba(34, 197, 94, 0.35); }
    }

    &.col-1 {
      background: Rgba(239, 68, 68, 0.15);
      color: #f87171;
      &.active { border-color: #ef4444; background: Rgba(239, 68, 68, 0.35); }
    }

    &.col-2 {
      background: Rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      &.active { border-color: #3b82f6; background: Rgba(59, 130, 246, 0.35); }
    }

    &.col-3 {
      background: Rgba(234, 179, 8, 0.15);
      color: #fde047;
      &.active { border-color: #eab308; background: Rgba(234, 179, 8, 0.35); }
    }
  }
}

.tile-preview-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #090d16;
  border: 1px solid #1e293b;
  padding: 6px;
  border-radius: 4px;

  .tile-img {
    width: 32px;
    height: 32px;
    image-rendering: pixelated;
    border: 1px solid #38bdf8;
    border-radius: 2px;
  }

  .tile-details {
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .tile-id {
      font-size: 10px;
      font-weight: bold;
      color: #38bdf8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tile-cat {
      font-size: 9px;
      color: #64748b;
    }
  }
}

.coords-card {
  display: flex;
  flex-direction: column;
  background: #090d16;
  border: 1px solid #1e293b;
  border-radius: 4px;
  padding: 6px;
  gap: 6px;

  .coord-header {
    display: flex;
    gap: 6px;

    .coord-badge {
      background: #1e293b;
      color: #38bdf8;
      font-size: 10px;
      font-weight: bold;
      padding: 2px 6px;
      border-radius: 3px;
    }
  }

  .cell-data-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 10px;

    .cell-row {
      display: flex;
      justify-content: space-between;

      .cell-label { color: #64748b; }
      .cell-val { color: #f1f5f9; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }

      .cell-col-val {
        font-weight: bold;
        &.col-0 { color: #4ade80; }
        &.col-1 { color: #f87171; }
        &.col-2 { color: #60a5fa; }
        &.col-3 { color: #fde047; }
      }

      &.text-warp .cell-val { color: #facc15; font-weight: bold; }
      &.text-spawn .cell-val { color: #22d3ee; font-weight: bold; }
    }
  }
}

.empty-coords {
  font-size: 10px;
  color: #475569;
  font-style: italic;
  padding: 8px;
  text-align: center;
}

.map-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 10px;

  .stat-row {
    display: flex;
    justify-content: space-between;
    color: #94a3b8;

    b { color: #f1f5f9; }
  }
}
</style>
