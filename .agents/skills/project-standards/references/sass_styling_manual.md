# SASS Styling & Premium Aesthetics Manual

This manual defines the technical requirements for Dart Sass compatibility and the visual standards required for a premium "Wow Factor" user experience.

---

## 🛡️ Technical Safety: Dart Sass Traps

Modern Sass built-ins often collide with standard CSS functions. You **MUST** use interpolation `#{}` to ensure Sass outputs literal CSS instead of attempting to process these values as color functions.

### 1. Function Collisions

Apply interpolation to the following CSS functions to prevent "X is not a color" errors:

- `transform: Scale(1.5);`
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

> [!WARNING]
> **SASS Filter Collision**: You MUST use **Capitalization** for `Brightness()`, `Scale()`, `Blur()`, `Rotate()`, `TranslateY()`, and `Grayscale()` in `.vue` and `.scss` files. Using lowercase (e.g., `scale(1.1)`) causes Sass to intercept them as internal color functions, leading to critical build errors.

### 2. Preference: Capitalization vs. Unquote/Interpolation

To bypass SASS color function collisions, we strictly follow a hierarchy of methods.

- **PRIMARY (Mandatory)**: **Capitalization**. Case-insensitive in CSS, but case-sensitive in SASS. This is the cleanest method.
  - ✅ `filter: Grayscale(1);`
  - ❌ `filter: grayscale(1);` (Collision)
  - ❌ `filter: string.unquote("grayscale(1)");` (Bloated)
- **SECONDARY**: **Interpolation** `#{}`. Use ONLY for complex dynamic values.
  - ✅ `transform: Scale(#{$factor});`
- **FORBIDDEN**: **string.unquote()** for standard filters. It violates the "Zero-Warning" architecture and makes the code harder to read.

### 3. GPU Optimization: Opacity property vs. filter

- **REQUIRED**: Always use the `opacity: X` property instead of `filter: Opacity(X)`.
- **Reasoning**: The property is hardware-accelerated and significantly more efficient for mobile GPUs than the filter function. It also avoids SASS deprecation warnings entirely.
  - ✅ `opacity: 0.5;`
  - ❌ `filter: Opacity(0.5);` (Inefficient)

> [!IMPORTANT]
> **VUE COMPONENT RULE**: Interpolation `#{}` only works inside `<style lang="scss">`. If you apply this fix to a `.vue` file, you **MUST** ensure the style block has the `lang="scss"` attribute.

### 4. Modern Built-ins (math, string)

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
  transform: Scale(1.05);
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
- **Dynamic Depth**: Use soft, multi-layered HSL shadows and subtle linear gradients.
- **Modern Rendering**: Do **NOT** use `image-rendering: pixelated` on the UI shell or background layouts. They must remain smooth and fluid.

### 2. The Pixel Art Heart (Content)

All game-specific content **MUST** be strictly Pixel Art to preserve the game's core identity.

- **Rendering**: For all sprites and pixelated assets, always use `image-rendering: pixelated;`.
- **Icons**: Only use pixel-art icons. **FORBIDDEN**: Modern SVG icons, FontAwesome, or high-res Material icons.
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
  - Use **Native CSS Variables** (`var(--color)`) for UI-wide palettes that might change dynamically (e.g., Theme coloring).
  - Use **Sass Variables** (`$token`) for technical constraints, sizing, and shared internal logic.
  - **MANDATORY Capitalization**: You **MUST** use **Rgba()** and **Rgb()** (Capitalized) instead of lowercase `rgba()`/`rgb()`. This prevents SASS from intercepting them as internal color functions and ensures literal CSS output.
  - **Local/One-off Colors**: Capitalized Rgba/Rgb or Hex values ARE PERMITTED for local, non-recurring styles within a component's `<style scoped>` block.
  - **SASS vs CSS Variables**: SASS color functions (like `color.scale`, `lighten()`, `darken()`) cannot process `var(--color)`. For interactive highlights/hovers, use static SASS fallbacks (e.g. `$yellow`) for calculations while maintaining the CSS variable for the main render to support dynamic themes.
  - **Variable Isolation**: In high-density or dynamically scoped components (e.g., within specialized filters or grids), if core SASS variables are not reliably available without manual imports, use **Direct Hex Values** to ensure visual stability and prevent "Color not defined" build errors.
- **Modern Control Flow**: The legacy ternary `if()` function is deprecated in SASS 1.8+. Always use standard `@if / @else` blocks for conditional styling logic to ensure build-log cleanliness.
- **Positioning & Micro-offsets**: Avoid using negative margins (`margin-top: -1px`) to correct alignment of symbols or small icons. This causes layout instability and triggers redundancy alerts. Use **TranslateY()** or **TranslateX()** (Capitalized) for hardware-accelerated positioning that doesn't affect the box model.
- **Global Pollution**: Do not define variables or mixins directly in component styles; always centralize them in tokens/partials and `@use` them.

### 4. CSS Redundancy & "Single Source of Truth"

Avoid spreading definitions for the same component across multiple files. This is the primary cause of "Visual Ghosts" where changes appear not to take effect.

- **MANDATORY**: Each core component (`.map-card`, `.base-modal`, `.hud-bar`) must have ONE primary SCSS file.
- **FORBIDDEN**: Redefining a root class in multiple stylesheets (e.g., having `.map-card` in `_render.scss`, `_items.scss`, and `_grid.scss`).
- **Audit Requirement**: Before committing UI changes, you MUST run the redundancy audit:
  `python3 .agents/skills/project-standards/scripts/audit/detect_css_redundancy.py`
- **Bypass Rule**: If the audit flags a valid nested override (e.g., a performance mode variant) as redundant, use the SASS ampersand operator (`& .class-name {`) to break the exact line-start regex pattern while maintaining identical CSS output.
- **Goal**: Maintain 0 redefinitions for critical game components.

### 5. UI Button Standardization (Mandatory Mixins)

To ensure visual consistency and prevent technical debt, all interactive buttons MUST use the core mixins instead of local styling.

- **Confirm / Primary Action**: `@include btn-vicio-primary;`
- **Cancel / Danger Action**: `@include btn-vicio-danger;`

**Requirements**:

- The component MUST use `lang="scss"`.
- You MUST import core tools: `@use "@/styles/core/tools" as *;`.

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
