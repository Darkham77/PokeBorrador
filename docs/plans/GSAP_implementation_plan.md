# Estudio y Plan de Trabajo: Migración a GSAP

Este documento detalla el análisis del sistema de animaciones actual y el plan para su modernización utilizando **GSAP (GreenSock Animation Platform)**, cumpliendo con la identidad _Hybrid Retro-Modern_ del proyecto.

## 1. Análisis del Sistema Actual

El sistema actual se basa en una combinación de:

- **CSS Keyframes**: Definidos en `_keyframes.scss`.
- **Vue Reactive States**: Flags como `isWildEntryAnimation`, `playerIsShaking`, etc.
- **setTimeout Orchestration**: Secuenciación manual de estados mediante `setTimeout` en `useBattleAnimations.ts`.
- **Event Bus**: Comunicación vía `gameBus` para disparar efectos visuales.

### Limitaciones Identificadas

- **"SetTimeout Hell"**: La secuenciación de animaciones complejas (como la entrada de un Pokémon salvaje) es difícil de mantener y depurar.
- **Falta de Control**: No es posible pausar, revertir o acelerar animaciones fácilmente (crítico para futuras opciones de "velocidad de batalla").
- **Interpolación Limitada**: CSS no ofrece la riqueza de easings y controles de interpolación que GSAP provee.
- **Riesgo de Race Conditions**: Los `setTimeout` no están sincronizados con el ciclo de vida de los componentes, lo que puede causar parpadeos o estados inconsistentes si la batalla termina abruptamente.

## 2. Propuesta: Arquitectura GSAP

GSAP permitirá centralizar la lógica de animación, mejorando la fluidez y permitiendo efectos visuales más "premium" sin sacrificar el estilo pixel-art.

### Objetivos Técnicos

- **Timelines centralizados**: Reemplazar los `setTimeout` encadenados por `gsap.timeline()`.
- **Performance**: GSAP utiliza `requestAnimationFrame`, lo que garantiza 60 FPS estables.
- **Mantenibilidad**: Código imperativo más legible para secuencias complejas.
- **Cero-Ignore Policy**: Implementación con tipos estrictos para GSAP.

## 3. Plan de Trabajo (Fases)

### Fase 1: Infraestructura y Estándares

- [ ] Instalación de `gsap` y `@types/gsap`.
- [ ] Creación de `src/logic/utils/animationRegistry.ts` para constantes de timing y easings predefinidos (manteniendo consistencia).
- [ ] Definición de una política de "CSS vs GSAP":
  - **CSS**: Para micro-animaciones constantes (hover, pulsos suaves, loops simples).
  - **GSAP**: Para secuencias, interacciones lógicas y efectos complejos.

### Fase 2: Migración del Motor de Batalla (`useBattleAnimations.ts`)

Esta es la parte más crítica y compleja.

- [ ] **Refactor de Secuencias**:
  - Migrar `triggerSearchEncounter` a un GSAP Timeline.
  - Migrar la secuencia de captura (`CATCH_SUCCESS`) y desmayo (`POKEMON_FAINT`).
- [ ] **Sincronización con FSM**: Asegurar que las transiciones de estado de la FSM esperen a que el Timeline de GSAP complete (usando promesas de GSAP).
- [ ] **Efectos de Daño**: Reemplazar `playerIsShaking` / `playerIsBlinking` por tweens directos de GSAP sobre los elementos DOM (o refs).

### Fase 3: Modern UI Shell (Componentes Globales)

- [ ] **Modales**: Migrar `BaseModal` para usar GSAP en sus transiciones de entrada/salida (Glassmorphism reveals).
- [ ] **Transiciones de Ruta**: Implementar transiciones suaves entre vistas (ej: Map -> Battle) usando GSAP.
- [ ] **Efectos de Texto**: Implementar el "typing effect" de los logs de batalla de forma más fluida.

### Fase 4: Optimización y GPU

- [ ] **Texture Atlases**: Asegurar que los tweens de GSAP no fuercen repaints innecesarios (uso de `force3D: true`).
- [ ] **Limpieza**: Eliminar flags reactivos innecesarios y archivos SCSS obsoletos.

## 4. Ejemplo de Implementación (Antes vs Después)

### Antes (CSS + setTimeout)

```typescript
// useBattleAnimations.ts
isWildEntryAnimation.value = true;
setTimeout(() => {
  isEmerging.value = true;
}, 600);
setTimeout(() => {
  isWildSilhouette.value = false;
}, 1400);
```

### Después (GSAP Timeline)

```typescript
// useBattleAnimations.ts
const tl = gsap.timeline({ onComplete: resolve });
tl.to(sprite, { y: -20, duration: 0.6, ease: 'power2.out' }).to(
  sprite,
  { filter: 'brightness(1)', duration: 0.8 },
  '+=0.2'
);
```

## 5. Verificación y Calidad

- **FPS Stability**: Monitoreo con el debugger interno para asegurar que no hay drops durante animaciones intensas.
- **Type Checking**: `npm run type-check` para validar la integración de GSAP.
- **Unit Testing**: Actualizar tests que dependen de tiempos de animación.

---

> [!IMPORTANT] La migración debe ser incremental. Se recomienda empezar por los efectos de daño y luego proceder con las secuencias de entrada que son las más propensas a errores.
