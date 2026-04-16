---
name: project-standards-checker
description: MANDATORY skill for verifying code quality, build stability, styling standards, and modularization. Use this BEFORE starting browser tests, after significant changes, or when creating/modifying files in src/. Ensures No Monolithic Files (>500 lines) and strict SCSS usage over inline styles.
---

# Project Standards Checker

Goal: Ensure that every piece of code delivered is syntactically correct, doesn't break the build, and remains modular for optimal AI and human readability.

## Modularization & File Length Standards

To maintain a healthy, readable codebase, we follow a strict **Modularization Policy**. High-density files are difficult for agents to process reliably and are prone to logic errors.

### 1. The 500-Line Rule

Any `.vue`, `.js`, or `.scss` file inside the `src/` directory **MUST NOT** exceed 500 lines.

- **Maintenance**: If you touch a file that is already over 500 lines, you **MUST** refactor it into smaller modules as part of your task.
- **New Code**: Never create a monolithic file from scratch. Plan the architecture to be modular from the start.

### 2. Refactoring Strategies

- **Vue Components**:
  - **Script**: Extract business logic into `src/composables/` (Composition API) or Pinia stores.
  - **Styles**: Move component-specific styles to `src/styles/components/` and import them via `@use` or `@import`.
  - **Template**: Break down the template into logical sub-components (e.g., `BattleHUD.vue`, `BoxGrid.vue`).
- **Styles (SCSS)**:
  - Split large stylesheets into feature-specific partials.
  - Example: `_battle.scss` -> `_battle-hud.scss`, `_battle-animations.scss`, `_battle-stats.scss`.
- **Logic (JS)**:
  - Extract utility functions to `src/logic/utils/`.
  - Use modular classes or function sets instead of monolithic bridges.

## Styling Standards

To maintain visual consistency and leverage the full power of our UI framework, we adhere to strict styling rules.

- **NO Hardcoded Styles**: You **MUST NEVER** use inline styles (`style="..."` in HTML/Vue) or hardcoded CSS values directly in components unless absolutely necessary (e.g., dynamic calculation in JS).
- **Prioritize SCSS**: Always extract styles to SCSS files/blocks and use the project's CSS/SCSS design tokens. If a unique style is needed, create the appropriate class in the component's `<style lang="scss">` or the global partials.
- **Critical Cases ONLY**: Inline styles are only acceptable when calculating elements dynamically via Javascript where there is literally no other option.

## Dev Server Management

To avoid port conflicts and resource waste, we must ensure only one instance of the development server is running.

- **Instance Detection**: Always check for running `vite` processes before executing `npm run dev`.
- **Reuse Policy**: If an instance is already running (usually on port 5173 or 5174), reuse it instead of starting a new one.

## Workflow

### 1. File Length Audit

Before finalizing, verify that no touched files violate the length standard:

```bash
find src -type f \( -name "*.vue" -o -name "*.js" -o -name "*.scss" \) -exec wc -l {} + | awk '$1 > 500 && $2 != "total"'
```

> [!IMPORTANT]
> If any files appear in the output (especially those you modified), you **MUST** refactor them before presenting the results.

### 2. Build & Lint Verification

Execute the official validation scripts:

```bash
npm run lint && npm run build
```

### 3. Dev Server Instance Check

Before starting a new development server, verify if one is already active:

```bash
pgrep -af vite || echo "No vite instances running"
```

> [!WARNING]
> If the command above returns existing processes, **do NOT** run `npm run dev`. Reuse the existing session to avoid port clashing and high CPU usage.

### 4. Analyze & Response

- **Lint Failed**: Review and fix errors immediately.
- **Build Failed**: Dig into the build log to find structural errors (missing imports, Vite config issues).
- **Server Running**: Skip `npm run dev` and proceed with the existing instance.
- **MANDATORY**: Do **NOT** proceed to browser testing or `browser_subagent` until these commands pass.

## Troubleshooting

- If `npm run lint` fails on files you didn't touch, run it with `--fix` if the error is minor.
- Aim to leave the codebase cleaner/more modular than you found it.

## Audit Checklist

1. `[ ]` Run length audit: No violator files in `src/`.
2. `[ ]` `npm run lint`: Execution success (0 errors).
3. `[ ]` `npm run build`: Execution success.
4. `[ ]` Dev Server Check: No duplicate instances or reused existing one.
