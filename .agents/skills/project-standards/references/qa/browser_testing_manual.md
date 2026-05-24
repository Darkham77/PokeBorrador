# Browser Testing and Simulation Manual

This manual establishes the standard protocol for visual and functional verification of the project using browser automation and CLI debug tools.

## 🌐 Local Environment Configuration

- **URL**: `http://localhost:5173` (Vite).
- **Test User**: `ASH`.
- **Authentication**: Password fields are not required locally; only the username identifies the session.
- **Service Worker & Vite Watcher Sync**: Programmatically clearing and recreating public directories (such as `public/assets` inside scripts) while Vite's Dev Server is active interrupts Vite's file watchers and causes the PWA Service Worker to cache empty/404 responses. If images appear broken or missing, you must perform a **Hard Refresh** (`Ctrl+F5` / `Cmd+Shift+R`) or clear the browser's storage via the _Application -> Storage -> Clear site data_ tab in DevTools to force assets re-synchronization.

---

## 🛠️ Login and Navigation Protocol

### 1. Session Verification

Before any test, verify if you are already logged in as `ASH` using `window.__VITE_DEBUG__.getGameStore().auth.user.username`.

### 2. Login via UI (MANDATORY)

If there is no active session:

1. Navigate to `/login`.
2. Type `ASH` in the username field.
3. Click the Login button.

> Do not use `evaluate` to skip the login; it is necessary to initialize `window.__VITE_DEBUG__` through the normal UI flow.

### 3. Fast Navigation (CLI-First)

Once logged in, use commands to clear the UI and jump to the target:

- `window.__VITE_DEBUG__.closeAllModals()`
- `window.__VITE_DEBUG__.navigate(tabId)`
- `window.__VITE_DEBUG__.openModal(modalName)`

---

## 🏎️ Browser Subagent Efficiency

To avoid lag and IDE saturation:

- Define atomic success conditions (e.g., "Stop when you see ID #dashboard-loaded").
- Limit actions to a maximum of 6 per task.

---

## ⚔️ Combat and State Simulation

When testing complex states (e.g., defeat), verify the Pinia state directly:

1. Check store state via `window.__VITE_DEBUG__.battleStore.state`.
2. Verify DOM updates in the Vue UI.
3. Prioritize using `BattleDebugTools.vue` before injecting states manually via console.
4. **CLI Combat Debug Commands**: When interacting with battle state via console tools, note that functions (like `damagePlayer`, `switchPlayerPokemon`, etc.) are defined under the active store. You must resolve them through the store namespace, for example using the resolver pattern: `window.__VITE_DEBUG__.battle.store().damagePlayer(30)` or `window.__VITE_DEBUG__.battle.store().switchPlayerPokemon(idx)` rather than executing them directly on the `window.__VITE_DEBUG__.battle` parent namespace.

### 4. UI Overrides vs. Database State

When testing visual states (e.g., forcing Pokedex "Caught" status via debug buttons), remember that these are **ephemeral Pinia states** (`uiStore`).

- **Safety**: Visual overrides NEVER modify the actual save file (`saveService.ts`).
- **Clarification**: Always inform the user that changes are temporary and will disappear on refresh, to avoid confusion regarding data persistence.

### 6. Debug Flip/Toggle Pattern

Commands and buttons for binary states (Weather, Field Effects, Status) MUST implement "Flip" logic:

- **Toggle**: If an effect is already active on the target side, clicking the debug button should automatically remove/clear it.
- **Visual Sync**: Buttons must be reactively linked to the state so they stay "active" (e.g., highlighted) while the effect persists.

### 5. Visual Coordinate Verification (Combat)

When testing sprite alignment and virtual world coordinates:

- **Scaling Parity**: Debug guides (rectangles, size labels) MUST use the exact same `OBJECT_SCALE` as the entities they represent.
- **Real-Size Guides**: In search or battle modes, use `.guide-real-size` overlays to compare the virtual container footprint with the original sprite's `naturalSize`.
- **Anchor Feedback**: Use visible dot markers at calculated `feetY` coordinates to verify that shadows and environment layers share the same physical baseline.

---

## 📱 Mobile Interaction Protocols

For complex UI components (Team Management, Bag), we use custom touch handlers to bypass native browser limitations.

### 1. Long-Press Trigger

