# Plan de Implementación: Habilidades de Equipo en Aventura (Builds de Farmeo ARPG)

## 1. Contexto y Propósito

Este documento establece la arquitectura y reglas para el sistema de **Habilidades de Aventura del Equipo**, transformando la composición de los 6 Pokémon del jugador en una "build" de farmeo estratégico estilo ARPG (inspirado en la optimización de personajes y afijos de *Diablo*).

El objetivo es darle una utilidad viva y emocionante fuera del combate a las habilidades clásicas de la franquicia, incentivando al entrenador a estructurar equipos de expedición diversos y especializados según el tipo de recurso que desea conseguir (minerales, bayas, dinero, botín o crianza).

### Principios Fundamentales

* **Diversificación Obligatoria (Cero Duplicados)**: Cada habilidad pasiva se aplica **una única vez**. Tener varios Pokémon con la misma habilidad (ej. dos Meowth con Recogida) no duplica el efecto; el sistema toma automáticamente el Pokémon de mayor nivel. Esto impide crear equipos absurdos de 6 Meowth y premia la variedad de los 6 miembros.
* **Supervivencia y Salud (HP > 0)**: Solo los Pokémon conscientes aportan su bonificación. Si un Pokémon cae debilitado en la hierba o ante un entrenador, su pasiva se apaga inmediatamente hasta que sea curado en un Centro Pokémon.
* **Botín Progresivo Escalado por Nivel**: Habilidades como *Recogida* recompensan subir de nivel a tu equipo de farmeo, pasando de simples pociones a nivel bajo a Caramelos Raros, Restos y Piedras Evolutivas a nivel 80-100.
* **Transparencia Total (HUD de Manifiesto)**: La interfaz muestra con claridad matemática el desglose de buffs activos antes de emprender cualquier viaje o combate en ruta.

---

## 2. Reglas del Sistema y Agregación de Pasivas

```text
[Equipo de 6 Pokémon en gameStore.state.team]
                   │
                   ▼
       [Filtro de Consciencia]
  ¿HP > 0? ──► SÍ ──► Pasa a evaluación
           └── NO ──► Habilidad inactiva (0% bono)
                   │
                   ▼
      [Filtro Anti-Duplicados]
  ¿Misma habilidad repetida? ──► Conservar solo el ejemplar de mayor nivel
                   │
                   ▼
     [Cálculo de Multiplicadores Totales]
  (Terreno de Ruta) + (Pasivas Únicas del Equipo) = Multiplicador Final de Aventura
```

---

## 3. Catálogo Canónico de Habilidades de Aventura

| Icono | Habilidad (Showdown ID) | Ejemplos de Pokémon | Efecto de Aventura en el Mapa |
| :--- | :--- | :--- | :--- |
| 🐱 | `pickup` (Recogida) | Meowth, Aipom, Teddiursa, Phanpy | 15% de probabilidad tras cada combate o tramo de encontrar un objeto del suelo. Escala por nivel del Pokémon. |
| 🦁 | `intimidate` (Intimidación) | Gyarados, Arcanine, Ekans, Tauros | +30% de probabilidad de encuentros con Entrenadores en ruta (+P¥ y EXP). |
| 👁️ | `compoundeyes` (Ojo Compuesto) | Butterfree, Venonat | +50% de probabilidad de que los Pokémon salvajes lleven objetos raros equipados al capturarlos. |
| 🔥 | `flamebody` / `magmaarmor` (Cuerpo Llama / Escudo Magma) | Magmar, Slugma, Magcargo | +50% de velocidad de eclosión de huevos en la mochila (-50% pasos requeridos). No acumulables entre sí. |
| 🐝 | `honeygather` (Recogemiel) | Combee, Teddiursa | Genera Miel silvestre garantizada al cruzar rutas con vegetación o hierba alta. |
| 🌀 | `synchronize` (Sincronía) | Abra, Kadabra, Alakazam, Natu | 50% de probabilidad de que los Pokémon salvajes compartan la Naturaleza del Pokémon portador. |
| 🎣 | `suctioncups` / `stickyhold` (Ventosas / Viscosidad) | Octillery, Muk, Gulpin | +40% de velocidad de picada y menor tiempo de espera en zonas de pesca. |
| 🧲 | `magnetpull` (Imán) | Magnemite, Magneton | Duplica la probabilidad de encontrar Pokémon de tipo Acero/Eléctrico y minerales en cavernas. |
| 💨 | `runaway` (Fuga) | Rattata, Eevee, Ponyta | 100% de éxito garantizado al huir de cualquier combate contra Pokémon salvajes ordinarios. |

---

## 4. Matriz de Botín de Recogida (`pickupLootTable.ts`)

La habilidad **Recogida** premia el entrenamiento de tus compañeros. Cuando se activa, consulta la tabla correspondiente según el nivel del Pokémon portador:

