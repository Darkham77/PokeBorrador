# UI Templates & Interactive Demos

This directory contains standalone HTML templates and interactive demos showcasing the **Generation 3 GBA Retro-Pixel UI system** and the **Modular Theming Engine** for Poké Vicio.

## Contents

- [**`pixel_ui_template.html`**](./pixel_ui_template.html): Master catalog of all standardized UI primitives:
  - **3px Virtual Pixel Curvature**: Mathematical stepped clip polygons (`--s: 3px`).
  - **Retro Pixel Checkboxes**: Recessed cavities with crisp pixel art SVG checkmarks and GSAP toggle physics.
  - **Inventory & PC Slots**: Continuous 360° recessed bevel cavities with zero corner gap holes.
  - **Parametric Buttons**: 7 color variants and 4 scales (XS, SM, MD, LG) with 100% GSAP microswitch click/hover physics.
  - **Combatant Status HUD**: 1:1 replica of Generation 3 battle HUD (Wingull Lv12).
  - **Type Pills & Status Badges**: Micro-chamfer pixel borders.
- [**`pixel_login_demo.html`**](./pixel_login_demo.html): Interactive demo of the game login screen:
  - Stepped GBA Wingull corner profile.
  - Real-time theme toggle (Vicio Dark vs Wingull GBA Light vs Cyber Neon).
  - Real-time density scale toggle (2px, 3px, 4px).
  - Interactive server selection and GSAP-driven auth tabs.

## Visual & Accessibility Protocols

- **360° Dark Outline for White Text**: In accordance with the high-contrast retro protocol (`@mixin text-outline(#000, 1px)`), any text rendered in white (`#ffffff` / `#f8fafc`) carries an 8-point 1px dark perimeter (`text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, ...`) to prevent eye strain and ensure maximum legibility against light or vibrant backgrounds.
- **Universal Emoji Centering (`.emoji`)**: All emojis, symbols, and gender glyphs are isolated via the `.emoji` class (`display: inline-flex; align-items: center; justify-content: center; line-height: 1; height: 1em;`) and matched with `line-height: 1` text spans to eliminate baseline sinking caused by the pixel font's `size-adjust: 128%`.
- **Zero-Filter GPU Physics**: Eliminates Chromium Skia offscreen rasterizer black flickering by driving hover/press states purely via GPU `transform: translateY` microswitch spring easing (`power2.out`, `back.out(2)`).

## Offline & Portability Details

- **Embedded Base64 Font**: Both demos embed the official `Pokemon FireRed LeafGreen` pixel font as Base64 Data URIs, completely avoiding Chromium local `file:///` CORS blocking.
- **GSAP Local + CDN Fallback**: Loads local GSAP from `node_modules/gsap` with automatic fallback to CDN when offline/standalone.
- **Zero Build Step**: Double-click any `.html` file from Windows Explorer or your desktop to test immediately.
