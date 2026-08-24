# Purpose

Modular Valibot schema definitions for authentication, battle state, Pokémon entities, and social features.

## Ownership

Security and Architecture Developers.

## Local Contracts

- All sub-schemas MUST follow Domain-Type-First governance with strict inferred DTO types.
- Exports MUST remain zero-fallback and tree-shakable.
- When validating `claimQueue` items (`claimItemSchema`), ensure optional fields (`user_id?: string`, `type?: string`) match the database table schema `claim_queue`. The asset type is canonicalized inside `asset_data.type` (`'pokemon' | 'item' | 'money' | 'currency'`).

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
