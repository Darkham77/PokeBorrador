---
name: vue-best-practices
description: MUST be used for Vue.ts tasks. Strongly recommends Composition API with `<script setup>` and TypeScript as the standard approach. Covers Vue 3, SSR, Volar, vue-tsc. Load for any Vue, .vue files, Vue Router, Pinia, or Vite with Vue work. ALWAYS use Composition API unless the project explicitly requires Options API.
license: MIT
metadata:
  author: github.com/vuejs-ai
  version: '18.0.0'
---

# Vue Best Practices Workflow

Use this skill as an instruction set. Follow the workflow in order unless the user explicitly asks for a different order.

## Core Principles

- **Keep state predictable:** one source of truth, derive everything else.
- **Make data flow explicit:** Props down, Events up for most cases.
- **Favor small, focused components:** easier to test, reuse, and maintain.
- **Avoid unnecessary re-renders:** use computed properties and watchers wisely.
- **Readability counts:** write clear, self-documenting code.

## 1) Confirm architecture before coding (required)

- Default stack: Vue 3 + Composition API + `<script setup lang="ts">`.
- If the project explicitly uses Options API, load `vue-options-api-best-practices` skill if available.
- If the project explicitly uses JSX, load `vue-jsx-best-practices` skill if available.

### 1.1 Must-read core references (required)

- Before implementing any Vue task, make sure to read and apply these core references:
  - `references/reactivity.md`
  - `references/sfc.md`
  - `references/component-data-flow.md`
  - `references/composables.md`
- Keep these references in active working context for the entire task, not only when a specific issue appears.

### 1.2 Plan component boundaries before coding (required)

Create a brief component map before implementation for any non-trivial feature.

- Define each component's single responsibility in one sentence.
- Keep entry/root and route-level view components as composition surfaces by default.
- Move feature UI and feature logic out of entry/root/view components unless the task is intentionally a tiny single-file demo.
- Define props/emits contracts for each child component in the map.
- Prefer a feature folder layout (`components/<feature>/...`, `composables/use<Feature>.ts`) when adding more than one component.

## 2) Apply essential Vue foundations (required)

These are essential, must-know foundations. Apply all of them in every Vue task using the core references already loaded in section 1.1.

### Reactivity

- Must-read reference from `1.1`: [reactivity](references/reactivity.md)
- Keep source state minimal (`ref`/`reactive`), derive everything possible with `computed`.
- **Avoid Object Cloning for Reactivity**: NEVER use object spreads (`{ ...p }`) to map store items in a `computed` list if those items need to remain reactive in sub-modals. Cloning breaks the live link to the Pinia/Game store.
  - **PATTERN (Wrapper Pattern)**: Instead of mapping to a new object, wrap the original in a metadata container: `items.map((p, i) => ({ pokemon: p, index: i, context: 'box' }))`.
  - **WHY**: This allows the UI to add metadata without modifying the original object, while ensuring that updates to `pokemon` are instantly visible across all components.
- Use watchers for side effects if needed.
- Avoid recomputing expensive logic in templates.

### SFC structure and template safety

- Must-read reference from `1.1`: [sfc](references/sfc.md)
- Keep SFC sections in this order: `<script>` → `<template>` → `<style>`.
- **300/500-Line Threshold Compliance**: If a file exceeds **300 lines**, it is RECOMMENDED to extract independent logic into Composables. If it exceeds **500 lines**, it is MANDATORY to extract UI sections into child components.
  - _Note_: Data-only files (e.g., in `src/data/`) are exempt to keep large datasets unified.
- Keep SFC responsibilities focused; split large components.
- Keep templates declarative; move branching/derivation to script.
- Apply Vue template safety rules (`v-html`, list rendering, conditional rendering choices).

### Keep components focused

Split a component when it has **more than one clear responsibility** (e.g. data orchestration + UI, or multiple independent UI sections).

- Prefer **smaller components + composables** over one “mega component”
- Move **UI sections** into child components (props in, events out).
- Move **state/side effects** into composables (`useXxx()`).

Apply objective split triggers. Split the component if **any** condition is true:

- It owns both orchestration/state and substantial presentational markup for multiple sections.
- It has 3+ distinct UI sections (for example: form, filters, list, footer/status).
- A template block is repeated or could become reusable (item rows, cards, list entries).

