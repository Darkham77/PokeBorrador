# Purpose

Manage the logic and assets of common.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Tooltip Wrapper Alignment in Flex Containers**: When consuming `PVTooltip` inside flex container layouts (e.g., vertical lists with `flex-direction: column`), parent containers MUST explicitly declare cross-axis alignment (`align-items: flex-start;` or similar) if child elements have dynamic intrinsic widths. This prevents the default `stretch` behavior from causing `.pv-tooltip-wrapper`'s internal `justify-content: center !important;` from misaligning shorter sibling elements.
- **Atmosphere Layer OffscreenCanvas & Weather Texture Preload Contract (`AtmosphereLayer.vue`)**: Weather noise textures preloaded for `createImageBitmap` transfer to OffscreenCanvas Web Workers MUST set `img.crossOrigin = 'anonymous'` to prevent cross-origin security exceptions across mobile and secure contexts. The dynamic container `useResizeObserver` MUST enforce a minimum resize delta threshold (`ATMOSPHERE_RESIZE_THRESHOLD_PX = 20`) before dispatching `RESIZE` events to the Web Worker, shielding mobile browsers from continuous canvas buffer re-allocations and visual texture flickering during touch scrolling.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
