# ⚔️ Sistema PvP (Player vs Player)

El sistema PvP de Poké Vicio permite combates en tiempo real entre entrenadores, utilizando una arquitectura de turnos simultáneos sincronizada a través de Supabase.

---

## 🔄 Protocolo de Turnos Simultáneos

A diferencia del modo historia, en PvP ambos jugadores eligen su acción al mismo tiempo. El motor resuelve las acciones siguiendo estas fases:

### 1. Fase de Elección (`choosing`)

Ambos jugadores seleccionan un movimiento o un cambio de Pokémon. La elección se envía de forma encriptada/privada hasta que ambos han confirmado.

### 2. Fase de Resolución (`resolving`)

El **Host** (jugador que inició o fue asignado como servidor) calcula el resultado del turno basándose en:

- **Prioridad de Movimiento**: Los movimientos con mayor prioridad (ej. Ataque Rápido) actúan primero.
- **Velocidad (Speed)**: Si la prioridad es igual, el Pokémon más rápido actúa primero.
- **Cambio de Pokémon**: Los cambios siempre ocurren antes que cualquier movimiento, a menos que el movimiento tenga una prioridad extremadamente alta.

### 3. Fase de Animación (`animating`)

Ambos clientes reciben el resultado y ejecutan las animaciones de forma sincronizada.

---

## 🏆 Modos de Juego

### PvP Amistoso

- Acceso directo a través de la lista de amigos o chat global.
- No afecta al ELO ni otorga recompensas competitivas.
- Ideal para pruebas de equipo y práctica.

### PvP Clasificatorio (Ranked)

- Utiliza un sistema de **ELO Rating** para el emparejamiento.
- Otorga **Battle Coins** y puntos de temporada.
- Desbloquea recompensas exclusivas en el _Ranked Track_.

---

## 📡 Sincronización Realtime

El juego utiliza los canales de **Supabase Realtime** para:

- Enviar invitaciones de combate.
- Sincronizar las elecciones de los jugadores (`broadcast`).
- Mantener la integridad de los HP y estados alterados entre ambos clientes.

---

## 📖 Referencias de Código

- Motor de resolución PvP: [pvpEngine.ts](../../src/logic/pvp/pvpEngine.ts)
- Store de batalla Live: [livePvP.ts](../../src/stores/livePvP.ts)
- Validación de Ranked: [rankedEngine.ts](../../src/logic/pvp/rankedEngine.ts)
