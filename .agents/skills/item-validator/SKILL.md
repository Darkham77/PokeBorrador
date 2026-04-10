---
name: item-validator
description: >
  Valida la integridad de los ítems del juego (SHOP_ITEMS + HEALING_ITEMS).
  Verifica campos obligatorios, coherencia entre sistemas (compra, mochila,
  combate, equipo) y ejecuta el script de validación automática.
---

# Item Validator Skill

## Descripción General

Este skill verifica que cada ítem del juego esté **correctamente definido y funcional**
en los tres sistemas principales:

1. **`js/08_shop.js`** → `SHOP_ITEMS[]` (catálogo, nombre, precio, sprite, descripción)
2. **`js/11_battle_ui.js`** → `HEALING_ITEMS{}` (efecto en mochila y combate)
3. **`js/12_box_bag.js`** → lógica de mochila exterior y equipamiento

---

## Cuándo usarlo

Ejecutar este skill siempre que:

- Se **agregue un nuevo ítem** al juego
- Se **modifique una tienda** (precios, disponibilidad)
- Se **añada un efecto especial** a un ítem existente
- Antes de un **deploy** para garantizar que no haya ítems rotos

---

## Schema Obligatorio de `SHOP_ITEMS`

Todo ítem en `SHOP_ITEMS` **debe** tener los siguientes campos:

```js
{
  id: 'string_snake_case',         // ID único del ítem (sin espacios)
  name: 'Nombre En Español',       // Nombre en pantalla (coincide con inventory key)
  cat: 'healing|held|tm|breeding|special|stone', // Categoría funcional
  sprite: 'https://...',           // URL de sprite (imagen pixelada)
  icon: '🔤',                     // Emoji de respaldo si el sprite falla
  price: 1000,                     // Precio en tienda (o 0 si no se vende)
  desc: 'Descripción clara...',    // Descripción visible en UI
  effect: (qty) => { ... },        // Función que suma al inventario al comprar
  // Opcionales / condicionales:
  unlockLv: 5,                     // Nivel mínimo del entrenador para comprarlo
  tier: 'common|rare|epic|legendary',
  market: true,                    // ¿Aparece en el mercado P2P?
  trainerShop: true,               // ¿Aparece en la tienda del entrenador?
  type: 'held',                    // Si es 'held', es equipable en Pokémon
}
```

### Categorías válidas de `cat`:

| cat       | Significado                                     |
|-----------|-------------------------------------------------|
| `healing` | Ítem de curación / PP / estados                 |
| `held`    | Equipable en un Pokémon                         |
| `tm`      | Movimiento técnica (MT)                         |
| `breeding`| Uso exclusivo en guardería                      |
| `special` | Repelentes, tickets, inciensos, buffs globales  |
| `stone`   | Piedra de evolución                             |

---

## Schema Obligatorio de `HEALING_ITEMS`

Todo ítem usable **fuera de combate o dentro de combate** debe tener una entrada en `HEALING_ITEMS`:

```js
'Nombre del Ítem': (pokemon) => {
  // Retorna: string (mensaje de éxito) | null (fallo silencioso) | 'deferred' (modal)
}
```

### Reglas del retorno:
- **`null`** → condición no cumplida (p.e. HP ya está lleno), NO consume el ítem
- **`'deferred'`** → abre un modal, el ítem se consume dentro del modal o callback
- **`string`** → éxito, el ítem se consume automáticamente

---

## Comportamiento Esperado por Categoría

| Campo           | healing | held  | tm    | breeding | special | stone |
|-----------------|---------|-------|-------|----------|---------|-------|
| sprite          | ✅      | ✅    | ✅    | ✅       | ✅      | ✅    |
| icon            | ✅      | ✅    | ✅    | ✅       | ✅      | ✅    |
| desc            | ✅      | ✅    | ✅    | ✅       | ✅      | ✅    |
| price > 0       | ✅      | ✅    | ✅    | ✅       | ✅      | ✅    |
| HEALING_ITEMS   | ✅      | ❌    | ✅    | ❌       | ✅      | ❌    |
| type='held'     | ❌      | ✅    | ❌    | ❌       | ❌      | ❌    |
| usable combate  | ✅ *    | ❌    | ❌    | ❌       | ❌**   | ❌    |
| usable exterior | ✅      | ❌    | ✅    | ❌       | ✅      | ✅    |
| equipable       | ❌      | ✅    | ❌    | ❌       | ❌      | ❌    |
| se consume      | ✅      | ❌    | ✅    | ✅       | ✅      | ✅    |

> \* Curativos simples (Poción, etc.) - MTs y items especiales están bloqueados en combate  
> \*\* Repelentes/Tickets son "globales" (no apuntan a Pokémon específico)

---

## Pasos para Agregar un Nuevo Ítem

### 1. Agregar entrada en `SHOP_ITEMS` (js/08_shop.js)

```js
{
  id: 'mi_item',
  cat: 'healing',   // ← ajustar según tipo
  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/NOMBRE.png',
  name: 'Mi Ítem',
  icon: '💊',
  price: 1500,
  unlockLv: 1,
  tier: 'common',
  market: true,
  trainerShop: false,
  desc: 'Descripción clara del efecto del ítem.',
  effect: (qty) => { state.inventory['Mi Ítem'] = (state.inventory['Mi Ítem'] || 0) + qty; }
},
```

### 2. Si es usable → agregar en `HEALING_ITEMS` (js/11_battle_ui.js)

```js
'Mi Ítem': p => {
  if (p.hp === p.maxHp) return null;   // Condición de fallo
  p.hp = Math.min(p.maxHp, p.hp + 50);
  return `recuperó 50 HP`;
},
```

### 3. Si NO es usable en combate → agregarlo a la lista `nonCombat` (js/11_battle_ui.js línea ~300)

### 4. Si es equipable → asegurarse de que `type: 'held'` esté en `SHOP_ITEMS`

### 5. Correr el validador

```bash
node .agents/skills/item-validator/validate_items.js
```

---

## Validaciones Automáticas (validate_items.js)

El script verifica:

- ✅ Todos los ítems en `SHOP_ITEMS` tienen: `id`, `name`, `cat`, `sprite`, `icon`, `desc`, `price`, `effect`
- ✅ Todos los `cat: 'healing'` tienen entrada en `HEALING_ITEMS`
- ✅ Todos los `cat: 'tm'` tienen entrada en `HEALING_ITEMS`
- ✅ Todos los `cat: 'special'` tienen entrada en `HEALING_ITEMS`
- ✅ Los ítems en `HEALING_ITEMS` existen en `SHOP_ITEMS`
- ✅ Ningún ítem `held` tiene entrada en `HEALING_ITEMS` (sería un error)
- ✅ Los ítems equipables (`type: 'held'`) no están bloqueados de combate
- ⚠️  Ítems con `price: 0` pero sin `market: false` (posible error de configuración)

---

## Criterios de Aprobación

Un ítem está **COMPLETO Y CORRECTO** si:
1. Tiene todos los campos obligatorios del schema
2. Su comportamiento en mochila (combate y exterior) coincide con su categoría
3. Pasa sin errores el script `validate_items.js`

Un ítem está **ROTO** si:
- Está en `HEALING_ITEMS` pero no en `SHOP_ITEMS` (ítem fantasma)
- Está en `SHOP_ITEMS` como `healing` pero no en `HEALING_ITEMS` (inutilizable)
- Le falta `sprite` o `icon` (se verá vacío en la UI)
- Le falta `desc` (la tarjeta del ítem mostrará texto vacío)
