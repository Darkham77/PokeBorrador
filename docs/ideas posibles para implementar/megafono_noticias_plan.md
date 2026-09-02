# Plan de Implementación: Sistema de Radio Kanto (Megáfono de Noticias del Mundo)

## 1. Contexto y Propósito

Para dotar a **Poké Vicio** de una atmósfera de "mundo vivo" y conectar a los jugadores en una experiencia compartida, se implementa el sistema de noticias **Radio Kanto**.

Inspirado en la icónica **Torre Radio de Pueblo Lavanda** y los programas de radio de las ediciones clásicas, este sistema actúa como el megáfono oficial de la región, emitiendo en tiempo real un cintillo informativo en estilo teletipo GBA.

### Principios Fundamentales

* **Integración Rolera (Diegética)**: La información se presenta como emisiones oficiales de la emisora *Radio Kanto (101.5 FM)*, evitando notificaciones genéricas o frías.
* **Cero Pay-to-Win**: Diseñado exclusivamente para celebrar logros de la comunidad y anunciar eventos dinámicos del mapa.
* **Rendimiento Retro-Modern**: Animación fluida acelerada por GPU mediante **GSAP** (sin bucles de temporizadores `setInterval` ni manipulación pesada del DOM).
* **Privacidad y Respeto al Jugador**: Soporte para "Modo Anónimo" y opción de silenciar/ocultar el sintonizador en los ajustes del juego.

---

## 2. Alcance de Eventos Transmitidos

Para mantener alta la relevancia y no saturar la pantalla con ruido visual, la Radio Kanto transmitirá **únicamente** 3 categorías de noticias:

1. **Capturas de Pokémon Variocolor (Shinies)**:
   * Ejemplo: *"¡Última hora en Radio Kanto! Informan que el entrenador [Ash] (Team Unión) acaba de capturar un Gyarados Shiny en la Ruta 21."*
2. **Encuentros y Capturas de Legendarios / Míticos**:
   * Ejemplo: *"¡Interrumpimos la programación! Avistamiento confirmado: el mítico Mew ha sido avistado y capturado por [Red]."*
3. **Eventos y Alertas Dinámicas en el Mapa**:
   * Ejemplo: *"¡Boletín meteorológico! Se reporta una extraña concentración de Pokémon y niebla densa en la Torre Pokémon de Lavanda."*
   * Ejemplo: *"¡Alerta de Territorio! El Guardián de la Ruta 11 ha despertado. ¡Entrenadores de ambos bandos, a sus puestos!"*

*(Cuando no existan noticias recientes de jugadores, la radio emitirá cápsulas breves de ambientación sobre la región).*

---

## 3. Arquitectura del Sistema

```text
       [Eventos del Juego]
    (Captura Shiny / Guardián)
                │
                ▼
      [radioBroadcaster.ts] ──(Filtro de privacidad: Anonimato)
                │
                ▼ (Supabase Realtime Channel: broadcast)
     ┌──────────────────────┐
     │  radio_kanto_channel │
     └──────────────────────┘
                │
                ▼ (Recibido por todos los clientes conectados)
       [useRadioStore.ts] ──(Cola FIFO en memoria: máx 15)
                │
                ▼ (Orquestación GSAP nativa)
     [RadioKantoTicker.vue] (Cintillo superior interactivo)
```

---

## 4. Contratos de Datos (TypeScript)

Archivo: `src/types/radio/radio.ts`

```typescript
export type RadioEventType = 'shiny' | 'legendary' | 'map_event' | 'broadcast_lore';

export interface RadioNewsPayload {
  id: string;
  type: RadioEventType;
  timestamp: number;
  trainerName: string;
  faction?: 'union' | 'poder' | 'none';
  pokemonId?: string;
  pokemonName?: string;
  locationId?: string;
  locationName?: string;
  customMessage?: string;
  isAnonymous?: boolean;
}

export interface RadioNewsItem extends RadioNewsPayload {
  formattedText: string;
}
```

---

## 5. Locución y Plantillas de Radio

Archivo: `src/logic/radio/radioTemplates.ts`

Generador con variedad de locución para que los mensajes se sientan orgánicos y transmitidos por presentadores de Kanto:

```typescript
import type { RadioNewsPayload } from '@/types/radio/radio';

export function formatRadioBroadcast(event: RadioNewsPayload): string {
  const trainer = event.isAnonymous ? 'Un entrenador misterioso' : event.trainerName;
  const factionTag = event.faction && event.faction !== 'none' ? `[${event.faction === 'union' ? 'Team Unión' : 'Team Poder'}] ` : '';

  switch (event.type) {
    case 'shiny':
      return `¡Última hora en Radio Kanto! ${factionTag}${trainer} acaba de capturar un ${event.pokemonName} Shiny en ${event.locationName}. ¡Felicidades!`;
    case 'legendary':
      return `¡Interrumpimos la sintonía! Reporte extraordinario: ${factionTag}${trainer} ha capturado al legendario ${event.pokemonName} en ${event.locationName}.`;
    case 'map_event':
      return `¡Boletín de Rutas! ${event.customMessage || `Gran actividad Pokémon reportada en ${event.locationName}.`}`;
    case 'broadcast_lore':
    default:
      return event.customMessage || 'Transmitiendo en 101.5 FM desde la Torre Radio. La música relaja a los Pokémon de toda la región.';
  }
}
```

---

## 6. Store Reactivo de Radio

Archivo: `src/stores/radioStore.ts`

* **Conexión a Supabase Realtime**: Suscripción al canal broadcast `radio_kanto_broadcast`.
* **Cola FIFO**: Mantiene un límite de 15 noticias. Si se supera el límite, se rotan las más antiguas garantizando que Shinies y Legendarios tengan prioridad de lectura.
* **Persistencia de Ajustes**: Guarda en `localStorage` si el usuario tiene silenciado el sintonizador o si prefiere emitir sus capturas en modo anónimo.

---

## 7. Componente Visual y Animación GSAP

Archivo: `src/components/common/RadioKantoTicker.vue`

### Características de la UI

* **Ubicación**: Barra superior fija en el layout principal del juego (`App.vue` o contenedor shell), fuera del marco interno de combate para no interferir con la acción.
* **Estética GBA**:
  * Chasis oscuro metálico con bordes retro.
  * Luz LED verde parpadeante: `[📻 RADIO KANTO · 101.5 FM]`.
  * Tipografía: `'Pokemon FireRed LeafGreen'` en tamaño legible.
* **Animación GSAP Determinista**:
  * Velocidad constante calibrada en pixels por segundo (`65px/s`) para que textos extensos no pasen volando.
  * Al finalizar la animación del texto actual, la promesa nativa `.then()` toma el siguiente mensaje de la cola.
  * **Pausa en Hover**: El timeline se pausa al posar el ratón (`mouseenter` / `touchstart`) y continúa al retirar el cursor (`mouseleave`).
  * Botón discreto de colapso rápido a un icono de radio para jugadores que deseen despejar la pantalla.

---

## 8. Privacidad y Seguridad

1. **Ajustes de Usuario**:
   * Interruptor `Ajustes > Noticiero`: *Mostrar transmisiones de Radio Kanto (Activado/Desactivado)*.
   * Interruptor `Ajustes > Privacidad`: *Ocultar mi nombre en la Radio al capturar Pokémon raros (Modo Anónimo)*.
2. **Protección contra Spam**:
   * Validación del lado cliente antes de emitir para evitar transmisiones duplicadas.
   * Supabase Broadcast rate-limiting por sesión de usuario.

---

## 9. Estrategia de Verificación y Testing

1. **Pruebas Unitarias**:
   * `tests/unit/radio/radio_templates.spec.ts`: Verificar generación correcta de textos según tipo de evento, anonimato y facción.
   * `tests/unit/radio/radio_store.spec.ts`: Verificar inserción FIFO, límite de cola y despacho secuencial.
2. **Comando Debug CLI**:
   * Exponer en consola:

     ```javascript
     window.__VITE_DEBUG__.radio.emitMock({
       type: 'shiny',
       pokemonName: 'Charizard',
       trainerName: 'Ash',
       faction: 'union',
       locationName: 'Ruta 2'
     });
     ```

---

## 10. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-RAD-01** | Identidad del Noticiero | "Radio Kanto (101.5 FM)" con justificación diegética de lore. | Megáfono o sistema de avisos de sistema genérico. | Integración inmersiva con el universo Pokémon clásico. |
| **ADR-RAD-02** | Formato de Presentación | Cintillo superior continuo tipo teletipo GBA. | Toasts flotantes o modales emergentes. | Evita obstruir mapas, menús o la vista de batalla. |
| **ADR-RAD-03** | Motor de Animación | GSAP Timeline nativo con promesas deterministas. | CSS Keyframes / `setInterval`. | Mandato estricto de GSAP del proyecto y sincronización exacta. |
| **ADR-RAD-04** | Transporte de Red | Supabase Realtime Broadcast. | Polling a base de datos / WebSockets manuales. | Latencia <50ms, cero impacto en almacenamiento y bajo coste. |