* **Nivel 1 – 20**: Poción, Antídoto, Antiparálisis, Pokébola, Baya Zreza, Baya Meloc.
* **Nivel 21 – 40**: Superpoción, Superball, Cuerda Huida, Repelente, Piedra Fuego / Agua / Hoja (rara).
* **Nivel 41 – 60**: Hiperpoción, Ultraball, Pepita, Piedra Lunar, Piedra Trueno, Más PP.
* **Nivel 61 – 80**: Máxima Poción, Revivir Máximo, Trozo Estrella, Más PS, Calcio, Caramelo Raro (raro).
* **Nivel 81 – 100**: Caramelo Raro, Restos (*Leftovers*), Chapa Plateada, Roca del Rey, Piedra Día / Noche, Máxima Pepita.

---

## 5. Interfaz de Usuario y Manifiesto de Aventura

Antes de viajar por una ruta o al estar estacionado en ella, el jugador dispone del **Manifiesto de Expedición**:

```text
┌─────────────────────────────────────────────────────────────┐
│                 SINERGIAS DE EXPEDICIÓN                     │
├─────────────────────────────────────────────────────────────┤
│  🌿 Ruta 1 (Vegetación):         +30% Bayas Silvestres      │
│  🐱 Meowth (Nv. 75 - Recogida):   +15% Botín Tier Alto      │
│  🦁 Gyarados (Intimidación):      +30% Entrenadores         │
│  🔥 Magmar (Cuerpo Llama):        +50% Eclosión de Huevos   │
│  ⚠️ Meowth Nv. 20 (Recogida):     [Duplicado - Inactivo]    │
├─────────────────────────────────────────────────────────────┤
│  RESUMEN: Botín x1.15 | Dinero x1.30 | Eclosión x1.50       │
└─────────────────────────────────────────────────────────────┘
```

### Notificaciones en Tiempo Real (Toasts y Logs)

Cuando una habilidad pasiva genera una recompensa o evento:

* Se reproduce un sutil tintineo de objeto retro.
* Aparece un Toast informativo:  
  * *"✨ ¡Meowth recogió un Caramelo Raro del suelo con Recogida!"*
  * *"🐝 ¡Combee recolectó un frasco de Miel fresca!"*

---

## 6. Arquitectura Técnica y Módulos

```text
src/
├── types/adventure/
│   └── adventurePassives.ts       # Definición de TeamPassiveEffect y TeamModifiers
├── data/adventure/
│   └── pickupLootTable.ts         # Matriz de 10 tiers de botín por nivel
├── logic/adventure/
│   └── teamPassiveCalculator.ts   # Función pura: analiza gameStore.state.team, aplica anti-duplicados y retorna multiplicadores
├── components/adventure/
│   └── TeamAdventureBuffsHUD.vue  # Widget visual del manifiesto de expedición
└── stores/
    └── mapActions.ts              # Invocación de tirada de Recogida y cálculo de encuentros
```

### 6.1 Algoritmo Anti-Duplicados y Consciencia

```typescript
export function calculateTeamAdventurePassives(team: Pokemon[]): ActivePassivesSummary {
  const activeAbilities = new Map<string, Pokemon>();

  for (const pokemon of team) {
    if (!pokemon || pokemon.hp <= 0 || !pokemon.ability) continue;
    
    const current = activeAbilities.get(pokemon.ability);
    if (!current || pokemon.level > current.level) {
      activeAbilities.set(pokemon.ability, pokemon);
    }
  }

  // Genera multiplicadores finales basados exclusivamente en habilidades únicas
  return buildModifiersFromUniqueAbilities(activeAbilities);
}
```

---

## 7. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-PAS-01** | Acumulación | Cero acumulación de duplicados (habilidades únicas). | Permitir acumular 6 Meowth con Recogida. | Obliga a diversificar los 6 miembros del equipo, creando builds de farmeo balanceadas e interesantes. |
| **ADR-PAS-02** | Consciencia | Solo Pokémon conscientes (HP > 0) aportan su pasiva. | Pasivas activas incluso con 0 PS. | Hace que el combate y el peligro en ruta importen; perder un Pokémon tiene consecuencias en el farmeo. |
| **ADR-PAS-03** | Escalado de Botín | Botín de Recogida escalado por nivel del Pokémon (1-100). | Tabla de botín fija o independiente del nivel. | Premia subir de nivel y cuidar a los Pokémon de soporte, aportando progreso RPG genuino. |
| **ADR-PAS-04** | Transparencia UI | Manifiesto de expedición visible antes de viajar. | Ocultar las matemáticas y buffs como sorpresas invisibles. | Da control táctico al jugador (estilo ARPG) para armar su equipo según la ruta elegida. |