Entry/root and route view rule:

- Keep entry/root and route view components thin: app shell/layout, provider wiring, and feature composition.
- Do not place full feature implementations in entry/root/view components when those features contain independent parts.
- For CRUD/list features (todo, table, catalog, inbox), split at least into:
  - feature container component
  - input/form component
  - list (and/or item) component
  - footer/actions or filter/status component
- Allow a single-file implementation only for very small throwaway demos; if chosen, explicitly justify why splitting is unnecessary.

### Component data flow

- Must-read reference from `1.1`: [component-data-flow](references/component-data-flow.md)
- Use props down, events up as the primary model.
- Use `v-model` only for true two-way component contracts.
- Use provide/inject only for deep-tree dependencies or shared context.
- Keep contracts explicit and typed with `defineProps`, `defineEmits`, and `InjectionKey` as needed.

### Composables

- Must-read reference from `1.1`: [composables](references/composables.md)
- Extract logic into composables when it is reused, stateful, or side-effect heavy.
- Keep composable APIs small, typed, and predictable.
- Separate feature logic from presentational components.

## 3) Consider optional features only when requirements call for them

### 3.1 Standard optional features

Do not add these by default. Load the matching reference only when the requirement exists.

- Slots: parent needs to control child content/layout -> [component-slots](references/component-slots.md)
- Fallthrough attributes: wrapper/base components must forward attrs/events safely -> [component-fallthrough-attrs](references/component-fallthrough-attrs.md)
- Built-in component `<KeepAlive>` for stateful view caching -> [component-keep-alive](references/component-keep-alive.md)
- Built-in component `<Teleport>` for overlays/portals -> [component-teleport](references/component-teleport.md)
- Built-in component `<Suspense>` for async subtree fallback boundaries -> [component-suspense](references/component-suspense.md)
- Animation-related features: pick the simplest approach that matches the required motion behavior.
  - Built-in component `<Transition>` for enter/leave effects -> [transition](references/component-transition.md)
  - Built-in component `<TransitionGroup>` for animated list mutations -> [transition-group](references/component-transition-group.md)
  - Class-based animation for non-enter/leave effects -> [animation-class-based-technique](references/animation-class-based-technique.md)
  - State-driven animation for user-input-driven animation -> [animation-state-driven-technique](references/animation-state-driven-technique.md)

### 3.2 Less-common optional features

Use these only when there is explicit product or technical need.

- Directives: behavior is DOM-specific and not a good composable/component fit -> [directives](references/directives.md)
- Async components: heavy/rarely-used UI should be lazy loaded -> [component-async](references/component-async.md)
- Render functions only when templates cannot express the requirement -> [render-functions](references/render-functions.md)
- Plugins when behavior must be installed app-wide -> [plugins](references/plugins.md)
- State management patterns: app-wide shared state crosses feature boundaries -> [state-management](references/state-management.md)

## 4) Run performance optimization after behavior is correct

Performance work is a post-functionality pass. Do not optimize before core behavior is implemented and verified.

- Large list rendering bottlenecks -> [perf-virtualize-large-lists](references/perf-virtualize-large-lists.md)
- Static subtrees re-rendering unnecessarily -> [perf-v-once-v-memo-directives](references/perf-v-once-v-memo-directives.md)
- Over-abstraction in hot list paths -> [perf-avoid-component-abstraction-in-lists](references/perf-avoid-component-abstraction-in-lists.md)
- Expensive updates triggered too often -> [updated-hook-performance](references/updated-hook-performance.md)
- **Synchronizing External Animation Engines (GSAP)**: When a prop change must trigger a full re-initialization of an external animation (like a GSAP timeline), ALWAYS use a `watch` combined with `await nextTick()`. This ensures that any template-driven DOM updates (like `v-if` mounting/unmounting layers) are finished before the animation script targets the elements.
- **GSAP Teleport Target Safety**: To prevent 'target not found' warnings when animating elements inside teleported slots (such as `BaseModal` layouts), avoid using raw string selectors (e.g., `'.fishing-card'`) in `onMounted`. Use Vue template refs (`ref`) instead, and trigger the tweens inside a `watch` checking the modal's active/show state combined with `await nextTick()`.

## 5) DOM & Event Quirks (Lessons Learned)

