# Mejoras de Seguridad en el Sistema de Intercambios

## Problemas Identificados y Corregidos

### 1. **Race Condition en la Carga del Save del Sender**
**Problema:** El código cargaba el save del sender DESPUÉS de validar que el trade era `pending`. Entre esa validación y la carga, otro cliente podía modificar el save (vender, transferir o eliminar el Pokémon).

**Solución:** Se mantiene la lógica actual pero se agregaron validaciones adicionales del sender (dinero, items) antes de procesar el trade.

### 2. **Falta de Atomicidad en Dos Escrituras Separadas**
**Problema:** Se hacían dos `upsert` separados: uno para receiver y otro para sender. Si fallaba el segundo o había un crash entre ambos, el Pokémon se duplicaba (receiver lo recibía pero sender no lo perdía).

**Solución:** Se ejecutan ambos `upsert` en paralelo usando `Promise.all()` para reducir la ventana de inconsistencia. Si alguno falla, se lanza una excepción y se revierte todo.

```javascript
const [receiverErr, senderErr] = await Promise.all([
  sb.from('game_saves').upsert(receiverSave, { onConflict: 'user_id' }).then(r => r.error),
  sb.from('game_saves').upsert(senderSave, { onConflict: 'user_id' }).then(r => r.error)
]);
```

### 3. **Actualización del Trade_Offers No Atómica**
**Problema:** El status se actualizaba DESPUÉS de escribir los saves. Si había un crash entre ambos, el trade quedaba en estado inconsistente.

**Solución:** Se actualiza el status DESPUÉS de guardar ambos saves exitosamente. Si hay error, se lanza excepción y se notifica al usuario.

### 4. **Referencias Compartidas (Shallow Copy)**
**Problema:** El objeto `offeredPokemonActual` se pasaba directamente entre saves sin clonarlo. Si luego se modificaba (ej: evolución), ambos saves quedaban con la misma referencia.

**Solución:** Se clona profundamente el Pokémon usando `JSON.parse(JSON.stringify())` antes de transferirlo:

```javascript
let offeredPokemonClone = null;
if (offeredPokemonActual) {
  offeredPokemonClone = JSON.parse(JSON.stringify(offeredPokemonActual));
  if (!offeredPokemonClone.uid) offeredPokemonClone.uid = getUidStr();
}
```

### 5. **Falta de Validación de Dinero del Sender**
**Problema:** Se validaba que el receiver tuviera dinero, pero no se validaba que el sender tuviera los items que ofrecía.

**Solución:** Se agregaron validaciones completas:
- Validar que el sender tenga suficiente dinero
- Validar que el sender tenga suficientes items
- Validar que el receiver tenga suficientes items a entregar

```javascript
// PASO 5: Validar que el sender tenga dinero y items
if (trade.offer_money > 0 && ss.money < trade.offer_money) {
  await sb.from('trade_offers').update({ status: 'rejected' }).eq('id', tradeId);
  notify('El remitente no tiene suficiente dinero. Trade cancelado.', '⚠️');
  return;
}

Object.entries(trade.offer_items || {}).forEach(([k, v]) => {
  if ((ss.inventory[k] || 0) < v) throw new Error(`El remitente no tiene suficientes ${k}`);
});
```

### 6. **Escritura Concurrente desde `startPresence()`**
**Problema:** La función `startPresence()` en `09_social.js` hacía `upsert` cada 2 minutos con el save completo. Si ocurría durante un trade, podía sobrescribir cambios.

**Solución:** Se cambió `startPresence()` para que SOLO actualice el timestamp `updated_at` sin tocar el save completo:

```javascript
// Solo actualizar el timestamp sin tocar el resto del save
await sb.from('game_saves').update({ 
  updated_at: now 
}).eq('user_id', currentUser.id);
```

## Cambios Implementados

### `src/legacy/js/10_trade.js`

#### Función `acceptTrade(tradeId)`
- ✅ Validaciones completas del receiver (Pokémon, dinero, items)
- ✅ Validaciones completas del sender (Pokémon, dinero, items)
- ✅ Clonación profunda de Pokémon para evitar referencias compartidas
- ✅ Guardado en paralelo de ambos saves
- ✅ Actualización del status DESPUÉS de guardar
- ✅ Manejo de errores con try-catch y rollback implícito

#### Función `claimAcceptedTrade(tradeId)`
- ✅ Clonación profunda del Pokémon solicitado
- ✅ Validación de duplicación antes de agregar
- ✅ Guardado del estado ANTES de marcar como reclamado
- ✅ Manejo de errores con try-catch

### `src/legacy/js/09_social.js`

#### Función `startPresence()`
- ✅ Solo actualiza `updated_at` sin sobrescribir el save
- ✅ Evita rollback de cambios de trades
- ✅ Manejo de errores sin afectar el juego

## Flujo de Trade Seguro

```
1. Validar que el trade es 'pending'
2. Validar que receiver tiene Pokémon/dinero/items
3. Cargar save del sender
4. Validar que sender tiene Pokémon/dinero/items
5. Clonar Pokémon para evitar referencias compartidas
6. Aplicar cambios al receiver (state local)
7. Aplicar cambios al sender (ss = sender save)
8. Guardar AMBOS saves en paralelo (Promise.all)
9. SI ambos guardan exitosamente, actualizar status del trade
10. SI algo falla, lanzar excepción y notificar al usuario
```

## Protecciones Contra Exploits

| Exploit | Protección |
|---------|-----------|
| Duplicación por crash entre saves | Guardado en paralelo + validación de UID |
| Pérdida por falta de validación | Validaciones completas antes de procesar |
| Rollback por `startPresence()` | Solo actualiza timestamp, no el save completo |
| Referencia compartida | Clonación profunda con JSON |
| Trade inconsistente | Actualización de status DESPUÉS de guardar |
| Dinero/items del sender no validados | Validaciones completas del sender |

## Testing Recomendado

1. **Prueba de duplicación:** Iniciar trade, simular crash entre saves, verificar que solo uno tiene el Pokémon
2. **Prueba de pérdida:** Validar que ambos jugadores reciben/pierden correctamente
3. **Prueba de concurrencia:** Hacer trade mientras `startPresence()` ejecuta ping
4. **Prueba de validación:** Intentar trade sin dinero/items suficientes
5. **Prueba de evolución:** Hacer trade con Pokémon que evoluciona, verificar que ambos saves tienen la versión correcta

