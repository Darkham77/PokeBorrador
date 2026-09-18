# Purpose

Declarative Vue Router 5 data loaders and route preloading functions.

## Ownership

Frontend Developers / State Architects.

## Local Contracts

- **Declarative Route Preloaders**: Loaders in this directory define route data loaders using Vue Router's experimental data loader API (`defineBasicLoader` from `vue-router/experimental`).
- **Store Integration & In-Flight Deduplication**: Loaders must delegate state retrieval to existing Pinia stores (`useSocialStore`, etc.) and respect `inFlightPromise` deduplication to prevent duplicate network calls.
- **Fail-Fast Error Handling**: Loaders must propagate errors rather than swallowing them with empty catches.

## Work Guidance

- Avoid creating speculative loaders for views that do not actively consume them.
- Keep loader implementations lean, focusing strictly on data fetching and route parameter mapping.

## Verification

- Run `npm run audit:dox` to verify DOX hierarchy.
- Run `npm run test:unit tests/unit/loaders/` for unit tests.
