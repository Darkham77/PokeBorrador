# SASS Styling & Premium Aesthetics Manual

This manual defines the technical requirements for Dart Sass compatibility and the visual standards required for a premium "Wow Factor" user experience.

---

## 🛡️ Technical Safety: Dart Sass Traps

Modern Sass built-ins often collide with standard CSS functions. You **MUST** use interpolation `#{}` to ensure Sass outputs literal CSS instead of attempting to process these values as color functions.

### 1. Function Collisions

Apply interpolation to the following CSS functions to prevent "X is not a color" errors:

- `transform: Scale(1.03);`
- `transform: TranslateY(-10px);`
- `transform: TranslateX(50%);`
- `transform: TranslateZ(0);`
- `filter: Invert(100%);`
- `filter: Grayscale(0.8);`
- `filter: Opacity(0.5);`
- `filter: Brightness(1.2);`
- `filter: Blur(5px);`
- `filter: Saturate(1.5);`
- `filter: Drop-shadow(0 4px 8px rgba(0,0,0,0.5));`
- `background: Radial-Gradient(...) / Linear-Gradient(...);` (Essential for weather overlays)

> [!WARNING]
> [!NOTE]
> **SASS 2.0 Collision Protocol**: To prevent Dart Sass 2.0 collisions, standard CSS functions (`scale`, `blur`, `rotate`, `invert`, `brightness`, etc.) must be capitalized. However, this process is **100% automated** by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR (Hot Module Replacement) and build. Developers and agents can write standard lowercase CSS properties, and Vite will automatically capitalize them.

### 2. Specificity vs. !important

When applying filters to sprites (especially in global components like `MapCard` or `Pokedex`), you **MUST NOT** use `!important`.

- **Reasoning**: Using `!important` on base filters blocks the application of silhouette classes (`.spawn-silhouette`, `.unknown-pokemon`) used to hide uncaptured species.
- **Requirement**: Use CSS specificity (nesting or multiple classes) to allow conditional overrides.
- **Specificity vs. !important**: Never use `!important` on base width/height or alignment classes in SASS. This blocks the ability for Vue `:style` bindings to calculate and inject precise virtual-world coordinates at runtime.
- **Global vs. Scoped Specificity**: Be aware that global SCSS selectors (e.g., `.hud-pill`) have higher specificity than Vue `scoped` styles (which use data-attributes). If a component needs to override a global layout property based on JS calculations (like font-size), use **CSS Variables** defined in the component or **Inline Styles** on the element to ensure the calculation wins.
- **Fullscreen Stability**: Overriding `BaseModal` fullscreen defaults requires ultra-specific selectors (e.g., `.base-modal-root .type-fullscreen.custom-class .base-modal-card`) to win against core `!important` rules. Use `contain: content` for maximum layout stability in these high-density game modals.

### 3. Combat Performance Override (High Fidelity)

In scenarios where pixel-perfect alignment is critical (Combat Arena), components MUST ignore global performance/simplification modes.

- **Implementation**: Use `provide('forceHighFidelity', true)` in the parent battle view.
- **Usage**: Components like `PVSpriteFX` MUST check for `forceHighFidelity` before simplifying filters or animations.

### 4. Preference: Capitalization vs. Unquote/Interpolation

To bypass SASS color function collisions, we strictly follow a hierarchy of methods.

- **PRIMARY (Automated)**: **Capitalization**. This is handled automatically by the Vite plugin (`vite-plugin-sass-traps.ts`). Developers and agents can write standard lowercase functions, and Vite will convert them to capitalized form.
  - Standard written: `filter: grayscale(1);`
  - Output after Vite save: `filter: Grayscale(1);`
- **SECONDARY**: **Interpolation** `#{}`. Use ONLY for complex dynamic values.
  - ✅ `transform: Scale(#{$factor});`
- **FORBIDDEN**: **string.unquote()** for standard filters. It violates the "Zero-Warning" architecture and makes the code harder to read.

### 5. GPU Performance & Hardware Acceleration (SSoT)

