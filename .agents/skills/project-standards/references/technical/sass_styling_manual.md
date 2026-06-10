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
- `filter: Saturate(1.5);`
- `filter: Drop-shadow(0 4px 8px rgba(0,0,0,0.5));`
- `background: Radial-Gradient(...) / Linear-Gradient(...);` (Essential for weather overlays)

> [!WARNING]
> [!NOTE]
> **SASS 2.0 Collision Protocol**: To prevent Dart Sass 2.0 collisions, standard CSS functions (`scale`, `rotate`, `invert`, `brightness`, etc.) must be capitalized. However, this process is **100% automated** by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR (Hot Module Replacement) and build. Developers and agents can write standard lowercase CSS properties, and Vite will automatically capitalize them.

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
- **Lowercase Preference**: Since capitalization is 100% automated by the Vite plugin (`vite-plugin-sass-traps.ts`), developers and agents SHOULD write standard lowercase CSS/SASS functions. This maintains readability and follows standard CSS conventions.

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

- **Divider Collapse in `flex-direction: column`**: An empty `<div>` used as a visual separator inside a `display: flex; flex-direction: column` container is treated as a flex item with zero intrinsic size, causing it to collapse to `0px` height and become invisible.
  - **Fix**: Force it out of the flex flow:
    ```scss
    .section-divider {
      display: block !important;
      height: 2px !important;
      min-height: 2px !important;
      background: Rgba(255, 255, 255, 0.15);
      flex-shrink: 0;
    }
    ```
  - **Why**: `display: block !important` prevents the parent flex context from controlling the element's size, allowing `height` and `min-height` to take effect.

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

> [!CAUTION]
> **Production Build Mixin Isolation Trap**: Vite's HMR dev mode resolves SASS mixins globally across partials, which can mask missing `@use` declarations. However, Vite's production bundler compiles each partial in **isolation**. A subfile (e.g., `_pokemon.scss`) that uses a mixin defined in another subfile (e.g., `text-outline` from `_layout.scss`) **MUST** explicitly `@use '_layout' as *;` locally, even if the HMR dev build appears to work without it.
> **Symptom**: The application works flawlessly in `npm run dev` but throws a `Undefined mixin` compile error on `npm run build`.
> **Rule**: Before shipping any SASS partial that uses a mixin not defined within itself, verify that the defining file is explicitly `@use`d at the top of that partial.

---

## ✨ Design Aesthetics: Hybrid Retro-Modern Standard

The project employs a high-contrast **Hybrid Retro-Modern** aesthetic. We combine high-fidelity "Modern Frames" with "Retro Hearts" (Pixel Art content).

### 1. The Modern UI Frame (Containers)

All layouts and structural containers **MUST** follow premium modern web design principles.

- **Premium Solidity**: Use high-contrast solid backgrounds with premium gradients for cards and overlays.
- **Premium Shell Base**: For `shell-premium` containers on black backgrounds, avoid pure black (`Rgba(0,0,0,x)`). Use a deep pizarra/navy tone like `#141824` to ensure the gradient texture and depth remain visible.
- **HUD Density**: For high-density game HUDs (like Battle Sidebars), use `Rgba(15, 23, 42, 1)` to ensure maximum readability and consistent visual depth.
- **Container Clarity**: Avoid applying semi-transparent backgrounds to both a parent container and its children. This causes "Visual Mud" (excessive darkness). Background logic MUST be delegated to the deepest relevant element (e.g., the card).
- **Dynamic Depth**: Use soft, multi-layered HSL shadows and subtle linear gradients.
- **Modern Rendering**: Do **NOT** use `image-rendering: pixelated` on the UI shell or background layouts. They must remain smooth and fluid.

### 2. The Pixel Art Heart (Content)

All game-specific content **MUST** be strictly Pixel Art to preserve the game's core identity.

- **Rendering (Mandatory)**: For all sprites and pixelated assets (Pokémon, items, badges), you **MUST** use `@include pixelated;`. This mixin ensures sharp edges, consistent typography rendering across browsers, and disables smoothing. It also forces GPU layer alignment via `translateZ(0)` to prevent sub-pixel blurring during motion.
- **Icons**: Only use pixel-art icons. **FORBIDDEN**: Modern SVG icons, FontAwesome, or high-res Material icons.
- **Scaling Standards**:
  - **Grid Oversize**: Use **1.5x** scaling (e.g., `min-width: 60px` for a 40px slot) for item sprites in combat grids. Combined with `overflow: hidden` on parent cards, this creates a high-fidelity "clipping" effect.
