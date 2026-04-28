---
name: project-browser-testing
description: Orquestador de tests E2E. Delega los protocolos de entorno y simulación al manual `@/project-standards/references/browser_testing_manual.md`.
---

# Skill: Browser Testing (Orquestador)

> [!IMPORTANT]
> Para realizar pruebas en navegador, **DEBES** seguir el protocolo de login y simulación detallado en el [Manual de Testing en Navegador](../project-standards/references/browser_testing_manual.md).

## Flujo de Ejecución

1. **Servidor Local**: Asegúrate de que `http://localhost:5173` esté activo.
2. **Login ASH**: Identifícate como el usuario de pruebas estándar.
3. **Comandos de Simulación**: Usa `window.__VITE_DEBUG__` para teleportarte a las vistas que deseas probar.

## Diagnóstico

Si un test falla, realiza un diagnóstico dual revisando tanto la consola del navegador como los logs del servidor de desarrollo.
