# 🎒 Propuesta: Sistema de Objetos Equipados en Pokémon Salvajes

Esta propuesta detalla la implementación de una mecánica donde los Pokémon salvajes tienen una probabilidad de llevar objetos equipados al ser capturados. El sistema está diseñado para ser equilibrado con la economía actual del juego y añadir un incentivo extra a la exploración.

---

## 📈 Probabilidades Globales

He dividido los objetos en **tres categorías de rareza**, basándome en su valor en la *Trainer Shop* (Battle Coins) y su impacto en el combate.

| Rareza | Probabilidad | Descripción |
| :--- | :---: | :--- |
| **Común** | 15% | Objetos de boost de tipo (20%) y utilidades básicas. |
| **Raro** | 5% | Objetos tácticos (Lente Zoom, Cascabel Concha) y de crianza. |
| **Épico** | 1% | Objetos de alto valor (Restos, Cinta Elegida, Banda Focus). |

> **Nota:** La probabilidad total de que un Pokémon lleve *cualquier* objeto es del **21%**. Esto significa que aproximadamente 1 de cada 5 capturas vendrá con un regalo.

---

## 📦 Lista de Objetos Sugeridos

He seleccionado objetos que ya existen en el código para asegurar compatibilidad total con el sistema de combate actual.

### 1. Categoría Común (15% de chance)
Estos objetos potencian un 20% los ataques de su tipo respectivo.
*   **Cinturón Negro** (Lucha)
*   **Carbón** (Fuego)
*   **Agua Mística** (Agua)
*   **Semilla Milagro** (Planta)
*   **Imán** (Eléctrico)

### 2. Categoría Rara (5% de chance)
Objetos con efectos tácticos moderados o utilidad en crianza.
*   **Lente Zoom** (Aumenta críticos)
*   **Cascabel Concha** (Cura al atacar)
*   **Piedra Eterna** (Útil para heredar naturaleza en crianza)
*   **Piedra Lunar** (Objeto de evolución raro)

### 3. Categoría Épica (1% de chance)
Objetos competitivos de alto nivel.
*   **Restos** (Recupera vida cada turno)
*   **Cinta Elegida** (Aumenta mucho el ataque, bloquea un movimiento)
*   **Banda Focus** (Evita el KO de un solo golpe)
*   **Caramelo Raro** (Sube un nivel al instante)

---

## 🛠️ Plan de Implementación Técnica

1.  **Modificación de `makePokemon`**: Añadiré una lógica en `js/04_state.js` para que, al generar un Pokémon salvaje, se evalúe si debe llevar un objeto basado en las probabilidades anteriores.
2.  **Lógica de Selección**:
    *   Si el Pokémon es de un tipo específico (ej. Fuego), tendrá más chance de llevar el objeto potenciador de ese tipo (**Carbón**).
    *   Si no tiene un objeto de tipo asignado, se elegirá uno de la lista general de su categoría de rareza.
3.  **Persistencia en Captura**: El objeto se mantendrá en el campo `heldItem` del Pokémon al ser guardado en el equipo o en la caja.
4.  **Notificación Visual**: Al capturar al Pokémon, se añadirá un mensaje en el log de batalla: *"¡Parece que [Nombre] llevaba un [Objeto] equipado!"*.

---

## 📝 ¿Qué necesito de ti?
1.  ¿Te parecen bien los porcentajes (**15% / 5% / 1%**)?
2.  ¿Quieres añadir algún objeto específico que no esté en la lista?
3.  ¿Deseas que ciertos Pokémon tengan objetos exclusivos (ej. Pikachu siempre con una probabilidad de llevar **Imán**)?

**Espero tu decisión final para proceder con el código.**
