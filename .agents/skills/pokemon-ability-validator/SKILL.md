---
name: pokemon-ability-validator
description: Valida la base de datos de habilidades Pokémon del juego comparándola contra PokeAPI y verifica que las mecánicas en batalla sean correctas según la Generación 3.
---

# Pokémon Ability Validator Skill

## Descripción
Esta skill valida que todas las habilidades implementadas en el juego correspondan con las mecánicas oficiales de PokeAPI (Generación 3). Detecta discrepancias en descripciones y comportamiento en batalla.

## Archivos del Skill
- **`validator.js`** — Script Node.js que consulta PokeAPI y compara contra los datos del juego.
- **`pokeapi_ability_cache.json`** — Caché local de las habilidades de PokeAPI (se genera automáticamente).

## Cómo Ejecutar

Desde la raíz del proyecto:

```bash
node .agents/skills/pokemon-ability-validator/validator.js
```

El validador:
1. Busca las habilidades asignadas a Pokémon en `js/04_state.js`
2. Busca las descripciones en `js/02_pokemon_data.js`
3. Descarga (o carga desde caché) todas las habilidades de PokeAPI
4. Mapea los nombres en Español a los identificadores ingleses de PokeAPI
5. Imprime una tabla comparativa con las diferencias

## Fuentes de Datos del Juego
- **`js/02_pokemon_data.js`** → `ABILITY_DATA` — Descripciones en español de cada habilidad
- **`js/04_state.js`** → `ABILITIES` — Mapeo de Pokémon a sus habilidades
- **`js/07_battle.js`** → Lógica de combate donde se ejecutan las habilidades

## Checklist de Auditoría

### Habilidades Verificadas ✅ (correctas)
| Habilidad        | PokeAPI          | Estado |
|-----------------|-----------------|--------|
| Espesura        | overgrow        | ✅ OK  |
| Hedor           | stench          | ✅ OK  |
| Caparazón       | shell-armor     | ✅ OK  |
| Levitación      | levitate        | ✅ OK  |
| Cabeza Roca     | rock-head       | ✅ OK  |
| Insomnio        | insomnia        | ✅ OK  |
| Corte Fuerte    | hyper-cutter    | ✅ OK  |
| Insonorizar     | soundproof      | ✅ OK  |
| Madrugar        | early-bird      | ✅ OK  |
| Nado Rápido     | swift-swim      | ✅ OK  |
| Cuerpo Llama    | flame-body      | ✅ OK  |
| Adaptable       | adaptability    | ✅ OK  |
| Inmunidad       | immunity        | ✅ OK  |
| Presión         | pressure        | ✅ OK  |
| Foco Interno    | inner-focus     | ✅ OK  |

### Habilidades Corregidas 🔧
| Habilidad        | Problema                                              | Corrección                         |
|-----------------|------------------------------------------------------|------------------------------------|
| Cura Natural    | Curaba al final del turno (comportamiento incorrecto) | Ahora cura al retirar/fin combate  |
| Punto Cura      | Unificado incorrectamente con Cura Natural            | Ahora aplica 30% de probabilidad   |

### Habilidades Sin Mapeo Automático ⚠️
Las siguientes habilidades del juego son customizadas o no tienen traducción directa en PokeAPI:
- `Escurridizo`, `Ráfaga`, `Absorbe Voltio`, `Calco`

## Mecánicas Oficiales Gen 3 Clave

### Cura Natural (natural-cure)
> **Oficial:** "Cures any major status ailment upon switching out."

- ✅ **Correcto:** Se cura al **retirar** el Pokémon del combate o al **finalizar** el combate.
- ❌ **Incorrecto (antes):** Se curaba al final de cada turno.

### Mudar / Punto Cura (shed-skin / natural-cure variant)
> **Oficial:** "Has a 30% chance of curing any major status ailment each turn."

- ✅ **Correcto:** 30% de probabilidad por turno de curar el estado.