- **Script Setup Initialization Order**: In `<script setup>`, always define `refs` before any `computed` properties or `watchers` that consume them. Failure to do so can result in a `ReferenceError: Cannot access 'X' before initialization` during the initial reactive cycle if the computed/watcher triggers immediately.
- **Scroll Event Bubbling**: Native `scroll` events do not bubble in the DOM. If your app relies on internal scrollable containers (e.g., `.tab-content` with `overflow-y: auto`), a `window.addEventListener('scroll')` will never fire. You **must** use the capture phase: `window.addEventListener('scroll', handler, { capture: true })`.
- **ResizeObserver on Fixed Containers**: `ResizeObserver` can report inaccurate heights (`0px`) when observing `position: fixed` elements, especially those using `container-type` or containing only absolute/percentage-based children. Always observe the true inner relative/static content wrapper to guarantee accurate dynamic height calculations.
- **ResizeObserver for Responsive Components**: Use `ResizeObserver` instead of media queries or window resize events for components that need to adapt their layout (e.g., column count or font-size) based on their own container width rather than the viewport.
  - **MANDATORY Cleanup**: Always call `observer.disconnect()` in the `onUnmounted` hook to prevent memory leaks and unexpected behavior after the component is destroyed.
- **Defensive Computed Properties**: When deriving state from potentially uninitialized or asynchronous stores (e.g., a search filter or a dynamic inventory list) or accessing deeply nested game data (e.g., `gym.difficulties[selected].levels`), ALWAYS handle `null` or `undefined` values.
  - **Pattern**: `const levels = computed(() => props.gym?.difficulties?.[selected.value]?.levels || [])`.
  - **Why**: Prevents critical runtime `TypeError` crashes during the component mount/initialization cycle or after state resets before the store data is ready.
- **Explicit lockReason Pattern**: For complex UI states (like routes or buttons locked by multiple conditions), use a computed property `lockReason` to centralize the logic.
  - **Pattern**: `const lockReason = computed(() => { if (isLockedByTicket) return 'Needs Ticket'; if (isLockedByMedals) return 'Needs 8 Medals'; return null; })`.
  - **Why**: Keeps templates clean, ensures consistency between tooltips and overlays, and makes the logic easier to test and maintain compared to inline ternary operators.
- **Teleport & Scoped Styles**: Components using `<Teleport to="body">` (like `BaseModal`) **MUST** use global SCSS (not `scoped`) for positioning and overlay styles. Scoped styles often fail to apply correctly once the element is moved out of its original DOM hierarchy.
- **Unified Modal Wrapper Mandate**: For any overlay, popup, or interactive minigame window, avoid writing custom absolute/fixed overlay divs or manual positioning container hierarchies. Always wrap the component UI in the centralized `BaseModal` component to guarantee proper teleportation to body and automatic integration into the dynamic z-index stacking depth registry.
- **Scrollbar Styling in Scoped SFCs**: Styles like `::-webkit-scrollbar` often fail to apply correctly when inside a `<style scoped>` block because the browser doesn't correctly attribute them to the component's unique data-attribute. You **must** move these styles to a global `<style lang="scss">` block (without `scoped`) or a shared global utility file to ensure they apply to all targeted containers.
- **Global Window Listeners (Safe Lifecycle)**: Global window listeners (added via `useWindowListener` or native `addEventListener`) MUST be managed carefully to avoid memory leaks.
  - **MANDATORY**: Use the project's standardized `useWindowListener` composable (`@/composables/useWindowListener`) for all `resize` or `scroll` listeners. It centralizes lifecycle hooks and ensures zero-leak cleanup.
- **Modal Click Propagation**: In deep-stacked modal architectures, click handlers on trigger elements (like Tooltips) MUST use the `.stop` modifier.
  - **WHY**: Prevents event bubbling from accidentally triggering background modal interactions or closing parent layers. +- **Selection Component Props (Centralized Modal Pattern)**: Components used within a dynamic modal stack (like `PokemonSelectionModal`) MUST receive their configuration (title, callbackConfirm, etc.) via `defineProps` to ensure reactivity and consistency with the `ModalHost` system.
  - **WHY**: Using legacy global store refs (e.g., `uiStore.pokemonSelectionConfig`) for modal configuration causes synchronization issues if the ref is not manually cleared or if multiple modals are opened in sequence. Props ensure each modal instance has its own unique, immutable configuration.
