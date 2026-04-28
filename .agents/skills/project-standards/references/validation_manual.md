# Manual de Validación y Calidad (Poké Vicio)

Este manual centraliza todos los protocolos de validación automática para asegurar que el código y los datos cumplan con los estándares de rigor técnico del proyecto.

## ⚔️ Validación de Batalla y Datos Pokémon

### 1. Movimientos (`MOVE_DATA`)

Todo cambio en `src/data/moves.js` o en la lógica de combate debe ser validado:

- **Estructura**: `node .agents/skills/pokemon-move-validator/scripts/validator.js` (detecta duplicados y errores semánticos).
- **Sincronización PokeAPI**: `node .agents/skills/pokemon-move-validator/scripts/pokeapi_sync.js` (verifica categorías y efectos contra el estándar oficial).
- **Integridad del Motor**: `node .agents/skills/pokemon-move-validator/scripts/check_battle_integrity.js` (asegura que cada `effect` tenga implementación en `battleMoves.js`).

### 2. Habilidades (`ABILITY_DATA`)

- **Validación General**: `node .agents/skills/pokemon-ability-validator/scripts/validator.js`.
- Verifica descripciones en español y existencia de lógica en `battleAbilities.js`.

---

## 🛠️ Auditoría de Estándares (Scripts Locales)

El proyecto cuenta con scripts de auditoría personalizados en `.agents/skills/project-standards/scripts/audit/`:

- **Detección de Redundancia CSS**: `python3 detect_css_redundancy.py`. Verifica selectores duplicados o anidamientos innecesarios.
- **Detección de Patrones Híbridos**: `detect_hybrid_patterns.py`. Identifica accesos directos al DOM o falta de pixelación.
- **Auditoría Global**: `python3 .agents/skills/project-standards/scripts/audit_project.py`. Ejecuta todos los checks de SASS, GPU y longitud de archivos.

---

## 🚨 Reglas de Calidad Innegociables

1. **Zero-Warning**: `npm run lint` y `npx vue-tsc --noEmit` DEBEN devolver 0 errores y 0 advertencias antes de cualquier commit.
2. **Capitalización SASS**: Todo filtro CSS (`Blur()`, `Scale()`) debe estar capitalizado para evitar colisiones con Dart Sass 2.0.
3. **Escudo de Dependencias**: Cualquier script que use librerías externas (ej. `Pillow`) debe manejar el `ImportError` y dar instrucciones de instalación claras.
4. **Bypass de Auditoría**: Si una violación es intencional por diseño, usa el comentario `// [PureVue-Ignore]` en la línea afectada.
5. **Integridad de Datos Largos**: Archivos de datos masivos (ej. spawn grids) deben llevar `// [PureVue-Ignore-Length]` al inicio para evitar fragmentación por agentes.
