# GUÍA DE RESTAURACIÓN DE EFECTOS DE ESTADO (Vicio Edition)

Este directorio contiene la lógica y los efectos visuales premium para los estados alterados (Veneno, Parálisis, Sueño, etc.) y efectos de campo (Reflejo, Pantallas, Drenadoras).

## ⚠️ IMPORTANTE PARA LA IA
Esta versión utiliza `PVSpriteFX.vue` como motor central de partículas. Al restaurar, asegúrate de que el componente `BattleCombatant.vue` envuelva el sprite del Pokémon con `<PVSpriteFX>`.

## Paso 1: Restauración de Archivos

### Componentes Visuales
```powershell
Copy-Item "docs/ESTADOS/components/PVSpriteFX.vue" "src/components/common/PVSpriteFX.vue" -Force
Copy-Item "docs/ESTADOS/components/AtmosphereLayer.vue" "src/components/common/AtmosphereLayer.vue" -Force
```

### Lógica de Estados y Acciones
```powershell
Copy-Item "docs/ESTADOS/logic/battleStatus.js" "src/logic/battle/battleStatus.js" -Force
Copy-Item "docs/ESTADOS/logic/statusActions.js" "src/logic/battle/actions/statusActions.js" -Force
Copy-Item "docs/ESTADOS/logic/statActions.js" "src/logic/battle/actions/statActions.js" -Force
```

### Animaciones y Estilos (SASS)
```powershell
Copy-Item "docs/ESTADOS/styles/_battle-animations.scss" "src/styles/components/_battle-animations.scss" -Force
Copy-Item "docs/ESTADOS/styles/_buffs.scss" "src/styles/components/_buffs.scss" -Force
```

## Paso 2: Integración en el Combate
Asegúrate de que `BattleCombatant.vue` use el componente de efectos:

```vue
<PVSpriteFX
  :status="pokemon.status"
  :is-shiny="pokemon.isShiny"
  :is-guardian="pokemon.isGuardian"
  :is-confused="pokemon.confused > 0"
  :is-seeded="pokemon.seeded"
  :has-reflect="stages.reflect > 0"
  ...
>
  <img :src="spriteUrl" ... />
</PVSpriteFX>
```

## Paso 3: Verificación de Animaciones
Los estados como **Quemadura** o **Veneno** deben disparar partículas (🔥/☠️) que orbitan hacia arriba. Si las partículas no aparecen, verifica que `forceHighFidelity` esté inyectado como `true` en el contexto de combate.

---
*Generado por Antigravity - Ecosistema Poké Vicio*