- **Tooltip Teleportation Mandate**: Always use `<Teleport to="body">` for tooltips (e.g., `PVTooltip`) to avoid `z-index` collisions and `overflow: hidden` clipping from parent containers.
- **Mandatory Mixin Environment**: When using project-standard mixins (e.g., `btn-vicio-primary`, `pixelated`), the `<style>` block **MUST** use `lang="scss"` and explicitly import tools: `@use "@/styles/core/tools" as *;`.
- **No Redundant SCSS Imports in SFCs**: Never add a `@use` import inside a `.vue` component's `<style>` block for a file that is already globally forwarded through `_index.scss`. Doing so creates a second compilation pass of that file's content, which can cause Vite to attempt to parse the component's `<script>` block as a stylesheet, leading to confusing `[sass] expected "{"` errors. If a component needs mixins, ensure they are available globally via `_index.scss` → `_mixins.scss` → `@forward`.
- **Mandatory Child Component Registration**: In Vue 3 `<script setup>`, sub-components (extracted for modularity) DO NOT inherit global component registration from parent modals unless they are registered in the main application instance.
  - **REQUIRED**: Always explicitly import and register common components like `PVTooltip` or `BaseModal` inside the sub-component's `<script setup>` to prevent "undefined component" rendering errors.

- **CLI-First Admin Delegation**: Administrative UI components (Debug panels, Event managers) MUST NOT manipulate stores or databases directly.
  - **Pattern**: `const save = () => window.__VITE_DEBUG__.saveEvent(data)`.
  - **Why**: Centralizes logic in `debugStore.ts`, ensures security wrappers are applied, and makes all actions programmatically accessible.

- **Dynamic Z-Index Stacking**: For components that can overlap (modals, overlays), use a `computedZIndex` based on the current number of active overlays. This ensures that the most recently opened element (e.g., an item selector) always appears on top of previous layers.
  - **REQUIRED**: In the `uiStore`, when computing `isAnyBlockingModalOpen`, you **MUST** explicitly exclude side-panels (e.g., `'Chat'`, `'Profile'`) if they are intended to allow background interaction.
  - **Why**: This prevents the global `body.modal-open` class from locking scroll and interaction when only a HUD-integrated panel is visible.

  - **PATTERN**: Use a unified loading state (e.g. `authStore.loading || !gameStore.isReady`) to prevent the template from switching to intermediate views (like Login or Black Screen) during the process. This ensures a professional, flicker-free startup experience. (Ref: `src/App.vue`).

- **Pinia Initialization Guard**: If a component accesses a store during `setup` (e.g., in a `computed` property), ensure that all required Vue utilities (like `computed`, `ref`) are correctly imported in the root component.
  - **Why**: A missing import in a high-level component can cause a silent failure that prevents Pinia from being correctly associated with the application instance, leading to the "getActivePinia() was called but there was no active Pinia" error in child components.
- **Pinia Store Headless Environment Compatibility**: When accessing global browser APIs (such as `localStorage` or `window`) inside Pinia store actions, getters, or initialization hooks, always guard the access with safety checks like `typeof localStorage !== 'undefined'`.
  - **Why**: Prevents runtime reference errors and critical test failures in headless or server-side/testing environments (like Vitest or Node.js) where these globals are not defined.
- **Mandatory defineEmits in `<script setup>`**: When using `<script setup>`, any custom events MUST be explicitly declared via `const emit = defineEmits([...])`.
  - **Why**: Accessing `emit` without declaration (common in Options API migration) will cause runtime errors (`ReferenceError: emit is not defined`) and block logic such as close animations in modals.
- **Dynamic Contextual Styling**: When a component's theme depends on a dynamic state (e.g., player class or faction), apply the state as a class to a high-level wrapper and use nested SCSS or computed variables to adjust internal styles (backgrounds, border colors, shadows).
  - **Pattern**: `<div :class="playerClass" class="modal-wrapper">`.
  - **Ref**: Use this to dynamically theme modal headers or backgrounds based on the player's current identity.
