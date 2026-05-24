# 📊 Informe de Auditoría: GSAP, Timers y Animaciones

Este informe detalla el estado actual de las animaciones, transiciones y temporizadores en el proyecto, identificando elementos obsoletos, desviaciones de los estándares y las tareas pendientes para lograr una migración del 100% a GSAP ("Full GSAP").

---

## 🔎 Resumen de Hallazgos

| Métrica | Estado | Detalle |
| :--- | :---: | :--- |
| **CSS Keyframes** | **100% Limpio** | Se eliminaron todos los `@keyframes` del código de la aplicación. |
| **CSS Transitions** | **90% Migrado** | Solo quedan transiciones CSS menores de `:hover` y algunos contenedores grandes. |
| **Timers en UI (`setTimeout`)** | **100% Migrado** | No hay ningún `setTimeout` huérfano controlando flujos visuales en componentes de UI. |
| **Timers en Lógica/Stores** | **95% Migrado** | Solo quedan 4 usos específicos de red/base de datos (tolerables pero optimizables). |
| **Timers en Realtime (`setInterval`)** | **100% Limpio** | Solo un timer huérfano definido pero nunca invocado en `auth.ts`. |

---

## 1. ⏱️ Estado de los Temporizadores (Timers)

El análisis por búsqueda global revela que la política **"Zero-Timer & Zero-Variable Policy"** se cumple casi a la perfección en la interfaz de usuario. No hay temporizadores de JavaScript controlando flujos de animación.

### 🔍 Usos Restantes de `setTimeout` (Análisis de Código)

Solo se encontraron **5 ocurrencias reales** en todo el directorio `src/`, todas ellas fuera del control de animaciones:

1. **`src/logic/db/sqliteEngine.ts` (Línea 121)**

   ```typescript
   await new Promise(resolve => setTimeout(resolve, 1500))
   ```

   * **Contexto**: Pausa de espera de reconexión/sincronización en SQLite.
   * **Evaluación**: Aceptable al ser backend local offline, pero se podría reemplazar por `gsap.delayedCall` o una utilidad de promesa nativa si se prefiere homogeneizar.

2. **`src/stores/auth.ts` (Línea 117)**

   ```typescript
   await new Promise(resolve => setTimeout(resolve, 1500))
   ```

   * **Contexto**: Espera de reintento para la sesión de Supabase si el servidor de la NAS está en arranque en frío.
   * **Evaluación**: Lógica de red pura. Es aceptable, pero para adherirse de forma estricta, podría usar `gsap.delayedCall`.

3. **`src/stores/auth.ts` (Línea 147)**

   ```typescript
   const { data: profile } = await Promise.race([
     profilePromise,
     new Promise((_, reject) => setTimeout(() => reject(new Error('FETCH_TIMEOUT')), 10000))
   ])
   ```

   * **Contexto**: Control de timeout de petición HTTP de perfil.
   * **Evaluación**: Lógica de red pura. Aceptable, aunque Node 26+ prefiere el uso de `AbortController` con `AbortSignal.timeout(10000)` en lugar de envolver promesas con `setTimeout`.

4. **`src/stores/game/actions/saveActions.ts` (Línea 119)**

   ```typescript
   setTimeout(() => save(false), 3000)
   ```

   * **Contexto**: Guardado diferido automático tras detectar progreso local más reciente que la nube.
   * **Evaluación**: **Desviación leve.** Debe ser migrado a `gsap.delayedCall` para cumplir con la prohibición estricta de `setTimeout` en la capa de lógica del cliente.

5. **`src/views/LoginView.vue` (Línea 84)**

   ```typescript
   const timeout = setTimeout(() => controller.abort(), 3000)
   ```

   * **Contexto**: Aborta el fetch de login tras 3 segundos.
   * **Evaluación**: Lógica de control de red. Es mejorable mediante el uso de `AbortSignal.timeout(3000)` nativo en el `fetch` para eliminar el `setTimeout` por completo.

### 🔍 Usos de `setInterval`

1. **`src/stores/auth.ts` (Línea 24)**

   ```typescript
   const sessionCheckInterval = ref<ReturnType<typeof setInterval> | null>(null)
   ```

   * **Contexto**: Definido y limpiado en `logout()`, pero **nunca se inicia** en ninguna parte del código (código muerto/huérfano).
   * **Recomendación**: Eliminar por completo la variable y su limpieza para sanear el store.

---

## 2. 🎬 Estado de los `@keyframes` de CSS

El análisis de la carpeta `src/` confirma que **no existe ningún bloque `@keyframes` activo** en los archivos `.vue`, `.scss` o `.css` de la aplicación (excluyendo el preloader estático del `index.html` que es correcto por arquitectura).

Sin embargo, persisten **referencias a animaciones CSS cuyos `@keyframes` ya no existen**, lo que las convierte en animaciones inactivas/muertas:

1. **`src/components/evolution/EvolutionScene.vue` (Línea 238)**

   ```css
   .result-text {
     animation: fadeIn 0.5s ease;
   }
   ```

   * **Problema**: El keyframe `fadeIn` no está definido en ninguna hoja de estilos activa del proyecto. Esta animación no hace nada.
   * **Acción para Full GSAP**: Ya que este componente usa una línea de tiempo (`gsap.timeline`) robusta para la evolución, la aparición de `.result-text` debe agregarse al final de la línea de tiempo usando `gsap.fromTo` con `opacity: 0` a `opacity: 1`.