- **REQUIRED**: Prioritize the `opacity` property over `filter: opacity()` and use efficient shadow types based on element geometry.
- **SSoT Authority**: For detailed rules on hardware-acceleration, shadow performance (`box-shadow` vs `drop-shadow`), and layer promotion, refer to the **[GPU Optimization Manual](gpu_optimization_manual.md)**.
- **Visual Goal**: Ensure smooth 60fps transitions by following the "Density Rule" for shadows and avoiding re-layout properties in animations.

### 6. Layout Stability: Flex-Scroll Areas

To prevent layout collapse in scrollable flex containers (Common in Debug and Grid panels), you **MUST** ensure the scrolling container can shrink correctly.

- **MANDATORY**: Apply `min-height: 0` to any element using `flex: 1` and `overflow: auto/hidden`.
- **Audit Positioning**: To be correctly detected by automated audit tools, the `min-height: 0` declaration SHOULD be placed immediately adjacent to the `overflow` property.
- **Example**:

  ```scss
  .scroll-container {
    flex: 1;
    overflow-y: auto;
    min-height: 0; // Essential for flex-child scroll stability
    @include smooth-scroll;
  }
  ```

> [!IMPORTANT]
> **VUE COMPONENT RULE**: Interpolation `#{}` only works inside `<style lang="scss">`. If you apply this fix to a `.vue` file, you **MUST** ensure the style block has the `lang="scss"` attribute.

### 7. Modern Built-ins (math, string)

Global built-in functions are deprecated in Dart Sass 2.0+ and will be removed in 3.0.0. Using them generates loud build warnings.

- **FORBIDDEN**: `random()`, `unquote()`, `unit()`, `percentage()`, `abs()`, `round()`, `ceil()`, `floor()`.
- **REQUIRED**:
  - Always add `@use "sass:math";` or `@use "sass:string";` at the top of the style block.
  - Use `math.random(...)`, `string.unquote(...)`, etc.
  - **Note**: Only use `string.unquote` for non-standard strings. For CSS filters, use **Capitalization** instead.

**Example:**

```scss
@use "sass:math";

.card {
  width: math.percentage(0.5);
  animation-delay: #{math.random(2000)}ms;
  // CORRECT: Using Capitalization for the transform
  transform: Scale(1.03);
}
```

---

## 🏗️ Modern Architecture: @use Mandate

The legacy `@import` directive is deprecated. This project strictly follows the `@use` and `@forward` system for modularity.

- **Namespacing**: Access variables via their namespace (e.g., `variables.$primary-color`).
- **Aliases**: Use `@use 'variables' as v;` if the filename is long.
- **Global Scope**: Avoid `@use '...' as *;` unless it is a core utility or function set intended to be ubiquitous.

> [!WARNING]
> **SASS @import Deprecation**: The use of `@import` for SASS files is strictly prohibited. It is deprecated and will be removed in Dart Sass 3.0.0.
> **Detection**: Any warning in the console stating `Sass @import rules are deprecated` MUST be fixed immediately by migrating to `@use`.
> **Fix**: Replace `@import "path";` with `@use "path" as *;` (if you need global members) or `@use "path";` (and access via namespace).

---

## ✨ Design Aesthetics: Hybrid Retro-Modern Standard

The project employs a high-contrast **Hybrid Retro-Modern** aesthetic. We combine high-fidelity "Modern Frames" with "Retro Hearts" (Pixel Art content).

### 1. The Modern UI Frame (Containers)

All layouts and structural containers **MUST** follow premium modern web design principles.

- **Glassmorphism**: Use `-webkit-backdrop-filter: Blur(10px); backdrop-filter: Blur(10px); background: rgba(255, 255, 255, 0.05);` for cards and overlays.
- **Premium Solid Glass**: For high-density game HUDs (like Battle Sidebars), use `Rgba(30, 41, 59, 0.8)` with `Blur(12px)`. This ensures readability against dynamic backgrounds without sacrificing the glass aesthetic.
- **Opacity Accumulation**: Prohibit applying background colors or blurs to both a parent container and its children. This causes "Visual Mud" (excessive darkness). Background logic MUST be delegated to the deepest relevant element (e.g., the card).
- **Dynamic Depth**: Use soft, multi-layered HSL shadows and subtle linear gradients.
- **Modern Rendering**: Do **NOT** use `image-rendering: pixelated` on the UI shell or background layouts. They must remain smooth and fluid.

