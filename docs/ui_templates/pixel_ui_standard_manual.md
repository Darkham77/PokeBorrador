# GBA Retro-Pixel UI System: Architecture & Design System Manual

This manual establishes the authoritative specification, mathematical algorithms, CSS architecture, and visual protocols for the **Generation 3 GBA Retro-Pixel UI System** in Poké Vicio.

Every AI agent, frontend developer, or automated assistant working with UI components, HTML templates (`docs/ui_templates/`), or Vue views MUST strictly adhere to this manual.

---

## 1. Architectural Principles & Visual Identity

Poké Vicio operates on a **Hybrid Retro-Modern** visual foundation:

1. **Modern UI Shell**: Rich color palettes, layered depth, CSS custom properties, GPU-accelerated GSAP microswitches, and responsive layouts.
2. **Pixel-Art Heart**: Genuine Game Boy Advance (GBA) Pokémon FireRed/LeafGreen aesthetics—pixelated typography (`Pokemon FireRed LeafGreen`), stepped pixel-corner contours, recessed inventory cavities, and 0 1px relief bevels.

### Golden Rules (Non-Negotiable)

- **Zero Handcrafted Corner Hacks**: Never manually hardcode arbitrary polygon coordinates for rounded pixel corners. All corner stepping MUST follow the universal mathematical Bresenham circle rasterization algorithm.
- **Zero Native CSS `border` on Clipped Elements**: Native CSS `border` properties are chopped off by CSS `clip-path`. Borders MUST be implemented using multi-layer pseudo-elements (`::after` with `--clip-*-border`) or nested frame geometry.
- **Strict 4-Tier Frame Hierarchy**: Never share the same corner radius across distinct component categories. Buttons MUST have curved pixel corners (Radius 5) to distinctly differentiate them from rectangular tabs (Radius 2).
- **Dual-Scale Contrast Protocol**: Never apply multi-directional text outline (`.text-outline`) to small text (<= 8px). Small pixel text must use single-direction drop shadows or high-contrast solid colors.
- **Mandatory Playwright Visual Verification**: Always capture and inspect screenshots using Playwright before declaring UI implementation complete.

---

## 2. Mathematical Bresenham Polygon Engine

Manual corner polygons produce asymmetrical defects: missing pixels on the right, surplus pixels on the left, and broken geometry when scaled.

The universal pixel border generator uses Bresenham/circle arc trigonometry quantized to virtual grid units (`--s`).

### 2.1 The Coordinate Generator Algorithm

