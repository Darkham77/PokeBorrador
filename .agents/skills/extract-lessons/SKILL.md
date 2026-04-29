---
name: extract-lessons
description: "Extracts lessons learned from the current conversation (user feedback, bugs fixed, patterns discovered, mistakes corrected) and distributes them ONLY into the appropriate existing LOCAL project skills or creates new local project skills. Use when: (1) a conversation is ending and knowledge should be preserved, (2) the user explicitly asks to capture lessons, or (3) significant debugging/refactoring revealed reusable patterns. NEVER update global skills."
---

# Extract Lessons

## Workflow

### Phase 1: Collect Lessons

Scan the full conversation history, artifacts, tasks, scratchpads, implementation plans, walkthrough, etc, for:

| Source                     | Example                                                             |
| :------------------------- | :------------------------------------------------------------------ |
| **User corrections**       | "Ese borde no es pixel-art" → `@/project-standards` (Aesthetics)    |
| **Bugs fixed**             | `p.moves.some` is undefined → `@/project-standards` (Validation)    |
| **Workarounds discovered** | SASS capitalization collision → `@/project-standards` (Styling)      |
| **Infrastructure issues**  | Vite proxy mismatch, port busy → Generic Dev Ops rules              |
| **Repeated patterns**      | Vue `computed` vs `ref` optimization → Generic Vue.js patterns      |
| **Aesthetic feedback**     | "Use Glassmorphism for panels" → `@/project-standards` (UI/UX)      |

Produce a numbered **Lessons List** with one-line summaries.

### Phase 2: Map to Skills

For each lesson, determine the **target skill**:

1. Read the list of existing skills from the skill descriptions. **CRITICAL: You must EXCLUDE any global skills (e.g., skills located outside the current workspace or in generic directories like Google Drive). ONLY consider skills that are local to the current project's `.agents/skills/` directory.**
2. **Prioritize @/project-standards**: If the lesson involves game rules, game-specific styles (SASS/UI), game mechanisms, formulas, or project-specific architecture, it **MUST** be mapped to **@/project-standards** (or one of its reference manuals in `@/project-standards/references/`).
3. Only map to other skills if the knowledge is **genuinely generic** and tool-related (e.g., Vue.js best practices, Javascript patterns, Markdown formatting standards, or Skill Creation protocols) and a dedicated local skill already exists for it.
4. If no existing local skill covers a *generic* lesson → mark it for **new skill creation** (which must also be saved locally in the project).

Produce a **mapping table**:

```text
| # | Lesson | Target Skill | Action |
| :--- | :--- | :--- | :--- |
| 1 | ... | `skill-name` | UPDATE |
| 2 | ... | `new-skill-name` | CREATE |
```

### Phase 3: Distribute

For each lesson in the mapping table:

#### UPDATE existing skill

1. **Mandatory Editor**: ALWAYS use **@/skill-creator** as the skill editor. For simple knowledge updates (lessons), you **MUST** skip the evaluation/benchmarking phase. Never use a `browser_subagent` to extract lessons.
2. Read the target skill's `SKILL.md`.
3. **Preserve Compatibility**: When adding the lesson, take extreme care NOT to remove or "summarize away" existing rules or lines unless they are explicitly incompatible with the new changes or were requested to be removed. Removing functionality for the sake of brevity is a regression.
4. Add the lesson as a new rule, guideline, or pattern in the appropriate section.
5. Keep it concise — one rule or one code block per lesson. Explain the **why** behind the rule instead of using heavy-handed MUSTs.
6. **Optimize Triggering**: Evaluate if the current `description` in the YAML frontmatter still covers the new logic. If necessary, use @/skill-creator to refine the description to ensure proper triggering.
7. **Never duplicate** information already in the skill or other skills. Use references: `see @/other-skill`.
8. If the lesson fits better as a reference file or if `SKILL.md` is approaching 500 lines, add it to a `references/` directory.
9. **Synchronized Updates**: ALWAYS verify and update any associated `references/`, `scripts/`, or diagnostic tools (e.g., Python check scripts) linked to the skill. Ensure all technical documentation and automated rules remain in parity with the new knowledge to avoid architectural contradictions.

#### CREATE new skill

1. **Mandatory Editor**: ALWAYS use **@/skill-creator** — follow its full process (init, edit, package).
2. Write "pushy" descriptions in the YAML frontmatter that detail both *what* the skill does and *specific contexts for when to use it* to ensure proper triggering.
3. Use progressive disclosure: keep `SKILL.md` under 500 lines and use `references/` or `scripts/` for larger pieces.
4. Reference existing skills instead of duplicating (e.g., `see @/add-error-handling`).

## Rules

- **Local Skills Only**: NEVER update global skills (skills located outside the current project's repository, such as those in generic user folders or Google Drive). Only update or create skills that belong to the current project's local workspace.
- **Skill-Creator usage**: Every creation or modification of a skill MUST be handled via the @/skill-creator workflow.
- **Zero-Regression Rule**: Never remove existing compatible lines or functionality during an update. Trimming for "conciseness" is forbidden if it removes distinct instructional value.
- **No duplication**: Before adding, search existing skills with `grep_search` to verify the information isn't already present.
- **Project-Standards Priority**: Any knowledge that is intrinsic to the game (mechanics, specific styles, logic, lore-based UI) MUST be directed to @/project-standards or its manuals. Other skills are only for generic technical or architectural patterns.
- **Explain the "Why"**: Substitute rigid MUSTs with explanations of the task semantics so the AI understands reasoning.
- **Concise additions**: Each lesson = max 2-3 lines added to a skill. Use code blocks only if the pattern is non-obvious.
- **Cross-references**: Use `@/skill-name` to reference related skills instead of repeating their content.
- **Preserve structure**: Follow the existing formatting conventions of each target skill (numbered lists, tables, code blocks).
- **Present the plan**: Show the user the Lessons List and mapping table before executing Phase 3. Get approval first.
- **Parity Mandate**: Every skill update MUST be reflected in its entire ecosystem. If a rule changes, the corresponding documentation in `references/` and validation logic in `scripts/` MUST be updated in the same turn.