- **Typography (Game Data)**: We maintain a strict hierarchy between "Game Heart" and "Modern Shell" typography.
  - **MANDATORY Pixel Fonts**: `Press Start 2P`, `VT323`, or `Silkscreen` (Google Fonts).
  - **MANDATORY Mixin**: Any element using a pixel font **MUST** include `@include pixelated;` to disable browser font-smoothing (`font-smooth: never`) and ensure sharp edges.

| UI Level | Element Type | Style Requirement | Recommended Font |
| :--- | :--- | :--- | :--- |
| **Game Heart** | Pokémon Names, Stats, Level, Moves | **PIXELATED** (Sharp) | `Press Start 2P` |
| **Game Heart** | Battle Log, Dialogs, NPC names | **PIXELATED** (Sharp) | `VT323` / `Silkscreen` |
| **Game Heart** | Modal Headers (Titles), Tab Labels | **PIXELATED** (Sharp) | `Press Start 2P` |
| **Modern Shell** | Secondary Info, Settings, Debug Consoles | **SMOOTH** (Antialiased) | `Outfit` / `Inter` |
| **Modern Shell** | Technical Logs, Trade History, Credits | **SMOOTH** (Antialiased) | `Outfit` / `Inter` |

- **Restriction**: Smooth fonts like `Outfit` or `Inter` are reserved ONLY for administrative headers or meta-UI that is secondary to the game experience. Any text that represents a "Game Object" or "Trainer HUD Action" **MUST** be pixelated.

- **Emoji FX Architecture (Double-Layer)**: To rotate or scale text-based emojis (💫, ❤️, etc.) without losing the orbital path, use a nested DOM structure:
  - **Outer Container**: Handles positioning, orbit, and `Translate`.
  - **Inner Element**: Must be `display: inline-block`. This element handles the `Rotate` and `Scale`.
  - **Why**: Standard `inline` text elements ignore many 2D/3D transforms in modern rendering engines.

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

1. **Frame Solidification**: Apply high-contrast solid backgrounds and HSL shadows to the parent container.
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
  - **Filter Capitalization**: This rule applies to all CSS filters (`Scale()`, `Brightness()`, `Grayscale()`, etc.).
  - **SVG Filter Quoting**: When referencing filters by ID in SASS functions or mixins, ALWAYS quote the ID inside the URL: `url("#id")`.
    - **WHY**: Prevents Dart Sass from misinterpreting the `#` as a color hex or causing compilation errors when the ID contains certain characters.
  - **Local/One-off Colors**: Capitalized Rgba/Rgb or Hex values ARE PERMITTED for local, non-recurring styles within a component's `<style scoped>` block, but variables are always preferred.
  - **SASS vs CSS Variables**: SASS color functions (like `color.scale`, `lighten()`, `darken()`) cannot process `var(--color)`. For interactive highlights/hovers, use static SASS fallbacks (e.g. `$yellow`) for calculations while maintaining the CSS variable for the main render to support dynamic themes.
  - **Variable Isolation**: In high-density or dynamically scoped components (e.g., within specialized filters or grids), if core SASS variables are not reliably available without manual imports, use **Direct Hex Values** to ensure visual stability and prevent "Color not defined" build errors.
  - **Inheritance vs Mixins**: Avoid using `@extend` for classes defined in external stylesheets (e.g., `.m-type-tag`) inside global or modular components. If the base stylesheet is not included in every build chunk, `@extend` will fail. Use the underlying mixin directly (e.g., `@include type-pill;`) instead.
  - **`@use 'X' as *` is NOT a safe fix for `@extend` failures**: Adding `@use './other-module' as *;` to a stylesheet to make a missing selector available for `@extend` re-exports *all* styles from that module into the current scope. This can inject unexpected `display`, `flex`, or `grid` rules that cascade into sibling elements and break layouts in unpredictable ways. **The correct fix is always to extract the shared style into a mixin** and `@include` it in both files.