```javascript
/**
 * Generates quadrant coordinates using quantized circle rasterization (270° down to 225°)
 * @param {number} radius - Grid unit radius (e.g., 2 for tabs, 5 for buttons, 4 for panels)
 * @param {number} pixelSize - Size of 1 virtual pixel in physical px (2, 3, or 4)
 * @param {number} offset - Inset offset for multi-pass borders
 */
function generatePoints(radius, pixelSize, offset = 0) {
  const coords = [];
  const lastCoords = { x: -1, y: -1 };
  
  for (let i = 270; i > 225; i--) {
    const x = parseInt(radius * Math.sin((2 * Math.PI * i) / 360) + radius + 0.5) * pixelSize;
    const y = parseInt(radius * Math.cos((2 * Math.PI * i) / 360) + radius + 0.5) * pixelSize;
    if (x !== lastCoords.x || y !== lastCoords.y) {
      lastCoords.x = x;
      lastCoords.y = y;
      coords.push({ x: x + offset * pixelSize, y: y + offset * pixelSize });
    }
  }
  return addCorners(mergeCoords(coords));
}

function flipCoords(coords) {
  return [...coords, ...coords.map(({ x, y }) => ({ x: y, y: x })).reverse()]
    .filter(({ x, y }, i, arr) => !i || arr[i - 1].x !== x || arr[i - 1].y !== y);
}

function insetCoords(coords, pixelSize, offset) {
  return coords.map(({ x, y }) => ({
    x: x + pixelSize * offset,
    y: y + pixelSize * Math.floor(offset / 2),
  })).reduce((ret, item) => {
    if (ret.length > 0 && ret[ret.length - 1].x === ret[ret.length - 1].y) return ret;
    ret.push(item);
    return ret;
  }, []);
}

function mergeCoords(coords) {
  return coords.reduce((result, point, index) => {
    if (index !== coords.length - 1 && point.x === 0 && coords[index + 1].x === 0) return result;
    if (index !== 0 && point.y === 0 && coords[index - 1].y === 0) return result;
    if (index !== 0 && index !== coords.length - 1 && point.x === coords[index - 1].x && point.x === coords[index + 1].x) return result;
    result.push(point);
    return result;
  }, []);
}

function addCorners(coords) {
  return coords.reduce((result, point, i) => {
    result.push(point);
    if (coords.length > 1 && i < coords.length - 1 && coords[i + 1].x !== point.x && coords[i + 1].y !== point.y) {
      result.push({ x: coords[i + 1].x, y: point.y });
    }
    return result;
  }, []);
}

function edgeCoord(n, offset) {
  if (offset) return n === 0 ? `calc(100% - ${offset}px)` : `calc(100% - ${offset + n}px)`;
  return n === 0 ? '100%' : `calc(100% - ${n}px)`;
}

function mirrorCoords(coords, offset = 0) {
  return [
    ...coords.map(({ x, y }) => ({
      x: offset ? `${x + offset}px` : `${x}px`,
      y: offset ? `${y + offset}px` : `${y}px`,
    })),
    ...coords.map(({ x, y }) => ({
      x: edgeCoord(y, offset),
      y: offset ? `${x + offset}px` : `${x}px`,
    })),
    ...coords.map(({ x, y }) => ({
      x: edgeCoord(x, offset),
      y: edgeCoord(y, offset),
    })),
    ...coords.map(({ x, y }) => ({
      x: offset ? `${y + offset}px` : `${y}px`,
      y: edgeCoord(x, offset),
    })),
  ];
}

function generatePath(coords, reverse = false) {
  const mirrored = mirrorCoords(coords);
  return (reverse ? mirrored : mirrored.reverse()).map(p => `${p.x} ${p.y}`).join(', ');
}

function getPixelFramePolygons(radius, pixelSize, borderWidth = 1) {
  const outerCoords = flipCoords(generatePoints(radius, pixelSize));
  const outerPath = generatePath(outerCoords);
  const innerCoords = addCorners(flipCoords(
    borderWidth < radius ? insetCoords(generatePoints(radius, pixelSize), pixelSize, borderWidth) : generatePoints(2, pixelSize, borderWidth)
  ));
  const innerPath = generatePath(innerCoords, true);
  const borderPath = `${outerPath}, 0px 50%, ${borderWidth * pixelSize}px 50%, ${innerPath}, ${borderWidth * pixelSize}px 50%, 0px 50%`;
  return { outerPath, innerPath, borderPath };
}
```

### 2.2 Dynamic Scale Recalculation (`updatePixelScale`)

When the user or application toggles pixel density (2px, 3px, 4px), call `updatePixelScale(pixelSize)`. It automatically updates root CSS custom properties across all 4 tiers:

