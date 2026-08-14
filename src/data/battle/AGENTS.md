# Purpose

Static battle datasets, move definitions, abilities, natures, and type matchups.

## Local Contracts

- **Zero Silent Fallbacks in Domain Lookups**: Functions like `getNatureInfo(nature: NatureId)` and `toNatureId(raw: string)` must fail loudly (`throw new Error(...)`) when encountering invalid keys. Redundant string sanitation (`.toLowerCase().trim()`) on typed domain IDs is strictly forbidden.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
