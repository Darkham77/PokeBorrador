# Asset Service & LOD Manual

This document details the centralized asset management system. All visual resources must be requested through this service to ensure performance, consistency, and multi-platform support.

## Core Interface

The primary entry point is the `getAssetUrl` function:

```javascript
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';

const url = getAssetUrl(ASSET_TYPES.POKEMON, 'pikachu', { isShiny: false });
```

## Asset Types & Routing Logic

| Type | Source | Description |
| :--- | :--- | :--- |
| `POKEMON` | PokeAPI / Local | Resolves to PokeAPI by default. Supports `isShiny` and `isBack`. |
| `ITEM` | PokeAPI / Local | Maps item names to PokeAPI IDs. Falls back to local PNG if missing. |
| `MAP` | Local (WebP) | Resolves map IDs to `/assets/maps/`. Includes **LOD support**. |
| `TRAINER` | Showdown / Local | Resolves IDs to Showdown sprites for leaders, or local for others. |
| `BANNER` | Local (WebP) | Route banners in `/assets/ui/banners/`. Includes **LOD support**. |
| `BATTLE_BG` | Local (WebP) | Battle backgrounds in `/assets/sprites/battle/`. |
| `UI` | Local (WebP) | General UI assets in `/assets/ui/`. |
| `FACTION` | Local (WebP) | Faction icons in `/assets/factions/`. |

## LOD (Level of Detail) System

The system automatically detects device capabilities and serves scaled versions of local assets if available.

### Scaling Rules

Assets processed through the `lod/` pipeline generate:

- **@1x**: Original resolution (100%).
- **@0.5x**: Half resolution (50%).
- **@0.25x**: Quarter resolution (25%).

### Automatic Resolution

The `assetResolver` (used internally by `AssetService`) will append the suffix based on `window.devicePixelRatio` or performance settings:

- `map_ruta1.webp` -> `map_ruta1@0.5x.webp`

## Implementation Guidelines

### 1. In Vue Components

Always use a computed property or a method to resolve the URL.

```vue
<script setup>
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
const props = defineProps(['pokemon']);
const spriteUrl = computed(() => getAssetUrl(ASSET_TYPES.POKEMON, props.pokemon.id));
</script>

<template>
  <img :src="spriteUrl" class="pixelated" />
</template>
```

### 2. In Game Logic

Avoid hardcoding strings. Use the `ASSET_TYPES` enum.

```javascript
// WRONG
const url = `/assets/maps/${id}.webp`;

// CORRECT
const url = getAssetUrl(ASSET_TYPES.MAP, id);
```

### 3. Adding New Assets

1. Place raw files in `_raw-assets/lod/` (for scaling) or `_raw-assets/original/` (1:1).
2. Run the conversion pipeline: `python .agents/skills/project-standards/scripts/convert_to_webp.py`.
3. If it's a new category, add it to `ASSET_TYPES` in `assetService.js`.
