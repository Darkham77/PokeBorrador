# Map Types Module

Defines and governs TypeScript domain contracts, types, and interfaces related to map exploration, lenses, and world routing.

## Local Contracts

- **Domain-Type-First**: All map lenses and route identifiers must be typed strictly via finite domain constants and union types.
- **Zero-Any Policy**: No `any` or untyped casts.
