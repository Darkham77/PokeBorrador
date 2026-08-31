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
| `ITEM` | Local (WebP) | Resolves to `/assets/sprites/crafting/tier[0-3]/` structured by `craftingTier`. |
| `MAP` | Local (WebP) | Resolves map IDs to `/assets/maps/`. |
| `TRAINER` | Local (WebP) | (Formerly Showdown) Resolves all trainer IDs (Leaders & Generic) to `/assets/sprites/trainers/`. |
| `BANNER` | Local (WebP) | Route banners in `/assets/ui/banners/`. |
| `BATTLE_BG` | Local (WebP) | Battle backgrounds in `/assets/sprites/battle/`. |
| `UI` | Local (WebP) | General UI assets in `/assets/ui/`. |
| `FACTION` | Local (WebP) | Faction icons in `/assets/factions/`. |
| `BADGE` | Local (WebP) | Kanto gym badges in `/assets/sprites/badges/`. |

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

### 1.1 Resolving Held Items dynamically

When resolving a Pokémon's held item represented by its database name string (e.g. `'Compartir EXP'`), you must map the name to its metadata first using `getItemByName` from `@/data/items` to obtain its sprite key before calling the asset service:

```vue
<script setup>
import { computed } from 'vue';
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService';
import { getItemByName } from '@/data/items';

const props = defineProps(['pokemon']);

const heldItemSprite = computed(() => {
  if (!props.pokemon?.heldItem) return '';
  const item = getItemByName(props.pokemon.heldItem);
  if (!item?.sprite) return '';
  return getAssetUrl(ASSET_TYPES.ITEM, item.sprite);
});
</script>
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
- **PIXEL ART OPTIMIZATION**: All game sprites (Pokémon, items, badges) MUST be converted using **Lossless WebP** (`lossless: true` in Sharp). This preserves the sharp edges and color precision required for the Retro aesthetic. Generic UI banners or backgrounds may use lossy compression (quality 80-98) to save space.

#### Asset Registry Mandate

Every new asset category MUST be explicitly registered in:

1. `ASSET_TYPES` constant in `src/logic/services/assetService.ts`.
2. The `getAssetUrl` switch-case logic to handle path resolution.
3. The `AssetPipeline` (`convert_assets.ts`) to ensure it's mirrored from `_raw-assets`.

#### Dynamic Family Scanning

When organizing and grouping environmental assets (e.g., bushes, trees, rocks) by prefix in conversion scripts, use an inclusive threshold `count >= 1` (rather than `count > 1`). This ensures single-asset categories (like `bushsnow` or `grassflower`) are properly registered as families, preventing type declaration compile-time errors in dynamic environments.

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
- **Event Banners Timeless Design Mandate**: All event banners and promotional artwork stored under `_raw-assets/public/assets/ui/events/` and resolved through `ASSET_TYPES.UI` MUST NEVER contain hardcoded calendar dates, years (e.g., 2024, 2026), hours, or physical location strings burned into the image pixels. Event scheduling and active timeframes must be rendered dynamically by Vue components overlaying the clean artwork.

#### Execution & Pipeline Commands

To process the `_raw-assets/` folder and generate all asset databases, execute:

```bash
npm run assets:convert
```

#### Item Sprites & Crafting Tiers Hierarchy

All inventory and shop item sprites in `public/assets/sprites/` MUST strictly follow the 4-tier domain hierarchy mapped from `item.craftingTier`:
- `crafting/tier0/`: Raw materials, stones, and primary crafting inputs (`item.craftingTier === 0`).
- `crafting/tier1/`: Refined materials and intermediate crafting items (`item.craftingTier === 1`).
- `crafting/tier2/`: Advanced components and complex parts (`item.craftingTier === 2`).
- `crafting/tier3/`: Finished products, consumables, TMs, Mochis, Pokéballs, and held battle items (`item.craftingTier === 3`).

To download missing items or re-tier them:
1. `npm run assets:download:items` (`scripts/assets/download_assets.ts`)
2. `npm run assets:convert` (`scripts/assets/convert_assets.ts`)
3. `npm run assets:organize-tiers`

Creating flat asset directories (such as `items/`) or altering `items.json` sprite paths away from `crafting/tier[0-3]/` is STRICTLY FORBIDDEN.

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

## ⚙️ NPC Sprite Pipeline & Catalog

The NPC sprite catalog (`npcSpriteCatalog.ts`) is automatically generated from the raw images in the assets folder via `scripts/convert_assets.ts`:

- **Archetype Synchronization**: To introduce new trainer categories or custom NPC archetypes, ensure you map the new archetype name and its parsing keywords to `ARCHETYPE_KEYWORDS_LOCAL` in `convert_assets.ts`.
- **Automatic Matching**: The script scans files in `_raw-assets/public/assets/sprites/npc/` matching filenames containing the keywords, classifying them, and exporting them in `npcSpriteCatalog.ts` under the new archetype key.

---

## 📦 PWA Caching & Configuration (VitePWA)

To ensure game assets are correctly precached and the service worker remains stable:

### 1. Workbox Validation Rules

- **FORBIDDEN**: The property `suppressGlobWarnings` is deprecated in recent versions of `workbox-build`. Including it in `vite.config.ts` will trigger a `ReferenceError` or validation failure that prevents the server from starting.
- **Maximum File Size**: Large assets (like high-res backgrounds) may exceed the default Workbox limit. Use `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (5MB) in the `workbox` config if needed.

### 2. Asset Manifest Integrity

- **Glob Patterns**: Ensure that `globPatterns` includes all critical game extensions: `['**/*.{js,css,html,ico,png,svg,webp,woff2}']`.
- **Static Injections**: Use `includeAssets` for critical WASM or background files that aren't automatically discovered by the crawler.

---

## 🔊 Audio & Cries Fallback System

To optimize performance and avoid run-time latency or 404 errors when resolving cries for variant Pokémon (e.g. Mega evolutions, specific forms), the asset pipeline pre-computes sound resources at compile time:

### 1. Compile-Time Pre-computation
- All official Pokémon entries are mapped to their specific audio files under `public/cries/`.
- If a specific variant cry is missing (e.g., `rayquazamega.mp3`), the compiler (`convert_assets.ts`) crawls the species hierarchy (`baseSpecies` and `prevo` chain) to precompute the correct fallback sound name.
- Fallback mappings are written directly into the `c` attribute of `pokemonFeetDatabase.json` and exposed in `src/data/pokemon/pokemonFeetDatabase.ts` as `POKEMON_CRIES_DATABASE` for O(1) runtime lookups.

### 2. Compile-Time Safe Gate
- The asset pipeline acts as a strict validation gate.
- If any official Pokémon (where `num > 0` and is not a CAP/Custom fanmade) fails to resolve to any valid audio or fallback cry file, the compiler MUST log a list of affected species and abort compilation with an error code (`process.exit(1)`).

---

## 📄 JSON Assets Readability Guidelines

To maintain developer ergonomics while ensuring optimal production performance:

### 1. Human-Readable in Development (DEV)
- All generated or maintained JSON files and catalogs (e.g., `pokemonFeetDatabase.json`, `animatedSpriteDatabase.json`, `npcSpriteCatalog.ts`) MUST be written using pretty-printed formatting (`JSON.stringify(..., null, 2)`) during local development and assets conversion.
- No JSON file committed in development should be in "machine" minified format.

### 2. Maximum Optimization in Production (Build)
- Production minification and space optimizations are handled automatically during the bundle compilation phase (`npm run build`). No manual minification should be done to files in the repository.