- **Standard RGB Injection**: For every dynamic color property (e.g., `--tier-color`, `--modal-accent`), a corresponding RGB channel variable (e.g., `--tier-color-rgb`) MUST be injected. This is the ONLY approved way to apply variable opacities in SASS while maintaining reactivity.
  - ✅ `background: Rgba(var(--modal-accent-rgb), 0.2);`
- **Identity Preservation**: SCSS rules MUST NOT override or strip visual identity markers (like tier borders) in any resource state (e.g., performance mode). Use CSS variables to ensure these markers persist and remain "owned" by the component.
- **Z-Index Standardization**:
  - **MANDATORY**: Never use hardcoded numbers for `z-index` (e.g., `z-index: 10;`). Use CSS variables (`var(--z-low)`, `var(--z-base)`, `var(--z-modal)`, `var(--z-critical)`) or relative calculations `calc(var(--z-base) +/- X)` for consistent layering.
  - **Single Source of Truth**: All layering constants MUST be defined in `src/logic/constants/visuals.ts`. The use of hardcoded integers is strictly forbidden.
  - **Relative Map Layering**: When layering elements over the map floor or map spawns (e.g., in minigames, map markers, or modal feedback overlays), use relative calculations based on standard anchors: `calc(var(--z-map-floor) + X)` or `var(--z-map-spawns)` rather than arbitrary hardcoded integers.
  - **Overlays & Debug Guides**: For temporary overlays, guide outlines, or speech bubble connectors within the battle scene, use relative math such as `calc(var(--z-overlay) - 1)` or reference specific visual assets layers like `var(--z-map-grass-back)` to ensure cohesive visual stacking.
- **Unified Tag Components (Type Tags)**: Avoid replicating CSS declarations or ad-hoc templates for elemental types. Always use the centralized `PokemonTypeTag.vue` component, which enforces sharp `@include pixelated` styling, proper color variables, and respects layout standardizations without SASS duplication.
- **GPU Promotion**: Any element applying a `filter` or `backdrop-filter` MUST include an explicit `will-change: filter` or `will-change: backdrop-filter` to prevent rendering jank.
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
    - **Aura Principal (Rare)**: Escala 0.1 (Mín) -> Escala 2.0 (Máx).
    - **Halo Secundario (Weather)**: Escala 2.0 (Máx) -> Escala 0.1 (Mín).
  - **Resultado**: Mientras una se apaga/encoge, la otra brilla/crece, manteniendo siempre un halo de color visible y distinguible.
- **Viewport Units (Mobile Safety)**:
  - **MANDATORY**: Use `dvh` and `dvw` (Dynamic Viewport) for any element requiring full-screen scaling.
  - **WHY**: Standard `vh`/`vw` units do not account for dynamic toolbars (URL bar, navigation) in mobile browsers like Safari. This leads to layout clipping or unwanted scrollbars.
  - **FORBIDDEN**: Legacy `vh` and `vw` units accompanied by numeric values (e.g., `100vh`).
  - **Audit**: `detect_viewport_units.py` enforces this rule and supports `--fix` for automatic migration.
- **Interaction Stability (Zero-Translatey)**:
  - **Rule**: Avoid vertical displacements (`TranslateY`) in the `:hover` or `:active` states of cards and interactive list elements (e.g., in inventory, battle Pokemon selectors, or boxes). The use of `TranslateY` causes visual artifacts ("ghosting") and layout shifts in dense layouts.
  - **Standard**: Use border-color transitions (`border-color`), brightness filters (`Brightness`), or uniform scale transformations (`Scale`) that do not alter the rendering flow. To neutralize unwanted inherited hover effects, apply `transform: none !important;`.
- **Avatar Frame Inset Integrity**:
  - **Rule**: For avatar elements (e.g., `TrainerAvatar` cosmetics) using conic-gradient backgrounds or borders, the `.avatar-frame-bg` element requires an explicit `inset: 0` (instead of negative values like `inset: -2px`) to prevent rendering a black ring/circle artifact, particularly visible on square avatar frames.
- **Hidden Scrollbars Compatibility**:
  - **Rule**: To hide scrollbars robustly without triggering IDE compatibility warnings, declare full compatibility across engines:

    ```scss
    scrollbar-width: none; // Modern standard (Firefox)
    -ms-overflow-style: none; // Legacy (IE/Edge)
    &::-webkit-scrollbar { display: none; } // Webkit (Chrome/Safari)
    ```