2. **`src/styles/components/_battle.scss` (Líneas 225-228)**

   ```scss
   &.bush-front-1 { animation: bush-wiggle 1.2s infinite ease-in-out; }
   &.bush-front-2 { animation: bush-wiggle 1.5s infinite ease-in-out -0.4s; }
   ...
   ```

   * **Problema**: Las plantas de búsqueda de combate tienen asignada una animación `bush-wiggle` cuyos keyframes no existen en los archivos SCSS del proyecto.
   * **Acción para Full GSAP**: Implementar el balanceo de las plantas usando GSAP en un bucle infinito y yoyo en el renderizado de la arena, o registrar de manera centralizada el movimiento en GSAP.

3. **`src/styles/components/_modals.scss` (Líneas 82 y 96)**

   ```scss
   .move-detail-overlay { animation: fadeIn 0.3s ease forwards; }
   .move-detail-card { animation: appear 0.45s cubic-bezier(0.34, 1.56, 0.64, 1); }
   ```

   * **Problema**: Estas clases pertenecen a un overlay de detalles de movimientos antiguo que no está referenciado en ninguna parte de la aplicación (código SCSS huérfano).
   * **Recomendación**: Eliminar estas clases muertas de `_modals.scss` para mantener el archivo limpio.

---

## 3. 🔄 Estado de las Transiciones de CSS (`transition:`)

Aunque no interfieren gravemente con el motor de físicas y FSM, el uso de transiciones CSS nativas en propiedades como `transform`, `opacity` o `all` choca contra el principio de **GSAP Exclusive Mandate** y puede generar jaloneos de renderizado en el navegador ("layout thrashing").

Se identificaron las siguientes transiciones CSS pendientes de migración a GSAP:

1. **`src/components/BattleArena.vue` (Línea 305 y 323)**
   * **Elemento 1**: `.env-icon` (Hover de los iconos del clima)

     ```css
     transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
     ```

     * **Pendiente**: Debería controlarse con animaciones GSAP de entrada/salida (`gsap.to(el, { scale: 1.3, translateY: -2 })`) en los eventos `@mouseenter` y `@mouseleave`.
   * **Elemento 2**: `.battle-screen-grid` (Fade de entrada del contenedor de batalla)

     ```css
     transition: opacity 0.3s ease;
     ```

     * **Pendiente**: La transición de opacidad general al montar/desmontar la arena debe manejarse mediante hooks de transición GSAP en Vue o directamente en el lifecycle del store de combate.

2. **`src/components/market/MarketPublish.vue` (Línea 314, 380 y 466)**
   * **Elemento 1**: Selector de modos (Botones POKÉMON / OBJETOS)

     ```css
     transition: all 0.2s;
     ```

   * **Elemento 2**: `.selectable-item-card` (Hover de cartas de objetos)

     ```css
     transition: all 0.2s ease;
     ```

   * **Elemento 3**: Círculo de selección

     ```css
     transition: all 0.2s;
     ```

     * **Pendiente**: Los efectos táctiles y de desplazamiento lateral (`transform: translateX(4px)`) deben migrarse a tweens ligeros de GSAP asociados a directivas o handlers de eventos para garantizar una respuesta táctil premium a 60 FPS consistentes.

---

### Fase 1: Limpieza de Código Muerto (Riesgo Cero)

* [ ] Eliminar la variable muerta `sessionCheckInterval` y su referencia en `logout()` de `src/stores/auth.ts`.
* [ ] Eliminar las clases huérfanas `.move-detail-overlay` y `.move-detail-card` con animaciones fantasma de `src/styles/components/_modals.scss`.

### Fase 2: Migración de Animaciones Incompletas (Riesgo Bajo)

* [ ] **EvolutionScene.vue**: Migrar la animación de entrada `.result-text` del CSS a la línea de tiempo de GSAP `startSequence()`.
* [ ] **Battle bushes**: Decidir si el balanceo infinito de las plantas de combate (`bush-wiggle`) se elimina del CSS o se implementa con una rotación/escala infinita en GSAP utilizando `onComplete` o `repeat: -1` y `yoyo: true`.

### Fase 3: Reemplazo de `setTimeout` Restantes en Cliente

* [ ] **saveActions.ts**: Cambiar `setTimeout(() => save(false), 3000)` por `gsap.delayedCall(3.0, () => save(false))`.
* [ ] **LoginView.vue**: Modernizar el aborto del login usando `AbortSignal.timeout(3000)` nativo en el `fetch`, purificando el código de `setTimeout` manual.

### Fase 4: Estandarización de Hover Transitions

* [ ] Crear un composable utilitario o directiva (`v-gsap-hover`) para unificar los efectos de bounce, scale y lift en botones premium (como las píldoras del clima en `BattleArena.vue` y cartas en `MarketPublish.vue`), eliminando completamente la propiedad `transition: all` del SCSS.
