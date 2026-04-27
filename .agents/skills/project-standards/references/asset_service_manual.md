# Asset Service Manual

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
| `POKEMON` | Local (WebP) | (Formerly PokeAPI) Resolves to local sprites in `/assets/sprites/pokemon/`. Supports `isShiny` and `isBack`. |
| `ITEM` | Local (WebP) | (Formerly PokeAPI) Maps item names to internal IDs in `/assets/items/`. |
| `MAP` | Local (WebP) | Resolves map IDs to `/assets/maps/`. |
| `TRAINER` | Local (WebP) | (Formerly Showdown) Resolves all trainer IDs (Leaders & Generic) to `/assets/sprites/trainers/`. |
| `BANNER` | Local (WebP) | Route banners in `/assets/ui/banners/`. |
| `BATTLE_BG` | Local (WebP) | Battle backgrounds in `/assets/sprites/battle/`. |
| `UI` | Local (WebP) | General UI assets in `/assets/ui/`. |
| `FACTION` | Local (WebP) | Faction icons in `/assets/factions/`. |

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

### 3. Adding New Assets: The Zero-Config Pipeline

To ensure minimal data transfer and optimal load times, all visual assets must be optimized via the **Zero-Config Asset Pipeline**.

#### Mandatory Formats

- **MANDATORY**: All final images used in the project (`public/assets/`) **MUST** be in **WebP** format.
- **FORBIDDEN**: Storing raw `.png`, `.jpg`, or `.jpeg` files in the final destination directories.

#### Folder Architecture

To process raw images, place them in the root `_raw-assets/` directory:

```text
_raw-assets/
├── public/assets/maps/        <-- Mirrors the exact destination in the project
└── src/assets/ui/
    └── icons.atlas/           <-- Folders ending in .atlas will be packed
```

#### Texture Atlas Mandate

- **Individual Files**: Use for Vue UI Banners, Backgrounds, and Large Portraits.
- **.atlas Folders**: Any folder ending in `.atlas` (e.g., `vfx.atlas/`) will be compiled into a **Texture Atlas** (JSON + WebP). Best for **Phaser FX**, **Animations**, and **Batched Sprites**.

#### Execution

To process the `_raw-assets/` folder, execute:
`python3 .agents/skills/project-standards/scripts/convert_to_webp.py`
