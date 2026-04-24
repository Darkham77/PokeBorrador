---
name: project-browser-testing
description: MANDATORY skill for end-to-end testing of the Poké Vicio project. Use this skill whenever the user asks to "check if it works," "verify UI," or "open the browser." This skill mandates server-readiness and provides the standard login protocol for the local environment.
---

# Project Testing Standards

This skill ensures that every visual and functional verification is performend in a stable, standardized local environment using real browser automation.

## 1. Dev Server Management (Pre-Flight Check)

Before attempting any browser-based testing, you **MUST** ensure the development server is running. Reuse existing instances to avoid port conflicts and resource waste.

### Step 1: Port Verification (curl)

Before attempting to start a new server, you **MUST** verify if the port `5173` is already listening. This is the fastest and most reliable way to detect an active development environment.

```bash
curl -I http://localhost:5173
```

- **If curl returns 200/302/OK**: The server is ALREADY active. **DO NOT** run `npm run dev`. Proceed directly to testing.
- **If curl fails (Connection Refused)**: The server is down. Proceed to Step 2.

### Step 2: Reuse or Start Server

1. **REUSE THE AVAILABLE SERVER**: If an active instance was detected in Step 1, you **MUST** use it. DO NOT run `npm run dev` again. Assume the server is healthy unless the browser subagent reports a connection error.
2. **If NO instance is found**:
    - Execute `npm run dev`.
    - **CRITICAL**: Use the `command_status` tool to monitor the output.
    - If the server fails to start (error logs in terminal), you **MUST** diagnose and fix the code (e.g., syntax errors, missing dependencies) before proceeding.
    - Once the server logs "Vite ... ready in X ms," proceed to testing.
3. **Persistence**: Once a server is started (or reused), keep it active for the entire duration of the conversation. Do not terminate it between browser subagent calls.

## 2. Local Environment Configuration

- **URL**: `http://localhost:5173` (default Vite port).
- **User Instance**: Always use the **LOCAL** world-state. NEVER test against production/online environments.
- **Testing Credentials**:
  - **Username**: `ASH`
  - **Authentication**: Email/Password fields are **NOT** required for local testing. Only the Username is used for session identification.

## 3. Browser Testing Workflow (`browser_subagent`)

### Anti-Lag Protection & Efficiency (CRITICAL)

To prevent the `browser_subagent` from creating hundreds of redundant artifacts (screenshots, recordings, DOMs) that crash the IDE and lag the chat, you **MUST** follow these strict rules when writing the `Task` description:

1. **NO RAW DOM**: Explicitly command the subagent: *"DO NOT return or attach the raw DOM in your report. Return ONLY a concise textual summary."*
2. **ATOMIC SUCCESS CONDITIONS**: Define an exact exit point. Example: *"Stop immediately once the element with ID 'dashboard-loaded' is visible. Do not re-verify or capture further states."*
3. **STEP LIMITS**: Always impose a logical limit. Example: *"Complete this verification in no more than 5 actions."*
4. **ZERO-DELTA PREVENTION**: Instruct the subagent: *"If the page state has not changed after an action, STOP and report the current state instead of retrying."*

### Execution Sequence

When invoking the `browser_subagent`, follow this exact sequence:

1. **Check Session & Identity**: Before navigating to `/login`, verify the current state:
    - **Condition A (Skip)**: If you are already logged in **AND** the current user is `ASH` (verify via `window.__VITE_DEBUG__.getGameStore().auth.user.username` or `#user-badge` text), proceed directly to Step 3.
    - **Condition B (Login/Relogin)**: If you are NOT logged in **OR** the current user is NOT `ASH`, proceed to Step 2.

2. **Login (UI-ONLY)**:
    - **Navigation**: Navigate to `http://localhost:5173/login`.

    - **No CLI Bypass**: You **MUST NOT** attempt to use `evaluate` to trigger login logic (e.g., `auth.login()`).
    - **Step 1**: Type `ASH` in the username field.
    - **Step 2**: Click the Login button.
    - **Reasoning**: This ensures the authentication perimeter is correctly tested and that `window.__VITE_DEBUG__` is initialized only through valid UI-triggered state changes.

