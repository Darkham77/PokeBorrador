# Purpose

Tactical and informational overlay layers for map location cards in Poké Vicio (such as faction war and dominance layers).

## Ownership

Frontend UI / Map Feature Engineers.

## Local Contracts

- All emoji glyphs in templates MUST be wrapped in approved icon/emoji containers (`<span class="emoji-inline">`).
- Animations and state transitions MUST use GSAP exclusively, with zero manual CSS `@keyframes` or `transition:` rules.
- Fully typed component props and emits adhering to domain types (`MapLocation`, `DominanceInfo`).

## Work Guidance

- Components here render modular tactical layers conditionally triggered by the active Map Lens (`adventure`, `war`).
- Decouple faction dominance metrics and guardian defeat indicators cleanly from core card presentation.

## Verification

- Run `npm run lint` and `npm run audit:warnings-diff` to verify zero type, styling, and typography violations.

## Reference Manuals

- [src/components/map/AGENTS.md](../AGENTS.md): Main map components architecture and guidelines.
