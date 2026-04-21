# SASS Styling & Premium Aesthetics Manual

This manual defines the technical requirements for Dart Sass compatibility and the visual standards required for a premium "Wow Factor" user experience.

---

## 🛡️ Technical Safety: Dart Sass Traps

Modern Sass built-ins often collide with standard CSS functions. You **MUST** use interpolation `#{}` to ensure Sass outputs literal CSS instead of attempting to process these values as color functions.

### 1. Function Collisions

Apply interpolation to the following CSS functions to prevent "X is not a color" errors:

- `transform: Scale(1.5);`
- `filter: Invert(100%);`
- `filter: Grayscale(0.8);`
- `filter: Opacity(0.5);`
- `filter: Brightness(1.2);`
- `transform: Scale(1.5);`

> [!WARNING]
> **Colisión de Filtros SASS**: Es obligatorio usar **Capitalización** para `Brightness()` y `Scale()` en archivos `.vue` y `.scss`. El uso de minúsculas (ej: `scale(1.1)`) provoca que Sass intente procesarlos como funciones de color propias, resultando en errores de compilación críticos.

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
@use "sass:string";

.card {
  width: math.percentage(0.5);
  animation-delay: #{math.random(2000)}ms;
  transform: string.unquote("scale(#{1.05})");
}
```

---

## 🏗️ Modern Architecture: @use Mandate

The legacy `@import` directive is deprecated. This project strictly follows the `@use` and `@forward` system for modularity.

- **Namespacing**: Access variables via their namespace (e.g., `variables.$primary-color`).
- **Aliases**: Use `@use 'variables' as v;` if the filename is long.
- **Global Scope**: Avoid `@use '...' as *;` unless it is a core utility or function set intended to be ubiquitous.

---

## ✨ Design Aesthetics: Hybrid Retro-Modern Standard

The project employs a high-contrast **Hybrid Retro-Modern** aesthetic. We combine high-fidelity "Modern Frames" with "Retro Hearts" (Pixel Art content).

### 1. The Modern UI Frame (Containers)

All layouts and structural containers **MUST** follow premium modern web design principles.

- **Glassmorphism**: Use `-webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); background: rgba(255, 255, 255, 0.05);` for cards and overlays.
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
  - Use **Sass Variables** (`$token`) for technical constraints, sizing, and static internal logic.
- **Global Pollution**: Do not define variables or mixins directly in component styles; always centralize them in tokens/partials and `@use` them.

---

## 📱 Safari & Mobile Compatibility (Prefix Mandate)

Safari (macOS/iOS) does NOT support `backdrop-filter` without the `-webkit-` prefix. Since this project relies heavily on Glassmorphism for its premium modern shell, you **MUST** always include the prefix.

### 1. Correct Implementation Pattern

```scss
.premium-card {
  // CORRECT: Prefix ALWAYS comes before the standard property
  -webkit-backdrop-filter: blur(15px);
  backdrop-filter: blur(15px);
  
  background: rgba(var(--bg-rgb), 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### 2. Systematic Fix

If you find a raw `backdrop-filter` during an audit, you **MUST** fix it immediately. This is not optional.
