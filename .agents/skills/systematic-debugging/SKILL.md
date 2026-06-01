---
name: systematic-debugging
description: "Master evidence-based troubleshooting with a 4-phase methodology: Reproduce, Isolate, Understand, and Fix. Use PROACTIVELY to solve complex bugs, perform root cause analysis, and ensure robust verification through systematic testing."
allowed-tools: Read, Glob, Grep
---

# Systematic Debugging

> Source: obra/superpowers

## Overview

This skill provides a structured approach to debugging that prevents random guessing and ensures problems are properly understood before solving.

## 4-Phase Debugging Process

### Phase 1: Reproduce

Before fixing, reliably reproduce the issue.

```markdown
## Reproduction Steps
1. [Exact step to reproduce]
2. [Next step]
3. [Expected vs actual result]

## Reproduction Rate
- [ ] Always (100%)
- [ ] Often (50-90%)
- [ ] Sometimes (10-50%)
- [ ] Rare (<10%)
```

### Phase 2: Isolate

Narrow down the source.

```markdown
## Isolation Questions
- When did this start happening?
- What changed recently?
- Does it happen in all environments?
- Can we reproduce with minimal code?
- What's the smallest change that triggers it?
```

### Phase 3: Understand

Find the root cause, not just symptoms.

```markdown
## Root Cause Analysis
### The 5 Whys
1. Why: [First observation]
2. Why: [Deeper reason]
3. Why: [Still deeper]
4. Why: [Getting closer]
5. Why: [Root cause]
```

### Phase 4: Fix & Verify

Fix and verify it's truly fixed.

```markdown
## Fix Verification
- [ ] Bug no longer reproduces
- [ ] Related functionality still works
- [ ] No new issues introduced
- [ ] Test added to prevent regression
```

## Debugging Checklist

```markdown
## Before Starting
- [ ] Can reproduce consistently
- [ ] Have minimal reproduction case
- [ ] Understand expected behavior

## During Investigation
- [ ] Check recent changes (git log)
- [ ] Check logs for errors
- [ ] Add logging if needed
- [ ] Use debugger/breakpoints

## After Fix
- [ ] Root cause documented
- [ ] Fix verified
- [ ] Regression test added
- [ ] Similar code checked
```

## Common Debugging Commands

```bash
# Recent changes
git log --oneline -20
git diff HEAD~5

# Search for pattern
grep -r "errorPattern" --include="*.ts"

# Check logs
pm2 logs app-name --err --lines 100
```

## Anti-Patterns (AVOID)

| Anti-Pattern | Why |
| :--- | :--- |
| **Random changes** | Leads to an unpredictable state and confusion ("Maybe if I change this..."). |
| **Ignoring evidence** | Prevents finding the true cause by dismissing valid clues ("That can't be the cause"). |
| **Assuming** | Wastes time on false trails without proof ("It must be X"). |
| **Not reproducing first** | Makes it impossible to verify the fix properly (fixing blindly). |
| **Stopping at symptoms** | Leaves the underlying issue to resurface later (not finding root cause). |
| **Fixing code but testing via HMR proxy** | When a Pinia store registers actions at startup (e.g., `window.__VITE_DEBUG__`), HMR reloads the module but the store's registered closures are NOT refreshed. The "fixed" code never runs. Solution: bypass the proxy and manipulate the store directly from the component, or do a full page refresh to re-run `init()`. |
| **Modifying working animations without isolation** | When a bug is in FSM flow or async sequencing, avoid rewriting state assignments or reactive variables that feed working animations (e.g., team reorder Pokéballs, battle log display). Changes to `searchLoop.ts` or `resolution.ts` that rearrange team state before visual sequences complete will silently break those animations. Always isolate the broken flow first, verify existing animations still play, then patch. |

