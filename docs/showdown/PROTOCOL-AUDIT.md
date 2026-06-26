# Showdown Protocol — Audit de Cobertura del Bridge

**Fuentes:**

- `@pkmn/sim` (build local) — tipos extraídos del build compilado
- [`docs/SIM-PROTOCOL.md`](./SIM-PROTOCOL.md) — protocolo oficial completo

**Archivo auditado:** `src/logic/battle/showdownBridge.ts`  
**Última actualización:** 2026-06-24

---

## ✅ Actualmente manejados en `showdownBridge.ts`

| Tipo | Qué hace actualmente |
| --- | --- |
| `move` | Log de movimiento, lastMove, animación de ataque |
| `-prepare` | Movimiento de dos turnos (Vuelo, Excavar) |
| `-damage` | Actualiza HP + shake + log |
| `-heal` | Actualiza HP + log |
| `faint` | HP=0 + log "se debilitó" |
| `-status` | Aplica status (par/slp/brn/psn/tox/frz) |
| `-curestatus` | Limpia status |
| `-boost` | +stages, max 6 |
| `-setboost` | Set stages absoluto (Belly Drum) |
| `-unboost` | -stages |
| `-weather` | Cambia clima + log |
| `-start` | Confusión, lockedmove |
| `-end` | Limpia confusión, lockedmove |

---

## 🔴 P1 — Feedback esencial faltante (bloquea comprensión del jugador)

| Tipo | Cuándo ocurre | Mensaje sugerido |
| --- | --- | --- |
| **`-miss`** | Falla la precisión. `parts[2]`=SOURCE (atacante), `parts[3]`=TARGET (opcional) | `"¡El ataque de X falló!"` |
| **`-immune`** | El tipo no afecta (Eléctrico vs Tierra, Normal vs Fantasma). `parts[2]`=Pokémon afectado | `"¡No afecta a X!"` |
| **`-fail`** | El movimiento falla por mecánica propia (Recuperar al 100%, Protección repetida). `parts[2]`=Pokémon, `parts[3]`=razón opcional | `"¡El movimiento de X falló!"` |
| **`cant`** | No puede atacar. `parts[2]`=Pokémon, `parts[3]`=razón (`par`, `slp`, `attract`, `frz`, `Disable`, `recharge`...), `parts[4]`=movimiento que intentó usar | `"¡X no puede moverse!"` + hint de causa |
| **`-crit`** | Golpe crítico. `parts[2]`=Pokémon que recibió el crítico | `"¡Golpe crítico!"` |
| **`-supereffective`** | Súper efectivo. `parts[2]`=Pokémon afectado | `"¡Es súper efectivo!"` |
| **`-resisted`** | Poco efectivo. `parts[2]`=Pokémon afectado | `"No es muy efectivo..."` |
| **`-block`** | Un efecto bloqueó el movimiento (Protección, Absorbevoltio, etc.). `parts[2]`=target, `parts[3]`=efecto bloqueante | `"¡X bloqueó el ataque!"` |

---

## 🟡 P2 — Enriquecimiento de experiencia

| Tipo | Cuándo ocurre | Detalles de parseo / Mensaje |
| --- | --- | --- |
| **`-hitcount`** | Multihit (Pin Misil, Danza Pétalo). `parts[2]`=Pokémon, `parts[3]`=número de hits | `"¡Golpeó X veces!"` |
| **`-ohko`** | Derrota instantánea (Fisura, Guillotina). Sin `parts[2]` específico | `"¡Derrota instantánea!"` |
| **`-activate`** | Efecto miscélaneo sin mejor mensaje. `parts[2]`=Pokémon o efecto, `parts[3]`=descripción. Casos: Focus Sash, Substitute, Encina, Berries | Depende — ignorar desconocidos |
| **`-ability`** | Habilidad persistente anunciada al entrar (Mold Breaker). `parts[2]`=Pokémon, `parts[3]`=habilidad | `"¡Habilidad: X de Y!"` |
| **`-enditem`** | Objeto destruido/consumido. `parts[2]`=Pokémon, `parts[3]`=item. Si `[eat]` es baya consumida | `"¡X consumió su [item]!"` |
| **`-item`** | Objeto revelado (Air Balloon al entrar). `parts[2]`=Pokémon, `parts[3]`=item | `"¡X tiene [item]!"` |
| **`-sethp`** | HP seteado directo (Intercambio de Salud). `parts[2]`=Pokémon, `parts[3]`=`HP/maxHP` | Actualizar HP en store, sin log |
| **`-cureteam`** | Todo el equipo curado de estado (Campana Cura, Aromaterapia). `parts[2]`=Pokémon usuario | `"¡El equipo de X se curó de todos sus estados!"` |
| **`-mustrecharge`** | Debe recargar (Hiperrayo, Giga Impacto). `parts[2]`=Pokémon | `"¡X debe recargar!"` o silencio |
| **`-sidestart`** | Condición de lado iniciada. `parts[2]`=`p1`/`p2`, `parts[3]`=condición (Reflect, Light Screen, Stealth Rock, Spikes, Tailwind) | `"¡[condición] activada en el campo de [lado]!"` |
| **`-sideend`** | Condición de lado terminó. `parts[2]`=lado, `parts[3]`=condición | `"¡[condición] del [lado] terminó!"` |
| **`-fieldstart`** | Condición de campo iniciada. `parts[2]`=condición (Trick Room, Grassy/Electric/Psychic/Misty Terrain) | `"¡[condición] activada en el campo!"` |
| **`-fieldend`** | Condición de campo terminó. `parts[2]`=condición | `"¡[condición] terminó!"` |
| **`-formechange`** | Cambio de forma temporal (Castform, Deoxys). `parts[2]`=Pokémon, `parts[3]`=especie | `"¡X cambió de forma!"` |
| **`-transform`** | Transformación (Ditto). `parts[2]`=Pokémon, `parts[3]`=especie objetivo | `"¡X se transformó en Y!"` |