```javascript
function updatePixelScale(pixelSize) {
  document.documentElement.style.setProperty('--s', pixelSize + 'px');

  const lPill = getPixelFramePolygons(2, pixelSize, 1);
  const lControl = getPixelFramePolygons(2, pixelSize, 1);
  const lBtn = getPixelFramePolygons(5, pixelSize, 1);
  const lPanel = getPixelFramePolygons(4, pixelSize, 1);

  // Level 1: Pills & Badges
  document.documentElement.style.setProperty('--clip-pill-outer', `polygon(${lPill.outerPath})`);
  document.documentElement.style.setProperty('--clip-pill-border', `polygon(${lPill.borderPath})`);
  document.documentElement.style.setProperty('--clip-pill-inner', `polygon(${lPill.innerPath})`);
  document.documentElement.style.setProperty('--clip-pill', `polygon(${lPill.outerPath})`);

  // Level 2: Controls, Tabs & Inputs
  document.documentElement.style.setProperty('--clip-control-outer', `polygon(${lControl.outerPath})`);
  document.documentElement.style.setProperty('--clip-control-border', `polygon(${lControl.borderPath})`);
  document.documentElement.style.setProperty('--clip-control-inner', `polygon(${lControl.innerPath})`);
  document.documentElement.style.setProperty('--clip-control', `polygon(${lControl.outerPath})`);

  // Level 3: Action Buttons (Distinct Curved Step Contour)
  document.documentElement.style.setProperty('--clip-btn-outer', `polygon(${lBtn.outerPath})`);
  document.documentElement.style.setProperty('--clip-btn-border', `polygon(${lBtn.borderPath})`);
  document.documentElement.style.setProperty('--clip-btn-inner', `polygon(${lBtn.innerPath})`);
  document.documentElement.style.setProperty('--clip-btn', `polygon(${lBtn.outerPath})`);

  // Level 4: Panels, Modals & Cards
  document.documentElement.style.setProperty('--clip-panel-outer', `polygon(${lPanel.outerPath})`);
  document.documentElement.style.setProperty('--clip-panel-border', `polygon(${lPanel.borderPath})`);
  document.documentElement.style.setProperty('--clip-panel-inner', `polygon(${lPanel.innerPath})`);
  document.documentElement.style.setProperty('--clip-panel', `polygon(${lPanel.outerPath})`);
}
```

---

## 3. The 4-Tier Frame Hierarchy

To avoid visual monotony and maintain clear affordances, elements are partitioned into 4 distinct geometric tiers:

| Tier | Target UI Components | Radius ($R$) | Visual Profile | CSS Variables |
| :--- | :--- | :---: | :--- | :--- |
| **Level 1** | Type Pills, Status Badges, Stepper Buttons, Micro Tags | `R = 2` | Compact micro-bevel with single-pixel chamfer. | `--clip-pill-outer`, `--clip-pill-border` |
| **Level 2** | Navigation Tabs, Input Fields, Inventory/Move Slots | `R = 2` | Stepped rectangular arcade frame. Highly structured. | `--clip-control-outer`, `--clip-control-border` |
| **Level 3** | Action & Interactive Buttons (`.pv-btn`) | `R = 5` | **3-Step Curved Pixel Contour**. Organic rounded push button. | `--clip-btn-outer`, `--clip-btn-border` |
| **Level 4** | Dialog Windows, Panels, Modals, Status HUDs | `R = 4` | Heavy structural window with cast shadow. | `--clip-panel-outer`, `--clip-panel-border` |

### CSS Frame Primitives

Every element uses `.pv-frame-*` paired with `::after` for border rendering:

```css
/* LEVEL 1: PILLS & MICRO BADGES */
.pv-frame-pill {
  position: relative;
  clip-path: var(--clip-pill-outer);
}
.pv-frame-pill::after {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: var(--clip-pill-border);
  background: var(--frame-border, #334155);
  pointer-events: none;
  z-index: 1;
}

/* LEVEL 2: CONTROLS, TABS & INPUTS */
.pv-frame-control {
  position: relative;
  clip-path: var(--clip-control-outer);
}
.pv-frame-control::after {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: var(--clip-control-border);
  background: var(--frame-border, #334155);
  pointer-events: none;
  z-index: 1;
}

/* LEVEL 3: ACTION BUTTONS */
.pv-frame-btn {
  position: relative;
  clip-path: var(--clip-btn-outer);
}
.pv-frame-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: var(--clip-btn-border);
  background: var(--frame-border, #334155);
  pointer-events: none;
  z-index: 1;
}

/* LEVEL 4: PANELS & WINDOWS */
.pv-frame-panel {
  position: relative;
  clip-path: var(--clip-panel-outer);
}
.pv-frame-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  clip-path: var(--clip-panel-border);
  background: var(--frame-border, #202b42);
  pointer-events: none;
  z-index: 1;
}
```

---

## 4. Text, Typography & Contrast Protocols

### 4.1 The Universal 360° Dark Outline for White Text

