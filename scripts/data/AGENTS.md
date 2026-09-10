# scripts/data/

Data generation and database synchronization utility scripts.

## Ownership

Tooling & Data Architecture.

## Local Contracts

- Strict compliance with Node.js 26+ native execution standards.
- Scripts must safely read source metadata and generate deterministic JSON/TS database files.
- Zero runtime fallbacks; all data must be validated at build/generation time.
- **Canonical Learnset & CompatMoves Partition Protocol (`generate_pokemon_db.ts`)**: Learnset generators must partition active standard level-up moves into `learnset` using `minLevel` across generations, and partition past-generation/legacy moves (`isNonstandard === 'Past'`) alongside TM/Tutor/Egg/Special moves into `compatMoves`. This ensures 100% legal coverage across all 9 generations and 939 canonical moves without inflating level 1-2 wild spawn pools.
