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

When invoking the `browser_subagent`, follow this exact sequence:

1. **Navigation**: Navigate to `http://localhost:5173/login`.
2. **Login**:
    - Type `ASH` in the username field.
    - Click the Login button.
3. **Verification**:
    - Wait for the Dashboard or Game Scene to load.
    - Verify that the `profiles` table in the local database has loaded correct data for `ASH`.
4. **Active Monitoring**:
    - **Browser Logs**: Always request a summary of console logs (errors, warnings, custom debug messages) from the subagent.
    - **Server Logs**: Periodically check the terminal output of the `npm run dev` command using `command_status` to detect SSR errors, HMR failures, or database router warnings.
5. **Audit**: During visual testing, perform a **Hybrid Retro-Modern Audit**:
    - Modern frames (Glassmorphism, gradients)?
    - Pixel Art content (Sprites, text)?
    - No smooth vector icons in game content?

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
