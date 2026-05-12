# AGENTS.md - GLOBAL PROJECT RULES & IDENTITY

This file defines the immutable DNA of the Poké Vicio project. Every AI agent interacting with this repository MUST adhere to these rules.

## 0. Efficient Thinking & Communication

- **Internal Reasoning**: The agent should use the most efficient language for its internal processing (preferably English) when reasoning, planning, or analyzing code.
- **User Interaction**: All direct communication with the user (responses, explanations, questions) MUST be conducted exclusively in Spanish, maintaining the tone and context of the project.

## 1. Mandatory Skill Invocation

- Always load and follow the instructions in the `@/project-standards` skill.
- This skill is NOT a checklist; it is the foundation of every reasoning and implementation step.

## 2. Core Identity: Hybrid Retro-Modern

- **Modern UI Shell**: Premium gradients, relief effects, shining borders, fluid transitions.
- **Pixel Art Heart**: All game content, sprites, and typography MUST be pixelated.
- **SASS Integrity**: SASS function capitalization is handled **automatically** by the Vite plugin (`vite-plugin-sass-traps.ts`) during HMR and build. Therefore, developers and agents can write standard lowercase CSS filters/transforms, and Vite will automatically format and capitalize them. No manual capitalization is required.
- **GPU Efficiency**: Strict use of Texture Atlases and Object Pooling (Phaser).
- **Game Performance First**: This is a high-fidelity web video game. All UI and logic implementations MUST prioritize GPU-accelerated rendering and FPS stability. Optimize workflows and filter chains (e.g., `pokemon-outline-performance`) to ensure maximum fluidity without compromising visual quality.
- **GSAP Exclusive Mandate**: All animations in the project (UI transitions, battle effects, map movements, etc.) MUST be implemented using GSAP. The use of manual CSS `@keyframes`, transitions, or `setTimeout`/`setInterval` for animation flow is STRICTLY FORBIDDEN. For ANY task involving the battle engine or FSM transitions, you MUST use `validate_fsm_diagrams.ts`, `validate_fsm_implementation.ts`, and `validate_fsm_flow_parity.ts` to ensure 1:1 parity with documentation and zero race conditions.
- **Zero-Timer & Zero-Variable Policy**: It is STRICTLY FORBIDDEN to use `setTimeout`, `setInterval`, or any numeric timer to wait for an animation to finish. Coordination of sequential animations MUST NOT be handled using reactive state variables (boolean flags like `isAnimating` or `stepIndex`). Always use GSAP's native deterministic orchestration: `.then()` promises, `await` on timelines, or `onComplete` callbacks. This ensures that logic remains synchronized even if animation durations are adjusted in the future.

## 3. Database Isolation

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.

## 4. Code Modularity (300/500 Rule)

- **Early Modularization**: Files exceeding **300 lines** should trigger a proactive refactoring review. Focus on extracting logic into **Composables** and ensuring **Single Responsibility (SRP)**.
- **Hard Limit**: No logic or UI component may exceed **500 lines**. Exceeding this limit is considered a critical technical debt error.
  - _Exception_: Massive databases, metadata modules, and files in `src/data/` are exempt from this limit to preserve data integrity.

## 5. Architectural Reuse & Inheritance

- **Zero-Invention Policy**: Never create new "islands" of logic or styling if a generic system (e.g., `BaseModal`, `UnifiedCard`, `DBRouter`) already exists.
- **Extend, Don't Duplicate**: Always prioritize parameterization and inheritance to adapt existing systems instead of starting from scratch.

## 6. CLI-First Debugging

- **Efficiency Over GUI**: When simulating game states or testing conditional UI (e.g., money, levels, map dominance), **ALWAYS** prioritize using the `window.__VITE_DEBUG__` console commands over manual GUI interaction.
- **Speed & Reliability**: CLI-based state simulation is faster and more reliable for automated tests and subagent tasks.
- **Standardized Execution**: Follow the exact simulation patterns and security protocols defined in the `@/project-browser-testing` skill.

## 7. TypeScript Integrity & Zero-Ignore Policy

- **Zero-Ignore Policy**: The use of `@ts-ignore`, `@ts-nocheck`, or any variant that bypasses TypeScript compiler checks is STRICTLY FORBIDDEN.
- **Zero-Any Policy**: The use of `any` is STRICTLY FORBIDDEN. Before resorting to it, you MUST analyze if new interfaces or data types should be defined to maintain strict type safety.
- **Verification Workflow**: Always run `npm run type-check` BEFORE `npm run lint` or any commit operation. Type safety is non-negotiable.
- **Node.js 26+ Modernization**: Use `Temporal` instead of `Date` for engine logic. Mandatory use of `node:` prefix for built-in imports. Mandatory use of the **Node.js 26 Permission Model** (`--permission`) for utility scripts with restricted FS access. Mandatory use of **Explicit Resource Management** (`using`) for file handles and database connections in Node scripts. Prefer **`node:test`** for pure logic unit tests (non-browser). Prefer **`node:timers/promises`** for delays in scripts. Run `npm run validate:sql` before database commits.

## 8. Git Safety & Rollback Protocol

- **Mandatory Confirmation**: Before executing any git operation that involves a rollback, reset, or destructive change (e.g., `git reset --hard`, `git checkout .`, `git clean`), the agent MUST explicitly ask the user for confirmation.
- **Explicit Command Disclosure**: The confirmation request MUST include the exact command(s) that are about to be executed so the user can review them.
- **Safety First**: Rollbacks are high-risk operations. Never assume the user wants a destructive revert without a clear, final "Yes" from their side.

---

_Note: If you are an AI agent and haven't loaded `@/project-standards` yet, do it now._
