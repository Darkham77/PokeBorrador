# scripts/auditors/assets/AGENTS.md

## Purpose & Scope

This directory contains multimedia, sprite existence, and sprite collision auditors for Pokémon and inventory items.

## Directory Structure & Files

- [audit_item_sprite_collisions.ts](./audit_item_sprite_collisions.ts): Verifies that inventory items do not inadvertently share sprite assets across distinct functional items.
- [validate_sprites.ts](./validate_sprites.ts): Audits sprite files and animations across standard and shiny variants.

## Local Governance & Rules

- All auditors in this family must adhere to the `StandardAuditResult` contract and support dual-mode execution.
