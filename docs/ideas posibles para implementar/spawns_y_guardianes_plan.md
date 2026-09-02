# Plan de Implementación: Spawns Dinámicos y Guardianes de Territorio

## 1. Contexto y Propósito

Inspirado en el aclamado modelo de eventos de **PokeMMO** y las incursiones programadas, este sistema convierte el mundo de **Poké Vicio** en un ecosistema vivo y dinámico. En lugar de saturar cada ruta con jefes estáticos diarios, los eventos se concentran en **ventanas de tiempo específicas en una única ruta aleatoria**.

### Beneficios del Modelo

* **Concentración Comunitaria**: Al haber **un solo evento activo en todo el mundo a la vez**, todos los jugadores (Team Unión y Team Poder) se desplazan hacia la misma ruta, generando un sentido de concurrencia y guerra territorial real.
* **Alta Retención (*Appointment Gaming*)**: Ciclos predecibles cada 4 horas motivan a los entrenadores a entrar al juego a lo largo del día.
* **Cero Frustración (Instanciación Justa)**: Aunque el evento está activo globalmente, el combate es individual. Ningún jugador pierde su oportunidad porque otro haya hecho clic antes.
* **Alertas Móviles PWA**: Integración con notificaciones nativas del teléfono para quienes tengan la aplicación instalada.

---

## 2. El Guardián de Territorio (Jefe Alfa)

### 2.1 Calendario y Ventanas de Tiempo

* **Frecuencia**: Se activa una ventana cada **4 horas** (6 apariciones diarias):
  * `02:00`, `06:00`, `10:00`, `14:00`, `18:00`, `22:00` (hora del servidor).
* **Duración**: La ventana de aparición dura **75 minutos**.
* **Ubicación**: Se selecciona al azar **una única ruta** entre todas las rutas habilitadas (escalable a futuras regiones como Johto o Hoenn).
* **Restricción de Recompensa**: Un jugador puede desafiar y derrotar/capturar al Guardián de cada ventana una sola vez por ciclo.

### 2.2 Mecánica de Combate Alfa (Showdown Engine)

El combate contra el Guardián se gestiona en el motor Showdown local con parámetros especiales de Jefe:

* **Barra de Vida Aumentada**: Modificador de vitalidad (HP base x2 o x2.5).
* **Aura Territorial**: Inicia el combate con un boost defensivo (+1 en Def y Def. Esp.).
* **Nivel Adaptativo**: Su nivel se escala en función del progreso de medallas del jugador para mantener el reto justo y emocionante.

### 2.3 Resolución: Derrota o Captura Exigente

El entrenador tiene dos opciones tácticas para resolver el encuentro:

1. **Derrotar al Guardián**:
   * Otorga **150 Puntos de Territorio (PT)** a la facción del jugador para la guerra semanal.
   * Otorga **Monedas de Guerra** (canjeables en la tienda de guerra).
   * Otorga botín valioso: Caramelos Raros, Bayas especiales o Chapas Plateadas.
2. **Capturar al Guardián**:
   * Catch rate reducido (desafío exigente con Ultra Balls o efectos de estado).
   * Al capturarlo, el jugador se queda con el Pokémon, el cual cuenta con **al menos 2 IVs perfectos (31)** garantizados y tamaño visual Alfa.
   * También otorga los PT y Monedas de Guerra correspondientes.

---

## 3. Enjambres Temporales y Entrenadores Errantes

Para garantizar actividad continua en el mundo entre una ventana de Guardián y otra, se alternan dos eventos complementarios:

### 3.1 Enjambres de Especies Raras (Swarms)

* **Horarios**: Se intercalan entre las ventanas de los Guardianes (duración: 90 minutos).
* **Mecánica**: Una especie exótica o difícil de encontrar (ej. Chansey, Scyther, Dratini, Lapras) experimenta una tasa de aparición masiva (+300%) en una ruta determinada.

### 3.2 Entrenadores Errantes (Retadores de Élite)

* NPCs especiales (Líderes de Gimnasio fuera de servicio, miembros del Alto Mando de viaje o entrenadores legendarios como Red/Blue) aparecen en una ruta para aceptar desafíos.
* **Reglas de Combate**: Combate táctico competitivo en Showdown con objetos competitivos equipados. Vencerlos otorga cosméticos exclusivos y Pokéyen elevado.

