# Plan de Implementación: Sistema de Housing (Rancho) y Maquinarias

## 1. Contexto y Propósito

Este documento establece el diseño y arquitectura técnica para el **Rancho del Entrenador**, la propiedad privada del jugador en **Poké Vicio**.

Integra una experiencia de gestión, agricultura, crafteo y entrenamiento pasivo conectada directamente con las expediciones del Mapa de Aventura ([`guardado_rutas_biomas_plan.md`](./guardado_rutas_biomas_plan.md)) y las habilidades de equipo ([`habilidades_equipo_aventura_plan.md`](./habilidades_equipo_aventura_plan.md)). El sistema actúa además como el principal **Sumidero de Dinero (*Money Sink*)** del juego para proteger la economía contra la inflación.

### Principios Fundamentales
* **Coherencia Rolera**: La Guardería pública de Kanto (Ruta 5) se mantiene como servicio público obligatorio presencial; construir una Guardería privada en tu rancho es una conquista de *endgame*.
* **Incubadoras Crafteables (Estilo Pokémon GO)**: El jugador puede llevar 1 huevo base en la mochila de forma gratuita; para eclosionar múltiples huevos simultáneos durante sus viajes, debe craftear Incubadoras en su Taller.
* **Blindaje Económico Anti-Bots**: Tiempos de crafteo escalonados por tier de ítem y colas de producción con ranuras limitadas.
* **Agricultura Amigable (Cero Marchitamiento)**: Las bayas nunca mueren si el jugador no puede conectarse; regarlas premia con mayor cantidad de cosecha.

---

## 2. Ubicación y Desbloqueo del Rancho

* **Ubicación en el Mapa**: Un nodo campestre exclusivo conectado a las afueras de Kanto (junto a Pueblo Paleta / Ruta 2).
* **Condición de Desbloqueo**: Se desbloquea automáticamente tras conseguir la **3ª o 4ª Medalla de Gimnasio** oficial de Kanto.

---

## 3. Módulo 1: La Guardería y el Sistema de Incubadoras

```text
[GUARDERÍA PÚBLICA (Ruta 5)]             [GUARDERÍA PRIVADA (Tu Rancho)]
 ├─ Servicio público para todos           ├─ Crafteable en el rancho (Madera + Minerales)
 ├─ Presencial: debes ir físicamente      ├─ Acceso directo desde tu hogar
 └─ Máximo 1 Pareja criando               └─ Múltiples corrales (2 a 3 Parejas criando)

                                    │
                                    ▼
                     [SISTEMA DE ECLOSIÓN EN VIAJE]
 ├─ Slot Gratuito Base:       Llevas 1 huevo contigo en la mochila
 └─ Incubadoras Crafteables:  Fabricadas en el taller (estilo Pokémon GO)
                              Permiten llevar +1 huevo adicional por incubadora
```

### 3.1 Guardería Pública de Ruta 5 (Presencial)
* Permite dejar **máximo 1 pareja de Pokémon**.
* Requiere que el jugador viaje físicamente con su avatar hasta el nodo de la Ruta 5 en el Mapa de Aventura para depositar a los padres y volver a viajar para recoger el huevo generado.
* El jugador cuenta siempre con **1 ranura gratuita de huevo** en su mochila de viaje para eclosionarlo caminando por las rutas.

### 3.2 Guardería Privada del Rancho (Estructura Crafteable)
* Se construye en el rancho invirtiendo tablones de madera, lingotes de hierro y Pokéyen.
* Permite gestionar la crianza directamente desde tu casa sin viajar a la Ruta 5.
* Desbloquea corrales adicionales (**hasta 3 parejas criando simultáneamente**).

### 3.3 Las Incubadoras de Huevos (Crafteo en Taller)
* Inspiradas en la mecánica de *Pokémon GO*, se fabrican en la Prensa del Taller:
  * **Incubadora Estándar**: Permite equipar y empollar **+1 huevo adicional** mientras viajas (durabilidad de 3 eclosiones).
  * **Súper Incubadora**: Permite empollar **+1 huevo adicional** y reduce los pasos necesarios un **33%** (crafteada con materiales raros de minería).
* **Sinergia con Cuerpo Llama**: Si además llevas un Pokémon con la habilidad *Cuerpo Llama* o *Escudo Magma* en tu equipo ([`habilidades_equipo_aventura_plan.md`](./habilidades_equipo_aventura_plan.md)), los tiempos de eclosión se reducen a la mitad.

---

## 4. Módulo 2: La Huerta de Bayas (Agricultura Amigable)

* **Capacidad**: Empiezas con 4 parcelas aradas de tierra fértil (ampliables a 8 con mejoras de rancho).
* **Siembra y Cuidado**:
  * Plantar consume 1 baya o semilla del inventario.
  * Tiempos de crecimiento en tiempo real:
    * *Bayas comunes (Zreza, Meloc, Safre)*: 2 a 3 horas.
    * *Bayas de recuperación (Aranja, Zidra)*: 4 a 6 horas.
    * *Bayas reductoras de EVs (Grana, Algama, Ispero)*: 8 a 12 horas.
