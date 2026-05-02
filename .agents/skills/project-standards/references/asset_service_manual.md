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

#### Asset Organization

- **Individual Files**: All assets (Banners, Backgrounds, Sprites, Icons) must be stored as individual WebP files.
- **Batched Sprites**: For animations, use CSS sprites or sequential WebP loading. The project no longer uses JSON atlases.

#### Execution

To process the `_raw-assets/` folder, execute:
`python3 .agents/skills/project-standards/scripts/convert_to_webp.py`

---

## 🌓 Dynamic Shadow System

To ensure visual consistency between terrestrial and flying Pokémon, the following anchoring rules must be followed:

### 1. Ground Anchoring (feetY)

- **Terrestrial**: Anchor is located at the base of the sprite.
- **Flying/Floating**: The `feetY` value MUST be **FORCED** to **90%** (or ground coordinates) regardless of the sprite's position. This ensures:
  - Poké Balls land on the ground.
  - Capture energy beams point to the base.
  - The shadow is projected correctly beneath the Pokémon.

### 2. Animation Synchronization

- Shadows must be integrated into the animation container to follow Dash and Attack movements.
- Shadow visibility must be synchronized with the Pokémon's opacity during capture/faint sequences.

---

## 📦 PWA Caching & Configuration (VitePWA)

To ensure game assets are correctly precached and the service worker remains stable:

### 1. Workbox Validation Rules

- **FORBIDDEN**: The property `suppressGlobWarnings` is deprecated in recent versions of `workbox-build`. Including it in `vite.config.js` will trigger a `ReferenceError` or validation failure that prevents the server from starting.
- **Maximum File Size**: Large assets (like high-res backgrounds) may exceed the default Workbox limit. Use `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (5MB) in the `workbox` config if needed.

### 2. Asset Manifest Integrity

- **Glob Patterns**: Ensure that `globPatterns` includes all critical game extensions: `['**/*.{js,css,html,ico,png,svg,webp,woff2}']`.
- **Static Injections**: Use `includeAssets` for critical WASM or background files that aren't automatically discovered by the crawler.
