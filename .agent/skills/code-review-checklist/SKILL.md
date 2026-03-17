---
name: code-review-checklist
description: Code review guidelines covering code quality, security, and best practices.
allowed-tools: Read, Glob, Grep
---

# Code Review Checklist

## Quick Review Checklist

### Correctness

- [ ] **Verify correctness:** Ensure code does exactly what it's supposed to do.
- [ ] **Check edge cases:** Handle all possible input variations.
- [ ] **Validate error handling:** Confirm errors are caught and surfaced safely.
- [ ] **Perform logic sanity check:** Look for obvious bugs or race conditions.

### Security

- [ ] **Sanitize input:** Validate and sanitize all external data.
- [ ] **Prevent injections:** Ensure no SQL/NoSQL injection vulnerabilities exist.
- [ ] **Guard against web attacks:** Block XSS and CSRF vulnerabilities.
- [ ] **Audit secrets:** Remove all hardcoded credentials or sensitive tokens.
- [ ] **Defend AI hooks:** Protect against Prompt Injection in AI calls.
- [ ] **Sanitize AI output:** Validate AI content before use in high-risk sinks.

### Performance

- [ ] **Optimize database calls:** Eliminate N+1 queries.
- [ ] **Reduce computation:** Remove unnecessary loops or heavy operations.
- [ ] **Implement caching:** Use appropriate caching strategies where effective.
- [ ] **Audit bundle size:** Consider the impact on frontend performance.

### Code Quality

- [ ] **Clarify naming:** Use descriptive names for variables and functions.
- [ ] **Enforce DRY:** Eliminate duplicate code blocks.
- [ ] **Apply SOLID:** Follow solid design principles.
- [ ] **Calibrate abstraction:** Keep the code at the appropriate complexity level.

### Testing

- [ ] **Write unit tests:** Ensure new code is covered by tests.
- [ ] **Test edge cases:** Verify the system handles unorthodox inputs.
- [ ] **Maintenance check:** Keep tests readable and easy to maintain.

### Documentation

- [ ] **Explain complex logic:** Add comments to non-obvious code.
- [ ] **Doc public APIs:** Update JSDoc/TSDoc for shared functions.
- [ ] **Sync README:** Document new features or structural changes.

## AI & LLM Review Patterns (2025)

### Logic & Hallucinations

- [ ] **Trace logic:** Ensure the chain of thought follows a verifiable path.
- [ ] **Verify edge cases:** Confirm the AI accounted for empty states, timeouts, and partial failures.
- [ ] **Audit external state:** Validate that safe assumptions are made about file systems or networks.

### Prompt Engineering Review

```markdown
// ❌ Vague prompt in code
const response = await ai.generate(userInput);

// ✅ Structured & Safe prompt
const response = await ai.generate({
  system: "You are a specialized parser...",
  input: sanitize(userInput),
  schema: ResponseSchema
});
```

## Anti-Patterns to Flag

```typescript
// ❌ Magic numbers
if (status === 3) { ... }

// ✅ Named constants
if (status === Status.ACTIVE) { ... }

// ❌ Deep nesting
if (a) { if (b) { if (c) { ... } } }

// ✅ Early returns
if (!a) return;
if (!b) return;
if (!c) return;
// do work

// ❌ Long functions (100+ lines)
// ✅ Small, focused functions

// ❌ any type
const data: any = ...

// ✅ Proper types
const data: UserData = ...
```

## Review Comments Guide

```text
// Blocking issues use 🔴
🔴 BLOCKING: SQL injection vulnerability here

// Important suggestions use 🟡
🟡 SUGGESTION: Consider using useMemo for performance

// Minor nits use 🟢
🟢 NIT: Prefer const over let for immutable variable

// Questions use ❓
❓ QUESTION: What happens if user is null here?
```
