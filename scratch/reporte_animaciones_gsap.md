# POKE VICIO - REPORTE DE ANIMACIONES Y TRANSICIONES MANUALES

En esta auditoría se identificaron un total de **241** transiciones y animaciones CSS manuales (`transition:`) que deben ser migradas a GSAP, excluyendo la carpeta `showdown/`.

## Resumen de Violaciones por Componente/Área

| Componente / Archivo | Nro de Violaciones | Ubicación |
| :--- | :---: | :--- |
| `_pokemon-display-card.scss` | 4 | `src\styles\components\_pokemon-display-card.scss` |
| `_unified-pokemon-detail.scss` | 4 | `src\styles\components\_unified-pokemon-detail.scss` |
| `_war-panel.scss` | 4 | `src\styles\components\_war-panel.scss` |
| `SocialRequestsTab.vue` | 4 | `src\components\social\SocialRequestsTab.vue` |
| `DebugAudioAnimTab.vue` | 4 | `src\components\admin\debug\DebugAudioAnimTab.vue` |
| `_main-game-view.scss` | 3 | `src\styles\views\_main-game-view.scss` |
| `_controls.scss` | 3 | `src\styles\views\box\_controls.scss` |
| `_debug-creator.scss` | 3 | `src\styles\components\_debug-creator.scss` |
| `_tooltips.scss` | 3 | `src\styles\components\_tooltips.scss` |
| `_core.scss` | 3 | `src\styles\components\pokemon-detail\_core.scss` |
| `MapControlList.vue` | 3 | `src\components\war\MapControlList.vue` |
| `WarPanel.vue` | 3 | `src\components\war\WarPanel.vue` |
| `TradeCard.vue` | 3 | `src\components\social\TradeCard.vue` |
| `Leaderboard.vue` | 3 | `src\components\ranked\Leaderboard.vue` |
| `RewardsTrack.vue` | 3 | `src\components\ranked\RewardsTrack.vue` |
| `ClassSelectionModal.vue` | 3 | `src\components\modals\ClassSelectionModal.vue` |
| `StonePickerModal.vue` | 3 | `src\components\modals\StonePickerModal.vue` |
| `MapStatusSummary.vue` | 3 | `src\components\map\MapStatusSummary.vue` |
| `EventMissions.vue` | 3 | `src\components\events\EventMissions.vue` |
| `IncubatingEggs.vue` | 3 | `src\components\breeding\IncubatingEggs.vue` |
| `BoxMoveModal.vue` | 3 | `src\components\box\BoxMoveModal.vue` |
| `BattleMovesGrid.vue` | 3 | `src\components\battle\BattleMovesGrid.vue` |
| `DebugStatsTab.vue` | 3 | `src\components\admin\debug\DebugStatsTab.vue` |
| `PokemonMovePicker.vue` | 3 | `src\components\admin\debug\PokemonMovePicker.vue` |
| `SocialView.vue` | 2 | `src\views\SocialView.vue` |
| `_pokedex.scss` | 2 | `src\styles\views\_pokedex.scss` |
| `_base.scss` | 2 | `src\styles\layouts\hud\_base.scss` |
| `_mobile.scss` | 2 | `src\styles\layouts\hud\_mobile.scss` |
| `_pills.scss` | 2 | `src\styles\layouts\hud\_pills.scss` |
| `_battle-hud.scss` | 2 | `src\styles\components\_battle-hud.scss` |
| `_cards.scss` | 2 | `src\styles\components\_cards.scss` |
| `_debug.scss` | 2 | `src\styles\components\_debug.scss` |
| `_shop.scss` | 2 | `src\styles\components\_shop.scss` |
| `_cards.scss` | 2 | `src\styles\components\pokemon-selection\_cards.scss` |
| `_evolutions.scss` | 2 | `src\styles\components\pokemon-detail\_evolutions.scss` |
| `_panes.scss` | 2 | `src\styles\components\pokemon-detail\_panes.scss` |
| `_tms.scss` | 2 | `src\styles\components\pokemon-detail\_tms.scss` |
| `LibraryModal.vue` | 2 | `src\components\LibraryModal.vue` |
| `MoveDetailModal.vue` | 2 | `src\components\MoveDetailModal.vue` |
| `ProfileModal.vue` | 2 | `src\components\ProfileModal.vue` |
| `WarDashboard.vue` | 2 | `src\components\war\WarDashboard.vue` |
| `CriminalityBar.vue` | 2 | `src\components\ui\CriminalityBar.vue` |
| `TeamHeader.vue` | 2 | `src\components\team\TeamHeader.vue` |
| `SocialTradesTab.vue` | 2 | `src\components\social\SocialTradesTab.vue` |
| `BlackMarket.vue` | 2 | `src\components\shop\BlackMarket.vue` |
| `UnifiedBadgePill.vue` | 2 | `src\components\shared\UnifiedBadgePill.vue` |
| `RankedMenu.vue` | 2 | `src\components\ranked\RankedMenu.vue` |
| `PokemonDetailHeader.vue` | 2 | `src\components\pokemon-detail\PokemonDetailHeader.vue` |
| `PokemonStatusSection.vue` | 2 | `src\components\pokemon-detail\PokemonStatusSection.vue` |
| `ClassInfoPanel.vue` | 2 | `src\components\player\ClassInfoPanel.vue` |
| `ClassSelector.vue` | 2 | `src\components\player\ClassSelector.vue` |
| `BuffsOverlay.vue` | 2 | `src\components\overlays\BuffsOverlay.vue` |
| `SessionLockOverlay.vue` | 2 | `src\components\overlays\SessionLockOverlay.vue` |
| `CosmeticsModal.vue` | 2 | `src\components\modals\CosmeticsModal.vue` |
| `DebugWeatherTablesModal.vue` | 2 | `src\components\modals\DebugWeatherTablesModal.vue` |
| `FishingModal.vue` | 2 | `src\components\modals\FishingModal.vue` |
| `PPUpModal.vue` | 2 | `src\components\modals\PPUpModal.vue` |
| `PromptModal.vue` | 2 | `src\components\modals\PromptModal.vue` |
| `InventoryItemNode.vue` | 2 | `src\components\modals\inventory\InventoryItemNode.vue` |
| `GlobalMarket.vue` | 2 | `src\components\market\GlobalMarket.vue` |
| `MarketFilters.vue` | 2 | `src\components\market\MarketFilters.vue` |
| `EventTimeline.vue` | 2 | `src\components\events\EventTimeline.vue` |
| `PVTooltip.vue` | 2 | `src\components\common\PVTooltip.vue` |
| `PWAManager.vue` | 2 | `src\components\common\PWAManager.vue` |
| `BreedingSlot.vue` | 2 | `src\components\breeding\BreedingSlot.vue` |
| `EggWarehouse.vue` | 2 | `src\components\breeding\EggWarehouse.vue` |
| `WalkedEggsPanel.vue` | 2 | `src\components\breeding\WalkedEggsPanel.vue` |
| `BattleArenaView.vue` | 2 | `src\components\battle\BattleArenaView.vue` |
| `BattleBallPicker.vue` | 2 | `src\components\battle\BattleBallPicker.vue` |
| `BattleInfoCard.vue` | 2 | `src\components\battle\BattleInfoCard.vue` |
| `BattleQuickBag.vue` | 2 | `src\components\battle\BattleQuickBag.vue` |
| `LoginForm.vue` | 2 | `src\components\auth\LoginForm.vue` |
| `SessionConflictModal.vue` | 2 | `src\components\auth\SessionConflictModal.vue` |
| `SignupForm.vue` | 2 | `src\components\auth\SignupForm.vue` |
| `LocalDebugPanel.vue` | 2 | `src\components\admin\LocalDebugPanel.vue` |
| `_navigation.scss` | 1 | `src\styles\layouts\_navigation.scss` |
| `_nav.scss` | 1 | `src\styles\layouts\hud\_nav.scss` |
| `_layout.scss` | 1 | `src\styles\core\mixins\_layout.scss` |
| `_shell.scss` | 1 | `src\styles\core\mixins\_shell.scss` |
| `_box-menu.scss` | 1 | `src\styles\components\_box-menu.scss` |
| `_buffs.scss` | 1 | `src\styles\components\_buffs.scss` |
| `_daycare.scss` | 1 | `src\styles\components\_daycare.scss` |
| `_gts.scss` | 1 | `src\styles\components\_gts.scss` |
| `_hud-navigation.scss` | 1 | `src\styles\components\_hud-navigation.scss` |
| `_map-card-info.scss` | 1 | `src\styles\components\_map-card-info.scss` |
| `_map-card-render.scss` | 1 | `src\styles\components\_map-card-render.scss` |
| `_type-pills.scss` | 1 | `src\styles\components\_type-pills.scss` |
| `ActionButtons.vue` | 1 | `src\components\ActionButtons.vue` |
| `FactionChoiceModal.vue` | 1 | `src\components\FactionChoiceModal.vue` |
| `SettingsModal.vue` | 1 | `src\components\SettingsModal.vue` |
| `TrainerPanel.vue` | 1 | `src\components\TrainerPanel.vue` |
| `MapDominanceOverlay.vue` | 1 | `src\components\war\MapDominanceOverlay.vue` |
| `ConnectionWarning.vue` | 1 | `src\components\ui\ConnectionWarning.vue` |
| `HUD_SidebarLeft.vue` | 1 | `src\components\ui\HUD_SidebarLeft.vue` |
| `ToastNotification.vue` | 1 | `src\components\ui\ToastNotification.vue` |
| `ClaimCard.vue` | 1 | `src\components\social\ClaimCard.vue` |
| `SocialCenterModal.vue` | 1 | `src\components\social\SocialCenterModal.vue` |
| `SocialRankings.vue` | 1 | `src\components\social\SocialRankings.vue` |
| `TradeFooter.vue` | 1 | `src\components\social\TradeFooter.vue` |
| `InviteNotification.vue` | 1 | `src\components\ranked\InviteNotification.vue` |
| `ProfileStatsGrid.vue` | 1 | `src\components\profile\ProfileStatsGrid.vue` |
| `PokemonMovesGrid.vue` | 1 | `src\components\pokemon-detail\PokemonMovesGrid.vue` |
| `PokemonStatBar.vue` | 1 | `src\components\pokemon-detail\PokemonStatBar.vue` |
| `PokemonStatsGrid.vue` | 1 | `src\components\pokemon-detail\PokemonStatsGrid.vue` |
| `PlayerAvatar.vue` | 1 | `src\components\player\PlayerAvatar.vue` |
| `GuardianOverlay.vue` | 1 | `src\components\overlays\GuardianOverlay.vue` |
| `VersionLockOverlay.vue` | 1 | `src\components\overlays\VersionLockOverlay.vue` |
| `AbilityPillModal.vue` | 1 | `src\components\modals\AbilityPillModal.vue` |
| `ConfirmModal.vue` | 1 | `src\components\modals\ConfirmModal.vue` |
| `FossilRevivalModal.vue` | 1 | `src\components\modals\FossilRevivalModal.vue` |
| `MoveRelearnerModal.vue` | 1 | `src\components\modals\MoveRelearnerModal.vue` |
| `NaturePatchModal.vue` | 1 | `src\components\modals\NaturePatchModal.vue` |
| `PokemonSelectionItem.vue` | 1 | `src\components\modals\PokemonSelectionItem.vue` |
| `RenameModal.vue` | 1 | `src\components\modals\RenameModal.vue` |
| `TeamManagementModal.vue` | 1 | `src\components\modals\TeamManagementModal.vue` |
| `InventoryControls.vue` | 1 | `src\components\modals\inventory\InventoryControls.vue` |
| `InventoryQuantityModal.vue` | 1 | `src\components\modals\inventory\InventoryQuantityModal.vue` |
| `EncounterSequence.vue` | 1 | `src\components\game\EncounterSequence.vue` |
| `EvolutionScene.vue` | 1 | `src\components\evolution\EvolutionScene.vue` |
| `EventBanner.vue` | 1 | `src\components\events\EventBanner.vue` |
| `BreedingSummary.vue` | 1 | `src\components\breeding\BreedingSummary.vue` |
| `CompatibilityPanel.vue` | 1 | `src\components\breeding\CompatibilityPanel.vue` |
| `EggCard.vue` | 1 | `src\components\breeding\EggCard.vue` |
| `BoxPokemonCard.vue` | 1 | `src\components\box\BoxPokemonCard.vue` |
| `BattleArenaControls.vue` | 1 | `src\components\battle\BattleArenaControls.vue` |
| `BattleDebugTools.vue` | 1 | `src\components\battle\BattleDebugTools.vue` |
| `BattleLog.vue` | 1 | `src\components\battle\BattleLog.vue` |
| `BattleQuickTeam.vue` | 1 | `src\components\battle\BattleQuickTeam.vue` |
| `CombatShadow.vue` | 1 | `src\components\battle\CombatShadow.vue` |
| `CombatShadowManager.vue` | 1 | `src\components\battle\CombatShadowManager.vue` |
| `FishingMinigame.vue` | 1 | `src\components\battle\FishingMinigame.vue` |
| `LivePvPArena.vue` | 1 | `src\components\battle\LivePvPArena.vue` |
| `PvPArena.vue` | 1 | `src\components\battle\PvPArena.vue` |
| `ServerSelector.vue` | 1 | `src\components\auth\ServerSelector.vue` |
| `EventAdminPanel.vue` | 1 | `src\components\admin\EventAdminPanel.vue` |
| `DebugItemsTab.vue` | 1 | `src\components\admin\debug\DebugItemsTab.vue` |
| `PokemonPreview.vue` | 1 | `src\components\admin\debug\PokemonPreview.vue` |