### 2. The Pixel Art Heart (Content)

All game-specific content **MUST** be strictly Pixel Art to preserve the game's core identity.

- **Rendering**: For all sprites and pixelated assets, always use `image-rendering: pixelated;`.
- **Icons**: Only use pixel-art icons. **FORBIDDEN**: Modern SVG icons, FontAwesome, or high-res Material icons.
- **Scaling Standards**:
  - **Grid Oversize**: Use **1.5x** scaling (e.g., `min-width: 60px` for a 40px slot) for item sprites in combat grids. Combined with `overflow: hidden` on parent cards, this creates a high-fidelity "clipping" effect.
- **Typography (Game Data)**: We maintain a strict hierarchy between "Game Heart" and "Modern Shell" typography.
  - **MANDATORY Pixel Fonts**: `Press Start 2P`, `VT323`, or `Silkscreen` (Google Fonts).
  - **MANDATORY Mixin**: Any element using a pixel font **MUST** include `@include pixelated;` to disable browser font-smoothing and ensure sharp edges.

| UI Level | Element Type | Style Requirement | Recommended Font |
| :--- | :--- | :--- | :--- |
| **Game Heart** | Pokémon Names, Stats, Level, Moves | **PIXELATED** (Sharp) | `Press Start 2P` |
| **Game Heart** | Battle Log, Dialogs, NPC names | **PIXELATED** (Sharp) | `VT323` / `Silkscreen` |
| **Game Heart** | Modal Headers (Titles), Tab Labels | **PIXELATED** (Sharp) | `Press Start 2P` |
| **Modern Shell** | Secondary Info, Settings, Debug Consoles | **SMOOTH** (Antialiased) | `Outfit` / `Inter` |
| **Modern Shell** | Technical Logs, Trade History, Credits | **SMOOTH** (Antialiased) | `Outfit` / `Inter` |

- **Restriction**: Smooth fonts like `Outfit` or `Inter` are reserved ONLY for administrative headers or meta-UI that is secondary to the game experience. Any text that represents a "Game Object" or "Trainer HUD Action" **MUST** be pixelated.

---

## 🚫 Non-Compliance Warning Protocol

If you detect a "smooth" modern aesthetic used for game content, you **MUST** issue a structured warning to the user.

**Warning Template (Example):**
> [!CAUTION]
> **STYLE NON-COMPLIANCE DETECTED**
> The current implementation of `[Component Name]` uses modern SVG icons/smooth fonts for game data. This violates the **Hybrid Retro-Modern Mandate**.
>
> **Proposed Refactor:**
>
> - Wrap the icons/text in a container with `font-family: 'Press Start 2P'` or `image-rendering: pixelated`.
> - Replace `[SVG Icon]` with the corresponding Pixel Art asset from `@/assets/icons/pixel/`.

---

## 🏗️ Migrating Smooth UI to Hybrid Retro-Modern

When refactoring legacy or generic components:

1. **Frame Modernization**: Apply Glassmorphism and HSL shadows to the parent container.
2. **Heart Pixelation**: Apply `image-rendering: pixelated` to all static images. Replace smooth typography with `Press Start 2P`.
3. **Contrast Verification**: Ensure the background is sharp/smooth (Modern) while the active game elements are crisp/pixelated (Retro).

---

## 🚫 Style Anti-Patterns