- **Hiding HTML5 Number Input Spinners**:
  - **Rule**: To prevent visual collision and layout breaks on centered numeric inputs, standard HTML5 number input up/down spin buttons MUST be hidden using browser-specific properties:

    ```scss
    input[type="number"] {
      -moz-appearance: textfield; // Firefox
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none; // Chrome/Safari/Edge
        margin: 0;
      }
    }
    ```

- **Tier-Aware Styling**:
  - **Rule**: Any list or grid representing Pokémon (e.g., swap menu, market, battle team) must dynamically reflect the premium hierarchy of the PC Box.
  - **Standard**: Apply the `.is-premium-tier` class if the Pokémon belongs to Tier S or S+. This class must inherit the premium combination (`@include pokemon-card-premium-tier`) with consistent radial highlights (`Radial-Gradient` in `::before`).
- **Pixel Font Legibility & Outlines**: Pixel fonts (Retro Typography) are highly sensitive to properties like `-webkit-text-stroke` or gradient-fill clippings with `-webkit-background-clip: text` and transparent color. These properties destroy pixel letterforms, causing them to look hollow and illegible. To achieve sharp outlines on pixel fonts, always use multiple solid pixel-aligned offset shadows (`text-shadow: 1px 1px 0 #color, -1px 1px 0 #color...`) combined with external soft glowing blur layers for premium effects.
- **White Text Contrast Mandate on Light Backgrounds**: Any pixel text rendered over a **light or variable-color background** (e.g., yellow type pills, season badges, dynamic gradient cards) MUST use `color: white` combined with `@include text-outline;`. Using dark text on yellow is a contrast failure — white text with a thin black `text-shadow` outline guarantees legibility on any background color. This is the project standard, proven in type-damage pills and must be enforced universally.
- **Text Outline Padding Safety (Clipping Prevention)**: When applying `@include text-outline;` (which adds pixel-level `text-shadow` offsets), the container's padding MUST be at least `4px 8px`. Insufficient padding causes the outline shadow to be visually clipped by the container's boundaries, making the text appear to touch or overflow the border. If a badge or pill looks "cramped" after adding an outline, increase padding — never reduce the outline.
- **No CSS Transitions on GSAP-managed Elements**: The use of CSS `transition: ...` or CSS keyframe animations is strictly prohibited in SASS stylesheets for interactive elements or visual nodes that are animated using GSAP (or expected to feature premium UI micro-animations). Manual transitions clash with GSAP tweens, leading to layout jank and double-transitioning. Always delegate these animations completely to GSAP.

- **Yellow Button Bold Standard**: The primary (yellow) variant of `btn-vicio-variant` MUST always render its label with `font-weight: bold`. This is enforced inside the mixin (`_buttons.scss`) via the `@if $variant == 'primary'` branch. Do not override `font-weight` in component-level styles for yellow buttons — the mixin is the single source of truth for this visual identity rule.

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
  - **Universal Environmental Tinting**: Environmental CSS filter tints (e.g., `tint-arctic`, `tint-desert`, `tint-swamp`) MUST be applied universally to all cover families (rocks, grass, boxes) rather than being restricted to grass. For arctic biomes, ensure rocks and bushes achieve pure white/grey snowy overlays with high brightness (`Saturate(0) Brightness(1.5) Contrast(1.15)`) to maintain cohesive visual immersion.

- **Goal**: Maintain 0 redefinitions for critical game components.
- **Grid Stabilization**: When designing grids with variable content (like GymCards), prefer fixed widths or controlled `minmax` (e.g., `340px`) over `1fr`. This prevents layout expansion and horizontal scroll issues when the number of elements is odd or changes dynamically.
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
- **Battle Controls (Switch/Bag)**: `@include btn-vicio('sm');` (Ensures 3D parity in combat).

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
- **GSAP Sync Mandate**: When animating properties like `Filter` or `Transform` via GSAP (JavaScript), you MUST use the **Capitalized** versions of the values (e.g., `filter: "Brightness(1.5)"`).
  - **Why**: The Vite SASS plugin capitalizes these values in the CSS. If GSAP uses lowercase, it will fail to read the current state of the property from the DOM, causing "visual jumps" or broken tweens.
