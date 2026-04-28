# Manual de Persistencia y DBRouter (Poké Vicio)

Este manual documenta la arquitectura de persistencia híbrida que permite el juego Online (Supabase) y Offline (SQLite WASM) con total aislamiento.

## 🧱 Arquitectura DBRouter

### 1. Aislamiento Estricto

El sistema **NUNCA** escribe en ambas bases de datos simultáneamente. El modo se determina al inicio de la sesión (`online` o `offline`).

### 2. Lógica "Last-In-Wins"

Para el modo Online, se utiliza un `current_session_id`. Si se detecta un cambio en este ID desde otro cliente, la sesión actual entra en conflicto y se bloquea para evitar corrupción de datos por escrituras concurrentes.

---

## ⏳ Protocolo de Tiempo y Simulación

### 1. getServerTime()

- **Online**: Obtiene el tiempo real mediante un RPC al servidor para evitar trampas con el reloj local.
- **Offline**: Utiliza el reloj local pero permite el uso de un **Time Offset**.

### 2. Time Mocking (Solo Debug/Offline)

Permite adelantar o atrasar el tiempo del motor para probar:

- Ciclos de Día/Noche.
- Climas dinámicos.
- Finalización de misiones IDLE.

---

## 🔄 Sincronización y Versiones

### 1. CLIENT_DB_VERSION

- Se calcula automáticamente basándose en la longitud del array `DATABASE_MIGRATIONS`.
- El cliente **NUNCA** debe conectarse a un servidor cuya versión de DB sea menor a la versión del cliente.

### 2. Persistencia en SQLite

En modo offline, los cambios se guardan en memoria y se sincronizan con el sistema de archivos del navegador mediante `persistSQLite()` al final de cada operación importante (ej. después de capturar un Pokémon).

---

## 🚨 Reglas de Uso para Desarrolladores

- **No usar Supabase Directo**: Siempre usa `gameStore.db` o el router inyectado.
- **RPCs**: Si creas un RPC en el servidor, DEBES crear su equivalente o un mock en `dbRouter.js` para que el modo offline no rompa.
- **Transacciones**: No hay transacciones multi-tabla garantizadas en el router; diseña la lógica para ser atómica a nivel de fila siempre que sea posible.
