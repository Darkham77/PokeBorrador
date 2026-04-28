# Manual de Testing y Simulación en Navegador

Este manual establece el protocolo estándar para la verificación visual y funcional del proyecto usando automatización de navegador y herramientas de debug CLI.

## 🌐 Configuración del Entorno Local

- **URL**: `http://localhost:5173` (Vite).
- **Usuario de Test**: `ASH`.
- **Autenticación**: Los campos de contraseña no son requeridos en local; solo el nombre de usuario identifica la sesión.

---

## 🛠️ Protocolo de Login y Navegación

### 1. Verificación de Sesión

Antes de cualquier test, verifica si ya estás logueado como `ASH` mediante `window.__VITE_DEBUG__.getGameStore().auth.user.username`.

### 2. Login vía UI (MANDATORIO)

Si no hay sesión activa:

1. Navega a `/login`.
2. Escribe `ASH` en el campo de usuario.
3. Haz clic en el botón de Login.

> No uses `evaluate` para saltarte el login; es necesario inicializar `window.__VITE_DEBUG__` a través del flujo normal de la UI.

### 3. Navegación Rápida (CLI-First)

Una vez logueado, usa comandos para limpiar la UI y saltar al objetivo:

- `window.__VITE_DEBUG__.closeAllModals()`
- `window.__VITE_DEBUG__.navigate(tabId)`
- `window.__VITE_DEBUG__.openModal(modalName)`

---

## 🏎️ Eficiencia del Subagente de Navegador

Para evitar lag y saturación de la IDE:

- **NO retornes el DOM raw**.
- Define condiciones de éxito atómicas (ej. "Para cuando veas el ID #dashboard-loaded").
- Limita las acciones a un máximo de 6 por tarea.

---

## ⚔️ Simulación de Combate y Estado

Al probar estados complejos (ej. derrota), sincroniza el motor Phaser con el estado de Pinia:

1. Trigger visual vía `phaserBridge.sendCommand('BattleScene', 'EVENT', data)`.
2. Actualización de Store (ej. `pokemon.hp = 0`).
3. Prioriza el uso de `BattleDebugTools.vue` antes de inyectar estados manualmente por consola.

---

## 🚨 Roadblock Policy

Si el test falla o el navegador se queda "congelado":

1. **DETENTE**: No intentes adivinar el estado de la UI.
2. **Diagnóstico Dual**: Revisa los logs de la consola del navegador Y los logs del servidor (`npm run dev`) simultáneamente.
3. **Reparación Prioritaria**: Arregla cualquier error de consola o SSR antes de reintentar el test.
