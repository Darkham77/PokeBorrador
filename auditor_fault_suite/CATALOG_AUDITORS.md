# Catálogo de Auditores Soportados: Poké Vicio (PokeBorrador)

Este documento enumera **todos los auditores y sub-auditores** soportados por Poké Vicio, incluyendo los auditores centrales de arquitectura, documentación, persistencia y dominio, así como las **familias personalizadas (`fsm`, `assets`)** y las extensiones locales de combate y sprites.

---

## 🏛️ Matriz Consolidada de Auditores y Triggers de Falla

| Familia | Sub-auditor | Archivo Fuente | Códigos de Error / Warning Emitidos | Trigger de Activación |
|---|---|---|---|---|
| **ARCHITECTURE** | `validate_vue_sfc_hygiene` | `src/suites/architecture/validate_vue_sfc_hygiene.ts` | `vue-scoped-style-missing`, `vue-script-setup-missing` | `triggers/bad_vue.vue` |
| **ARCHITECTURE** | `validate_html_validate` | `src/suites/architecture/validate_html_validate.ts` | `html-validate-error`, `no-deprecated-attr` | `triggers/bad_vue.vue` |
| **ARCHITECTURE** | `validate_template_ids` | `src/suites/architecture/validate_template_ids.ts` | `template-missing-input-id` | `triggers/bad_vue.vue` |
| **ARCHITECTURE** | `validate_component_styles` | `src/suites/architecture/validate_component_styles.ts` | `unscoped-component-styles` | `triggers/bad_vue.vue` |
| **ARCHITECTURE** | `validate_z_index` | `src/suites/architecture/validate_z_index.ts` | `z-index-out-of-scale` | `triggers/bad_styles.scss` |
| **ARCHITECTURE** | `validate_css_duplicates` | `src/suites/architecture/validate_css_duplicates.ts` | `css-duplicate-block` | `triggers/bad_styles.scss` |
| **ARCHITECTURE** | `validate_dead_css` | `src/suites/architecture/validate_dead_css.ts` | `dead-css-class` | `triggers/bad_styles.scss` |
| **ARCHITECTURE** | `validate_typography_line_height`| `src/suites/architecture/validate_typography_line_height.ts`| `line-height-overlap` | `triggers/bad_styles.scss` |
| **ARCHITECTURE** | `validate_pinia_reactivity` | `src/suites/architecture/validate_pinia_reactivity.ts` | `pinia-direct-state-mutation` | `triggers/bad_store.ts` |
| **ARCHITECTURE** | `validate_reactive_leaks` | `src/suites/architecture/validate_reactive_leaks.ts` | `reactive-timer-uncleaned` | `triggers/bad_store.ts` |
| **ARCHITECTURE** | `validate_reactive_purity` | `src/suites/architecture/validate_reactive_purity.ts` | `impure-computed-side-effect` | `triggers/bad_store.ts` |
| **ARCHITECTURE** | `validate_console_cleanliness` | `src/suites/architecture/validate_console_cleanliness.ts`| `naked-console-call` | `triggers/bad_console.ts` |
| **ARCHITECTURE** | `validate_error_suppression` | `src/suites/architecture/validate_error_suppression.ts` | `empty-catch-block` | `triggers/bad_catch.ts` |
| **ARCHITECTURE** | `validate_native_paths` | `src/suites/architecture/validate_native_paths.ts` | `hardcoded-windows-path-separator` | `triggers/bad_paths.ts` |
| **ARCHITECTURE** | `validate_ephemeral_storage_isolation` | `src/suites/architecture/validate_ephemeral_storage_isolation.ts` | `ephemeral-storage-in-source` | `triggers/bad_paths.ts` |
| **ARCHITECTURE** | `validate_duplicate_constants`| `src/suites/architecture/validate_duplicate_constants.ts` | `duplicate-constant-value` | `triggers/bad_constants.ts` |
| **ARCHITECTURE** | `validate_bundle_budget` | `src/suites/architecture/validate_bundle_budget.ts` | `bundle-chunk-size-exceeded` | `triggers/bad_bundle.ts` |
| **ARCHITECTURE** | `validate_type_check` | `src/suites/architecture/validate_type_check.ts` | `typescript-compile-error` | `triggers/bad_typecheck.ts` |
| **ARCHITECTURE** | `validate_test_hygiene` | `src/suites/architecture/validate_test_hygiene.ts` | `test-missing-assertions` | `triggers/bad_test.spec.ts` |
| **ARCHITECTURE** | `validate_test_fragmentation`| `src/suites/architecture/validate_test_fragmentation.ts` | `unauthorized-test-fragmentation` | `triggers/bad_test.spec.ts` |
| **ARCHITECTURE** | `validate_fallow_config` | `src/suites/architecture/validate_fallow_config.ts` | `fallow-banned-entry-glob` | `triggers/bad_fallow_config.json`|
| **ARCHITECTURE** | `audit_project` | `src/suites/architecture/audit_project.ts` | `cognitive-complexity-exceeded` | `triggers/bad_complexity.ts` |
| **DOMAIN_DATA** | `validate_domain_types` | `src/suites/domain_data/validate_domain_types.ts` | `naked-string-domain-id` | `triggers/bad_domain.ts` |
| **DOMAIN_DATA** | `validate_o1_data_structures`| `src/suites/domain_data/validate_o1_data_structures.ts` | `linear-search-in-o1-catalog` | `triggers/bad_domain.ts` |
| **PERSISTENCE** | `validate_sql_anti_patterns`| `src/suites/persistence/validate_sql_anti_patterns.ts` | `select-star-prohibited` | `triggers/bad_migration.sql` |
| **DOCUMENTATION**| `validate_dox_integrity` | `src/suites/documentation/validate_dox_integrity.ts` | `dox-missing-agents-md` | `triggers/bad_dox/` |
| **DOCUMENTATION**| `validate_markdown_links` | `src/suites/documentation/validate_markdown_links.ts` | `markdown-broken-relative-link` | `triggers/bad_markdown.md` |
| **DOCUMENTATION**| `validate_markdown_lint` | `src/suites/documentation/validate_markdown_lint.ts` | `markdownlint-trailing-spaces` | `triggers/bad_markdown.md` |
| **DOCUMENTATION**| `validate_markdown_syntax`| `src/suites/documentation/validate_markdown_syntax.ts`| `markdown-malformed-table` | `triggers/bad_markdown.md` |
| **DOCUMENTATION**| `validate_markdown_code_references` | `src/suites/documentation/validate_markdown_code_references.ts` | `broken-package-script-reference` | `triggers/bad_markdown.md` |
| **FSM** | `validate_combat_invariants` | `scripts/auditors/fsm/validate_combat_invariants.ts` | `fsm-turn-order-violation`, `fsm-state-desync` | `triggers/bad_fsm.ts` |
| **FSM** | `validate_fsm_diagrams` | `scripts/auditors/fsm/validate_fsm_diagrams.ts` | `fsm-mermaid-drift` | `triggers/bad_fsm.ts` |
| **FSM** | `validate_fsm_flow_parity` | `scripts/auditors/fsm/validate_fsm_flow_parity.ts` | `fsm-flow-branch-mismatch` | `triggers/bad_fsm.ts` |
| **FSM** | `validate_fsm_implementation` | `scripts/auditors/fsm/validate_fsm_implementation.ts` | `fsm-missing-transition-handler` | `triggers/bad_fsm.ts` |
| **FSM** | `validate_showdown_parity` | `scripts/auditors/fsm/validate_showdown_parity.ts` | `showdown-formula-divergence` | `triggers/bad_showdown.ts` |
| **ASSETS** | `audit_item_sprite_collisions` | `scripts/auditors/assets/audit_item_sprite_collisions.ts` | `sprite-name-collision` | `triggers/bad_sprites/` |
| **ASSETS** | `validate_asset_usage` | `scripts/auditors/assets/validate_asset_usage.ts` | `orphan-game-asset` | `triggers/bad_sprites/` |
| **ASSETS** | `validate_sprites` | `scripts/auditors/assets/validate_sprites.ts` | `sprite-invalid-dimension` | `triggers/bad_sprites/` |
| **EXTENSION** | `validate_battle_ui_branching`| `scripts/auditors/architecture/validate_battle_ui_branching.ts` | `battle-ui-excessive-branching` | `triggers/bad_battle.vue` |
| **EXTENSION** | `validate_client_sim_decoupling`| `scripts/auditors/architecture/validate_client_sim_decoupling.ts` | `sim-direct-client-coupling` | `triggers/bad_battle.vue` |
| **EXTENSION** | `validate_abilities` | `scripts/auditors/domain_data/validate_abilities.ts` | `unknown-ability-id` | `triggers/bad_pokedex.ts` |
| **EXTENSION** | `validate_items` | `scripts/auditors/domain_data/validate_items.ts` | `unknown-item-id` | `triggers/bad_pokedex.ts` |
| **EXTENSION** | `validate_moves` | `scripts/auditors/domain_data/validate_moves.ts` | `unknown-move-id` | `triggers/bad_pokedex.ts` |
| **EXTENSION** | `validate_pokemon` | `scripts/auditors/domain_data/validate_pokemon.ts` | `invalid-pokemon-stats` | `triggers/bad_pokedex.ts` |
| **EXTENSION** | `validate_spanish_ids` | `scripts/auditors/domain_data/validate_spanish_ids.ts` | `non-english-canonical-id` | `triggers/bad_pokedex.ts` |
| **EXTENSION** | `validate_spawns_whitelist` | `scripts/auditors/domain_data/validate_spawns_whitelist.ts` | `unwhitelisted-encounter-spawn` | `triggers/bad_pokedex.ts` |
| **EXTENSION** | `validate_save_persistence_parity` | `scripts/auditors/persistence/validate_save_persistence_parity.ts` | `save-sqlite-supabase-desync` | `triggers/bad_save.ts` |
| **EXTENSION** | `validate_schema_parity` | `scripts/auditors/persistence/validate_schema_parity.ts` | `schema-parity-mismatch` | `triggers/bad_schema.sql` |
| **EXTENSION** | `validate_sql_migrations` | `scripts/auditors/persistence/validate_sql_migrations.ts` | `non-idempotent-migration` | `triggers/bad_schema.sql` |

---

## 🎯 Instrucciones de Ejecución de la Suite de Falla

```bash
# Correr auditoría apuntando a la configuración de fallas
node packages/auditor/src/cli/audit_full.ts --config auditor_fault_suite/audit.config.faults.ts
```
