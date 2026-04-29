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

When testing complex states (e.g., defeat), synchronize the Phaser engine with the Pinia state:

1. Visual trigger via `phaserBridge.sendCommand('BattleScene', 'EVENT', data)`.
2. Store update (e.g., `pokemon.hp = 0`).
3. Prioritize using `BattleDebugTools.vue` before injecting states manually via console.

### 4. UI Overrides vs. Database State

When testing visual states (e.g., forcing Pokedex "Caught" status via debug buttons), remember that these are **ephemeral Pinia states** (`uiStore`).

- **Safety**: Visual overrides NEVER modify the actual save file (`saveService.js`).
- **Clarification**: Always inform the user that changes are temporary and will disappear on refresh, to avoid confusion regarding data persistence.

---

## 🚨 Roadblock Policy

If the test fails or the browser stays "frozen":

1. **STOP**: Do not attempt to guess the UI state.
2. **Dual Diagnosis**: Check the browser console logs AND the server logs (`npm run dev`) simultaneously.
3. **Priority Repair**: Fix any console or SSR errors before retrying the test.
