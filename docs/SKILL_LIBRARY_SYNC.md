# 🧠 Skill: Sincronización de la Biblioteca de Ayuda

Esta "Skill" es una instrucción obligatoria para cualquier IA que realice cambios en las mecánicas del juego `PokeBorrador`.

## 🎯 Objetivo
Asegurar que el botón **Biblioteca 📚** (ubicado en el HUD) siempre muestre información precisa y actualizada a los jugadores.

## 📋 Flujo de Trabajo Obligatorio

Cada vez que se realice un cambio en:
1.  **Reglas de Combate** (probabilidades, fórmulas de daño, efectos de estado).
2.  **Sistema de Captura** (ratios, efectos de Pokéballs, racha de capturas).
3.  **Clases de Jugador** (bonos, penalizaciones, habilidades únicas).
4.  **Crianza** (herencia de IVs, tiempos de eclosión).
5.  **Eventos o Gimnasios** (nuevos líderes, recompensas).

**DEBES realizar los siguientes pasos:**

### Paso 1: Identificar el cambio
Analiza qué archivo de la carpeta `src/legacy/js/` ha sido modificado (ej: `07_battle.js`, `15_breeding.js`, `20_classes.js`).

### Paso 2: Localizar la sección en la Biblioteca
Busca el objeto `libraryContent` dentro de `src/legacy/js/22_library.js`. Las claves actuales son:
- `gimnasios`
- `captura`
- `eventos`
- `clases`
- `crianza`

### Paso 3: Actualizar el HTML de ayuda
Modifica el string de la sección correspondiente en `src/legacy/js/22_library.js` para reflejar el cambio técnico de forma legible para el jugador. 
- Usa etiquetas `<strong>` para resaltar valores numéricos.
- Usa `<ul>` y `<li>` para listas de cambios.
- Usa `<table class="library-table">` si el cambio afecta a múltiples datos comparativos.

### Paso 4: Verificación
Asegúrate de que la función `toggleLibrary()` y `switchLibraryTab()` sigan funcionando correctamente tras la edición.

---
*Nota: Esta biblioteca es la única fuente de verdad "dentro del juego" para el jugador. Si cambias un código y no actualizas la biblioteca, el jugador se sentirá confundido.*