In accordance with the project's high-contrast retro protocol (`@mixin text-outline(#000, 1px)`):

- **Mandate**: **Any text rendered in white (`#ffffff` / `#f8fafc`) MUST carry a 360° dark perimeter outline** across all backgrounds, gradients, and UI elements (buttons, headings, tabs, and badges).
- **8-Direction Canonical Outline**:

  ```css
  text-shadow: 
    1px 1px 0 #000, 
    -1px -1px 0 #000, 
    1px -1px 0 #000, 
    -1px 1px 0 #000,
    0 1px 0 #000,
    0 -1px 0 #000,
    1px 0 0 #000,
    -1px 0 0 #000;
  ```

- **Badges & Pills Calibration**: To ensure the 1px perimeter outline does not close up internal glyph cavities (such as `A`, `B`, `O`, `R`), badges MUST use:
  - `font-size: 8.5px;`
  - `letter-spacing: 0.8px;`
  - `padding: 4px 8px;`
  - `line-height: 1;`
  This guarantees that all 18 elemental types and status indicators (`FUEGO`, `AGUA`, `ELÉCTRICO`, `PAR`, etc.) maintain crisp letter interiors and complete 360° contrast.

### 4.2 Multiline Text Line Height (`line-height: 1.4`)

When a text label or tab title wraps across two lines (e.g. `POKÉMON` + `(6)`):

- Never leave `line-height: 1` or `line-height: 0.9`. It causes glyph ascenders/descenders to collide.
- Always declare:

  ```css
  .pv-tab-btn {
    line-height: 1.4;
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: center;
    justify-content: center;
  }
  ```

---

## 5. Centering, Glyphs & Icon Alignment

### 5.1 The Close Button `[X]` Mandate

- **Problem**: Typing `'X'` or `'✕'` using the pixel font causes the glyph to sink to the bottom of the button because of font baseline offsets and ascender heights.
- **Rule**: Close buttons MUST NEVER use raw text characters. Always use a centered vector SVG cross:

```html
<!-- CANONICAL CLOSE BUTTON -->
<button class="pv-frame-pill pv-window-close" title="Cerrar">
  <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
    <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
    <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="square" />
  </svg>
</button>
```

```css
.pv-window-close {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #94a3b8;
  cursor: pointer;
}
.pv-window-close svg {
  display: block;
  pointer-events: none;
}
```

### 5.2 Universal `.emoji` Optical Centering per `/project-standards`

As governed by `/project-standards` (`ui_ux_standards.md` & `sass_styling_manual.md`):

1. **Pixel Font Baseline Drift**: The GBA font `Pokemon FireRed LeafGreen` has a low x-height (~2px at 8px) and inflated line box. When unadjusted, system emojis hang below the text baseline.
2. **Container Flex Mandate**: Any container rendering pixel text alongside an emoji MUST use `display: inline-flex; align-items: center; line-height: 1;`.
3. **Optical `-2px` Offset**: The master `.emoji` class applies `transform: translateY(-2px);` to align the emoji's optical center directly with the geometric center of the pixel text:

```css
.emoji:not(i):not([class*="fa"]),
.emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", sans-serif !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
  vertical-align: middle !important;
  transform: translateY(-2px); /* Optical centering with pixel font per /project-standards */
  width: auto;
  flex-shrink: 0;
  text-shadow: none !important;
}

/* Standalone Icon Buttons (no text) */
.pv-icon-btn .emoji {
  transform: translateY(-1px); /* Optical centering against button top bevel */
}
```

---

## 6. Panel Shadow Stacking ("Se Ve Todo Negro" Bug Prevention)

Applying a dark drop-shadow directly on a clipped panel wrapper often causes the shadow overlay to cover the panel's interior surface, darkening the entire screen.

### Canonical Shadow Architecture

1. **Outer Wrap** (`.pv-panel-wrap`): Host element with `position: relative`.
2. **Cast Shadow** (`.has-cast-shadow::before`): Generates the offset shadow at `z-index: 0` with `pointer-events: none;`.
3. **Surface** (`.pv-panel-surface`): Sits at `z-index: 2` with `position: relative`.

