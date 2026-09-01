# src/stores/auth/

Authentication state verification, session retry strategies, and profile metadata enrichment.

## Ownership

State Architects / Security Engineers.

## Local Contracts

- `authSessionVerifier.ts`: Online session verification with cold-start retry strategies, session ID persistence, and profile enrichment.

## Verification

- Run `npm run test` and `npm run audit`.