3. **Fast Target Acquisition (CLI-First)**:
    - Once logged in (or if session was resumed), if the UI is in an irrelevant state (e.g., old modals open, wrong tab), you **MUST** use CLI commands to clear the UI and teleport to the target.
    - **Step 1 (Cleanup)**: Execute `window.__VITE_DEBUG__.closeAllModals()` to ensure a clean state.
    - **Step 2 (Teleport)**: Use `window.__VITE_DEBUG__.navigate(tabId)` or `window.__VITE_DEBUG__.openModal(name)` to reach the target menu/tab immediately.
    - **Reasoning**: This bypasses slow manual GUI interaction and ensures tests start from a deterministic state.

4. **Verification**:
    - Wait for the target Dashboard, Modal, or Scene to load.
    - Verify that the internal state (via `window.__VITE_DEBUG__.getGameStore()`) matches the expected test conditions.
5. **Active Monitoring**:
    - **Browser Logs**: Always request a summary of console logs (errors, warnings, custom debug messages) from the subagent.
    - **Server Logs**: Periodically check the terminal output of the `npm run dev` command using `command_status` to detect SSR errors, HMR failures, or database router warnings.
6. **Audit**: During visual testing, perform a **Hybrid Retro-Modern Audit**:
    - Modern frames (Glassmorphism, gradients)?
    - Pixel Art content (Sprites, text)?
    - No smooth vector icons in game content?

### Example Task Prompt (Copy-Paste friendly)

Use this template when invoking the subagent:

> *"Navigate to URL. Check if logged in as ASH; if not, login as ASH via UI. Clear UI using `closeAllModals()`, then navigate to #target using `window.__VITE_DEBUG__.navigate('target')`. Stop immediately upon verification of #target-loaded. DO NOT return the DOM. Report: 1. Success/Fail, 2. Console errors. Limit: 6 actions."*

## 4. Dual-Log Monitoring (Diagnostics)

You **MUST** cross-reference logs from both environments while testing:

- **Browser Console**: Look for 404s on assets, Vue reactivity warnings, and hydration errors.
- **Dev Server (npm run dev)**: Look for SQL errors from `dbRouter`, compilation errors, and backend/supabase mock failures.
- **The information from BOTH is required** to diagnose complex issues where the UI might fail silently.

## 5. Error Correction Loop

If the browser subagent reports a UI error or a console crash:

1. Capture the error stack trace from the browser.
2. Check the server logs for corresponding backend failures.
3. Cross-reference with the corresponding Vue component.
4. Fix the code.
5. Rerun the server check and the browser test.

## 6. Roadblock Policy (Immediate Intervention)

If you encounter an unexpected behavior, a "roadblock," or a UI state that does not match expectations:

1. **STOP IMMEDIATELY**: Do not attempt to "guess" or "brute force" the UI.
2. **DIAGNOSE**: Immediately check the `npm run dev` server logs (using `command_status`) AND the browser console logs.
3. **REPAIR FIRST**: If the server or browser reports ANY error or warning (even if it seems minor), you **MUST** prioritize fixing it before proceeding.
4. **NO WASTED TIME**: Continuing to test on a broken or warning-heavy environment is a waste of time. Fix the foundation first.

## 7. Debug Menu State Simulation (CLI-First)

When testing complex conditional UI (like route badges or level-locked maps), **PRIORITIZE** using console commands over manual GUI interaction. This is faster and more reliable.

- **Entry Point**: `window.__VITE_DEBUG__`
- **Discovery (Source of Truth)**: To find the most current available commands and their arguments, you MUST read the command registration logic in `src/stores/debug.js`. Do not rely on static command lists in documentation.
- **Fast Navigation Mandate**: To reach a specific testing target (e.g., the Pokedex or a specific Pokemon detail), you **MUST** prioritize using the navigation commands (`window.__VITE_DEBUG__.navigate`, `openModal`, `inspectPokemon`) over manual GUI interaction.
- **Hybrid Interaction Rule**: Acknowledge that while CLI handles navigation and state, specific UI features (e.g., **search filters**, **sorting buttons**, or **drag-and-drop**) may not be exposed to the CLI. You MUST use standard `browser_subagent` UI actions (typing/clicking) to test these specific interactive elements.
- **HMR Reliability**: `window.__VITE_DEBUG__` can hold **stale closures** after Hot Module Replacement. If a command has no effect or behaves unexpectedly, perform a full page refresh before diagnosing further.
- **Verification**: After a simulation command, verify that the UI reacts reactively without needing a page refresh. If a refresh is needed to see changes (other than fixing HMR), the `browser_subagent` will report it as a bug.
