---
name: sass-styling-protection
description: MANDATORY skill for any styling task (SCSS/SASS/Vue Styles). Prevents technical traps like the scale() color collision error, enforces modern @use architecture, and ensures premium/dynamic aesthetics (glassmorphism, vibrant gradients, micro-animations). Use this whenever you are editing .scss files or <style> blocks in Vue.
---

# Sass Styling Protection & Premium Aesthetics

This skill ensures that project styles are technically robust for Dart Sass and follow the premium "Wow Factor" design principles.

## Technical Safety: The Dart Sass Traps

Standard CSS functions often collide with modern Sass built-ins. You **MUST** use interpolation `#{}` to ensure Sass outputs literal CSS.

### 1. The `scale()` Collision

Modern Sass has a `scale()` color function. You **MUST** wrap CSS `transform: scale()` values in interpolation to prevent "X is not a color" errors.

> [!IMPORTANT]
> **VUE COMPONENT WARNING**: Interpolation `#{}` only works inside `<style lang="scss">`. If you apply this fix to a `.vue` file, you **MUST** ensure the style block has the `lang="scss"` attribute. Failing to do so will break the CSS parser.

- **WRONG**: `transform: scale(1.5);` (in SCSS)
- **WRONG**: `transform: scale(#{1.5});` (in plain `<style>` without `lang="scss"`)
- **CORRECT**: `transform: scale(#{1.5});` (only inside `<style lang="scss">`)

### 2. Other Potential Collisions

Apply the same interpolation logic to other CSS functions that might overlap with Sass built-ins:

- `invert(#{100%})`
- `grayscale(#{0.8})`
- `opacity(#{0.5})`

---

## Modern Architecture: `@use` Mandate

The legacy `@import` directive is deprecated. This project **MUST** use the `@use` and `@forward` system for modularity.

- **Namespacing**: When using `@use 'variables'`, access variables via `variables.$name`.
- **Aliases**: Use `@use 'variables' as v;` if the namespace is too long.
- **No Global Scope Pollution**: Avoid `@use '...' as *;` unless it is a toolset or function core intended to be ubiquitous.

---

## Design Aesthetics: The "Wow" Standard

Every UI component must feel premium and state-of-the-art. **Avoid basic layouts.**

1. **Rich Aesthetics**:
   - Use curated HSL color palettes, not plain `#ff0000`.
   - Implement subtle **gradients** instead of flat colors.
   - Use **Glassmorphism**: `backdrop-filter: blur(x); background: rgba(...);`.

2. **Visual Alive-ness**:
   - **Hover Effects**: Every button or card MUST have a `:hover` state with transform and/or shadow changes.
   - **Micro-animations**: Use subtle transitions (`all 0.2s ease`) and keyframe animations for entry effects.
   - **Typography**: Strictly use Google Fonts (Outfit, Inter, Press Start 2P) and proper hierarchy.

3. **Pixel Art Integration**:
   - For sprites, always use `image-rendering: pixelated;`.
   - Connect pixel aesthetics with modern high-fidelity backgrounds (Cyberpunk/Premium UI mix).

---

## Anti-Patterns to Avoid

- **NO Inline Styles**: Never use `style="..."` in Vue templates. Use scoped SCSS classes instead.
- **Dynamic Colors**: Prefer **Native CSS Variables** `var(--color-name)` for the primary UI palette (red, blue, green, etc.). This ensures they can be modified at runtime via JavaScript/State.
- **Sass Variables**: Use Sass variables (`$variables`) for technical tokens, numeric values, and internal logic that doesn't need to change in the browser.
- **NO Excessive Nesting**: Max 3 levels deep to prevent CSS bloat and specificity wars.