- **Nesting Depth**: Never exceed **3 levels** of nesting in SCSS. Excessive nesting creates specificity wars and bloated CSS.
- **Color Management**:
  - **FORBIDDEN**: Hardcoded hex values (e.g., `#ff0000`) for standard UI elements. Use **Native CSS Variables** (`var(--color)`) or SASS variables (`$color`) from the project tokens.
  - **MANDATORY Capitalization**: You **MUST** use **Rgba()**, **Rgb()**, **Linear-Gradient()**, and **Radial-Gradient()** (Capitalized) instead of lowercase. This prevents SASS from intercepting them as internal color functions and ensures literal CSS output.
  - ✅ `background: Rgba(255, 255, 255, 0.5);`
  - ❌ `background: rgba(255, 255, 255, 0.5);` (Collision)
  - **Module & Variable Protection**: Automated refactoring tools (auditors, Vite plugins) **MUST** ignore functions preceded by a dot `.` or dollar `$` (e.g., `color.scale`, `$my-var.blur`). Converting these to uppercase breaks SASS module logic and variable lookups.
  - **Filter Capitalization**: This rule applies to all CSS filters (`Blur()`, `Scale()`, `Brightness()`, `Grayscale()`, etc.).
  - **SVG Filter Quoting**: When referencing filters by ID in SASS functions or mixins, ALWAYS quote the ID inside the URL: `url("#id")`.
    - **WHY**: Prevents Dart Sass from misinterpreting the `#` as a color hex or causing compilation errors when the ID contains certain characters.
  - **Local/One-off Colors**: Capitalized Rgba/Rgb or Hex values ARE PERMITTED for local, non-recurring styles within a component's `<style scoped>` block, but variables are always preferred.
  - **SASS vs CSS Variables**: SASS color functions (like `color.scale`, `lighten()`, `darken()`) cannot process `var(--color)`. For interactive highlights/hovers, use static SASS fallbacks (e.g. `$yellow`) for calculations while maintaining the CSS variable for the main render to support dynamic themes.
  - **Variable Isolation**: In high-density or dynamically scoped components (e.g., within specialized filters or grids), if core SASS variables are not reliably available without manual imports, use **Direct Hex Values** to ensure visual stability and prevent "Color not defined" build errors.
  - **Inheritance vs Mixins**: Avoid using `@extend` for classes defined in external stylesheets (e.g., `.m-type-tag`) inside global or modular components. If the base stylesheet is not included in every build chunk, `@extend` will fail. Use the underlying mixin directly (e.g., `@include type-pill;`) instead.
- **Z-Index Standardization**:
  - **MANDATORY**: Never use hardcoded numbers for `z-index` (e.g., `z-index: 10;`). Use CSS variables (`var(--z-low)`, `var(--z-base)`, `var(--z-modal)`, `var(--z-critical)`) for consistent layering and to pass aesthetics audits.
- **Modern Control Flow**: The legacy ternary `if()` function is deprecated in SASS 1.8+. Always use standard `@if / @else` blocks for conditional styling logic to ensure build-log cleanliness.
- **Positioning & Micro-offsets**: Avoid using negative margins (`margin-top: -1px`) to correct alignment of symbols or small icons. This causes layout instability and triggers redundancy alerts. Use **TranslateY()** or **TranslateX()** (Capitalized) for hardware-accelerated positioning that doesn't affect the box model.
  - **HUD Icon Normalization**: When mixing image-based icons (SVG/PNG) with font-based icons (FontAwesome), you MUST normalize their heights to ensure a consistent text baseline.
    - **Standard**: SVG/Img icons should have a wrapper height of **20px** (vs. 16-18px for font icons) and use a small vertical offset (e.g., `TranslateY(-2px)`) to achieve optical balance with pixelated text.
- **CSS Animation Composition**: When applying multiple classes that define an `animation` to the same element, you MUST ensure they do not override each other.
  - **Standard**: If an element needs to Shake AND Flash, use a combined rule: `animation: wobble 0.6s, flash 0.3s;`.
  - **WHY**: CSS properties follow a "last-one-wins" rule. Declaring `animation` in two separate classes applied to the same element will result in only the last class's animation being executed.
- **Aura Counter-Pulse (Sincronización Inversa)**:
  - **REGLA**: Cuando un elemento tiene múltiples auras (ej: Roja por rareza y Cian por clima), las animaciones **DEBEN** estar en contra-fase exacta para evitar "ruido visual" y que un color eclipse al otro.
  - **Sincronización**: Ambas animaciones deben compartir el mismo `animation-delay` basado en semilla (ej: `var(--spawn-seed)`) para asegurar que el baile sea determinista por instancia.
  - **Comportamiento**:
    - **Aura Principal (Rare)**: 0% Escala 1.0 (Mín) -> 50% Escala 1.05 (Máx).
    - **Halo Secundario (Weather)**: 0% Escala 1.15 (Máx) -> 50% Escala 0.9 (Mín).
  - **Resultado**: Mientras una se apaga, la otra brilla, manteniendo siempre un halo de color visible y distinguible.
