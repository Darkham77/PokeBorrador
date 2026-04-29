# Integración de Pokémon Showdown - Documento de Diseño

## 1. Resumen del Proyecto
- **Objetivo:** Reemplazar el motor de combate actual de Poké Vicio por el simulador open-source de Pokémon Showdown (vía `@pkmn/sim`).
- **Propósito:** Delegar el 100% de la lógica de combate (cálculos de daño, precisión, estados, habilidades y mecánicas) a un motor infalible y probado por la comunidad.
- **Público:** Jugadores que buscan combates precisos sin bugs, manteniendo la integridad del competitivo, tanto en modo Offline (Historia) como Online (PvP).
- **Restricción Principal:** Arquitectura de Doble Entorno. El motor debe correr localmente en el navegador para el modo sin conexión, y estar desacoplado para poder correr en un servidor seguro (Node.js/Supabase Edge) para los combates PvP.
- **No-Objetivos:** No se reescribirá la interfaz gráfica; el cliente de Vue y Phaser actuará como un "visualizador tonto" de los cálculos que dicte el simulador.

## 2. Asunciones y Requisitos No Funcionales
1. **Datos Compatibles:** Asumimos que los datos actuales de nuestro juego (IVs, EVs, stats, movimientos) se pueden formatear a la sintaxis estándar de texto de equipos de Showdown antes de iniciar el combate.
2. **Empaquetado Frontend:** Asumimos que podemos empaquetar `@pkmn/sim` (una librería Node) dentro de Vite y el navegador, posiblemente mediante un Web Worker.
3. **Animaciones Desacopladas:** La UI se encargará de "retrasar" la información visual. Aunque el motor resuelva todo el turno en 1 milisegundo, nuestro *Store* debe reproducir visualmente los eventos paso a paso (ej. la animación del ataque primero, luego la barra de vida bajando).

## 3. Decisiones Arquitectónicas (Decision Log)

| Decisión | Alternativas Consideradas | Razón de la Elección (Rationale) |
| :--- | :--- | :--- |
| **Uso de `@pkmn/sim`** | `pokemon-showdown` oficial puro | El paquete de la comunidad `@pkmn` está escrito en TypeScript, es más modular y está pensado para abstraerse del pesado entorno de servidor de Node.js, facilitando su compilación en Vite. |
| **Web Worker Aislado** | Hilo principal de Vue (Main Thread) | La simulación y la IA pueden tener cálculos costosos. Correrlo en un *Worker* asegura que las animaciones de la UI y los FPS nunca sufran tirones (stuttering). |
| **Reglas de Generación 3** | Programar excepciones propias | Showdown soporta el formato `gen3customgame`. Al activarlo, implementa automáticamente el sistema físico/especial por tipos, desactiva el tipo Hada y revierte las habilidades a sus versiones de GBA. Ahorro masivo de tiempo. |
| **Sprites de PokeAPI** | Usar URLs crudas de Showdown | PokéAPI incluye los sprites animados de Showdown bajo `sprites.other.showdown`. Se sincroniza perfecto con nuestras peticiones de base de datos actuales. |

## 4. Especificación Técnica y Flujo de Datos

### 4.1. Componentes del Sistema
La integración se dividirá en 4 componentes principales con fronteras claras:
1. **`BattleWorker.ts` (El Motor Oculto):** Web Worker dedicado. Importa `@pkmn/sim`, inicializa combates y recibe comandos del tipo `p1 move tackle`. Devuelve eventos crudos en formato `SIM-PROTOCOL`.
2. **`ShowdownParser.ts` (El Traductor):** Clase utilitaria. Lee las salidas crudas (ej. `|-damage|p1a: Pikachu|50/100`) y las transforma en mutaciones ordenadas y legibles para nuestro frontend.
3. **`useBattleEngineStore.ts` (Pinia Store):** El orquestador. Mantiene el estado visual actual, se comunica con el *Worker* y alimenta de datos a la UI.
4. **`BattleArenaView.vue` (Vista de Combate):** Completamente reactiva. Solo pinta en pantalla lo que el Store dicta. Si el Store dice que Pikachu tiene 50 HP, dibuja la barra al 50%.

### 4.2. Flujo de Datos del Turno
1. El jugador presiona un movimiento en la UI.
2. La vista llama a `battleStore.sendAction('move 1')`.
3. El *Store* despacha la acción al *Worker* vía `postMessage()`.
4. El *Worker* de Showdown simula los RNGs, prioridades, daños y resuelve el turno entero de forma instantánea.
5. El *Worker* envía de regreso el protocolo (ej. qué pasó, quién golpeó primero, cuanta vida sobró).
6. El *Parser* procesa la lista de eventos, y el *Store* actualiza reactivamente a Vue, activando los hooks visuales correspondientes para que el jugador vea la animación.
