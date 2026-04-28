# Manual del Sistema de Ítems (Poké Vicio)

Este manual define la estructura, categorías y protocolos de validación para todos los ítems del juego.

## 📦 Estructura de Datos

Los ítems se gestionan en `src/data/items.js` a través de dos objetos principales:

### 1. `SHOP_ITEMS` (Catálogo)

Define cómo se ve y cuánto cuesta el ítem.

```js
{
  id: 'snake_case_id',
  name: 'Nombre Visible',
  cat: 'healing|held|tm|breeding|special|stone',
  sprite: 'URL_pixel_art',
  icon: 'emoji',
  price: 1000,
  desc: 'Descripción...',
  effect: (qty) => { inventoryStore.addItem('Nombre', qty); }
}
```

### 2. `HEALING_ITEMS` (Lógica Usable)

Define qué hace el ítem al usarse sobre un Pokémon o globalmente.

- Retorno `null`: No se cumple condición (ej. HP lleno). El ítem **NO** se consume.
- Retorno `'deferred'`: Abre un modal.
- Retorno `string`: Mensaje de éxito. El ítem se consume automáticamente.

---

## 💰 Economía de Ítems

- **Precio de Venta**: Los ítems se venden por el **50%** de su valor de compra (`price * 0.5`).
- **Batch Selling**: El sistema permite la venta masiva de ítems, calculando el beneficio total antes de confirmar.

---

## 📖 Uso de TMs y Evolución

### 1. Máquinas Técnicas (TMs)

- **Aprendizaje**: Si el Pokémon tiene < 4 movimientos, aprende el nuevo instantáneamente.
- **Queue**: Si tiene 4 movimientos, se añade a una cola de aprendizaje (`learnQueue`) para que el usuario elija cuál olvidar.
- **Consumo**: El ítem se consume únicamente después de confirmar el aprendizaje.

### 2. Piedras Evolutivas

- **Validación**: El ítem solo aparece como "Usable" si el Pokémon tiene una evolución definida con ese ítem específico en `evolutionData.js`.
- **Trigger**: Activa la escena de evolución de Phaser antes de consumir el objeto.

### 3. Objetos Especiales (Held Items)

- **Equipamiento**: Al equipar un ítem, si el Pokémon ya tenía uno, este regresa automáticamente al inventario.
- **Restricción de Batalla**: No se pueden equipar/desequipar ítems durante un combate activo.

---

## 🛠️ Categorías Funcionales (`cat`)

| Categoría | Uso Principal | Entrada en `HEALING_ITEMS` |
| :--- | :--- | :--- |
| `healing` | Curación, PP, Estados | ✅ Obligatoria |
| `held` | Equipable en Pokémon (`type: 'held'`) | ❌ Prohibida |
| `tm` | Enseñar movimientos | ✅ Obligatoria |
| `stone` | Evolución | ✅ Obligatoria |
| `special` | Buffs globales, Repelentes | ✅ Obligatoria |

---

## 🚀 Protocolo para Agregar Ítems

1. **Registro**: Agregar entrada en `SHOP_ITEMS`.
2. **Lógica**: Si es usable, agregar función en `HEALING_ITEMS`.
3. **Restricción de Combate**: Si no es usable en batalla, agregarlo a la lista `nonCombat` en `items.js`.
4. **Validación**: Ejecutar el script:

   ```bash
   node .agents/skills/item-validator/scripts/validate_items.js
   ```

---

## 🚨 Reglas de Integridad

- **Detección de Assets**: El sistema busca palabras clave (ball, stone, potion) para resolver assets de PokeAPI. Si el ítem no sigue estas convenciones, debe mapearse manualmente en el resolver.
- **Normalización**: Los IDs y nombres se tratan como case-insensitive en la lógica, pero los archivos de assets deben estar en minúsculas.
- **Transparencia Financiera**: Todas las operaciones de venta masiva deben mostrar el beneficio total estimado en el diálogo de confirmación.
