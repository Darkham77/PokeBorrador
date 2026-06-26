# Inventario de Tipos de Log de Showdown

Fuente: `@pkmn/sim` build — todos los tipos extraídos directamente del simulador.

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

## 🔴 Faltantes — Feedback visible al jugador (DEBEN implementarse)

| Tipo | Cuándo ocurre | Mensaje sugerido |
| --- | --- | --- |
| **`-miss`** | Falla la precisión (Vendaval, Trueno sin lluvia, etc.) | `"¡El ataque de X falló!"` |
| **`-immune`** | El tipo no afecta (ej. Eléctrico vs Tierra) | `"¡No afecta a X!"` |
| **`-fail`** | El movimiento falla por otra razón (Recuperar al 100%, Protección repetida, etc.) | `"¡El movimiento de X falló!"` |
| **`cant`** | El Pokémon no puede atacar (paralizado, dormido, atraído, etc.) | `"¡X no puede moverse!"` / `"¡X está paralizado!"` |
| **`-crit`** | Golpe crítico | `"¡Golpe crítico!"` |
| **`-supereffective`** | Súper efectivo | `"¡Es súper efectivo!"` |
| **`-resisted`** | Poco efectivo | `"No es muy efectivo..."` |
| **`-ohko`** | Movimiento de derrota instantánea (Fisura, etc.) | `"¡Derrota instantánea!"` |
| **`-hitcount`** | Movimiento multihit (Pin Misil, etc.) | `"¡El movimiento golpeó X veces!"` |
| **`-activate`** | Activación de habilidad/efecto especial (Foco, Encina, etc.) | Depende del efecto |
| **`-ability`** | Habilidad que se activa visualmente (Espesura, Motor Descarga, etc.) | `"¡Habilidad: X de Y!"` |
| **`-formechange`** | Cambio de forma (Castform, Deoxys, etc.) | `"¡X cambió de forma!"` |
| **`-transform`** | Transformación (Ditto, Metamon) | `"¡X se transformó en Y!"` |
| **`switch`** / **`drag`** | Cambio de Pokémon por el sim (arrastre, Torbellino, etc.) | Depende — puede interferir con el sistema propio de switch |
| **`-enditem`** | Se consumió un objeto (Baya, Focus Sash) | `"¡X consumió [objeto]!"` |
| **`-mega`** | Megaevolución | `"¡X megaevolucionó!"` |
| **`detailschange`** | Cambio de detalles permanente (ej. Zygarde) | `"¡X cambió!"` |

---

## 🟡 Faltantes — Silencio aceptable (infraestructura)

| Tipo | Por qué ignorar es OK |
| --- | --- |
| `turn` | El turno ya lo gestiona la lógica propia |
| `upkeep` | Mantención interna de condiciones (el jugador no necesita verlo) |
| `win` / `tie` | El juego usa `result.isOver` del worker, no este log |
| `swap` | Swap de posición (solo dobles) — proyecto es singles |
| `-hint` | Sugerencia interna del sim (ej. "algunos efectos pueden forzar repetir...") |
| `-message` / `message` | Mensajes genéricos del sim, a veces ya cubiertos por otros events |
| `-zpower` / `-zbroken` / `-terastallize` / `-mega` / `-primal` / `-burst` / `-candynamax` / `-center` | Mecánicas de otras generaciones (Gen 6+) — fuera del scope del proyecto |
| `start` | Inicio del combate (infraestructura) |
| `player` / `gametype` / `gen` / `tier` / `teamsize` / `rated` / `showteam` / `clearpoke` | Headers de inicialización — ya ignorados correctamente |
| `t:` | Timestamp — ignorar |
| `bigerror` / `debug` | Solo dev |
| `-clearnegativeboost` / `-clearpositiveboost` | Limpieza de stats por Z-moves (fuera del scope) |

---

## 📋 Prioridad de implementación sugerida

| Prioridad | Tipos | Razón |
| --- | --- | --- |
| **P1 — Ahora** | `-miss`, `-immune`, `-fail`, `cant`, `-crit`, `-supereffective`, `-resisted` | Feedback esencial de combate que el jugador espera ver en cada batalla |
| **P2 — Próximo** | `-hitcount`, `-activate`, `-ability`, `-ohko`, `-enditem` | Enriquecen la experiencia pero no bloquean la comprensión del combate |
| **P3 — Luego** | `-formechange`, `-transform`, `-mega`, `detailschange` | Mecánicas específicas de Pokémon concretos |
| **Ignorar** | Todo lo demás | Infraestructura o fuera del scope del proyecto |