```css
.pv-panel-wrap {
  position: relative;
  display: flex;
}

.pv-panel-wrap.has-cast-shadow::before {
  content: '';
  position: absolute;
  inset: 0;
  transform: translate(6px, 8px);
  background: rgba(0, 0, 0, 0.65);
  clip-path: var(--clip-panel-outer);
  z-index: 0;
  pointer-events: none;
}

.pv-panel-surface {
  position: relative;
  z-index: 2;
  width: 100%;
}
```

---

## 7. Component Reference & Styling Catalog

### 7.1 Action Buttons (`.pv-btn`)

Buttons feature 7 semantic color variants and 4 scales (XS, SM, MD, LG):

```html
<button class="pv-frame-btn pv-btn pv-btn-primary pv-btn-md">
  CONFIRMAR
</button>
```

```css
.pv-btn {
  font-family: var(--font-pixel);
  font-weight: bold;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  box-shadow: inset 0 2px 0 rgba(255, 255, 255, 0.25), inset 0 -2px 0 rgba(0, 0, 0, 0.35);
  transition: transform 0.05s ease;
}

/* Scales */
.pv-btn-xs { height: 22px; padding: 0 8px; font-size: 8px; }
.pv-btn-sm { height: 28px; padding: 0 12px; font-size: 8px; }
.pv-btn-md { height: 36px; padding: 0 16px; font-size: 9px; }
.pv-btn-lg { height: 44px; padding: 0 24px; font-size: 11px; }

/* Color Themes */
.pv-btn-primary   { background: #2563eb; color: #fff; --frame-border: #1d4ed8; }
.pv-btn-secondary { background: #475569; color: #fff; --frame-border: #334155; }
.pv-btn-success   { background: #16a34a; color: #fff; --frame-border: #15803d; }
.pv-btn-danger    { background: #dc2626; color: #fff; --frame-border: #b91c1c; }
.pv-btn-warning   { background: #d97706; color: #fff; --frame-border: #b45309; }
.pv-btn-info      { background: #0891b2; color: #fff; --frame-border: #0e7490; }
.pv-btn-ghost     { background: rgba(255,255,255,0.06); color: #94a3b8; --frame-border: rgba(255,255,255,0.15); text-shadow: none; }
```

### 7.2 Elemental Type Pills & Status Badges

Used for Pokémon types (Fire, Water, Grass, etc.) and battle conditions (PAR, PSN, BRN):

```html
<span class="pv-frame-pill pv-type-pill type-water">AGUA</span>
<span class="pv-frame-pill pv-type-pill type-electric">ELÉCTRICO</span>
<span class="pv-frame-pill pv-status-badge status-par">PAR</span>
```

```css
.pv-type-pill {
  padding: 4px 8px;
  font-size: 8.5px;
  font-weight: 900;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.8px;
  line-height: 1;
  text-shadow: 
    1px 1px 0 #000, 
    -1px -1px 0 #000, 
    1px -1px 0 #000, 
    -1px 1px 0 #000,
    0 1px 0 #000,
    0 -1px 0 #000,
    1px 0 0 #000,
    -1px 0 0 #000;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.type-fire     { background: #f97316; --frame-border: #9a3412; }
.type-water    { background: #0284c7; --frame-border: #075985; }
.type-grass    { background: #16a34a; --frame-border: #14532d; }
.type-electric { background: #eab308; --frame-border: #854d0e; }

.pv-status-badge {
  padding: 3px 6px;
  font-size: 8.5px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  text-shadow: 
    1px 1px 0 #000, 
    -1px -1px 0 #000, 
    1px -1px 0 #000, 
    -1px 1px 0 #000,
    0 1px 0 #000,
    0 -1px 0 #000,
    1px 0 0 #000,
    -1px 0 0 #000;
}
.status-par { background: #eab308; --frame-border: #854d0e; }
```

### 7.3 Combat Move Slots

2x2 battle layout with left/right symmetry:

