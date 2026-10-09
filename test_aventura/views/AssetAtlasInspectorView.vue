<script setup lang="ts">
/**
 * src/views/studio/AssetAtlasInspectorView.vue
 *
 * GBA ASSET ATLAS INSPECTOR VIEW (/studio/assets)
 *
 * Side-by-side interactive inspector for Kanto GBA spritesheets:
 *   - Panel A: MasterSheetCanvas (Pan/Zoom, 16px Grid snapping, Green overlay, JSON generator).
 *   - Panel B: AssetGalleryPanel (Registered assets gallery, filters, bidirectional focus).
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAssetAtlas } from '../composables/studio/useAssetAtlas.ts';
import MasterSheetCanvas from '../components/studio/MasterSheetCanvas.vue';
import AssetGalleryPanel from '../components/studio/AssetGalleryPanel.vue';
import type { CanonicalAssetEntry } from '../logic/map/canonicalAssetsRegistry.ts';

const router = useRouter();
const atlas = useAssetAtlas();

const masterCanvasRef = ref<InstanceType<typeof MasterSheetCanvas> | null>(null);

function handleSelectRegisteredAsset(asset: CanonicalAssetEntry): void {
  atlas.selectRegisteredAsset(asset);
  // Give DOM a microtick if sheet changed
  setTimeout(() => {
    masterCanvasRef.value?.centerOnRect(asset.sourceRect);
  }, 50);
}

function handleSheetChange(event: Event): void {
  const target = event.target as HTMLSelectElement;
  atlas.selectSheet(target.value);
  atlas.setSelection(null);
  masterCanvasRef.value?.resetZoom();
}
</script>

<template>
  <div class="asset-inspector-view">
    <!-- Top Global Studio Navigation Bar -->
    <header class="inspector-navbar">
      <div class="nav-brand-group">
        <h1 class="brand-title">
          <span class="icon">🎨</span> GBA Asset Atlas Inspector
        </h1>
        <span class="version-tag">Kanto Canonical Suite</span>
      </div>

      <!-- Sheet Selector & Grid Controls -->
      <div class="nav-controls-group">
        <div class="control-item">
          <label
            for="sheet-select"
            class="control-label"
          >Hoja Maestra:</label>
          <select
            id="sheet-select"
            :value="atlas.activeSheetId.value"
            class="sheet-dropdown"
            @change="handleSheetChange"
          >
            <option
              v-for="sheet in atlas.availableSheets"
              :key="sheet.id"
              :value="sheet.id"
            >
              {{ sheet.label }} ({{ sheet.filename }})
            </option>
          </select>
        </div>

        <div class="control-item">
          <label
            for="grid-select"
            class="control-label"
          >Baldosa:</label>
          <select
            id="grid-select"
            v-model.number="atlas.currentGrid.value.tileSize"
            class="grid-dropdown"
          >
            <option :value="16">
              16px (Nativo)
            </option>
            <option :value="32">
              32px (2x)
            </option>
            <option :value="8">
              8px (Sub-tile)
            </option>
          </select>
        </div>

        <div class="control-item">
          <span class="control-label">Margen:</span>
          <span class="grid-badge">X:{{ atlas.currentGrid.value.marginX }}, Y:{{ atlas.currentGrid.value.marginY }}</span>
        </div>

        <div class="control-item">
          <span class="control-label">Espaciado:</span>
          <span class="grid-badge">X:{{ atlas.currentGrid.value.spacingX }}, Y:{{ atlas.currentGrid.value.spacingY }}</span>
        </div>

        <div class="control-item">
          <button
            type="button"
            class="grid-toggle-btn"
            :class="{ active: atlas.showGrid.value }"
            @click="atlas.showGrid.value = !atlas.showGrid.value"
          >
            {{ atlas.showGrid.value ? '⊞ Visible' : '⊟ Oculta' }}
          </button>
        </div>
      </div>

      <!-- Navigation Links to other Studio tools -->
      <nav class="studio-links">
        <button
          type="button"
          class="nav-link-btn"
          @click="router.push('/studio/continent')"
        >
          <span class="btn-emoji">🗺️</span> Continent Studio
        </button>
        <button
          type="button"
          class="nav-link-btn"
          @click="router.push('/studio/map')"
        >
          <span class="btn-emoji">📐</span> Map Studio
        </button>
      </nav>
    </header>

    <!-- Side-by-Side Main Workspace Layout -->
    <main class="inspector-workspace">
      <!-- Left Panel A: Master Spritesheet Interactive Canvas -->
      <section class="panel-master-canvas">
        <MasterSheetCanvas
          ref="masterCanvasRef"
          :sheet-url="atlas.activeSheetUrl.value"
          :sheet-filename="atlas.activeSheet.value.filename"
          :registered-entries="atlas.currentSheetEntries.value"
          :selected-rect="atlas.selectedRect.value"
          :selected-asset-id="atlas.selectedAssetId.value"
          :sheet-grid="atlas.currentGrid.value"
          :show-grid="atlas.showGrid.value"
          @select-rect="atlas.setSelection"
          @select-registered-entry="handleSelectRegisteredAsset"
        />
      </section>

      <!-- Right Panel B: Registered Assets Gallery & Inspector -->
      <section class="panel-asset-gallery">
        <AssetGalleryPanel
          :entries="atlas.allManifestEntries.value"
          :selected-asset-id="atlas.selectedAssetId.value"
          @select-asset="handleSelectRegisteredAsset"
        />
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
.asset-inspector-view {
  display: flex;
  flex-direction: column;
  height: dvh;
  width: dvw;
  background: #090d16;
  color: #f8fafc;
  overflow: hidden;
}

.inspector-navbar {
  height: 52px;
  background: #0b1120;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.12);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 16px;
  z-index: var(--z-navigation);
}

.nav-brand-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-title {
  font-size: 15px;
  font-weight: 800;
  margin: 0;
  letter-spacing: 0.5px;
  color: #f8fafc;
}

.version-tag {
  font-size: 10px;
  font-weight: 700;
  background: #0284c7;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

.nav-controls-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
}

.sheet-dropdown {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  max-width: 320px;

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }
}

.grid-dropdown {
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 12px;

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }
}

.grid-badge {
  background: #1e293b;
  border: 1px solid #334155;
  color: #38bdf8;
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 11px;
  font-family: monospace;
}

.grid-toggle-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #94a3b8;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &.active {
    background: #0369a1;
    border-color: #38bdf8;
    color: #ffffff;
  }

  &:hover {
    background: #334155;
  }
}

.studio-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link-btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #334155;
    border-color: #475569;
    color: #ffffff;
  }
}

.inspector-workspace {
  flex: 1;
  display: flex;
  min-height: 0;
  width: 100%;
}

.panel-master-canvas {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.panel-asset-gallery {
  width: 380px;
  height: 100%;
  position: relative;
  overflow: hidden;
}
</style>
