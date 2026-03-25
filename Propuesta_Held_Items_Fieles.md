# 🎒 Propuesta: Objetos Equipados Fieles a los Juegos Originales

Esta propuesta redefine el sistema de objetos equipados para que sea fiel a las entregas de **Pokémon Rojo Fuego / Verde Hoja y Esmeralda**, asignando objetos característicos a especies específicas.

---

## ⚙️ Probabilidades de Aparición
Siguiendo el estándar de los juegos originales, cada especie listada tendrá las siguientes probabilidades al ser encontrada en estado salvaje:

| Categoría | Probabilidad |
| :--- | :---: |
| **Objeto Común** | 50% |
| **Objeto Raro** | 5% |

---

## 📋 Lista de Pokémon y Objetos (Selección Clave)

He seleccionado las especies más icónicas y los objetos que el usuario solicitó específicamente:

| Pokémon | Objeto Común (50%) | Objeto Raro (5%) | Efecto del Objeto |
| :--- | :---: | :---: | :--- |
| **Meowth** | --- | **Moneda Amuleto** | Duplica el dinero ganado en batalla (Permanente). |
| **Snorlax** | --- | **Restos** | Recupera 1/16 de HP cada turno. |
| **Chansey** | --- | **Huevo Suerte** | Aumenta la EXP ganada un 50% (Permanente). |
| **Pikachu** | Baya Aranja | **Bola Luminosa** | Duplica Ataque y At. Especial de Pikachu. |
| **Abra / Kadabra** | --- | **Cuchara Torcida** | Potencia ataques de tipo Psíquico (+20%). |
| **Machoke** | --- | **Banda Focus** | Sobrevive con 1 HP ante un golpe KO. |
| **Magneton** | --- | **Imán** | Potencia ataques de tipo Eléctrico (+20%). |
| **Farfetch'd** | --- | **Palo** | Aumenta drásticamente la probabilidad de críticos. |
| **Cubone / Marowak** | --- | **Hueso Grueso** | Duplica el Ataque de Cubone y Marowak. |
| **Ditto** | --- | **Polvo Metálico** | Aumenta la Defensa de Ditto un 50%. |
| **Shellder / Cloyster** | Perla Grande | Perla | Objetos valiosos para vender en la tienda. |

---

## 🛠️ Nuevos Objetos a Implementar

Para cumplir con esta propuesta, crearé los siguientes objetos que actualmente no existen o funcionan diferente en el juego:

1.  **Huevo Suerte (Held Item):** A diferencia del "Huevo Suerte Pequeño" (que es un consumible temporal), este será un objeto equipable que da el beneficio de EXP de forma **permanente** mientras esté equipado.
2.  **Moneda Amuleto (Held Item):** Versión equipable permanente de la moneda actual.
3.  **Objetos de Mejora de Stats:** **Bola Luminosa**, **Hueso Grueso**, **Palo** y **Polvo Metálico** con sus efectos específicos para sus respectivos Pokémon.
4.  **Boosters de Tipo:** **Cuchara Torcida** (Psíquico) y **Hechizo** (Fantasma).

---

## 💻 Plan de Implementación Técnica

1.  **Actualización de `SHOP_ITEMS`**: Registraré estos nuevos objetos con sus iconos y descripciones en `js/08_shop.js`.
2.  **Lógica de Asignación en `makePokemon`**: Modificaré `js/04_state.js` para incluir una tabla de consulta por `pokemonId`. Al crear un Pokémon salvaje, se lanzarán los dados (50% y 5%) para ver si lleva el objeto correspondiente.
3.  **Efectos en Batalla**: Actualizaré la fórmula de daño en `js/07_battle.js` para reconocer los nuevos multiplicadores (Bola Luminosa, Hueso Grueso, etc.).
4.  **Efecto de EXP y Dinero**: Ajustaré las funciones de recompensa para que verifiquen si el Pokémon activo (o el equipo) lleva el **Huevo Suerte** o la **Moneda Amuleto** equipada.

---

**¿Qué te parece esta lista? Si me das el visto bueno, procederé a crear los objetos y la lógica de asignación.**
