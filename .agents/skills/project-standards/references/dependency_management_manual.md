# Dependency Management Manual

Este manual define la política de versiones y estabilidad de las librerías del proyecto Poké Vicio.

## 🛡️ Core Stable Stack

Para garantizar el funcionamiento de los sistemas críticos (PWA, Service Workers, Animations), el proyecto se adhiere a un "Stack de Estabilidad Confirmada":

| Librería | Versión | Rol |
| :--- | :--- | :--- |
| **Vite** | `^7.x` | Build Tool & Dev Server |
| **Vue** | `^3.5.x` | Framework Core |
| **Pinia** | `^2.x` | State Management |
| **Vue Router** | `^4.x` | Routing |
| **Vitest** | `^3.x` | Testing Framework |

### Por qué no usamos "Latest" (Vite 8+, Pinia 3+)
Aunque existan versiones más nuevas, el ecosistema de plugins (específicamente `vite-plugin-pwa`) suele tardar en alcanzar la paridad de soporte. Usar versiones de "vanguardia" rompe la política de **Zero-Warning** y la integridad del Service Worker en dispositivos móviles.

---

## 🩹 Parches y Overrides

Cuando se detectan vulnerabilidades críticas en sub-dependencias profundas que no han sido actualizadas por sus mantenedores, el proyecto utiliza el campo `overrides` en `package.json`.

> [!IMPORTANT]
> **Parches de Compilación Actual**: Todos los overrides (como el de `serialize-javascript`) son medidas correctivas para la compilación y el estado actual del ecosistema. Deben revisarse en cada salto mayor de versión.

---

## 🚀 Guía para Futuras Migraciones

Antes de intentar subir de versión cualquier librería del "Core Stack", se DEBE seguir este protocolo:

1. **Análisis de Ola (Wave Analysis)**: No actualices una pieza sola. Vite, Pinia y Vue Router suelen moverse en "olas". Verifica que existan versiones estables de las tres antes de migrar una.
2. **Auditoría de Peer Dependencies**: Verifica explícitamente que `vite-plugin-pwa` soporte la nueva versión mayor de Vite.
3. **Validación de Mixins SASS**: Las actualizaciones de Sass (ej. hacia 2.0) pueden romper los mixins de pixel-art. Mantén `sass` en versiones que no fuercen refactorizaciones masivas de color a menos que sea necesario.
4. **Prueba de Build PWA**: Una migración solo se considera exitosa si `npm run build` genera un `sw.js` válido y funcional.

---

## 🛠️ Comandos de Mantenimiento

- **Verificar Vulnerabilidades**: `npm audit`
- **Limpieza de Caché**: `npm cache clean --force`
- **Reinstalación Limpia**: `rm -rf node_modules package-lock.json && npm install`
