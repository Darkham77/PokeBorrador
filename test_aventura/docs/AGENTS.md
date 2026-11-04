# Purpose

Design documentation, architecture proposals, and exploratory research for adventure mechanics, route structures, and game mechanics in the `test_aventura` suite.

## Ownership

Game Mechanics / Adventure Prototyping Documentation.

## Local Contracts

- **Language Exemption**: Documents in this directory are exploratory design specifications and proposals maintained in their original authored language (`es`) and are explicitly exempted from English-first file documentation checks via `documentation.languageExemptions` in `.auditor/audit.config.ts`.
- **Reference Integrity**: Markdown links to code symbols or architectural concepts must reflect current sandbox structure.

## Key Files

- [`AUTOTILE_HEALING_BRUSH_DESIGN.md`](./AUTOTILE_HEALING_BRUSH_DESIGN.md): Technical specification and mathematical domain model for the autotile healing brush tool.
- [`DESIGN_DOC.md`](./DESIGN_DOC.md): Architectural design document for Kanto adventure gameplay loop and engine integration.
- [`FARMING_ROUTES_DESIGN_DOC.md`](./FARMING_ROUTES_DESIGN_DOC.md): Farming routes layout, resource distribution, and economy design.
- [`Propuesta_de_Diseño__Integración_de_Bicicleta_y_MO.docx`](./Propuesta_de_Diseño__Integración_de_Bicicleta_y_MO.docx): Design proposal for bicycle and HM (Hidden Machine) mechanics integration.

## Work Guidance

- Consult design documentation when implementing or refactoring adventure mechanics and exploration routes.

## Verification

- `npm run auditor:documentation-language`
- `npm run auditor:md`

## Child DOX Index

- _This directory contains specialized domain logic and files with no subdirectories._