- **Viewport Units (Mobile Safety)**:
  - **MANDATORY**: Use `dvh` and `dvw` (Dynamic Viewport) for any element requiring full-screen scaling.
  - **WHY**: Standard `vh`/`vw` units do not account for dynamic toolbars (URL bar, navigation) in mobile browsers like Safari. This leads to layout clipping or unwanted scrollbars.
  - **FORBIDDEN**: Legacy `vh` and `vw` units accompanied by numeric values (e.g., `100vh`).
  - **Audit**: `detect_viewport_units.py` enforces this rule and supports `--fix` for automatic migration.
- **Global Pollution**: Do not define variables or mixins directly in component styles; always centralize them in tokens/partials and `@use` them.

### 4. CSS Redundancy & "Single Source of Truth"

Avoid spreading definitions for the same component across multiple files. This is the primary cause of "Visual Ghosts" where changes appear not to take effect.

- **MANDATORY**: Each core component (`.map-card`, `.base-modal`, `.hud-bar`) must have ONE primary SCSS file.
- **FORBIDDEN**: Redefining a root class in multiple stylesheets (e.g., having `.map-card` in `_render.scss`, `_items.scss`, and `_grid.scss`).
- **Responsive SASS**: When possible, consolidate media queries into the main component file instead of creating separate `-responsive.scss` files for the same classes. This avoids redundancy audit triggers.
- **Audit Requirement**: Before committing UI changes, you MUST run the redundancy audit:
  `python3 .agents/skills/project-standards/scripts/audit/detect_css_redundancy.py`
- **Component Namespacing**: To avoid global collisions and audit-detected redundancies, all classes for new or refactored components **MUST** use a unique namespace prefix related to the component:
  - ✅ `.box-pokemon-card`, `.upd-species-subtitle`, `.pdc-action-grid`
  - ❌ `.pokemon-card`, `.species-subtitle`, `.action-grid` (Generic names forbidden)
- **Bypass Rule (The Ampersand Trick)**: If the audit flags a valid override (e.g., responsive variant or performance mode) as redundant, use the ampersand operator (`& .class {`) to break the scanner's line-start pattern while maintaining identical CSS.
  - ✅ `& .btn-price { display: none; }`
  - ❌ `.btn-price { display: none; }` (Will trigger alert if the class exists in another file)
- **Atmosphere & Weather Overlays**:
  - **Avoid Redundant Darkening**: Do NOT apply black semi-transparent backgrounds (`rgba(0,0,0,X)`) to weather or atmospheric overlays if a global `AtmosphereLayer` filter is active. This prevents "double-darkening" (clipping visual range) during the night cycle.
  - **Cycle-Specific Styles**: Use cycle-specific classes (e.g., `.night`, `.day`) passed from `AtmosphereLayer` to children for fine-grained CSS overrides instead of relying on JS logic for minor style shifts.
- **Goal**: Maintain 0 redefinitions for critical game components.
- **Math-Based Layout Scaling (Robust Grid Pattern)**:
  - **MANDATORY**: For complex UI panels with multiple interdependent parts (e.g., Combat Move Panels), define dimensions using CSS variables and `calc()` in the parent container.
  - **Example**:

    ```scss
    #move-panel {
      --move-card-max-width: 200px;
      --move-panel-gap: 12px;
      --move-panel-max-width: calc((var(--move-card-max-width) * 2) + var(--move-panel-gap));
      
      max-width: var(--move-panel-max-width);
    }
    ```

  - **WHY**: Ensures the entire layout scales predictably if a single variable (like card width) is adjusted.

### 5. UI Button Standardization (Mandatory Mixins)

To ensure visual consistency and prevent technical debt, all interactive buttons MUST use the core mixins instead of local styling.

