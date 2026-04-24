---
name: add-pokemon
description: Guía paso a paso para agregar un Pokémon completamente nuevo al juego. Incluye stats, learnset Gen 3 desde PokeAPI, habilidades, evoluciones, compatibilidad de MTs y entrada en la Pokédex. Ejecutar el script `fetch_pokemon.js` para obtener los datos automáticamente.
---

# Skill: Agregar un Pokémon Nuevo al Juego

## Prerequisitos

- Tener Node.js disponible para ejecutar el script de fetch.
- Los validators de movimientos y habilidades ya deben existir en `.agents/skills/`.

---

## 🚨 REGLA DE ORO: INTEGRIDAD DE DATOS Y ESTÁNDARES

1. **Nombres de Objetos**: Usa siempre los nombres oficiales completos. Ejemplo: **"Subida de PP"** (NO "Subida PP").
2. **Deduplicación**: Nunca agregues un movimiento a `MOVE_DATA` que ya exista. El validador ahora detecta duplicados automáticamente.
3. **Sincronización de PP**: Al inicializar un movimiento para un Pokémon, `maxPP` debe ser igual a su `pp` base inicial.
4. **Formato de Imagen**: Todas las imágenes externas de PokeAPI **DEBEN** ser **PNG**.
5. **Cálculo de Tiers**: La clasificación (S+, S, A, etc.) es **DINÁMICA**. No la agregues a la DB; se calcula en la UI usando `src/logic/constants/tiers.js`.
6. **Estilo SASS**: Si creas estilos para el nuevo Pokémon, las directivas `@use` deben ser las **primeras líneas** del archivo. Usa capitalización para filtros (ej. `Filter: Blur(2px)`).
7. **CLI-First Verification**: Al terminar la implementación, **DEBES** usar los comandos de `window.__VITE_DEBUG__` vía subagente de navegador para verificar el Pokémon.

---

## Paso 0: Obtener todos los datos desde PokeAPI

Ejecutar el script de fetch pasando el nombre en inglés del Pokémon:

```bash
node .agents/skills/add-pokemon/scripts/fetch_pokemon.js houndour
```

Esto genera un archivo `_output/<pokemon>_code.txt` con todos los bloques listos para copiar.

---

## Paso 1: Agregar a `POKEMON_DB` en `src/data/pokemonDB.js`

### Formato exacto

```js
houndour: {
  name: 'Houndour', emoji: '🔥', type: 'fire',
  hp: 45, atk: 60, def: 30, spa: 80, spd: 50, spe: 65,
  learnset: [
    { lv: 1, name: 'Lanzamiento', pp: 35 },
    { lv: 1, name: 'Gruñido', pp: 40 },
    { lv: 7, name: 'Ascuas', pp: 25 },
    { lv: 13, name: 'Mordisco', pp: 25 },
    { lv: 19, name: 'Rugido', pp: 20 },
    { lv: 25, name: 'Colmillo Ígneo', pp: 15 },
    { lv: 31, name: 'Rastreo', pp: 30 },
    { lv: 37, name: 'Lanzallamas', pp: 15 },
    { lv: 43, name: 'Infierno', pp: 5 },
    { lv: 50, name: 'Llamarada', pp: 5 }
  ]
},
```

> Los movimientos del learnset DEBEN existir en `MOVE_DATA` (en `src/data/moves.js`). Si alguno falta, agrégalo primero.

---

## Paso 2: Agregar tipo secundario en `SECONDARY_TYPES` (`src/data/types.js`)

Si el Pokémon tiene dos tipos, agrega la entrada en el objeto `SECONDARY_TYPES`:

```js
houndour: 'dark',
```

---

## Paso 3: Agregar habilidades en `POKEMON_ABILITIES` (`src/data/abilities.js`)

### Formato

```js
houndour: ['Espíritu Vital', 'Madrugar'],
```

### Reglas

- Los nombres están en **español**, exactamente como en `ABILITY_DATA`.
- Si la habilidad es nueva, agrégala a `ABILITY_DATA` en el mismo archivo:

  ```js
  'Inicio Rápido': 'Duplica la Velocidad cuando el Pokémon tiene un estado alterado.',
  ```

- Si tiene efecto en batalla, impleméntala en `src/logic/battle/battleAbilities.js`.

---

## Paso 4: Agregar evolución en `src/data/evolutionData.js`

