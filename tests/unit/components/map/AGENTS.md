# tests/unit/components/map/ - Map Component Unit Tests

This directory contains isolated unit tests for map components, pathfinding engines, and graph navigation.

## Directory Scope & Responsibilities

- **`adventurePathfinding.spec.ts`**: Verifies graph pathfinding accuracy, Dijkstra shortest-path calculations, MO obstacle constraints (e.g. Cut tree blocks), and alternative route discoveries.

## Key Testing Rules

1. **Deterministic Red-to-Green**: All graph algorithms must be tested with explicit inputs and expected outputs without external timers or random seeds.
2. **Standard Vitest Suite**: Run natively via `npm run test:unit` or `npm run test`.