---

## 4. Notificaciones y Descubrimiento

### 4.1 En el Juego (In-Game)

1. **Radio Kanto (101.5 FM)**: Interrupción de emergencia del locutor al iniciar la ventana:
   * *"🚨 ¡Interrumpimos la programación de Radio Kanto! ¡Un Tyranitar Alfa colosal ha sido avistado en la Ruta 10! Tienen 75 minutos antes de que regrese a las montañas."*
2. **Marcador en el Mapa**:
   * En el mapa de Kanto ([`test aventura/App.vue`](file:///d:/Documentos/GitHub/PokeBorrador/test%20aventura/App.vue) y selector de rutas), el nodo de la ruta muestra un icono pixelado animado con un temporizador flotante:
     * 👑 Corona roja titilante para el Guardián Alfa.
     * ✨ Hierba brillante para Enjambres.
     * 🧢 Silueta de gorra para Entrenadores Errantes.

### 4.2 En el Móvil (PWA Web Push Notifications)

* Para los usuarios con Poké Vicio instalado en su teléfono como PWA:
  * El Service Worker recibe la alerta de inicio de ventana.
  * Notificación nativa con sonido retro:  
    * **Título**: *"🚨 ¡Alerta de Guardián Alfa en Kanto!"*  
    * **Cuerpo**: *"Un Snorlax Alfa ha aparecido en la Ruta 16. La ventana de combate cierra en 75 min."*
  * Opcional y configurable: se puede activar/desactivar desde la pantalla de Ajustes del juego.

---

## 5. Esquema de Base de Datos (Supabase)

```sql
-- 1. Tabla de Eventos Activos en el Mundo
CREATE TABLE public.world_active_spawns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('guardian', 'swarm', 'roaming_trainer')),
  map_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,         -- Showdown species ID o trainer ID (ej. 'tyranitar', 'brock')
  display_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN GENERATED ALWAYS AS (NOW() BETWEEN starts_at AND expires_at) STORED
);

-- 2. Registro de Completación de Guardianes por Jugador
CREATE TABLE public.guardian_completions (
  id BIGSERIAL PRIMARY KEY,
  spawn_id UUID NOT NULL REFERENCES public.world_active_spawns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  action_taken TEXT NOT NULL CHECK (action_taken IN ('defeated', 'caught')),
  pts_awarded INT NOT NULL DEFAULT 150,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (spawn_id, user_id)
);
```

---

## 6. Arquitectura Frontend

```text
src/
├── types/world/
│   └── spawns.ts                  # Tipos TypeScript para spawns, eventos y jefes alfa
├── stores/
│   └── worldEventsStore.ts        # Store Pinia: escucha spawns activos de Supabase Realtime
├── logic/battle/
│   └── alphaBossModifier.ts       # Inyector de multiplicador HP y auras en Showdown
├── logic/notifications/
│   └── pwaPushManager.ts          # Gestión de permisos y suscripción a Web Push
└── components/map/
    └── MapEventBadge.vue          # Icono animado de corona / enjambre / silueta en el nodo
```

---

## 7. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-SPW-01** | Modelo de Frecuencia | Ventanas programadas cada 4 horas (1 solo Guardián en todo el mapa). | 1 guardián estático diario en cada una de las 20 rutas. | Concentra a toda la comunidad en una sola ruta y crea retención (*appointment gaming*). |
| **ADR-SPW-02** | Instanciación de Combate | Evento global compartido, pero instancia de combate individual por jugador. | Jefe público único ("quien hace click primero se lo queda"). | Elimina la frustración de robo de spawns y desactiva el uso de bots auto-clickers. |
| **ADR-SPW-03** | Resolución del Jefe | Derrota o Captura exigente (con IVs destacados garantizados). | Solo derrota obligatoria. | Enriquece las decisiones tácticas del jugador (¿capturar para mi equipo o derrotar rápido por botín?). |
| **ADR-SPW-04** | Notificaciones Fuera de Juego | Web Push Notifications nativas de PWA. | Correos electrónicos o mensajes de Discord externos obligatorios. | Experiencia moderna de app móvil, directa y no invasiva. |
