/**
 * auditor_fault_suite/audit.config.faults.ts
 *
 * Configuración de auditoría de estrés para Poké Vicio apuntando a la suite de fallas
 */

let defineFn: any;
try {
  const mod = await import('@francogp/auditor');
  defineFn = mod.defineAuditConfig;
} catch {
  const mod = await import('../packages/auditor/src/core/auditConfig.ts');
  defineFn = mod.defineAuditConfig;
}

export default defineFn({
  name: 'Poké Vicio (Fault Injection Suite)',
  paths: {
    srcRoots: ['auditor_fault_suite/triggers'],
    testRoots: ['auditor_fault_suite/triggers'],
    e2eRoots: ['auditor_fault_suite/triggers'],
    integrationRoots: ['auditor_fault_suite/triggers'],
    migrationsDir: 'auditor_fault_suite/triggers',
    scriptsRoots: ['auditor_fault_suite/triggers'],
    codeRoots: ['auditor_fault_suite/triggers'],
    dataRoots: ['auditor_fault_suite/triggers'],
    constantsRoots: ['auditor_fault_suite/triggers'],
    componentsRoots: ['auditor_fault_suite/triggers'],
    viewsRoots: ['auditor_fault_suite/triggers'],
    storesRoots: ['auditor_fault_suite/triggers'],
    composablesRoots: ['auditor_fault_suite/triggers'],
    typesRoots: ['auditor_fault_suite/triggers'],
    stylesRoots: ['auditor_fault_suite/triggers'],
    logicRoots: ['auditor_fault_suite/triggers'],
    exemptFiles: [],
    includeTestsInCodeAudit: true,
    ignoreGlobs: [],
    ignoredDirs: []
  },
  persistence: {
    engine: 'hybrid',
    schemaQualified: false,
    authorizedSaveFiles: [
      'auditor_fault_suite/triggers/bad_save.ts'
    ],
    saveKeyPrefixes: ['pokemon_local_save_']
  },
  e2e: {
    idLocatorsOnly: false
  },
  styles: {
    zLayersEnabled: true,
    baseScssFile: 'auditor_fault_suite/triggers/bad_styles.scss',
    zLayersScssFile: 'auditor_fault_suite/triggers/bad_styles.scss',
    zLayersTsFile: 'src/logic/constants/visuals.ts',
    lineHeightOverlapCheck: true,
    globalUtilityClasses: ['pv-button-retro']
  },
  bundle: {
    enabled: false
  },
  templates: {
    requireInputIds: true
  },
  domain: {
    timezoneVariable: 'APP_TIMEZONE',
    finiteDomainTypes: [
      'PokemonId', 'MoveId', 'AbilityId', 'ItemId'
    ],
    infraIdWhitelist: ['saveId', 'userId'],
    fallbackIdPatterns: ['moveId', 'itemId']
  },
  customFamilies: [
    {
      key: 'fsm',
      title: 'Finite State Machine & Turn Invariants',
      order: 5,
      icon: '🔄'
    },
    {
      key: 'assets',
      title: 'Game Assets & Sprite Integrity',
      order: 6,
      icon: '🎨'
    }
  ],
  extensions: [
    './scripts/auditors/architecture/validate_battle_ui_branching.ts',
    './scripts/auditors/architecture/validate_client_sim_decoupling.ts',
    './scripts/auditors/assets/audit_item_sprite_collisions.ts',
    './scripts/auditors/assets/validate_asset_usage.ts',
    './scripts/auditors/assets/validate_sprites.ts',
    './scripts/auditors/domain_data/validate_abilities.ts',
    './scripts/auditors/domain_data/validate_items.ts',
    './scripts/auditors/domain_data/validate_moves.ts',
    './scripts/auditors/domain_data/validate_pokemon.ts',
    './scripts/auditors/domain_data/validate_spanish_ids.ts',
    './scripts/auditors/domain_data/validate_spawns_whitelist.ts',
    './scripts/auditors/fsm/validate_combat_invariants.ts',
    './scripts/auditors/fsm/validate_fsm_diagrams.ts',
    './scripts/auditors/fsm/validate_fsm_flow_parity.ts',
    './scripts/auditors/fsm/validate_fsm_implementation.ts',
    './scripts/auditors/fsm/validate_showdown_parity.ts',
    './scripts/auditors/persistence/validate_save_persistence_parity.ts',
    './scripts/auditors/persistence/validate_schema_parity.ts',
    './scripts/auditors/persistence/validate_sql_migrations.ts'
  ]
});
