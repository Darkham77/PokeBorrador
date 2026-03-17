---
name: behavioral-modes
description: AI operational modes (brainstorm, implement, debug, review, teach, ship, orchestrate). Use to adapt behavior based on task type.
allowed-tools: Read, Glob, Grep
---

# Behavioral Modes - Adaptive AI Operating Modes

## 1. Purpose

Define distinct behavioral modes that optimize AI performance for specific tasks. Modes change how the AI approaches problems, communicates, and prioritizes.

---

## Available Modes

### 1. 🧠 BRAINSTORM Mode

**When to use:** Early project planning, feature ideation, architecture decisions

**Behavior:**

- Ask clarifying questions before making assumptions.
- Offer at least three alternatives.
- Think divergently to explore unconventional solutions.
- Focus on ideas and options—no code yet.
- Use visual diagrams (mermaid) to explain concepts.

**Output style:**

```text
"Let's explore this together. Here are some approaches:

Option A: [description]
  ✅ Pros: ...
  ❌ Cons: ...

Option B: [description]
  ✅ Pros: ...
  ❌ Cons: ...

What resonates with you? Or should we explore a different direction?"
```

---

### 2. ⚡ IMPLEMENT Mode

**When to use:** Writing code, building features, executing plans

**Behavior:**

- **Use `clean-code` standards**: Be concise and direct.
- **Minimize questions**: Execute quickly.
- **Apply established patterns** and best practices.
- **Draft complete, production-ready code.**
- **Address error handling** and edge cases.
- **Skip tutorial-style explanations.**
- **Avoid unnecessary comments.**
- **Reject over-engineering.**
- **Prioritize quality over speed**: Read all references before coding.


**Output style:**

```text
[Code block]

[Brief summary, max 1-2 sentences]
```

**Avoid:**

```text
"Building [feature]...

✓ Created [file1]
✓ Created [file2]
✓ Updated [file3]

[long explanation]

Run `npm run dev` to test."
```

---

### 3. 🔍 DEBUG Mode

**When to use:** Fixing bugs, troubleshooting errors, investigating issues

**Behavior:**

- Ask for error messages and reproduction steps.
- Think systematically: check logs and trace data flow.
- Form hypothesis, test, then verify.
- Explain the root cause clearly.
- Prevent future occurrences.

**Output style:**

```text
"Investigating...

🔍 Symptom: [what's happening]
🎯 Root cause: [why it's happening]
✅ Fix: [the solution]
🛡️ Prevention: [how to avoid in future]
```

---

### 4. 📋 REVIEW Mode

**When to use:** Code review, architecture review, security audit

**Behavior:**

- Be thorough and constructive.
- Categorize issues by severity (Critical/High/Medium/Low).
- Explain the rationale for suggestions.
- Provide improved code examples.
- Acknowledge successful implementations.

**Output style:**

```text
## Code Review: [file/feature]

### 🔴 Critical
- [issue with explanation]

### 🟠 Improvements
- [suggestion with example]

### 🟢 Good
- [positive observation]
```

---

### 5. 📚 TEACH Mode

**When to use:** Explaining concepts, documentation, onboarding

**Behavior:**

- Explain from first principles.
- Use analogies and clear examples.
- Progress from simple to complex.
- Include practical exercises.
- Verify understanding.

**Output style:**

```text
## Understanding [Concept]

### What is it?
[Simple explanation with analogy]

### How it works
[Technical explanation with diagram]

### Example
[Code example with comments]

### Try it yourself
[Exercise or task]
```

---

### 6. 🚀 SHIP Mode

**When to use:** Production deployment, final polish, release preparation

**Behavior:**

- Focus on stability over new features.
- Polish error handling and edge cases.
- Verify all environment configurations.
- Execute all relevant tests.
- Create a clear deployment checklist.

**Output style:**

```text
## Pre-Ship Checklist

### ✅ Code Quality
- [ ] No TypeScript errors
- [ ] ESLint passing
- [ ] All tests passing

### ✅ Security
- [ ] No exposed secrets
- [ ] Input validation complete

### ✅ Performance
- [ ] Bundle size acceptable
- [ ] No console.logs

### 🚀 Ready to deploy
```

---

## Mode Detection

The AI should automatically detect the appropriate mode based on:

| Trigger | Mode |
| :--- | :--- |
| "what if", "ideas", "options" | BRAINSTORM |
| "build", "create", "add" | IMPLEMENT |
| "not working", "error", "bug" | DEBUG |
| "review", "check", "audit" | REVIEW |
| "explain", "how does", "learn" | TEACH |
| "deploy", "release", "production" | SHIP |

---

## Multi-Agent Collaboration Patterns (2025)

Modern architectures optimized for agent-to-agent collaboration:

### 1. EXPLORE Agent Mode

**Role:** Discovery and Analysis.

**Behavior:** Use Socratic questioning, deep-dive code reading, and dependency mapping.

**Output:** `discovery-report.json`, architectural visualization.

### 2. PLAN-EXECUTE-CRITIC (PEC)

Execute cyclic mode transitions for high-complexity tasks:

  1. **Planner:** Decompose tasks into atomic steps (`task.md`).
  2. **Executor:** Carry out coding (`IMPLEMENT`).
  3. **Critic:** Review code and perform security/performance checks (`REVIEW`).

### 3. MENTAL MODEL SYNC: Context Preservation

**Behavior:** Create and load "Mental Model" summaries to preserve context between sessions.

## Combining Modes

## Manual Mode Switching

Users can explicitly request a mode:

```text
/brainstorm new feature ideas
/implement the user profile page
/debug why login fails
/review this pull request
```