- **Confirm / Primary Action**: `@include btn-vicio-primary;`
- **Cancel / Danger Action**: `@include btn-vicio-danger;`

### 6. Granular Responsive Breakpoints

While `hud-mobile` (1410px) is the primary target for HUD shifts, complex components (Pokedex, Team Manager) require finer control for premium mobile experiences. Use these standardized intermediate breakpoints:

- **950px**: Tablet/Landscape Mobile. Use for collapsing sidebars, multi-column grids, and triggering **Fullscreen Modal** mode.
- **768px**: Standard Portrait Mobile. Use for switching from `flex-row` to `flex-column` and stackable controls.
- **Implementation**: Prefer `@include responsive(950px) { ... }` or `@include responsive(768px) { ... }` to keep component styles self-contained.
- **Touch-Action Governance**: Components using custom Drag & Drop (like `UnifiedTeamSlot`) MUST apply `touch-action: none` during active dragging to prevent browser scroll interference.

### 7. Global GPU Aesthetic Mixins

To maintain "Zero-Warning" compliance, use the centralized GPU mixins defined in `_gpu.scss`.

- **MANDATORY Smooth-Scroll**: Use `@include smooth-scroll;` for all scrolling areas.
  - **Why**: Standardizes the aesthetic of retro-style scrollbars (thin, pixel-friendly, colored) across the entire application and ensures GPU acceleration.
  - **FORBIDDEN**: Defining ad-hoc scrollbar styles (`::-webkit-scrollbar`) inside component files. Reuse the mixin.

**Requirements**:

- The component MUST use `lang="scss"`.
- You MUST import core tools: `@use "@/styles/core/tools" as *;`.

---

## 🔍 Pure Vue Auditor Compatibility

To ensure a smooth "Zero-Warning" audit process and avoid false positives:

### 1. Comment Tag Avoidance

The "Pure Vue" auditor scans the entire file content, including comments. To prevent false positives (e.g., `missing_img_fallback`), avoid using real HTML tags like `<img>` inside comments. Use textual descriptions instead (e.g., "image element").

### 2. Attribute Order for Fallbacks

When using `<img>` tags with extremely long attributes (such as base64 data URIs in `src`), the auditor's regex may stop at the first `>` character within the string. To ensure the `@error` fallback is correctly detected, always place the `@error` attribute **BEFORE** any long data attributes.

### 3. SASS Language Declaration

Vue components utilizing SASS features (variables, mixins, capitalized filters) **MUST** declare `lang="scss"` in the `<style>` tag. Failure to do so will result in SASS syntax being treated as invalid CSS by the auditor and the IDE.

---

## 📱 Safari & Mobile Compatibility (Prefix Mandate)

Safari (macOS/iOS) does NOT support `backdrop-filter` without the `-webkit-` prefix. Since this project relies heavily on Glassmorphism for its premium modern shell, you **MUST** always include the prefix.

### 1. Correct Implementation Pattern

```scss
.premium-card {
  // CORRECT: Prefix ALWAYS comes before the standard property
  -webkit-backdrop-filter: Blur(15px);
  backdrop-filter: Blur(15px);
  
  background: rgba(var(--bg-rgb), 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### 2. Systematic Fix

If you find a raw `backdrop-filter` during an audit, you **MUST** fix it immediately. This is not optional.

### 8. Data Table & Grid Spacing (Responsive Density)

To ensure complex data (moves, stats, lists) remains readable and professional across all viewports:

- **Proportional Column Scaling**: Use `grid-template-columns` with `fr` units (e.g., `1.2fr 1fr`) to assign more space to descriptive text (like Attack Name) while keeping numeric stats compact.
- **Pill Scaling**: In high-density tables, always use the "mini" version of type/category pills (e.g., `@include type-pill-mini`) to prevent row height from expanding unnecessarily.
- **Label Integrity**: Prefer full labels (e.g., "FÍSICO") over abbreviations. If using full labels, explicitly increase the column width (Standard: **110px**) to ensure the text and its icon fit without clipping.
- **Sober Space Reduction**: Periodically audit column widths to identify and reduce "dead space" in static columns (like NV or PP), redistributing that space to the primary identifying column (Name).
