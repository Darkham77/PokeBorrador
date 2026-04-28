# Manual de Creación de Contenido (Poké Vicio)

Este manual detalla los protocolos para agregar nuevos Pokémon, movimientos, habilidades y otros elementos de juego, asegurando la integridad de los datos y la coherencia con el motor de Poké Vicio.

## 🚨 REGLA DE ORO: INTEGRIDAD DE DATOS Y ESTÁNDARES

1. **Nombres de Objetos**: Usa siempre los nombres oficiales completos. Ejemplo: **"Subida de PP"** (NO "Subida PP").
2. **Deduplicación**: Nunca agregues un elemento (movimiento, habilidad, ítem) que ya exista. Usa los validadores antes de proceder.
3. **Sincronización de PP**: Al inicializar un movimiento para un Pokémon, `maxPP` debe ser igual a su `pp` base inicial.
4. **Formato de Imagen**: Todas las imágenes externas de PokeAPI **DEBEN** ser **PNG**.
5. **Cálculo de Tiers**: La clasificación (S+, S, A, etc.) es **DINÁMICA**. No la agregues a la DB; se calcula en la UI usando `src/logic/constants/tiers.js`.
6. **Estilo SASS**: Si creas estilos para el nuevo contenido, las directivas `@use` deben ser las **primeras líneas** del archivo. Usa capitalización para filtros (ej. `Filter: Blur(2px)`).
7. **CLI-First Verification**: Al terminar la implementación, **DEBES** usar los comandos de `window.__VITE_DEBUG__` para verificar el contenido.

---

## 🐲 Agregar un Pokémon Nuevo

### Paso 0: Obtener datos desde PokeAPI

Ejecuta el script de fetch (ubicado en `.agents/skills/add-pokemon/scripts/fetch_pokemon.js`) pasando el nombre en inglés:

```bash
node .agents/skills/add-pokemon/scripts/fetch_pokemon.js <nombre>
```

Esto genera un archivo `_output/<pokemon>_code.txt` con los bloques listos para copiar.

### Paso 1: POKEMON_DB (`src/data/pokemonDB.js`)

Asegúrate de que el learnset incluya solo movimientos que existan en `MOVE_DATA`.

### Paso 2: Tipos y Habilidades

- **Tipos**: Agrega tipos secundarios en `src/data/types.js` -> `SECONDARY_TYPES`.
- **Habilidades**: Agrega en `src/data/abilities.js` -> `POKEMON_ABILITIES`. Si la habilidad es nueva, impleméntala en `src/logic/battle/battleAbilities.js`.

### Paso 3: Evoluciones (`src/data/evolutionData.js`)

Registra en `EVOLUTION_TABLE`, `STONE_EVOLUTIONS` o `TRADE_EVOLUTIONS`.

### Paso 4: Pokédex (`src/logic/pokedexConstants.js`)

- Registra el **ID Nacional** en `POKEMON_SPRITE_IDS`.
- Inserta en el array `PDEX_ORDER`.
- Agrega compatibilidad de MTs en `TM_COMPAT` (según Gen 3).

---

## 🥚 Sistema de Huevos y Eclosión

La eclosión sigue un ciclo de vida interactivo de 3 fases gerenciado por `HatchAnimationModal.vue`:

1. **Fase de Huevo**: Requiere **clic manual** para progresar.
2. **Fase de Ruptura**: Vibración y partículas.
3. **Fase de Revelación**: Sonido `evolution_complete` y lift de `-85px` al sprite.

### Comandos de Prueba

```js
// Protocolo silencioso
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch' });
// Protocolo con animación interactiva
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch_anim' });
```

---

## ✅ Checklist de Verificación Final

- [ ] Entrada en `POKEMON_DB` con stats y learnset Gen 3.
- [ ] Tipo secundario y Habilidades registradas.
- [ ] Evolución y Pokédex IDs configurados.
- [ ] Compatibilidad de MTs verificada.
- [ ] **Validadores Pasados**: Ejecutar los scripts de validación de movimientos y habilidades.
- [ ] **Persistencia**: Verificado que el Pokémon sobrevive a un `F5`.