## Detalle Completo de Archivos y Líneas a Migrar

### 📁 [_pokemon-display-card.scss](file:///src/styles/components/_pokemon-display-card.scss)

**Ubicación:** `src\styles\components\_pokemon-display-card.scss` (4 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 22 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 33 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 212 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 263 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_unified-pokemon-detail.scss](file:///src/styles/components/_unified-pokemon-detail.scss)

**Ubicación:** `src\styles\components\_unified-pokemon-detail.scss` (4 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 139 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 236 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 269 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 310 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_war-panel.scss](file:///src/styles/components/_war-panel.scss)

**Ubicación:** `src\styles\components\_war-panel.scss` (4 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 62 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 89 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 116 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 117 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SocialRequestsTab.vue](file:///src/components/social/SocialRequestsTab.vue)

**Ubicación:** `src\components\social\SocialRequestsTab.vue` (4 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 116 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 128 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 180 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 190 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [DebugAudioAnimTab.vue](file:///src/components/admin/debug/DebugAudioAnimTab.vue)

**Ubicación:** `src\components\admin\debug\DebugAudioAnimTab.vue` (4 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 453 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 499 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 532 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 601 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_main-game-view.scss](file:///src/styles/views/_main-game-view.scss)

**Ubicación:** `src\styles\views\_main-game-view.scss` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 66 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 120 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 164 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_controls.scss](file:///src/styles/views/box/_controls.scss)

**Ubicación:** `src\styles\views\box\_controls.scss` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 81 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 108 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 142 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_debug-creator.scss](file:///src/styles/components/_debug-creator.scss)

**Ubicación:** `src\styles\components\_debug-creator.scss` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 145 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 153 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 164 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_tooltips.scss](file:///src/styles/components/_tooltips.scss)

**Ubicación:** `src\styles\components\_tooltips.scss` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 20 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 154 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 199 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_core.scss](file:///src/styles/components/pokemon-detail/_core.scss)

**Ubicación:** `src\styles\components\pokemon-detail\_core.scss` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 28 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 79 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 82 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [MapControlList.vue](file:///src/components/war/MapControlList.vue)

**Ubicación:** `src\components\war\MapControlList.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 160 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 197 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 270 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [WarPanel.vue](file:///src/components/war/WarPanel.vue)

**Ubicación:** `src\components\war\WarPanel.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 178 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 241 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 296 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [TradeCard.vue](file:///src/components/social/TradeCard.vue)

**Ubicación:** `src\components\social\TradeCard.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 302 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 523 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 529 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [Leaderboard.vue](file:///src/components/ranked/Leaderboard.vue)

**Ubicación:** `src\components\ranked\Leaderboard.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 156 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 181 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 211 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [RewardsTrack.vue](file:///src/components/ranked/RewardsTrack.vue)

**Ubicación:** `src\components\ranked\RewardsTrack.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 222 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 256 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 309 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ClassSelectionModal.vue](file:///src/components/modals/ClassSelectionModal.vue)

**Ubicación:** `src\components\modals\ClassSelectionModal.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 204 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 236 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 260 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [StonePickerModal.vue](file:///src/components/modals/StonePickerModal.vue)

**Ubicación:** `src\components\modals\StonePickerModal.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 194 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 235 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 253 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [MapStatusSummary.vue](file:///src/components/map/MapStatusSummary.vue)

**Ubicación:** `src\components\map\MapStatusSummary.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 253 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 351 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 479 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EventMissions.vue](file:///src/components/events/EventMissions.vue)

**Ubicación:** `src\components\events\EventMissions.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 379 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 405 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 572 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [IncubatingEggs.vue](file:///src/components/breeding/IncubatingEggs.vue)

**Ubicación:** `src\components\breeding\IncubatingEggs.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 223 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 278 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 326 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BoxMoveModal.vue](file:///src/components/box/BoxMoveModal.vue)

**Ubicación:** `src\components\box\BoxMoveModal.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 163 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 186 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 220 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleMovesGrid.vue](file:///src/components/battle/BattleMovesGrid.vue)

**Ubicación:** `src\components\battle\BattleMovesGrid.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 490 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 510 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 545 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [DebugStatsTab.vue](file:///src/components/admin/debug/DebugStatsTab.vue)

**Ubicación:** `src\components\admin\debug\DebugStatsTab.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 307 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 330 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 365 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonMovePicker.vue](file:///src/components/admin/debug/PokemonMovePicker.vue)

**Ubicación:** `src\components\admin\debug\PokemonMovePicker.vue` (3 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 170 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 208 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 294 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SocialView.vue](file:///src/views/SocialView.vue)

**Ubicación:** `src\views\SocialView.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 127 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 166 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_pokedex.scss](file:///src/styles/views/_pokedex.scss)

**Ubicación:** `src\styles\views\_pokedex.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 92 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 215 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_base.scss](file:///src/styles/layouts/hud/_base.scss)

**Ubicación:** `src\styles\layouts\hud\_base.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 16 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 50 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_mobile.scss](file:///src/styles/layouts/hud/_mobile.scss)

**Ubicación:** `src\styles\layouts\hud\_mobile.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 37 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 45 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_pills.scss](file:///src/styles/layouts/hud/_pills.scss)

**Ubicación:** `src\styles\layouts\hud\_pills.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 17 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 164 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_battle-hud.scss](file:///src/styles/components/_battle-hud.scss)

**Ubicación:** `src\styles\components\_battle-hud.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 100 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 124 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_cards.scss](file:///src/styles/components/_cards.scss)

**Ubicación:** `src\styles\components\_cards.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 9 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 28 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_debug.scss](file:///src/styles/components/_debug.scss)

**Ubicación:** `src\styles\components\_debug.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 44 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 111 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_shop.scss](file:///src/styles/components/_shop.scss)

**Ubicación:** `src\styles\components\_shop.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 73 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 291 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_cards.scss](file:///src/styles/components/pokemon-selection/_cards.scss)

**Ubicación:** `src\styles\components\pokemon-selection\_cards.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 56 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 162 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_evolutions.scss](file:///src/styles/components/pokemon-detail/_evolutions.scss)

**Ubicación:** `src\styles\components\pokemon-detail\_evolutions.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 23 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 40 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_panes.scss](file:///src/styles/components/pokemon-detail/_panes.scss)

**Ubicación:** `src\styles\components\pokemon-detail\_panes.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 26 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 159 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_tms.scss](file:///src/styles/components/pokemon-detail/_tms.scss)

**Ubicación:** `src\styles\components\pokemon-detail\_tms.scss` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 51 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 76 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [LibraryModal.vue](file:///src/components/LibraryModal.vue)

**Ubicación:** `src\components\LibraryModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 93 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 159 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [MoveDetailModal.vue](file:///src/components/MoveDetailModal.vue)

**Ubicación:** `src\components\MoveDetailModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 172 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 276 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ProfileModal.vue](file:///src/components/ProfileModal.vue)

**Ubicación:** `src\components\ProfileModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 414 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 439 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [WarDashboard.vue](file:///src/components/war/WarDashboard.vue)

**Ubicación:** `src\components\war\WarDashboard.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 279 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 305 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [CriminalityBar.vue](file:///src/components/ui/CriminalityBar.vue)

**Ubicación:** `src\components\ui\CriminalityBar.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 99 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 115 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [TeamHeader.vue](file:///src/components/team/TeamHeader.vue)

**Ubicación:** `src\components\team\TeamHeader.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 153 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 189 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SocialTradesTab.vue](file:///src/components/social/SocialTradesTab.vue)

**Ubicación:** `src\components\social\SocialTradesTab.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 253 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 298 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BlackMarket.vue](file:///src/components/shop/BlackMarket.vue)

**Ubicación:** `src\components\shop\BlackMarket.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 143 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 235 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [UnifiedBadgePill.vue](file:///src/components/shared/UnifiedBadgePill.vue)

**Ubicación:** `src\components\shared\UnifiedBadgePill.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 143 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 233 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [RankedMenu.vue](file:///src/components/ranked/RankedMenu.vue)

**Ubicación:** `src\components\ranked\RankedMenu.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 276 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 334 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonDetailHeader.vue](file:///src/components/pokemon-detail/PokemonDetailHeader.vue)

**Ubicación:** `src\components\pokemon-detail\PokemonDetailHeader.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 200 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 220 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonStatusSection.vue](file:///src/components/pokemon-detail/PokemonStatusSection.vue)

**Ubicación:** `src\components\pokemon-detail\PokemonStatusSection.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 182 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 213 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ClassInfoPanel.vue](file:///src/components/player/ClassInfoPanel.vue)

**Ubicación:** `src\components\player\ClassInfoPanel.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 442 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 463 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ClassSelector.vue](file:///src/components/player/ClassSelector.vue)

**Ubicación:** `src\components\player\ClassSelector.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 204 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 282 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BuffsOverlay.vue](file:///src/components/overlays/BuffsOverlay.vue)

**Ubicación:** `src\components\overlays\BuffsOverlay.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 81 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 127 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SessionLockOverlay.vue](file:///src/components/overlays/SessionLockOverlay.vue)

**Ubicación:** `src\components\overlays\SessionLockOverlay.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 69 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 95 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [CosmeticsModal.vue](file:///src/components/modals/CosmeticsModal.vue)

**Ubicación:** `src\components\modals\CosmeticsModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 353 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 507 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [DebugWeatherTablesModal.vue](file:///src/components/modals/DebugWeatherTablesModal.vue)

**Ubicación:** `src\components\modals\DebugWeatherTablesModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 301 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 425 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [FishingModal.vue](file:///src/components/modals/FishingModal.vue)

**Ubicación:** `src\components\modals\FishingModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 197 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 288 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PPUpModal.vue](file:///src/components/modals/PPUpModal.vue)

**Ubicación:** `src\components\modals\PPUpModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 122 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 143 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PromptModal.vue](file:///src/components/modals/PromptModal.vue)

**Ubicación:** `src\components\modals\PromptModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 117 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 139 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [InventoryItemNode.vue](file:///src/components/modals/inventory/InventoryItemNode.vue)

**Ubicación:** `src\components\modals\inventory\InventoryItemNode.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 94 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 150 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [GlobalMarket.vue](file:///src/components/market/GlobalMarket.vue)

**Ubicación:** `src\components\market\GlobalMarket.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 222 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 242 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [MarketFilters.vue](file:///src/components/market/MarketFilters.vue)

**Ubicación:** `src\components\market\MarketFilters.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 257 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 286 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EventTimeline.vue](file:///src/components/events/EventTimeline.vue)

**Ubicación:** `src\components\events\EventTimeline.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 165 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 188 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PVTooltip.vue](file:///src/components/common/PVTooltip.vue)

**Ubicación:** `src\components\common\PVTooltip.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 373 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 421 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PWAManager.vue](file:///src/components/common/PWAManager.vue)

**Ubicación:** `src\components\common\PWAManager.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 325 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 363 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BreedingSlot.vue](file:///src/components/breeding/BreedingSlot.vue)

**Ubicación:** `src\components\breeding\BreedingSlot.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 149 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 254 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EggWarehouse.vue](file:///src/components/breeding/EggWarehouse.vue)

**Ubicación:** `src\components\breeding\EggWarehouse.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 149 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 234 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [WalkedEggsPanel.vue](file:///src/components/breeding/WalkedEggsPanel.vue)

**Ubicación:** `src\components\breeding\WalkedEggsPanel.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 240 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 337 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleArenaView.vue](file:///src/components/battle/BattleArenaView.vue)

**Ubicación:** `src\components\battle\BattleArenaView.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 629 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 642 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleBallPicker.vue](file:///src/components/battle/BattleBallPicker.vue)

**Ubicación:** `src\components\battle\BattleBallPicker.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 251 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 372 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleInfoCard.vue](file:///src/components/battle/BattleInfoCard.vue)

**Ubicación:** `src\components\battle\BattleInfoCard.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 731 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 758 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleQuickBag.vue](file:///src/components/battle/BattleQuickBag.vue)

**Ubicación:** `src\components\battle\BattleQuickBag.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 177 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 230 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [LoginForm.vue](file:///src/components/auth/LoginForm.vue)

**Ubicación:** `src\components\auth\LoginForm.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 146 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 164 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SessionConflictModal.vue](file:///src/components/auth/SessionConflictModal.vue)

**Ubicación:** `src\components\auth\SessionConflictModal.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 64 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 80 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SignupForm.vue](file:///src/components/auth/SignupForm.vue)

**Ubicación:** `src\components\auth\SignupForm.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 75 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 93 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [LocalDebugPanel.vue](file:///src/components/admin/LocalDebugPanel.vue)

**Ubicación:** `src\components\admin\LocalDebugPanel.vue` (2 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 144 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |
| 218 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_navigation.scss](file:///src/styles/layouts/_navigation.scss)

**Ubicación:** `src\styles\layouts\_navigation.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 47 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_nav.scss](file:///src/styles/layouts/hud/_nav.scss)

**Ubicación:** `src\styles\layouts\hud\_nav.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 32 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_layout.scss](file:///src/styles/core/mixins/_layout.scss)

**Ubicación:** `src\styles\core\mixins\_layout.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 93 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_shell.scss](file:///src/styles/core/mixins/_shell.scss)

**Ubicación:** `src\styles\core\mixins\_shell.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 57 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_box-menu.scss](file:///src/styles/components/_box-menu.scss)

**Ubicación:** `src\styles\components\_box-menu.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 137 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_buffs.scss](file:///src/styles/components/_buffs.scss)

**Ubicación:** `src\styles\components\_buffs.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 69 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_daycare.scss](file:///src/styles/components/_daycare.scss)

**Ubicación:** `src\styles\components\_daycare.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 103 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_gts.scss](file:///src/styles/components/_gts.scss)

**Ubicación:** `src\styles\components\_gts.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 137 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_hud-navigation.scss](file:///src/styles/components/_hud-navigation.scss)

**Ubicación:** `src\styles\components\_hud-navigation.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 71 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_map-card-info.scss](file:///src/styles/components/_map-card-info.scss)

**Ubicación:** `src\styles\components\_map-card-info.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 61 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_map-card-render.scss](file:///src/styles/components/_map-card-render.scss)

**Ubicación:** `src\styles\components\_map-card-render.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 61 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [_type-pills.scss](file:///src/styles/components/_type-pills.scss)

**Ubicación:** `src\styles\components\_type-pills.scss` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 68 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ActionButtons.vue](file:///src/components/ActionButtons.vue)

**Ubicación:** `src\components\ActionButtons.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 53 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [FactionChoiceModal.vue](file:///src/components/FactionChoiceModal.vue)

**Ubicación:** `src\components\FactionChoiceModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 157 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SettingsModal.vue](file:///src/components/SettingsModal.vue)

**Ubicación:** `src\components\SettingsModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 200 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [TrainerPanel.vue](file:///src/components/TrainerPanel.vue)

**Ubicación:** `src\components\TrainerPanel.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 134 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [MapDominanceOverlay.vue](file:///src/components/war/MapDominanceOverlay.vue)

**Ubicación:** `src\components\war\MapDominanceOverlay.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 102 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ConnectionWarning.vue](file:///src/components/ui/ConnectionWarning.vue)

**Ubicación:** `src\components\ui\ConnectionWarning.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 32 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [HUD_SidebarLeft.vue](file:///src/components/ui/HUD_SidebarLeft.vue)

**Ubicación:** `src\components\ui\HUD_SidebarLeft.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 29 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ToastNotification.vue](file:///src/components/ui/ToastNotification.vue)

**Ubicación:** `src\components\ui\ToastNotification.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 81 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ClaimCard.vue](file:///src/components/social/ClaimCard.vue)

**Ubicación:** `src\components\social\ClaimCard.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 136 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SocialCenterModal.vue](file:///src/components/social/SocialCenterModal.vue)

**Ubicación:** `src\components\social\SocialCenterModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 208 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [SocialRankings.vue](file:///src/components/social/SocialRankings.vue)

**Ubicación:** `src\components\social\SocialRankings.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 220 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [TradeFooter.vue](file:///src/components/social/TradeFooter.vue)

**Ubicación:** `src\components\social\TradeFooter.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 118 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [InviteNotification.vue](file:///src/components/ranked/InviteNotification.vue)

**Ubicación:** `src\components\ranked\InviteNotification.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 150 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ProfileStatsGrid.vue](file:///src/components/profile/ProfileStatsGrid.vue)

**Ubicación:** `src\components\profile\ProfileStatsGrid.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 79 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonMovesGrid.vue](file:///src/components/pokemon-detail/PokemonMovesGrid.vue)

**Ubicación:** `src\components\pokemon-detail\PokemonMovesGrid.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 71 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonStatBar.vue](file:///src/components/pokemon-detail/PokemonStatBar.vue)

**Ubicación:** `src\components\pokemon-detail\PokemonStatBar.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 188 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonStatsGrid.vue](file:///src/components/pokemon-detail/PokemonStatsGrid.vue)

**Ubicación:** `src\components\pokemon-detail\PokemonStatsGrid.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 133 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PlayerAvatar.vue](file:///src/components/player/PlayerAvatar.vue)

**Ubicación:** `src\components\player\PlayerAvatar.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 81 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [GuardianOverlay.vue](file:///src/components/overlays/GuardianOverlay.vue)

**Ubicación:** `src\components\overlays\GuardianOverlay.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 166 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [VersionLockOverlay.vue](file:///src/components/overlays/VersionLockOverlay.vue)

**Ubicación:** `src\components\overlays\VersionLockOverlay.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 61 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [AbilityPillModal.vue](file:///src/components/modals/AbilityPillModal.vue)

**Ubicación:** `src\components\modals\AbilityPillModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 109 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ConfirmModal.vue](file:///src/components/modals/ConfirmModal.vue)

**Ubicación:** `src\components\modals\ConfirmModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 136 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [FossilRevivalModal.vue](file:///src/components/modals/FossilRevivalModal.vue)

**Ubicación:** `src\components\modals\FossilRevivalModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 446 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [MoveRelearnerModal.vue](file:///src/components/modals/MoveRelearnerModal.vue)

**Ubicación:** `src\components\modals\MoveRelearnerModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 194 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [NaturePatchModal.vue](file:///src/components/modals/NaturePatchModal.vue)

**Ubicación:** `src\components\modals\NaturePatchModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 105 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonSelectionItem.vue](file:///src/components/modals/PokemonSelectionItem.vue)

**Ubicación:** `src\components\modals\PokemonSelectionItem.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 304 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [RenameModal.vue](file:///src/components/modals/RenameModal.vue)

**Ubicación:** `src\components\modals\RenameModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 211 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [TeamManagementModal.vue](file:///src/components/modals/TeamManagementModal.vue)

**Ubicación:** `src\components\modals\TeamManagementModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 397 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [InventoryControls.vue](file:///src/components/modals/inventory/InventoryControls.vue)

**Ubicación:** `src\components\modals\inventory\InventoryControls.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 154 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [InventoryQuantityModal.vue](file:///src/components/modals/inventory/InventoryQuantityModal.vue)

**Ubicación:** `src\components\modals\inventory\InventoryQuantityModal.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 207 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EncounterSequence.vue](file:///src/components/game/EncounterSequence.vue)

**Ubicación:** `src\components\game\EncounterSequence.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 204 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EvolutionScene.vue](file:///src/components/evolution/EvolutionScene.vue)

**Ubicación:** `src\components\evolution\EvolutionScene.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 262 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EventBanner.vue](file:///src/components/events/EventBanner.vue)

**Ubicación:** `src\components\events\EventBanner.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 151 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BreedingSummary.vue](file:///src/components/breeding/BreedingSummary.vue)

**Ubicación:** `src\components\breeding\BreedingSummary.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 315 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [CompatibilityPanel.vue](file:///src/components/breeding/CompatibilityPanel.vue)

**Ubicación:** `src\components\breeding\CompatibilityPanel.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 58 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EggCard.vue](file:///src/components/breeding/EggCard.vue)

**Ubicación:** `src\components\breeding\EggCard.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 69 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BoxPokemonCard.vue](file:///src/components/box/BoxPokemonCard.vue)

**Ubicación:** `src\components\box\BoxPokemonCard.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 351 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleArenaControls.vue](file:///src/components/battle/BattleArenaControls.vue)

**Ubicación:** `src\components\battle\BattleArenaControls.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 223 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleDebugTools.vue](file:///src/components/battle/BattleDebugTools.vue)

**Ubicación:** `src\components\battle\BattleDebugTools.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 780 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleLog.vue](file:///src/components/battle/BattleLog.vue)

**Ubicación:** `src\components\battle\BattleLog.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 297 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [BattleQuickTeam.vue](file:///src/components/battle/BattleQuickTeam.vue)

**Ubicación:** `src\components\battle\BattleQuickTeam.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 92 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [CombatShadow.vue](file:///src/components/battle/CombatShadow.vue)

**Ubicación:** `src\components\battle\CombatShadow.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 77 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [CombatShadowManager.vue](file:///src/components/battle/CombatShadowManager.vue)

**Ubicación:** `src\components\battle\CombatShadowManager.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 107 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [FishingMinigame.vue](file:///src/components/battle/FishingMinigame.vue)

**Ubicación:** `src\components\battle\FishingMinigame.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 334 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [LivePvPArena.vue](file:///src/components/battle/LivePvPArena.vue)

**Ubicación:** `src\components\battle\LivePvPArena.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 410 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PvPArena.vue](file:///src/components/battle/PvPArena.vue)

**Ubicación:** `src\components\battle\PvPArena.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 232 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [ServerSelector.vue](file:///src/components/auth/ServerSelector.vue)

**Ubicación:** `src\components\auth\ServerSelector.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 75 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [EventAdminPanel.vue](file:///src/components/admin/EventAdminPanel.vue)

**Ubicación:** `src\components\admin\EventAdminPanel.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 69 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [DebugItemsTab.vue](file:///src/components/admin/debug/DebugItemsTab.vue)

**Ubicación:** `src\components\admin\debug\DebugItemsTab.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 97 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---

### 📁 [PokemonPreview.vue](file:///src/components/admin/debug/PokemonPreview.vue)

**Ubicación:** `src\components\admin\debug\PokemonPreview.vue` (1 violaciones)

| Línea | Tipo | Detalle de la Regla |
| :---: | :--- | :--- |
| 115 | `ERROR` | Animación manual detectada: 'transition:'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual. ("transition:") |

---
