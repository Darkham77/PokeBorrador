---
name: learn-with-docs
description: Custom learning and behavior persistence skill leveraging `/learn` within the DOX (AGENTS.md) documentation framework. Use when executing `/learn` or saving newly acquired patterns, rules, or game behaviors. It ensures learnings are written to the correct child or project-standards indices in their native file language.
---

# Learn With Docs

This skill customizes the behavior of the `/learn` slash command to ensure that newly acquired patterns, corrections, and rules are persisted correctly in the hierarchical DOX (AGENTS.md) framework.

## 1. Precise Placement Strategy

When saving a new behavior, constraint, or success pattern:
- **Do NOT default to the first or root `AGENTS.md` index** unless it is a universal, project-wide rule.
- **Navigate and Find the Proper Boundary**: Analyze the target directory tree. Locate the specific child `AGENTS.md` (via [dox-navigator](../dox-navigator/SKILL.md)) matching the scope of the learning, or create a new child index if one is needed.
- **Game Rules & Standard Cross-Check**: Any new Pokémon Showdown or battle engine logic rules, mechanics constraints, or game behavior overrides MUST also be recorded in the [project-standards](../project-standards/SKILL.md) skill and the nearest applicable DOX file.
- **Mandatory `@/project-standards` Synchronization**: Whenever adding or modifying rules in any child DOX index, you MUST proactively audit and cross-check related technical manuals and specialized rule files under [project-standards](../project-standards/SKILL.md) (`references/rules/`, `references/battle/`, `references/technical/`, `references/core/`, etc.). Identify and resolve any outdated parameters, conflicting mixin instructions, or legacy values to prevent documentation drift and desynchronization across the repository.

## 2. Language & Integrity Constraints

- **Preserve Native Language**: Check the target file's primary language before updating it. Do not mix languages within a single file.
- **English-First**: Since all configuration files and most docs are in English, any changes or additions to them MUST be written in English. Direct user communication, proposals, and summaries must remain in Spanish.
- **Relative Paths**: Always use relative paths when linking files and DOX indices (e.g., `[dox-navigator](../dox-navigator/SKILL.md)`). Refer to [grill-with-docs](../grill-with-docs/SKILL.md) for examples of linking within the DOX framework.

## 3. Workflow Steps & Learn Artifacts

1. **Identify Learnings & Audit Scope**: Analyze recent interactions to identify what to learn (Rules vs. Skills), determine the correct target DOX scope, and scan related [project-standards](../project-standards/SKILL.md) manuals for required corrections or enhancements.
2. **Locate Target & Cross-Check Standards**: Use the [dox-navigator](../dox-navigator/SKILL.md) skill to identify the correct `AGENTS.md` file(s) AND grep corresponding technical manuals in [project-standards](../project-standards/SKILL.md) for any legacy contradictions.
3. **Mandatory Proposal Workflow**: Do NOT modify files immediately. You MUST create/update the `learning_proposal.md` artifact outlining the classification, rationale, and precise text additions/diffs for BOTH the child DOX indices and any synchronized [project-standards](../project-standards/SKILL.md) manuals:
   - Save the artifact strictly to the Artifact Directory `<appDataDir>/brain/<conversation-id>/learning_proposal.md`. NEVER save it inside `scratch/` or the project repository workspace.
   - Pass complete `ArtifactMetadata` containing `UserFacing: true`, `RequestFeedback: true`, and a detailed multi-line `Summary` describing the proposed rules/lessons.
4. **Language Integrity Check**: Ensure the proposed rules or additions inside the `learning_proposal.md` diff blocks are written in English (matching the target files), while all descriptions, justifications, and chat explanations are in Spanish.
5. **Get User Approval**: Stop and wait for the user's explicit approval on the proposal before applying any changes to the files.
6. **Documentation-Only Verification**: After applying changes to `AGENTS.md` or skill files, ONLY run DOX integrity checks (`npm run audit:dox`) and fast markdown linting (`npm run lint:md` or `npm run lint`).
   - **STRICT PROHIBITION ON RUNNING TESTS FOR DOCS**: You are STRICTLY FORBIDDEN from running `npm run test`, Vitest, Node test runners, or E2E simulations when updating documentation, DOX indices, or `.md` files. Test suites are exclusively for code logic changes in `src/` or `database/`.


