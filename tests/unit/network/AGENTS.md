# Purpose

Unit tests for networking protocols, WebSocket bridges, and realtime messaging adapters.

## Ownership

Frontend Developers / Network Engineers.

## Local Contracts

- **Network Boundary Validation**: Tests in this directory verify incoming and outgoing network payloads against strict schemas (Valibot).
- **Zero Mock Overuse**: Network payload testing verifies real schema serialization and parsing without mocking data contracts.

## Work Guidance

- Test valid payloads, invalid action discriminators, and missing fields.

## Verification

- Run `npm run test:unit tests/unit/network/`
