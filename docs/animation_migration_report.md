# Reporte de Migración de Animaciones a GSAP

Este documento detalla todas las animaciones de combate que han sido migradas de keyframes CSS tradicionales a la orquestación determinista con **GSAP**, cumpliendo con los estándares de rendimiento y sincronización del proyecto.

## 1. PVSpriteFX.vue (Núcleo de Efectos Visuales)

Se ha centralizado la lógica de partículas y auras persistentes usando líneas de tiempo de GSAP.

| Efecto | Descripción de la Migración | Estado |
| :-- | :-- | :-- |
| **Brillos Shiny** | Migrados a GSAP con desincronización aleatoria. Se corrigió el desplazamiento horizontal no deseado. | ✅ Finalizado |
| **Aura Guardián** | Reemplazado el pulso CSS por un `gsap.fromTo` con easing `sine.inOut`. | ✅ Finalizado |
| **Estados Primarios** | Quemadura (pulso naranja), Envenenamiento (glow púrpura), Parálisis (jitter amarillo), Sueño (atenuación) y Congelación (set azul hielo). | ✅ Finalizado |
| **Estados Secundarios** | Confusión (wobble), Maldición (aura oscura), Drenadoras (flote verde), Atrapado (cadenas) y Atracción (corazones). | ✅ Finalizado |
| **Efectos Tácticos** | Protección (escudo), Aguante (foco), Foco Energía (mira) y Fijar Blanco (objetivo). | ✅ Finalizado |
| **Pantallas y Auras** | Reflejo, Pantalla Luz, Velo Sagrado y Neblina (movimiento de deriva suave). | ✅ Finalizado |

## 2. Componentes de Arena y Entorno

| Componente | Animación Migrada | Detalles Técnicos |
| :-- | :-- | :-- |
| **CombatGrass.vue** | Agitación de arbustos (Wiggle) | Implementado con `gsap.to` y `repeat: -1` para reemplazo de `pulse-grass`. |
| **BattleArenaView.vue** | Entrada/Salida de Entrenadores | Desplazamiento lateral suave con easing `back.out` para entradas de rivales. |
| **BattleInfoCard.vue** | Animación de Level Up | Disparada vía `gameBus` con efecto de brillo y escalado en la tarjeta de HUD. |
| **FishingMinigame.vue** | Notas y Feedback | Movimiento de notas y animaciones de acierto/fallo orquestadas con GSAP. |

## 3. Sistema de Debug y Control

Se han integrado botones específicos en el panel de administración para testear cada una de estas animaciones individualmente:

- **Trigger Anim UI**: Permite disparar manualmente `trainer_in`, `trainer_out`, `levelUp`, y `bush_wiggle`.
- **Modo Silueta**: Toggle manual para forzar el estado de silueta en el Pokémon enemigo.

---

**Estado General de la Migración:** 100% Completada. **Política de Zero-Timers:** Se eliminaron todos los `setTimeout` en favor de promesas de GSAP y callbacks `onComplete`.
