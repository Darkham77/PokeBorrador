---
name: extract-lessons
description: "Extracts lessons learned from the current conversation (user feedback, bugs fixed, patterns discovered, mistakes corrected) and distributes them ONLY into the appropriate existing LOCAL project skills or creates new local project skills. Use when: (1) a conversation is ending and knowledge should be preserved, (2) the user explicitly asks to capture lessons, or (3) significant debugging/refactoring revealed reusable patterns. NEVER update global skills."
---

# Extract Lessons

## Workflow

### Phase 1: Collect Lessons

Scan the full conversation history for:

| Source | Example |
| :--- | :--- |
| **User corrections** | "That checkbox doesn't match the standard" → design pattern |
| **Bugs fixed** | `SystemStatus.showBanner is not a function` → API verification rule |
| **Workarounds discovered** | `mysqldump` unavailable in Docker → no-external-binaries rule |
| **Infrastructure issues** | Volume path mismatch, permission errors → Docker rules |
| **Repeated patterns** | Lock files, DRY extraction → modularization/concurrency rules |
| **Aesthetic feedback** | "Use glass-subcard for checkboxes" → design philosophy |

Produce a numbered **Lessons List** with one-line summaries.

### Phase 2: Map to Skills

For each lesson, determine the **target skill**:

1. Read the list of existing skills from the skill descriptions. **CRITICAL: You must EXCLUDE any global skills (e.g., skills located outside the current workspace or in generic directories like Google Drive). ONLY consider skills that are local to the current project's `.agent/skills/` directory.**
2. Match each lesson to the most relevant local skill by topic.
3. If no existing local skill covers the lesson → mark it for **new skill creation** (which must also be saved locally in the project).

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

1. **Mandatory Editor**: ALWAYS use **@skill-creator** as the skill editor. NEVER edit the `SKILL.md` file directly with file-writing tools during this phase; let **@skill-creator** manage the update process.
2. Read the target skill's `SKILL.md`.
3. **Preserve Compatibility**: When adding the lesson, take extreme care NOT to remove or "summarize away" existing rules or lines unless they are explicitly incompatible with the new changes or were requested to be removed. Removing functionality for the sake of brevity is a regression.
4. Add the lesson as a new rule, guideline, or pattern in the appropriate section.
5. Keep it concise — one rule or one code block per lesson. Explain the **why** behind the rule instead of using heavy-handed MUSTs.
6. **Optimize Triggering**: Evaluate if the current `description` in the YAML frontmatter still covers the new logic. If necessary, use **@skill-creator** to refine the description to ensure proper triggering.
7. **Never duplicate** information already in the skill or other skills. Use references: `see **@other-skill**`.
8. If the lesson fits better as a reference file or if `SKILL.md` is approaching 500 lines, add it to a `references/` directory.

#### CREATE new skill

1. **Mandatory Editor**: ALWAYS use **@skill-creator** — follow its full process (init, edit, package).
2. Write "pushy" descriptions in the YAML frontmatter that detail both *what* the skill does and *specific contexts for when to use it* to ensure proper triggering.
3. Use progressive disclosure: keep `SKILL.md` under 500 lines and use `references/` or `scripts/` for larger pieces.
4. Reference existing skills instead of duplicating (e.g., `see **@add-error-handling**`).

## Rules

- **Local Skills Only**: NEVER update global skills (skills located outside the current project's repository, such as those in generic user folders or Google Drive). Only update or create skills that belong to the current project's local workspace.
- **Skill-Creator usage**: Every creation or modification of a skill MUST be handled via the **@skill-creator** workflow.
- **Zero-Regression Rule**: Never remove existing compatible lines or functionality during an update. Trimming for "conciseness" is forbidden if it removes distinct instructional value.
- **No duplication**: Before adding, search existing skills with `grep_search` to verify the information isn't already present.
- **Explain the "Why"**: Substitute rigid MUSTs with explanations of the task semantics so the AI understands reasoning.
- **Concise additions**: Each lesson = max 2-3 lines added to a skill. Use code blocks only if the pattern is non-obvious.
- **Cross-references**: Use `**@skill-name**` to reference related skills instead of repeating their content.
- **Preserve structure**: Follow the existing formatting conventions of each target skill (numbered lists, tables, code blocks).
- **Present the plan**: Show the user the Lessons List and mapping table before executing Phase 3. Get approval first.
