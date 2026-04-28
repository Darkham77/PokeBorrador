---
name: add-pokemon
description: Orquestador para agregar nuevos Pokémon al sistema. Utiliza los scripts de fetch y delega todas las reglas de integridad y formato al manual `@/project-standards/references/content_creation_manual.md`.
---

# Skill: Agregar Pokémon (Orquestador)

> [!IMPORTANT]
> Esta skill es un orquestador de pasos. Antes de realizar cualquier cambio en los archivos de datos, **DEBES** leer y seguir estrictamente el [Manual de Creación de Contenido](../project-standards/references/content_creation_manual.md).

## Flujo de Trabajo Estándar

### 1. Obtención de Datos Automática

Utiliza el script de fetch para generar los bloques de código base:

```bash
node .agents/skills/add-pokemon/scripts/fetch_pokemon.js <nombre_en_ingles>
```

### 2. Integración de Código

Sigue el orden de integración definido en el manual de estándares:

1. `POKEMON_DB` (`pokemonDB.js`)
2. Tipos Secundarios (`types.js`)
3. Habilidades (`abilities.js`)
4. Evoluciones (`evolutionData.js`)
5. Pokédex y MTs (`pokedexConstants.js`)

### 3. Validación y Verificación

1. **Validadores**: Ejecuta los validadores de movimientos y habilidades detallados en el [Manual de Validación](../project-standards/references/validation_manual.md).
2. **CLI-First**: Verifica el nuevo Pokémon en el navegador usando los comandos de `window.__VITE_DEBUG__` especificados en el [Manual de Testing](../project-standards/references/browser_testing_manual.md).

---

## Referencias de Implementación

- **PokeAPI**: `https://pokeapi.co/`
- **Estándares del Proyecto**: [project-standards](../project-standards/SKILL.md)