- **Fixed Header + Scrolling Body Pattern**:
  - **Rule**: For complex modals or views with long lists, always separate the header and the body using flexbox to keep the header fixed.
  - **Implementation**: Parent `.wrapper { display: flex; flex-direction: column; height: 100%; overflow: hidden; }`. Header `.header { flex: 0 0 auto; }`. Body `.body { flex: 1 1 auto; overflow-y: auto; @include smooth-scroll; }`.
  - **Why**: This prevents the header from scrolling away and eliminates nested scroll conflicts.
- **Business Logic Parity Mandate**: Critical logic used in multiple contexts (e.g., selling prices calculated in both individual menus and mass selection) MUST be centralized in utility files (e.g., `src/logic/pokemonUtils.ts`). This prevents calculation discrepancies between different UI layers.
- **Utility Component Schema Awareness**: Always verify the prop schema for common utility components. For example, `PVTooltip` expects `title` and `description` props; using an incorrect prop like `text` will result in empty tooltips.
- **Style Binding with !important**: Vue's object style binding `:style="{ prop: 'value !important' }"` does NOT work as the compiler automatically strips the `!important` modifier. You **must** move the important rule to a CSS class and apply it via `:class` to ensure it is respected by the browser.
- **Mandatory SFC Imports**: When using Vue core features (like `watch`, `nextTick`, `onMounted`, `onUnmounted`) inside `<script setup>`, always verify their explicit import from `'vue'`. Missing imports can lead to silent failures or `ReferenceError` crashes during component initialization, especially after adding new logic to existing files.
- **Import Hygiene & Cleanliness**: Unused imports (e.g., importing `ref`, `gsap`, or lifecycle hooks that are no longer used in the component) MUST be strictly removed during cleanup to ensure a zero-warning codebase and prevent IDE-level linter complaints.
- **Subcomponent Extraction Import Cleanup**: When extracting a section of a component's `<script setup>` into a new child component, **simultaneously** remove all imports, variables, and data constants that were exclusively used by the extracted section (e.g., `NATURE_DATA`, `ABILITY_DATA`, computed refs) from the parent. Leaving them behind produces `TS6133` lint errors and can cause `ReferenceError` crashes in the browser through Vite's HMR module cache if the variable is referenced in the template before the full page reload.
- **Vite HMR Stale Cache (`ReferenceError` after cleanup)**: If a variable is deleted from a component's `<script setup>` but the browser still reports `ReferenceError: X is not defined`, it means Vite's HMR module cache is holding a stale version of the compiled template. `vue-tsc` and `npm run lint` will pass clean, but the running browser instance still references the old module. The fix is a manual browser hard-refresh (`F5` or `Ctrl+Shift+R`). This is not a code bug.
- **Dynamic Import Failures (SASS Compilation Collision)**:
  - **Rule**: The error `Failed to fetch dynamically imported module: .../MyComponent.vue` in the browser with Vite is typically caused by an underlying SASS compilation error within that component or its child styles (e.g., an undefined mixin, missing variable, or bad indentation).
  - **Solution**: Before debugging Vue logic, always inspect the terminal/Vite console to locate SASS preprocessor compilation failures.
- **Input Standardization and 'appearance'**:
  - **Rule**: When styling numeric or text inputs that require overriding default browser styles, always include the standard `appearance: textfield;` property alongside vendor prefixes (e.g., `-moz-appearance: textfield;`) to ensure cross-engine compatibility and satisfy IDE linter rules.
- **Provider Import Verification**: When implementing conditional logic based on entity metadata (e.g., checking `isFloating` for species-specific rendering in `BattleArenaView`), ALWAYS verify that the required data provider (e.g., `pokemonDataProvider`) is imported. Failing to do so will cause a `ReferenceError` when the computed property tries to resolve the species data.
- **Mobile Touch Interaction Patterns**:
  - **Long-Press Recognition**: Use a timer (e.g., `setTimeout` for 800ms) within `touchstart` and `touchend` handlers to detect long-presses for complex actions (like Drag & Drop) while allowing normal scroll.
  - **Dynamic touch-action**: Set `element.style.touchAction = 'none'` when a custom touch-interaction starts to prevent native browser scrolling. Reset to `''` when finished.
  - **Touch-Collision Detection**: During `touchmove`, set `pointer-events: none` on the dragged element and use `document.elementFromPoint(touch.clientX, touch.clientY)` to detect slots or targets underneath.
