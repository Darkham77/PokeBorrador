# AGENTS.md - GLOBAL PROJECT RULES & IDENTITY

This file defines the immutable DNA of the Poké Vicio project. Every AI agent interacting with this repository MUST adhere to these rules.

## 0. Efficient Thinking & Communication

- **Internal Reasoning**: The agent should use the most efficient language for its internal processing (preferably English) when reasoning, planning, or analyzing code.
- **User Interaction**: All direct communication with the user (responses, explanations, questions) MUST be conducted exclusively in Spanish, maintaining the tone and context of the project.

## 1. Mandatory Skill Invocation

- Always load and follow the instructions in the `@/project-standards` skill.
- This skill is NOT a checklist; it is the foundation of every reasoning and implementation step.

## 2. Core Identity: Hybrid Retro-Modern

- **Modern UI Shell**: Glassmorphism, premium gradients, fluid transitions.
- **Pixel Art Heart**: All game content, sprites, and typography MUST be pixelated.
- **SASS Integrity**: MANDATORY use of **Capitalized Filters** (e.g., `Blur()`, `Scale()`) to prevent Dart Sass 2.0 collisions.
- **GPU Efficiency**: Strict use of Texture Atlases and Object Pooling (Phaser).
- **Game Performance First**: This is a high-fidelity web video game. All UI and logic implementations MUST prioritize GPU-accelerated rendering and FPS stability. Optimize workflows and filter chains (e.g., `pokemon-outline-performance`) to ensure maximum fluidity without compromising visual quality.

## 3. Database Isolation

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.

## 4. Code Modularity

- Enforce the 500-line rule for all logic and UI components.

## 5. Architectural Reuse & Inheritance

- **Zero-Invention Policy**: Never create new "islands" of logic or styling if a generic system (e.g., `BaseModal`, `UnifiedCard`, `DBRouter`) already exists.
- **Extend, Don't Duplicate**: Always prioritize parameterization and inheritance to adapt existing systems instead of starting from scratch.

## 6. CLI-First Debugging

- **Efficiency Over GUI**: When simulating game states or testing conditional UI (e.g., money, levels, map dominance), **ALWAYS** prioritize using the `window.__VITE_DEBUG__` console commands over manual GUI interaction.
- **Speed & Reliability**: CLI-based state simulation is faster and more reliable for automated tests and subagent tasks.
- **Standardized Execution**: Follow the exact simulation patterns and security protocols defined in the `@/project-browser-testing` skill.

## 7. TypeScript Integrity & Zero-Ignore Policy

- **Zero-Ignore Policy**: The use of `@ts-ignore`, `@ts-nocheck`, or any variant that bypasses TypeScript compiler checks is STRICTLY FORBIDDEN.
- **Verification Workflow**: Always run `npm run type-check` BEFORE `npm run lint` or any commit operation. Type safety is non-negotiable.
- **Node.js 26+ Modernization**: Use `Temporal` instead of `Date` for engine logic. Mandatory use of `node:` prefix for built-in imports. Mandatory use of the **Node.js 26 Permission Model** (`--permission`) for utility scripts with restricted FS access. Mandatory use of **Explicit Resource Management** (`using`) for file handles and database connections in Node scripts. Prefer **`node:test`** for pure logic unit tests (non-browser). Prefer **`node:timers/promises`** for delays in scripts. Run `npm run validate-sql` before database commits.

---
*Note: If you are an AI agent and haven't loaded `@/project-standards` yet, do it now.*