```html
<div class="move-slots-grid">
  <div class="pv-frame-control pv-move-slot move-water">
    <div class="move-info">
      <div class="move-name">HIDROBOMBA</div>
      <span class="pv-frame-pill pv-type-pill type-water">AGUA</span>
    </div>
    <div class="move-pp">PP 05/05</div>
  </div>
</div>
```

```css
.move-slots-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.pv-move-slot {
  padding: 12px 18px;
  background: #161b2a;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.move-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.move-name {
  font-size: 9px;
  font-weight: bold;
  color: #fff;
  text-shadow: 1px 1px 0 #000;
}
.move-pp {
  font-size: 8px;
  color: var(--color-text-gold, #fde047);
}
```

### 7.4 Recessed Item Slots (Inventory Cavities)

Recessed inventory squares with continuous 360° bevel and active/hover glow:

```html
<div class="pv-frame-control pv-slot-recessed selected">
  <img src="..." class="slot-item-icon" alt="Item" />
  <span class="slot-qty-tag">x99</span>
</div>
```

```css
.pv-slot-recessed {
  width: 48px;
  height: 48px;
  background: var(--color-slot-bg, #0b0f19);
  --frame-border: var(--color-slot-border, #1e293b);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: inset 2px 2px 0 var(--color-slot-bevel-dark, #05080f),
              inset -2px -2px 0 var(--color-slot-bevel-hi, #202b42);
  cursor: pointer;
}
.pv-slot-recessed.selected {
  --frame-border: #bf5af2;
  box-shadow: inset 2px 2px 0 #7928ca,
              inset -2px -2px 0 #d946ef,
              0 0 12px rgba(191, 90, 242, 0.45);
}
.slot-qty-tag {
  position: absolute;
  bottom: 3px;
  right: 5px;
  font-size: 8px;
  font-weight: 900;
  color: #ffd60a;
  text-shadow: 1px 1px 0 #000;
}
```

---

## 8. GSAP Microswitch Motion Standard

UI state transitions MUST NOT use native CSS transition delay loops or `@keyframes`. GSAP tweens provide predictable tactile feel:

```javascript
// Hover & Active Microswitch Interaction
document.querySelectorAll('.pv-btn').forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    if (btn.disabled) return;
    gsap.to(btn, { y: -2, duration: 0.12, ease: 'power2.out' });
  });
  btn.addEventListener('mouseleave', () => {
    if (btn.disabled) return;
    gsap.to(btn, { y: 0, duration: 0.12, ease: 'power2.out' });
  });
  btn.addEventListener('mousedown', () => {
    if (btn.disabled) return;
    gsap.to(btn, { y: 2, duration: 0.05, ease: 'power1.in' });
  });
  btn.addEventListener('mouseup', () => {
    if (btn.disabled) return;
    gsap.to(btn, { y: -2, duration: 0.10, ease: 'back.out(2)' });
  });
});
```

---

## 9. Quality Verification & Playwright Protocol

Before committing any UI modification:

1. **Verify No Type or Lint Errors**:

   ```bash
   npm run lint
   ```

2. **Execute Headless Visual Snapshot (Playwright)**:
   Create a temporary runner in `scratch/verify_ui.js` that sets `deviceScaleFactor: 2` and screenshots the targeted component:

   ```javascript
   import { chromium } from 'playwright';
   const browser = await chromium.launch({ headless: true });
   const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 });
   await page.goto('file:///' + process.cwd().replace(/\\/g, '/') + '/docs/ui_templates/pixel_ui_template.html');
   const el = await page.$('.pv-move-slot');
   await el.screenshot({ path: 'scratch/verify.png' });
   await browser.close();
   ```

3. **Inspect Output**: Call `view_file` on the resulting PNG to confirm:
   - [ ] No missing corners or jagged asymmetrical pixel teeth.
   - [ ] No dark mud clogging letters in small badges (8px).
   - [ ] Close button `[X]` centered dead-center via SVG.
   - [ ] Multiline tab text cleanly separated by at least `line-height: 1.4`.
   - [ ] Panel background clearly visible without black shadow occlusion.
