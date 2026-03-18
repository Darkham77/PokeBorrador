---
name: web-design-guidelines
description: MANDATORY review of UI code for Web Interface Guidelines compliance. YOU MUST use this when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices". Audit rigorously.
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

> PROACTIVELY audit files for compliance with Web Interface Guidelines.

## How It Works

1. **Fetch** the latest guidelines from the source URL below.
2. **Read** the specified files (or prompt user for files/pattern).
3. **Verify** against ALL rules in the fetched guidelines.
4. **Report** findings in the terse `file:line` format.

## Guidelines Source

Fetch fresh guidelines before EVERY review:

```text
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use `read_url_content` to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:

1. **Fetch** guidelines from the source URL above.
2. **Analyze** the specified files.
3. **Apply** ALL rules from the fetched guidelines.
4. **Output** findings using the format specified in the guidelines.

If no files specified, ASK the user which files to review.

---

## Related Skills

| Skill | When to Use |
| :--- | :--- |
| **[frontend-design](../frontend-design/SKILL.md)** | **BEFORE** coding - Learn design principles (color, typography, UX psychology) |
| **web-design-guidelines** (this) | **AFTER** coding - Audit for accessibility, performance, and best practices |

## Design Workflow

```text
1. DESIGN   → Read frontend-design principles
2. CODE     → Implement the design
3. AUDIT    → Run web-design-guidelines review ← YOU ARE HERE
4. FIX      → Address findings from audit
```
