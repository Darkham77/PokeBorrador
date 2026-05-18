# Plan de Implementación: Motor de Combate Pokémon Showdown

Este documento detalla el plan técnico paso a paso para sustituir el sistema de batallas actual por `@pkmn/sim`. Está diseñado para ejecutarse secuencialmente en el futuro sin romper el juego existente.

## Fase 1: Configuración de Dependencias y Entorno

**Objetivo:** Instalar el motor y preparar Vite para soportar simuladores en hilos paralelos.

1. Instalar `@pkmn/sim` (y opcionalmente `@pkmn/client` si facilita el parseo del protocolo).

   ```bash
   npm install @pkmn/sim
   ```

2. Configurar `vite.config.ts` (si fuera necesario) para asegurar que la exportación del Web Worker funciona correctamente en el build de producción.
3. Crear el directorio `src/game/battle/showdown/` para contener toda la lógica nueva y mantenerla separada de los componentes UI.

## Fase 2: Implementación del Web Worker (El Motor Oculto)

**Objetivo:** Levantar el simulador fuera del hilo principal de Vue.

1. Crear `src/game/battle/showdown/ShowdownWorker.ts`.
2. Dentro del archivo, importar `Battle` y `Dex` de `@pkmn/sim`.
3. Establecer un `addEventListener('message')` que escuche comandos de inicialización:
   - Recibir el equipo del jugador (`playerTeam`) y del enemigo (`enemyTeam`).
   - Instanciar la batalla forzando las reglas: `{ formatid: 'gen3customgame' }`.
4. Establecer la recepción de comandos de combate:
   - Mapear el mensaje `useMove` al comando interno de Showdown `battle.choose('p1', 'move 1')`.
5. Enviar el resultado del turno generado por Showdown (`battle.log`) de vuelta al hilo principal usando `postMessage()`.

## Fase 3: Traductor del Protocolo (El Parser)

**Objetivo:** Convertir el texto que escupe Showdown en estado de JavaScript puro.

1. Crear `src/game/battle/showdown/ShowdownParser.ts`.
2. Escribir un parser de expresiones regulares (o usar un módulo de `@pkmn/client`) para traducir las líneas de `SIM-PROTOCOL`.
   *Ejemplo:* Cuando llegue `|-damage|p1a: Pikachu|50/100`, el parser devolverá un objeto: `{ action: 'damage', target: 'player', currentHP: 50, maxHP: 100 }`.
3. Construir adaptadores para estados críticos: Daño, Curación, Cambios de Clima, Faints (Debilitamiento), y Estados Alterados (Parálisis, Veneno).

## Fase 4: Integración con Pinia (El Puente Reactivo)

**Objetivo:** Conectar el Web Worker con nuestro ecosistema Vue.

1. Crear/Refactorizar `src/stores/useBattleEngineStore.ts`.
2. Instanciar el Web Worker al inicializar el store.
3. Crear un estado reactivo (`state`) que represente la vista actual de la batalla (HP de los 2 Pokémon, sprites actuales de PokeAPI, clima activo).
4. Escuchar los mensajes del *Worker* y pasarlos por el *Parser*.
5. Implementar un **Sistema de Cola de Animaciones**: Si el turno produce 5 eventos (ataque, daño, veneno, daño de veneno), el Store debe aplicar esos cambios con intervalos (ej. `setTimeout` de 500ms) para que la UI tenga tiempo de animarlos secuencialmente, en lugar de aplicarlos todos al mismo tiempo.

## Fase 5: Conexión con la Interfaz de Usuario (UI)

**Objetivo:** Convertir a `BattleArenaView.vue` en una vista "tonta" (Dumb Component).

1. Eliminar cualquier lógica de cálculo de velocidad o daño dentro de la UI.
2. Hacer que las barras de vida y sprites se enlacen (`v-bind`) directamente a las variables reactivas de `useBattleEngineStore`.
3. Actualizar los botones de ataques: Al presionar un ataque, simplemente invocar `battleStore.sendAction('move', moveIndex)`.
4. Añadir *Watchers* para disparar efectos de Phaser/CSS cuando el estado cambie (ej. si `store.state.weather === 'rain'`, renderizar partículas de lluvia).

## Fase 6: Pruebas y Transición

1. Ejecutar simulaciones en consola (CLI-First Debugging) forzando el comando `window.__VITE_DEBUG__.testShowdownBattle()`.
2. Verificar que los combates mantengan 60 FPS estables sin micro-tirones durante el cálculo de la IA enemiga.
3. Desconectar el motor viejo y fusionar el código a la rama principal (Safe Commit).