* **Regla Anti-Frustración**:
  * Las bayas **nunca se marchitan ni mueren**.
  * Si usas la Regadera Squirtle durante su crecimiento: Cosecha abundante (**4 a 5 bayas**).
  * Si no puedes conectarte a regar: Cosecha base garantizada (**2 bayas**).

---

## 5. Módulo 3: El Taller de Maquinarias (Crafteo Blindado)

* **Capacidad de Producción**: 2 ranuras de maquinaria activas a la vez (ampliables a 4 con mejoras del taller).
* **Tiempos Escalonados por Tier de Receta**:
  * **Tier 1 (Básico - 1 a 3 min)**: Pokéballs comunes, Cebo de bayas, Poción casera.
  * **Tier 2 (Especializado - 10 a 15 min)**: Acua Ball, Nido Ball, Superpoción, Antídotos, Incubadora Estándar.
  * **Tier 3 (Endgame - 45 a 90 min)**: Turno Ball, Peso Ball, Trozo Estrella, Más PP, Súper Incubadora.
* **Materiales Requeridos**: Minerales (Hierro, Cobre, Piedras) de las rutas de montaña y bayas/madera de las rutas de vegetación ([`guardado_rutas_biomas_plan.md`](./guardado_rutas_biomas_plan.md)).

---

## 6. Módulo 4: El Dojo de Entrenamiento (EVs y EXP / Money Sink)

* **Capacidad**: Hasta 2 Pokémon depositados simultáneamente.
* **Regla de Retención**: El Pokémon queda entrenando en el rancho y no puede usarse en el equipo ni combatir hasta retirarlo.
* **Máquinas Especializadas**:
  * 🥊 *Saco de Boxeo*: EVs de Ataque.
  * 🏃 *Cinta de Correr*: EVs de Velocidad.
  * 🛡️ *Muro de Piedra*: EVs de Defensa.
  * 🧘 *Estatua de Meditación*: EVs de Atq. Especial / Def. Especial.
  * 🏋️ *Circuito General*: Experiencia continua (subir de nivel pasivo).
* **Tarifa y Ritmo**:
  * Gana **32 EVs por hora** (8 horas continuas para alcanzar el tope de 252 EVs).
  * Tarifa de **2,500 P¥ por hora** (20,000 P¥ por un ciclo completo de 252 EVs). Extrae activamente dinero del servidor para mantener sana la economía.

---

## 7. Persistencia y Arquitectura de Datos

El estado del rancho se persiste en `gameStore.state.housing`:

```typescript
export interface HousingState {
  isUnlocked: boolean;
  unlockedAt: number;
  gardenPlots: {
    id: number;
    berryId: string | null;
    plantedAt: number | null;
    wateredAt: number | null;
    isWatered: boolean;
  }[];
  workshopQueue: {
    slotId: number;
    recipeId: string;
    startedAt: number;
    durationSecs: number;
    readyToClaim: boolean;
  }[];
  dojoSlots: {
    slotId: number;
    pokemonUid: string | null;
    regime: 'atk' | 'spe' | 'def' | 'spa' | 'spd' | 'exp';
    startedAt: number | null;
    costPerHour: number;
  }[];
  privateDaycare: {
    isBuilt: boolean;
    slots: { parent1Uid: string | null; parent2Uid: string | null; depositedAt: number | null }[];
  };
  activeIncubators: {
    id: string;
    eggUid: string | null;
    type: 'standard' | 'super';
    remainingUses: number;
    stepsWalked: number;
    stepsRequired: number;
  }[];
}
```

---

## 8. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-HOU-01** | Guardería Pública | Presencial en Ruta 5 (1 pareja, 1 huevo base en mochila). | Eliminar la guardería pública o hacerla accesible desde cualquier menú. | Preserva el rol clásico de los juegos originales de Pokémon. |
| **ADR-HOU-02** | Guardería Privada | Crafteable en el rancho con múltiples corrales de crianza. | Guardería privada regalada desde el inicio. | Ofrece un hito de progresión de endgame muy gratificante. |
| **ADR-HOU-03** | Incubadoras | Crafteables en taller (estilo Pokémon GO) para llevar huevos extra. | Llevar huevos infinitos en la mochila sin límite. | Da propósito al taller y evita la eclosión masiva descontrolada. |
| **ADR-HOU-04** | Huerta de Bayas | Crecimiento en tiempo real sin marchitamiento. | Bayas que mueren si no se riegan a tiempo. | Elimina la frustración de perder cultivos si el jugador no puede conectarse. |
| **ADR-HOU-05** | Dojo de EVs | Cobro de 2,500 P¥/h y retención del Pokémon en el rancho. | Entrenamiento instantáneo gratis o sin retención. | Actúa como un *Money Sink* vital que protege la economía del juego contra la inflación. |
| **ADR-HOU-06** | Taller Crafteo | Ranuras limitadas y tiempo de producción escalonado por tier. | Crafteo instantáneo ilimitado. | Impide que bots o especuladores inunden el mercado de ítems raros. |
