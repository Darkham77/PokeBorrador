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

import { ref, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAssetAtlas } from '../composables/studio/useAssetAtlas.ts';
import MasterSheetCanvas from '../components/studio/MasterSheetCanvas.vue';
import AssetGalleryPanel from '../components/studio/AssetGalleryPanel.vue';
import type { CanonicalAssetEntry } from '../logic/map/canonicalAssetsRegistry.ts';

const router = useRouter();
const atlas = useAssetAtlas();

const masterCanvasRef = ref<InstanceType<typeof MasterSheetCanvas> | null>(null);

async function handleSelectRegisteredAsset(asset: CanonicalAssetEntry): Promise<void> {
  atlas.selectRegisteredAsset(asset);
  await nextTick();
  const rectToCenter = atlas.selectedRect.value ?? asset.sourceRect;
  masterCanvasRef.value?.centerOnRect(rectToCenter);
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
            id="btn-atlas-toggle-grid"
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
          id="btn-atlas-link-continent"
          type="button"
          class="nav-link-btn"
          @click="router.push('/studio/continent')"
        >
          <span class="btn-emoji">🗺️</span> Continent Studio
        </button>
        <button
          id="btn-atlas-link-map"
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
  width: 100%;
  height: 100%;
  background: var(--slate-900);
  color: var(--slate-50);
  overflow: hidden;
}

.inspector-navbar {
  z-index: var(--z-navigation);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-lg;
  height: 52px;
  padding: 0 16px;
  background: var(--slate-900);
  border-bottom: 1px solid Rgb(255 255 255 / 12%);
}

.nav-brand-group {
  display: flex;
  align-items: center;
  gap: $spacing-md-alt;
}

.brand-title {
  margin: 0;
  color: var(--slate-50);
  font-size: var(--font-15);
  font-weight: 800;
  letter-spacing: 0.5px;
}

.version-tag {
  padding: 2px 6px;
  border-radius: $radius-sm;
  background: var(--sky-dark);
  color: var(--white);
  font-family: monospace;
  font-size: var(--font-10);
  font-weight: 700;
}

.nav-controls-group {
  display: flex;
  align-items: center;
  gap: $spacing-lg;
}

.control-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.control-label {
  color: var(--slate-400);
  font-size: var(--font-11);
  font-weight: 600;
}

.sheet-dropdown {
  max-width: 320px;
  padding: 5px 10px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-12);
  font-weight: 600;

  &:focus {
    outline: none;
    border-color: var(--sky);
  }
}

.grid-dropdown {
  padding: 5px 8px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-12);

  &:focus {
    outline: none;
    border-color: var(--sky);
  }
}

.grid-badge {
  padding: 3px 6px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-sm;
  background: var(--slate-800);
  color: var(--sky);
  font-family: monospace;
  font-size: var(--font-11);
}

.grid-toggle-btn {
  padding: 4px 10px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-400);
  font-size: var(--font-11);
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--slate-700);
  }

  &.active {
    background: var(--sky-dark);
    color: var(--white);
    border-color: var(--sky);
  }
}

.studio-links {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.nav-link-btn {
  padding: 5px 12px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-200);
  font-size: var(--font-11);
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--slate-700);
    color: var(--white);
    border-color: var(--slate-600);
  }
}

.inspector-workspace {
  display: flex;
  width: 100%;
  min-height: 0;
  flex: 1;
}

.panel-master-canvas {
  position: relative;
  height: 100%;
  flex: 1;
  overflow: hidden;
}

.panel-asset-gallery {
  position: relative;
  width: 380px;
  height: 100%;
  overflow: hidden;
}
</style>
