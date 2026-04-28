# Manual de Migración y Referencia de Código Legacy

Este manual gobierna el proceso de modernización del código pre-Vue hacia la arquitectura actual de Poké Vicio, manteniendo la paridad visual 1:1.

## 📂 Fuentes de Referencia

- El código original se encuentra en `backup_legacy_code/`.
- Úsalo para comparar fórmulas de batalla, assets visuales o comportamientos que hayan sufrido regresiones en la versión Vue.

---

## 🏛️ Protocolo de Migración (Migrator-Legacy-Vue)

### 1. Paridad Visual Estricta

- Cada componente migrado debe ser idéntico al original en términos de pixel-art, alineación y animaciones.
- Se prohíbe la "mejora" de assets durante la migración sin aprobación; el objetivo es la estabilidad operativa.

### 2. Aislamiento de Lógica

- Extrae la lógica de los archivos `.js` legacy hacia composables de Vue 3 (`src/logic/` o `src/composables/`).
- Mantén los archivos de lógica por debajo de las 500 líneas (Regla de Oro).

### 3. Verificación de Regresiones

Después de migrar un módulo crítico (ej. el sistema de cajas o el inventario):

- Compara el comportamiento con el script de unit test legacy: `node backup_legacy_code/unit_test_battle.js`.
- Verifica que el estado de guardado persista correctamente entre versiones.

---

## 🚨 Reglas de Referencia

- **Prohibición de "Islands"**: No crees nuevos sistemas de estilos si existe un mixin global en `src/assets/styles/`.
- **Detección de Cambios**: Si descubres una lógica legacy que contradice los estándares actuales (ej. un cálculo de daño obsoleto), prioriza SIEMPRE el estándar documentado en `project-standards`.
