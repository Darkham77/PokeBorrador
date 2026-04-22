# AGENTS.md - GLOBAL PROJECT RULES & IDENTITY

This file defines the immutable DNA of the Poké Vicio project. Every AI agent interacting with this repository MUST adhere to these rules.

## 1. Mandatory Skill Invocation

- Always load and follow the instructions in the `@/project-standards` skill.
- This skill is NOT a checklist; it is the foundation of every reasoning and implementation step.

## 2. Core Identity: Hybrid Retro-Modern

- **Modern UI Shell**: Glassmorphism, premium gradients, fluid transitions.
- **Pixel Art Heart**: All game content, sprites, and typography MUST be pixelated.
- **SASS Integrity**: MANDATORY use of **Capitalized Filters** (e.g., `Blur()`, `Scale()`) to prevent Dart Sass 2.0 collisions.
- **GPU Efficiency**: Strict use of Texture Atlases and Object Pooling (Phaser).

## 3. Database Isolation

- Maintain absolute separation between Online (Supabase) and Offline (SQLite) contexts via the `DBRouter`.

## 4. Code Modularity

- Enforce the 500-line rule for all logic and UI components.

## 5. Architectural Reuse & Inheritance

- **Zero-Invention Policy**: Never create new "islands" of logic or styling if a generic system (e.g., `BaseModal`, `UnifiedCard`, `DBRouter`) already exists.
- **Extend, Don't Duplicate**: Always prioritize parameterization and inheritance to adapt existing systems instead of starting from scratch.

---
*Note: If you are an AI agent and haven't loaded `@/project-standards` yet, do it now.*