- **Readonly Computed Store Warning**: NEVER attempt to mutate a store property that is defined as a `computed` from within a component. This triggers a `target is readonly` warning. If a property needs to be updated from a view (e.g., syncing an animation state), it MUST be defined as a `ref` in the store.
- **Template Scope Integrity**: To avoid "property accessed during render but not defined" warnings, ensure all reactive properties or composable returns used in the `<template>` are explicitly destructured or returned from the `setup()` function (or available in `<script setup>`).
- **Duplicate Declaration Safety**: When adding "legacy" or compatibility functions to an existing composable, ALWAYS verify that the identifier (function or variable name) is not already declared in the same file. Duplicate declarations in Javascript/Vue will result in a `SyntaxError: Identifier 'X' has already been declared` that prevents the entire application from loading.
- **CSS Variable Reactivity Optimization**: When binding multiple complex reactive styles (like filters, transforms, or camera coordinates) to CSS variables in a template, ALWAYS consolidate them into a single `computed` object instead of spreading multiple reactive objects.
  - **WHY**: Using the spread operator (`:style="{ ...obj1, ...obj2 }"`) on reactive objects in the template can cause Vue to lose track of some reactive dependencies or override them incorrectly, leading to broken synchronization between the UI and external tools (like debug guides or zoom systems).
- **Neutralizing Sub-component Roots in Flex Layouts**: When extracting absolutely positioned children from a flex container into a new sub-component, the new sub-component's root wrapper acts as a static flex item by default, disrupting the parent's layout.
  - **REQUIRED**: Apply `position: absolute; inset: 0; pointer-events: none;` (or `display: contents`) to the sub-component's root wrapper to neutralize its impact on the parent's flex layout.
- **Explicit Reactivity Tracking (Void Operator)**: When you need to force reactivity in a `watchEffect` without assigning the reactive property to a variable (which triggers ESLint "unused variable" warnings and breaks Zero-Warning policies).
  - **PATTERN**: Use the `void` operator (e.g., `void props.pokemon?.status`). This explicitly tracks the dependency in Vue's reactivity system without creating an orphan variable.
- **Reactive Animation Re-initialization**: When managing GSAP or canvas animations for a dynamic list of DOM elements, detect changes in the element count to safely force a re-initialization.
  - **PATTERN**: Use a `Map` or similar structure to store the previous state/count and compare it during updates to safely restart the animation engine when new elements are injected into an already active effect.
- **Reactive Watchers for Deep Layout Updates**: When updating complex UI layouts or external engines (like a virtual camera viewport scale) from a computed property or store value (`battleStore.debugZoom`), set up an explicit `watch` on the computed reference to trigger immediate recalculations (`updateCamera()`). This ensures fluid UI updates without manual window resize events.
- **Temporal for Cooldown Calculations**: When calculating complex, time-restricted actions or cooldown gates (e.g. rename limits, daily actions), strictly use the `@js-temporal/polyfill` (`Temporal` API) instead of the legacy `Date` object. This ensures robust timezone management and precise comparison metrics, matching the repository's modern standard requirements.
- **Post-Flush Watchers for Dynamic DOM Queries**: When a watcher triggers logic that queries the DOM (such as using `document.querySelectorAll` or refs to query elements rendered with `v-for` or `v-if`), standard watchers execute before virtual DOM updates are flushed to the real DOM. This causes query selectors to return stale or empty arrays.
  - **PATTERN**: Always specify `{ flush: 'post' }` in the watcher options, or wrap DOM-dependent queries inside `await nextTick()`.
  - **WHY**: Ensures that the browser DOM has settled with the latest template updates before the selection and animation logic (e.g., GSAP targets initialization) runs.


## 6) Final self-check before finishing

- Core behavior works and matches requirements.
- All must-read references were read and applied.
- Reactivity model is minimal and predictable.
- SFC structure and template rules are followed.
- Components are focused and well-factored, splitting when needed.
- Entry/root and route view components remain composition surfaces unless there is an explicit small-demo exception.
- Component split decisions are explicit and defensible (responsibility boundaries are clear).
- Data flow contracts are explicit and typed.
- Composables are used where reuse/complexity justifies them.
- Moved state/side effects into composables if applicable
- Optional features are used only when requirements demand them.
- Performance changes were applied only after functionality was complete.
