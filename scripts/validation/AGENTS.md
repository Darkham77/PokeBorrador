# Purpose

Validation scripts for battle FSM structures, abilities, items, moves, and translations matching.

## Local Contracts

- **Active Localization Leak Audits**: Data validators (such as `validate_items.ts` and `validate_translations.ts`) must never validate string fields by simple non-null / non-empty checks alone. They MUST actively assert Spanish localization by scanning for forbidden English keywords (`holder`, `raises`, `single use`, `attacks`, `if held by`, etc.) and untranslated English entity tokens.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
