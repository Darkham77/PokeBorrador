# Purpose

Design documentation, architecture proposals, and exploratory research for adventure mechanics, route structures, and game mechanics in the `test_aventura` suite.

## Ownership

Game Mechanics / Adventure Prototyping Documentation.

## Local Contracts

- **Language Exemption**: Documents in this directory are exploratory design specifications and proposals maintained in their original authored language (`es`) and are explicitly exempted from English-first file documentation checks via `documentation.languageExemptions` in `.auditor/audit.config.ts`.
- **Reference Integrity**: Markdown links to code symbols or architectural concepts must reflect current sandbox structure.

## Key Files

- [`DESIGN_DOC.md`](./DESIGN_DOC.md): Architectural design document for Kanto adventure gameplay loop and engine integration.
- [`FARMING_ROUTES_DESIGN_DOC.md`](./FARMING_ROUTES_DESIGN_DOC.md): Farming routes layout, resource distribution, and economy design.
- [`Propuesta_de_Diseño__Integración_de_Bicicleta_y_MO.docx`](./Propuesta_de_Diseño__Integración_de_Bicicleta_y_MO.docx): Design proposal for bicycle and HM (Hidden Machine) mechanics integration.

## Verification

- `npm run auditor:documentation-language`
- `npm run auditor:md`
