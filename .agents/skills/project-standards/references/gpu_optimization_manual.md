# GPU Optimization & Performance Manual

This manual details the mandatory techniques for maintaining stable 60 FPS in a high-fidelity visual environment.

## 1. GPU Layer Promotion

All heavy components or those that animate frequently must be promoted to a GPU compositor layer.

- **Mandatory**: Use `@include gpu-layer` on Modals, Overlays, MapCards, PC Box, and HUD.
- **Technique**: This injects `transform: translate3d(0,0,0)` and `backface-visibility: hidden`.
- **Golden Rule**: If an element uses `backdrop-filter: Blur()`, it **MUST** have layer promotion to avoid stuttering.

## 2. Low-Cost Animations

- **Allowed Properties**: `transform` (scale, translate, rotate) and `opacity`.
- **Native Opacity**: NEVER use `filter: Opacity()` for static transparency; use the native `opacity` property to avoid redundant GPU layer creation.
- **Forbidden Properties**: `margin`, `padding`, `width`, `height`, `top`, `left`, `right`, `bottom`.
- **Will-Change**: Use `@include will-animate(transform, opacity)` only on elements with constant animations (e.g., auras, Shiny pulses). Do not abuse, as it consumes video memory.

## 3. Smooth Scroll & Gutter

- **Standard**: Use `@include smooth-scroll`.
- **Zero Scrollbar Gutter**: `scrollbar-gutter: stable` is forbidden. Layouts must be fluid and edge-to-edge.
- **Padding**: Delegate padding to the innermost scrollable component to prevent glow effects from being clipped by the parent container.

## 4. Complexity Management (LOD)

- **LOD (Level of Detail)**: For very long lists (Pokedex, PC Box with 500+ Pokemon), implement virtualization or lazy loading.
- **Memoization**: Use `computed` in Vue to avoid O(N) calculations in every template rendering cycle.

---

## 5. Sincronización de Modales y Performance

El sistema de modales debe integrarse con el motor de renderizado de fondo (Phaser/Mapa) para optimizar recursos.

### Ciclo de Vida del Modo Performance

- **Entrada**: Activa la simplificación del fondo **INMEDIATAMENTE** cuando un modal que oscurece la pantalla empieza a abrirse. Esto evita ruido visual durante la transición.
- **Salida**: Restaura la fidelidad total del fondo **INMEDIATAMENTE** cuando el último modal empieza su animación de cierre (`close`). Esto permite al usuario ver el mundo regresar a través del overlay que se desvanece.

### Inmersión y Desbordamiento (Clipping FX)

Para eventos cinemáticos (Evolución, Eclosión), el modal debe permitir que los efectos visuales desborden su contenedor:

- **Configuración**: Usa `overflow: visible !important` y fondos transparentes en `BaseModal`.
- **Z-Index**: Los efectos de partículas deben estar por encima del contenido del modal pero por debajo del botón de cierre.