- **Initial Filter State for GSAP Animations**: When animating CSS filters (like brightness) on an element using GSAP, you MUST declare an explicit initial filter value in the CSS sheet (e.g., `filter: brightness(1);`) and declare `will-change: filter;` on that class. Without a defined baseline, Webkit/Blink browsers will render the element as completely transparent for one frame at the start of the animation, causing a noticeable flicker.
- **Visual Scaling of Pixel Art Sprites**: To scale pixel art sprites (e.g., in badges or lists) without expanding their physical bounding boxes or shifting neighboring layout nodes, apply `transform: scale(N)` instead of increasing `width`/`height`. Use `margin-right: X` (layout offset) and add `white-space: nowrap;` to the text content within the flex container to accommodate the visual growth without breaking long labels into multiple lines.

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

## 📱 Safari & Mobile Compatibility (Performance Mandate)

Safari (macOS/iOS) requires strict GPU promotion for complex filter chains.

### 1. Correct Implementation Pattern

```scss
.premium-card {
  background: Rgba(var(--bg-rgb), 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px Rgba(0, 0, 0, 0.5);
}
```

### 2. Systematic Fix

If you find a raw `filter` that causes lag on mobile during an audit, you **MUST** fix it immediately. This is not optional.

### 8. Data Table & Grid Spacing (Responsive Density)

To ensure complex data (moves, stats, lists) remains readable and professional across all viewports:

- **Proportional Column Scaling**: Use `grid-template-columns` with `fr` units (e.g., `1.2fr 1fr`) to assign more space to descriptive text (like Attack Name) while keeping numeric stats compact.
- **Pill Scaling**: In high-density tables, always use the "mini" version of type/category pills (e.g., `@include type-pill-mini`) to prevent row height from expanding unnecessarily.
- **Label Integrity**: Prefer full labels (e.g., "FÍSICO") over abbreviations. If using full labels, explicitly increase the column width (Standard: **110px**) to ensure the text and its icon fit without clipping.
- **Sober Space Reduction**: Periodically audit column widths to identify and reduce "dead space" in static columns (like NV or PP), redistributing that space to the primary identifying column (Name).
- **Grid & Tag Layout Integrity**: Any refactor that ensanches or scales a standardized tag system (like Type Pills) MUST be accompanied by an audit of all grid layouts that contain them.
  - **MANDATORY**: If a pill size increase causes text clipping (e.g., in `_vicio-panes.scss`), the corresponding grid column (e.g., `grid-template-columns`) MUST be widened (Standard: 85px for Type tags) to maintain legibility.

### 9. Premium Brand Integration (Floating Logos)

To create a high-fidelity "wow factor" where the brand logo interacts with the UI shell:

- **Rule**: Position brand logos to partially overlap the main content card using negative margins (e.g., `margin-bottom: -40px`).
- **Compensation**: Apply a proportional `padding-top` to the child container and use `z-index` offsets (`calc(var(--z-base) + 2)`) to ensure the logo remains visible and centered.
- **Goal**: Achieves a premium depth effect where the logo feels integrated into the interface rather than just sitting on top.

### 10. Dynamic Wallpaper Scaling (Vertical Integrity)

For full-screen wallpapers or map backgrounds where vertical visibility is prioritized over horizontal coverage:

- **Rule**: Use `background-size: auto 100%` and `background-position: center`.
- **Result**: Ensures the image is always **vertically complete** (no clipping at top/bottom) while allowing horizontal "growth" (expanding/cropping) to fill the width.

### 11. High-Fidelity Combat Outlines (SVG Filters)

For battle sprites, standard 2px/3px outlines may be too thin. Specialized status effects (like Freeze) MUST use dedicated SVG filters to maintain pixel-art sharpness at larger scales.

- **Standard**: Use `#pixel-outline-ice` or similar filters with `feMorphology`.
- **Radius**: Battle status outlines should use a **8px radius** to ensure high visibility and a "premium" feel.
- **Sharpness**: Avoid `feGaussianBlur` in these filters to preserve a strict pixelated look.

```xml
<filter id="pixel-outline-ice">
  <feMorphology in="SourceAlpha" operator="dilate" radius="8" />
  <feFlood flood-color="#e0ffff" result="ice-color" />
  <feComposite in="ice-color" operator="in" />
  <feMerge>
    <feMergeNode />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```
