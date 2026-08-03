# Walkthrough — E2E Battle Simulation Unification & Concurrency Parity

¡Hito completado con éxito! Se han unificado los replayers del fuzzer con la suite de simulación Playwright E2E y se han ejecutado los **59 tests de combate** (58 lotes de fuzzer stress sync + 1 manual scenarios) con un **resultado de 100% de éxito (59 passed)** en 14.9 minutos bajo concurrencia paralela optimizada.

---

## Cambios Realizados y Verificados

### 1. Robustez de Interacción y Mitigación de Tooltips
* **Problema**: El movimiento del cursor en Playwright activaba tooltips flotantes (`PVTooltip`) sobre los botones de objetos en la bolsa rápida (`quick-item-card`), interceptando los clicks tradicionales y provocando fallos por visibilidad.
* **Solución**: Se actualizó `clickResilient` en `scripts/e2e/e2e_helpers.ts` para capturar este error de interceptación e intentar un fallback robusto de teclado (`.focus()` + presionar `'Enter'`). Esto hace que cualquier interacción de click en el suite Playwright sea inmune a la obstrucción física de tooltips.

### 2. Estabilidad de Arranque de Sesión y Login
* **Problema**: Bajo alta concurrencia de procesadores, el arranque inicial de Vue y las llamadas asíncronas de `authStore.checkSession()` a Supabase tardaban más de 5 segundos, arrojando timeouts de carga en los trabajadores paralelos.
* **Solución**:
  * Se pre-inicializó `pokevicio_session_mode = 'offline'` en el `addInitScript` de la página para evitar accesos/reintentos lentos a Supabase.
  * Se añadió una espera explícita en `loginTestUser` para aguardar a que Vue se monte y registre (`window.pwa_app_mounted === true`) y que desaparezcan las pantallas de carga inicial (`.loading-overlay` y `.auth-loading-text`).
  * Se desactivaron las animaciones GSAP de introducción en `LoginView.vue` bajo entorno de test (`window.__E2E__ === true`) para prevenir que las tarjetas de autenticación se queden bloqueadas con `opacity: 0` cuando el procesador está muy congestionado y Chromium ralentiza los frames (`requestAnimationFrame`).

### 3. Aislamiento y Control de Actualizaciones PWA
* **Problema**: Durante los tests concurrentes de Playwright, los service workers en segundo plano podían detectar un cambio de versión de desarrollo y activar `needRefresh = true`, mostrando el panel de "NUEVA VERSIÓN" y ocultando los tabs de selección del servidor local de forma destructiva.
* **Solución**: Se modificaron las callbacks de `registerSW` y `gameBus` en `src/composables/system/usePWA.ts` para ignorar y anular actualizaciones (`needRefresh.value = true`) si la bandera `window.__E2E__` de simulación está activa.

### 4. Fórmula Dinámica de Concurrencia a Medida (`Cores / 4`)
* **Problema**: La fórmula anterior `Math.max(1, os.cpus().length - 2)` calculaba 14 workers concurrentes en tu procesador de 16 hilos (8 núcleos físicos). Ejecutar 14 navegadores Chromium concurrentes saturaba la CPU al 100%, ralentizando de forma crítica la compilación de archivos del servidor dev de Vite y el renderizado.
* **Solución**: Se optimizó la concurrencia en todo el proyecto a **la cantidad de procesadores lógicos dividida por 4**:
  * `playwright.config.ts`: `workers: Math.max(1, Math.floor(os.cpus().length / 4))` (resulta en exactamente 4 workers).
  * `scripts/e2e/fuzzer/core/fuzzer_engine.ts`: `MAX_WORKER_CORES` adaptado idénticamente.
  * `scripts/e2e/fuzzer/AGENTS.md`: Actualizados los contratos de concurrencia.

### 5. Sistema de Logging Silencioso en Consola
* **Problema**: Se imprimían en tiempo real cientos de miles de líneas de logs informativos en la terminal de Playwright, mezclando las salidas de los workers y saturando el buffer de salida de la terminal.
* **Solución**:
  * Se modificó `setupE2ESession` en `scripts/e2e/e2e_helpers.ts` para enviar **el 100% de los logs de la consola del navegador** al buffer del test correspondiente si está definido.
  * En `battle_fsm_sync.simulation.ts`, solo se vuelca el buffer de logs a consola si la prueba **falla** (`testInfo.status !== 'passed'`) o si se activa explicitamente `DEBUG_E2E=true`.
  * La traza de logs completa y detallada de cada combate se sigue guardando siempre a disco de forma individual en `scratch/e2e_logs/lote-X.log` para permitir reproducibilidad y depuración total.

---

## Resultados de Verificación de Suite Completa

Ejecutando `npm run sim:e2e:combat` (4 workers paralelos silenciosos):
```
Running 59 tests using 4 workers
  ok 53 ... debería consumir un Revivir... (20.3s)
  ok 51 ... lote de fuzzer #28... (1.0m)
  ok 52 ... lote de fuzzer #13... (1.0m)
  ...
  ok 59 ... lote de fuzzer #15... (54.7s)

  59 passed (14.9m)
```
**Resultado**: 100% aprobado, ejecución completamente limpia en consola, rendimiento de CPU óptimo y logs detallados persistidos en disco.