- **Standard**: Use an **800ms** threshold for long-press actions (like starting a Drag & Drop).
- **Feedback**: ALWAYS provide tactile feedback using `navigator.vibrate(50)` when the long-press threshold is met.
- **Reasoning**: This prevents accidental drags while the user is trying to scroll the container.

### 2. Touch Drag Detection

- **Collision Detection**: During `touchmove`, you MUST temporarily set `pointer-events: none` on the dragged element to allow `document.elementFromPoint(x, y)` to identify the underlying target slot.
- **Scroll Suppression**: You MUST apply `touch-action: none` to the interactive element while dragging to prevent the viewport from scrolling.

---

## 🚨 Roadblock Policy

If the test fails or the browser stays "frozen":

1. **STOP**: Do not attempt to guess the UI state.
2. **Dual Diagnosis**: Check the browser console logs AND the server logs (`npm run dev`) simultaneously.
3. **Priority Repair**: Fix any console or SSR errors before retrying the test.

## 🧪 Unit Testing and Regression

To maintain system stability, every core logic change MUST be validated against the Vitest suite:

1. **Test Payload Parity**: When modifying event payloads in `gameBus` (e.g., adding `ballId` to `PLAY_CATCH_ENERGY`), you MUST update corresponding unit tests. Discrepancies between implementation and test expectations are the primary cause of CI failure.
2. **State Snapshotting**: Use `vi.clearAllMocks()` in `beforeEach` to ensure isolation between test cases.
3. **Mocking External Services**: Always mock global state providers (e.g., `gameStore`, `battleStore`) to avoid side effects during logic-only testing.
4. **Synchronous Debug Registration**: When initializing the `debugStore`, all commands **MUST** be registered synchronously, even if they depend on dynamically loaded modules (`import()`). This ensures tools like `window.__VITE_DEBUG__` are available immediately for unit tests, preventing failures due to race conditions.

---

## 🧪 Unit Testing Protocols (Deep Dive)

To ensure unit tests are deterministic and resilient:

### 1. Sanitization Requirements

When testing functions that use `sanitizePokemon` (such as battle start):

- **Mandatory Species ID**: Always provide a valid `id` (string) in the Pokémon mock. Critical gender and validation logic fails catastrophically (`.endsWith`) if the ID is `undefined`.
- **Team Mocks**: Ensure that `gs.state.team` has at least one Pokémon with `hp > 0` to prevent the battle store from failing while searching for the `playerPoke`.

### 2. Exporting for Atomic Testing

- **Internal Functions**: If a Store function is critical for a sequential logic (e.g., `applyEndTurnEffects`), it MUST be exported in the store's `return` object, even if not directly consumed by the UI. This allows verifying state changes step-by-step without relying on complex timers or full battle flows.

### 3. Promise Synchronization (Async/Await)

- **Battle Start**: The `_startBattle` method is asynchronous. In tests, it MUST always be awaited (`await`) before performing any assertions on `battle.state`; otherwise, assertions will run against a `null` or incomplete state.

### 4. Mocking Determinism (Randomness)

To test functions that depend on probability (e.g., capture success, move accuracy, secondary effects):

- **Pattern**: Use `vi.spyOn(Math, 'random')` to force specific outcomes.
- **Verification**: Calculate the exact threshold required for success (e.g., `b / 65535` for capture) and mock values slightly above and below that threshold to verify both paths (success/failure).
- **Cleanup**: Always use `vi.restoreAllMocks()` or `spy.mockRestore()` to avoid polluting subsequent tests.

### 5. Deep Reactivity in Debug Command Mutations

When writing debug commands or console helpers that mutate nested properties of reactive Vue 3 refs (e.g., `ctx.activeBattle.value.player.hp = ...`), the changes might not be programmatically detected by Vue's reactivity system. To guarantee immediate visual update across UI observers and components, you MUST force deep reactivity updates by spreading the nested object and re-assigning the root ref:
```ts
active.player = { ...active.player }
ctx.activeBattle.value = { ...active }
```
This triggers reactive watchers and updates HUD components instantly.

### 6. window.__VITE_DEBUG__ Sanitization in Unit Tests

In testing environments that define the `window` object (such as `jsdom` with Vitest), stores will automatically register their console debug commands on `window.__VITE_DEBUG__` during instantiation. To prevent test isolation leakage, memory leaks, or side effects across different test specs, you MUST explicitly clean up the global debug object in a `beforeEach` hook:
```ts
beforeEach(() => {
  delete (window as any).__VITE_DEBUG__
})
```
This guarantees a clean global state for each test run.