### Para evolución por nivel

Agregar en `EVOLUTION_TABLE`:

```js
houndour: { level: 24, to: 'houndoom' },
```

### Para evolución por piedra/intercambio

Usa `STONE_EVOLUTIONS` o `TRADE_EVOLUTIONS` según corresponda.

---

## Paso 5: Registro en la Pokédex (`src/logic/pokedexConstants.js`)

### 5a. Agregar en `POKEMON_SPRITE_IDS`

```js
houndour: 228,
```

Usa el **ID nacional** oficial.

### 5b. Agregar en `PDEX_ORDER`

Inserta la key en el array en la posición nacional correcta.

### 5c. Agregar compatibilidad de MTs en `TM_COMPAT`

Consulta la compatibilidad oficial de Gen 3 y agrega la lista de IDs (`TM01`, `TM02`, etc.).

---

## Paso 6: Validaciones Automáticas

Ejecuta los validadores para asegurar la integridad de los datos:

```bash
# Validar movimientos
node .agents/skills/pokemon-move-validator/scripts/validator.js

# Validar habilidades
node .agents/skills/pokemon-ability-validator/scripts/validator.js
```

---

## Paso 7: Agregar al mapa/encuentros (opcional)

Si el Pokémon debe aparecer salvaje, búscalo en `src/data/maps.js` y agrégalo a la ubicación correspondiente:

```bash
grep -rn "encounters\|wildPokemon" src/data/maps.js | head -10
```

---

## Paso 8: Verificación por Consola (CLI-First)

Una vez insertado el código, **abre el navegador** y usa el subagente para ejecutar estos comandos en la consola:

### 1. Inyectar y Verificar Detalle

```js
// Crea e inyecta el Pokémon en la caja inmediatamente
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', level: 50, isShiny: true });

// Abre el modal de detalle para verificar visualmente
window.__VITE_DEBUG__.inspectPokemon(0, 'box'); 
```

### 2. Probar Combate (Visualización y Stats)

```js
// Fuerza un encuentro salvaje para ver al Pokémon en escena de batalla
window.__VITE_DEBUG__.spawnEncounter({ id: 'houndour', level: 50 });
```

### 3. Verificar Persistencia

Refresca la página (`F5`) y verifica si el Pokémon sigue en la caja usando:

```js
window.__VITE_DEBUG__.navigate('pc');
```

---

## 🥚 Sistema de Huevos y Eclosión

La eclosión se gestiona a través del `HatchAnimationModal.vue` y sigue un ciclo de vida interactivo de 3 fases:

1. **Fase de Huevo (Egg Phase)**: El huevo aparece flotando. Requiere un **clic manual** para progresar.
2. **Fase de Ruptura (Crack Phase)**: Animación de vibración y partículas.
3. **Fase de Revelación (Reveal Phase)**: Se dispara el sonido `evolution_complete` y se aplica el lift de `-85px` al sprite.

### Comandos de Prueba para Huevos

```js
// Inyectar huevo silencioso al inventario
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch' });

// Lanzar animación de eclosión interactiva inmediatamente
window.__VITE_DEBUG__.createPokemon({ id: 'houndour', protocol: 'hatch_anim' });
```

---

## Checklist Final

- `[ ]` Entrada en `POKEMON_DB` con stats y learnset completo.
- `[ ]` Tipo secundario en `SECONDARY_TYPES` (`types.js`).
- `[ ]` Habilidades en `POKEMON_ABILITIES` (`abilities.js`).
- `[ ]` Evolución en `EVOLUTION_TABLE` u otros.
- `[ ]` Número sprite y orden en `pokedexConstants.js`.
- `[ ]` Compatibilidad de MTs verificada contra Gen 3.
- `[ ]` Todos los movimientos existen en `MOVE_DATA`.
- `[ ]` Validadores automáticos pasados sin errores.
- `[ ]` **CLI-First**: Verificado mediante consola (`createPokemon`, `inspectPokemon`).
- `[ ]` **Persistencia**: El Pokémon sobrevive a un refresco de página (F5).

---

## Referencias

- **PokeAPI:** `https://pokeapi.co/api/v2/pokemon/<id_o_nombre>`
- **Learnset Gen 3:** `firered-leafgreen` en version_group_details.
- **TM Compat Gen 3:** Bulbapedia o PokeAPI (move_learn_method: machine).
