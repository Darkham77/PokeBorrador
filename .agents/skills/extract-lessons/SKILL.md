---
name: extract-lessons
description: "Use when a conversation ends, after bug fixing, after refactoring, after receiving user corrections, or after discovering reusable patterns — whenever knowledge should be preserved. Runs /learn with a project-specific routing rule: lessons intrinsic to this project go to @/project-standards (or its reference manuals); generic, reusable lessons go to the appropriate local skill. Global skills may only be updated with explicit user permission."
---

# Extract Lessons

Invoke **/learn** to identify, classify, and persist lessons from the current session.

Add the following routing instruction to `/learn`'s workflow:

> **Routing rule**: When deciding where to store a lesson, apply this priority:
> 1. Is the lesson specific to this project (its mechanics, conventions, architecture, or domain)? → Store in **`@/project-standards`** or its reference manuals.
> 2. Is the lesson a generic pattern reusable in any project? → Store in the **appropriate existing local skill**, or create a new local skill if none covers it.
>
> Global skills are **forbidden** unless the user explicitly grants permission before any write. **Never** write anything before the user approves the `learning_proposal.md` artifact.
