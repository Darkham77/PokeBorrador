# Purpose

Offscreen rendering workers, canvas drawing, and weather animations renderers.

## Ownership

Graphics Developers.

## Local Contracts

- Computes layout geometries and particle matrices inside background worker threads.
- **Atmospheric Weather Noise & Heat Shimmer OffscreenCanvas Contract (`atmosphere.worker.ts`)**: Weather noise textures (`pattern-noise-1`, `pattern-noise-2`) are rendered off-thread onto an `OffscreenCanvas`. For heat weathers (`sun`, `intense_sun`, `heatwave`), the worker combines upward physical convection drift (`driftY1`/`driftY2` < 0) with real-time sinusoidal horizontal wave oscillation (`heatShimmerX1`/`heatShimmerX2` driven by `Math.sin(time * freq)`) to emulate atmospheric heat haze with zero main-thread layout thrashing. The canvas is styled with `inset: 0 !important; width: 100% !important; height: 100% !important;` and masked with a radial gradient vignette (`mask-image`), keeping the viewport center crystal clear and confining the shimmer noise to the screen borders.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
