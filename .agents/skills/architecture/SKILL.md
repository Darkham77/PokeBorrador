---
name: architecture
description: Architectural decision-making framework. Requirements analysis, trade-off evaluation, ADR documentation. Use when making architecture decisions or analyzing system design.
allowed-tools: Read, Glob, Grep
---

# Architecture Decision Framework

> "Requirements drive architecture. Trade-offs inform decisions. ADRs capture rationale."

---

## 🎯 Selective Reading Rule

**Read ONLY files relevant to the request!** Check the content map, find what you need.

| File | Description | When to Read |
| :--- | :--- | :--- |
| `context-discovery.md` | Questions to ask, project classification | Starting architecture design |
| `trade-off-analysis.md` | ADR templates, trade-off framework | Documenting decisions |
| `pattern-selection.md` | Decision trees, anti-patterns | Choosing patterns |
| `examples.md` | MVP, SaaS, Enterprise examples | Reference implementations |
| `patterns-reference.md` | Quick lookup for patterns | Pattern comparison |

---

## 🔗 Related Skills

| Skill | Use For |
| :--- | :--- |
| [database-design](../database-design/SKILL.md) | Database schema design |
| [api-patterns](../api-patterns/SKILL.md) | API design patterns |

---

## 3. Core Principle: Simplicity

> "Simplicity is the ultimate sophistication."

- Start simple
- Add complexity ONLY when proven necessary
- You can always add patterns later
- Removing complexity is MUCH harder than adding it

---

## 4. Hybrid Engine Parity (Mandatory)

When maintaining the `DBRouter` or `ProxyQuery` logic:

- **API Parity**: Ensure that `ProxyQuery` implements all methods used by the Supabase client (e.g., `insert`, `upsert`, `update`, `delete`, `select`, `single`, `maybeSingle`).
- **Fail-Safe Execution**: Always `await` action handlers within try-catch blocks to return standard `{ data, error }` objects instead of crashing the UI.

---

## Validation Checklist

Before finalizing architecture:

- [ ] Requirements clearly understood
- [ ] Constraints identified
- [ ] Each decision has trade-off analysis
- [ ] Simpler alternatives considered
- [ ] ADRs written for significant decisions
- [ ] Team expertise matches chosen patterns
