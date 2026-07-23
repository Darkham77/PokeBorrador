# Purpose

Global Trade Station (GTS) scenario simulations validating the marketplace explorer, item/pokemon listing flow, and multi-account transactions.

## Ownership

QA / Automation Engineers.

## Local Contracts

- GTS simulations MUST simulate multi-account interactions using independent browser contexts (`browser.newContext()`) to verify both sides of a transaction.
- Simulations run against the local offline mock database (SQLite) using a unified server-side data structure.

## Work Guidance

- Verify that listing fees (e.g. 5% market fee) are correctly computed and subtracted from seller proceeds.
- Ensure that the buyer's balance decreases synchronously and that the purchased asset appears in the correct PC box.

## Verification

- Run `npm run sim:e2e:gts` to verify GTS transactions.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
