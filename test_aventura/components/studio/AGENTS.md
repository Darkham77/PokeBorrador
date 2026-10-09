# Purpose

Manage visual asset gallery and master spritesheet grid inspector components for GBA tile mapping.

## Ownership

Frontend Engineers / Tooling Developers.

## Local Contracts

- `AssetGalleryPanel.vue`: Paginated catalog panel displaying pre-cropped canonical tiles and prefabs.
- `MasterSheetCanvas.vue`: Interactive canvas renderer overlaying grid coordinates and asset bounds over raw tileset sheets.

## Key Files

- [`AssetGalleryPanel.vue`](./AssetGalleryPanel.vue): Module implementation.
- [`AutotilePatchCard.vue`](./AutotilePatchCard.vue): Module implementation.
- [`AutotileReportModal.vue`](./AutotileReportModal.vue): Module implementation.
- [`ContinentStudioControls.vue`](./ContinentStudioControls.vue): Module implementation.
- [`MasterSheetCanvas.vue`](./MasterSheetCanvas.vue): Module implementation.
- [`POIDetailDrawer.vue`](./POIDetailDrawer.vue): Module implementation.
- [`ProceduralMapViewer.vue`](./ProceduralMapViewer.vue): Module implementation.
- [`RegionalLocalMapModal.vue`](./RegionalLocalMapModal.vue): Module implementation.
- [`RegionalNetworkSvgOverlay.vue`](./RegionalNetworkSvgOverlay.vue): Module implementation.
- [`RegionalStudioToolbar.vue`](./RegionalStudioToolbar.vue): Module implementation.
- [`RegionalUrbanSvgOverlay.vue`](./RegionalUrbanSvgOverlay.vue): Module implementation.
- [`StudioAdventureGraphInspector.styles.scss`](./StudioAdventureGraphInspector.styles.scss): Module implementation.
- [`StudioAdventureGraphInspector.vue`](./StudioAdventureGraphInspector.vue): Module implementation.
- [`StudioAdventureGraphViewport.styles.scss`](./StudioAdventureGraphViewport.styles.scss): Module implementation.
- [`StudioAdventureGraphViewport.vue`](./StudioAdventureGraphViewport.vue): Module implementation.
- [`StudioAssetImportModal.styles.scss`](./StudioAssetImportModal.styles.scss): Module implementation.
- [`StudioAssetImportModal.vue`](./StudioAssetImportModal.vue): Module implementation.
- [`StudioCanvasViewport.vue`](./StudioCanvasViewport.vue): Module implementation.
- [`StudioConfirmModal.vue`](./StudioConfirmModal.vue): Module implementation.
- [`StudioConnectionsViewport.vue`](./StudioConnectionsViewport.vue): Module implementation.
- [`StudioGeographicViewport.vue`](./StudioGeographicViewport.vue): Module implementation.
- [`StudioInspector.vue`](./StudioInspector.vue): Module implementation.
- [`StudioLayersPanel.vue`](./StudioLayersPanel.vue): Module implementation.
- [`StudioProceduralConfigModal.vue`](./StudioProceduralConfigModal.vue): Module implementation.
- [`StudioSpritePipelineModal.vue`](./StudioSpritePipelineModal.vue): Module implementation.
- [`StudioTileCatalogDrawer.vue`](./StudioTileCatalogDrawer.vue): Module implementation.
- [`StudioToolbar.vue`](./StudioToolbar.vue): Module implementation.

## Work Guidance

- Canvas rendering must support hardware acceleration and clean unmount cleanup.
- All emojis in labels must use approved `.icon` or `.emoji-inline` wrapper classes.

## Verification

- `npm run lint`
- `npm run sim:e2e:continent-studio`

## Child DOX Index

- *This directory contains specialized domain logic and files with no subdirectories.*
