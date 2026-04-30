# Browser Testing and Simulation Manual

This manual establishes the standard protocol for visual and functional verification of the project using browser automation and CLI debug tools.

## 🌐 Local Environment Configuration

- **URL**: `http://localhost:5173` (Vite).
- **Test User**: `ASH`.
- **Authentication**: Password fields are not required locally; only the username identifies the session.

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

### 4. UI Overrides vs. Database State

When testing visual states (e.g., forcing Pokedex "Caught" status via debug buttons), remember that these are **ephemeral Pinia states** (`uiStore`).

- **Safety**: Visual overrides NEVER modify the actual save file (`saveService.js`).
- **Clarification**: Always inform the user that changes are temporary and will disappear on refresh, to avoid confusion regarding data persistence.

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