---

## 🟢 P3 — Mecánicas específicas / baja frecuencia

| Tipo | Cuándo ocurre | Notas |
| --- | --- | --- |
| **`-mega`** | Megaevolución. `parts[2]`=Pokémon, `parts[3]`=Mega Stone | Fuera de scope Gen 3 |
| **`detailschange`** / **`replace`** | Cambio permanente de detalles / Fin de Ilusión (Zoroark). Mismo formato que `switch` | Actualizar nombre en store |
| **`switch`** / **`drag`** | Cambio forzado por el sim (Torbellino, Rugido). `parts[2]`=Pokémon, `parts[3]`=DETAILS, `parts[4]`=HP STATUS | Puede colisionar con el sistema propio — evaluar |
| **`-swapboost`** | Intercambia stages (Guardia Intercambia). `parts[2]`=source, `parts[3]`=target, `parts[4]`=stats CSV | Requiere lógica de stages |
| **`-invertboost`** | Invierte stages (Revés). `parts[2]`=Pokémon | Requiere invertir todas las stages |
| **`-clearboost`** | Limpia stages de un Pokémon (Neblina). `parts[2]`=Pokémon | Setear todas las stages a 0 |
| **`-clearallboost`** | Limpia stages de todos. Sin args | Raro en Gen 3 |
| **`-copyboost`** | Copia stages (Sincronía Mental). `parts[2]`=source, `parts[3]`=target | Requiere copiar objeto stages |
| **`-singlemove`** | Efecto que dura el movimiento (Destinado, Vínculo). `parts[2]`=Pokémon, `parts[3]`=movimiento | Silencio OK |
| **`-singleturn`** | Efecto que dura el turno (Protección, Puño Certero, Roost). `parts[2]`=Pokémon, `parts[3]`=movimiento | Silencio OK |
| **`-endability`** | Habilidad suprimida (Ácido Gástrico). `parts[2]`=Pokémon | Silencio OK |

---

## ⚪ Ignorar conscientemente (infraestructura / fuera de scope)

| Tipo | Razón |
| --- | --- |
| `turn` | El turno lo gestiona la lógica propia del juego |
| `upkeep` | Mantención interna de condiciones del sim |
| `win` / `tie` | El juego usa `result.isOver` del worker |
| `swap` | Solo dobles — el proyecto es singles |
| `-hint` | Sugerencias internas del sim (Fake Out, Mat Block) |
| `-message` / `message` | Mensajes genéricos de mods y cláusulas |
| `-zpower`, `-zbroken`, `-terastallize`, `-primal`, `-burst`, `-candynamax`, `-center` | Mecánicas Gen 6+ — fuera del scope del proyecto |
| `start`, `player`, `gametype`, `gen`, `tier`, `teamsize`, `rated`, `showteam`, `clearpoke`, `teampreview`, `poke`, `rule` | Headers de inicialización — ya ignorados |
| `t:` | Timestamp |
| `bigerror`, `debug` | Solo dev |
| `-clearnegativeboost`, `-clearpositiveboost` | Limpieza por Z-moves — fuera de scope |
| `-combine`, `-waiting` | Movimientos de juramento (Fire Pledge) — fuera de scope |
| `-nothing` | Deprecated — reemplazado por `-activate` |
| `inactive`, `inactiveoff` | Timer de batalla — no aplicable |
| `request` | Solicitud de decisión — el worker lo maneja internamente |
| `-notarget` | Gen 1-4 solo, en Gen 5+ usa `-fail` |
| `-mustrecharge` | Puede ignorarse — el sim lo maneja internamente |

---

## Resumen de cobertura

| Categoría | Cantidad |
| --- | --- |
| Tipos totales en el protocolo oficial | ~65 |
| Tipos relevantes en partidas Singles típicas | ~35 |
| Actualmente manejados en el bridge | 13 |
| **P1 faltantes** (críticos — bloquean feedback) | **8** |
| **P2 faltantes** (enriquecimiento) | **15** |
| **P3 faltantes** (baja frecuencia / mecánicas especiales) | **11** |
| Ignorar conscientemente | ~27 |

> **Nota sobre `-sidestart`/`-sideend` y `-fieldstart`/`-fieldend`**: son importantes si el proyecto planea implementar Trampa Rocas, Reflejo, Pantalla de Luz, Sala Rara o Terrenos. Actualmente en scope bajo (Gen 3), pero conviene al menos loguearlos sin efectos de juego.
