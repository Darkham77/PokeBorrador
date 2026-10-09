<script setup lang="ts">
import { useMapStudioStore, type StudioLayer, type StudioLayerKey } from '../../stores/mapStudio';

const store = useMapStudioStore();

interface LayerDef {
  readonly id: StudioLayer;
  readonly name: string;
  readonly icon: string;
  readonly key: StudioLayerKey;
}

const layers: readonly LayerDef[] = [
  { id: 'ground', name: 'Ground (Suelo/Caminos)', icon: '🌱', key: 'ground' },
  { id: 'elevation', name: 'Elevation (Estructuras/Agua)', icon: '🏛️', key: 'elevation' },
  { id: 'decorations', name: 'Decorations (Props/Vegetación)', icon: '🌿', key: 'decorations' },
  { id: 'collision', name: 'Colisiones (Máscara 0-3)', icon: '🚧', key: 'collision' }
];

interface OverlayDef {
  readonly key: StudioLayerKey;
  readonly label: string;
  readonly icon: string;
}

const overlays: readonly OverlayDef[] = [
  { key: 'collision', label: 'Capa de Colisiones', icon: '🚧' },
  { key: 'entities', label: 'Warps & Spawns', icon: '🚪' },
  { key: 'grid', label: 'Cuadrícula (Grid 16px)', icon: '📏' }
];

function toggleVisibility(k: StudioLayerKey): void {
  store.layerVisibility[k] = !store.layerVisibility[k];
}

function selectActiveLayer(layer: StudioLayer): void {
  store.activeLayer = layer;
  // If user selects collision layer, automatically ensure collision overlay is visible
  if (layer === 'collision') {
    store.layerVisibility.collision = true;
  }
}
</script>

<template>
  <div class="studio-layers-panel">
    <div class="panel-header">
      <span class="icon header-icon">📑</span>
      <h4 class="panel-title">
        CAPAS &amp; VISIBILIDAD
      </h4>
    </div>

    <!-- Active Layer Selection -->
    <div class="layers-section">
      <span class="section-label">Capa de Edición Activa:</span>
      <div class="layers-list">
        <div
          v-for="l in layers"
          :id="'layer-row-' + l.id"
          :key="l.id"
          class="layer-item"
          :class="{ active: store.activeLayer === l.id }"
          @click="selectActiveLayer(l.id)"
        >
          <button
            :id="'btn-vis-layer-' + l.key"
            class="vis-btn"
            :class="{ hidden: !store.layerVisibility[l.key] }"
            :title="store.layerVisibility[l.key] ? 'Ocultar capa' : 'Mostrar capa'"
            @click.stop="toggleVisibility(l.key)"
          >
            <span class="icon">{{ store.layerVisibility[l.key] ? '👁️' : '👁️‍🗨️' }}</span>
          </button>
          <span class="icon layer-icon">{{ l.icon }}</span>
          <span class="layer-name">{{ l.name }}</span>
          <span
            v-if="store.activeLayer === l.id"
            class="icon active-indicator"
          >✏️</span>
        </div>
      </div>
    </div>

    <div class="panel-divider" />

    <!-- Technical Overlays -->
    <div class="overlays-section">
      <span class="section-label">Guías y Metadatos:</span>
      <div class="overlays-list">
        <div
          v-for="o in overlays"
          :id="'overlay-row-' + o.key"
          :key="o.key"
          class="overlay-item"
        >
          <label
            :id="'label-chk-' + o.key"
            class="checkbox-label"
          >
            <input
              :id="'chk-overlay-' + o.key"
              type="checkbox"
              :checked="store.layerVisibility[o.key]"
              @change="toggleVisibility(o.key)"
            >
            <span class="icon overlay-icon">{{ o.icon }}</span>
            <span class="overlay-name">{{ o.label }}</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.studio-layers-panel {
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

.section-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 6px;
  text-transform: uppercase;
}

.layers-list {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .layer-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    background: #1e293b;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background: #334155;
    }

    &.active {
      border-color: #38bdf8;
      background: Rgba(56, 189, 248, 0.15);

      .layer-name {
        color: #f8fafc;
        font-weight: bold;
      }
    }

    .vis-btn {
      background: transparent;
      border: none;
      font-size: 12px;
      cursor: pointer;
      padding: 0;

      &.hidden {
        opacity: 0.35;
      }
    }

    .layer-icon {
      font-size: 12px;
    }

    .layer-name {
      font-size: 11px;
      color: #94a3b8;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .active-indicator {
      font-size: 11px;
    }
  }
}

.panel-divider {
  height: 1px;
  background: #1e293b;
}

.overlays-list {
  display: flex;
  flex-direction: column;
  gap: 6px;

  .overlay-item {
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: #cbd5e1;
      cursor: pointer;

      input[type="checkbox"] {
        accent-color: #38bdf8;
        cursor: pointer;
      }

      .overlay-icon {
        font-size: 12px;
      }

      .overlay-name {
        font-size: 11px;
      }
    }
  }
}
</style>
