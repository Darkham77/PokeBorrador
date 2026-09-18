# Purpose

Manage the logic and assets of debug.

## Ownership

Frontend Developers / Systems Engineers.

## Local Contracts

- Follow standard repository modularity guidelines.
- **Debug Simulation Fixture Schema Parity Mandate (`rewardsDebugSimulationHelpers.ts`)**: All simulated test fixtures, reward generators, and debug helpers that insert records directly into database tables (such as `market_listings`, `claim_queue`, `game_saves`) MUST strictly adhere to the canonical database schema (e.g. using `listing_type: 'item'` and JSON `data: { name, qty }`). Inserting legacy, synthesized, or non-existent columns (e.g. `currency`, `item_data`, `category`) is strictly prohibited and must throw errors instead of being swallowed.

## Work Guidance

- Ensure clean decoupling and zero-warning type safety.

## Verification

- Run standard validation scripts.

## Child DOX Index

- _This domain module does not contain nested sub-directories with independent AGENTS.md files._
