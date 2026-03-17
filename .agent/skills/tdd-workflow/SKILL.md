---
name: tdd-workflow
description: Test-Driven Development workflow principles. RED-GREEN-REFACTOR cycle.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# TDD Workflow

> Write tests first, code second.

---

## 1. The TDD Cycle

```text
🔴 RED → Write failing test
    ↓
🟢 GREEN → Write minimal code to pass
    ↓
🔵 REFACTOR → Improve code quality
    ↓
   Repeat...
```

---

## 2. The Three Laws of TDD

1. **Write production code only to make a failing test pass.**
2. **Write only enough of a test to demonstrate failure.**
3. **Write only enough code to make the test pass.**

---

## 3. RED Phase Principles

### What to Write

| Focus | Example |
| :--- | :--- |
| **Behavior** | "Should add two numbers." |
| **Edge cases** | "Should handle empty input." |
| **Error states** | "Should throw for invalid data." |

### RED Phase Rules

- **Ensure the test fails first.**
- **Use test names that describe expected behavior.**
- **Enforce one assertion per test (ideally).**

---

## 4. GREEN Phase Principles

### Minimum Code

| Principle | Meaning |
| :--- | :--- |
| **YAGNI** | "You Aren't Gonna Need It"—avoid speculative features. |
| **Simplest thing** | Write the bare minimum to make the test pass. |
| **No optimization** | Focus on functionality; defer optimization to the REFACTOR phase. |

### GREEN Phase Rules

- **Reject unneeded code.**
- **Defer all optimization.**
- **Pass the test, and nothing more.**

---

## 5. REFACTOR Phase Principles

### What to Improve

| Area | Action |
| :--- | :--- |
| **Duplication** | **Extract** common code into reusable functions. |
| **Naming** | **Rename** variables and functions to clarify intent. |
| **Structure** | **Reorganize** code for better readability. |
| **Complexity** | **Simplify** convoluted logic. |

### REFACTOR Rules

- **Maintain green status across all tests.**
- **Apply small, incremental changes.**
- **Commit the code after each successful refactor.**

---

## 6. AAA Pattern

Every test should follow this structure:

| Step | Purpose |
| :--- | :--- |
| **Arrange** | Set up the necessary test data and state. |
| **Act** | Execute the specific code under test. |
| **Assert** | Verify that the outcome matches the expectation. |

---

## 7. When to Use TDD

| Scenario | TDD Value |
| :--- | :--- |
| **New feature** | High—defines the specification early. |
| **Bug fix** | High—write the test that catches the bug first. |
| **Complex logic** | High—provides a safety net for intricate changes. |
| **Exploratory** | Low—spike the solution first, then apply TDD. |
| **UI layout** | Low—visual changes are better verified manually. |

---

## 8. Test Prioritization

| Priority | Test Type |
| :--- | :--- |
| 1 | **Happy path** |
| 2 | **Error cases** |
| 3 | **Edge cases** |
| 4 | **Performance** |

---

## 9. Anti-Patterns

| Avoid | Instead |
| :--- | :--- |
| Skipping the RED phase | **Watch the test fail** before writing code. |
| Writing tests after the fact | **Invert the flow**—write tests before implementation. |
| Over-engineering initial code | **Keep it primitive** until the test passes. |
| Using multiple assertions | **Isolate one behavior** per test. |
| Testing implementation details | **Test observable behavior** instead. |

---

## 10. AI-Augmented TDD

### Multi-Agent Pattern

| Agent | Role |
| :--- | :--- |
| **Agent A** | **RED:** Write the failing tests. |
| **Agent B** | **GREEN:** Implement the minimal code to pass. |
| **Agent C** | **REFACTOR:** Optimize and clean up. |

---

> [!IMPORTANT]
> **Treat the test as the specification.** If you cannot write a test, you do not yet fully understand the requirements. Always verify failure before success.
