import { defineAuditConfig } from '@francogp/auditor';

export default defineAuditConfig({
  name: 'Poké Vicio',
  auditorVersion: '10.7.12-build.20261103-233754',
  paths: {
    srcRoots: ['src', 'test_aventura'],
    testRoots: ['tests', 'test_aventura/tests'],
    e2eRoots: ['scripts/e2e'],
    integrationRoots: ['tests/integration'],
    migrationsDir: 'database/migrations',
    scriptsRoots: ['scripts', 'supabase'],
    codeRoots: ['src', 'scripts', 'database', 'ui-demo', 'test_aventura', 'supabase'],
    cliRoots: ['scripts', 'supabase'],
    dataRoots: ['src/data', 'test_aventura/data'],
    componentsRoots: ['src/components', 'test_aventura/components'],
    viewsRoots: ['src/views', 'test_aventura/views'],
    storesRoots: ['src/stores', 'test_aventura/stores'],
    composablesRoots: ['src/composables', 'test_aventura/composables'],
    typesRoots: ['src/types', 'test_aventura/types'],
    stylesRoots: ['src/styles', 'test_aventura/styles'],
    logicRoots: ['src/logic', 'test_aventura/logic'],
    loggerFiles: ['src/logic/utils/logger.ts'],
    demoRoots: ['ui-demo'],
    exemptFiles: [],
    includeTestsInCodeAudit: false,
    ignoreGlobs: [],
    ignoredDirs: ['external'],
    ignoredPatterns: ['src/logic/db/migrations_data.ts']
  },
  coverage: {
    enabled: true,
    exemptGlobs: [
      { glob: 'src/data/ai/random-sets.json', reason: 'Heuristic AI random movesets database' },
      { glob: '.markdownlintignore', reason: 'Markdownlint exclusion file' },
      { glob: '.prettierrc', reason: 'Prettier code formatter configuration' },
      { glob: '.replit', reason: 'Replit container execution configuration' },
      { glob: 'public/_headers', reason: 'Static HTTP response headers configuration' },
      { glob: '_raw-assets/**/desktop.ini', reason: 'Windows Explorer localized folder metadata' },
      { glob: '_raw-assets/**/*.pdn', reason: 'Paint.NET binary graphic source file' },
      { glob: 'docs/**/*.html', reason: 'Legacy architecture test harnesses and visualizers' },
      { glob: 'docs/**/*.txt', reason: 'Historical git blame notes' },
      { glob: 'docs/**/*.docx', reason: 'Binary specification documents' },
      { glob: 'test_aventura/docs/**/*.docx', reason: 'Binary game design proposal documents' }
    ],
    acknowledgedDegradations: [
      {
        glob: 'scripts/**',
        policy: 'scripts',
        reason: 'Maintenance and simulation scripts running in CLI Node environment'
      },
      {
        glob: 'scripts/**',
        policy: 'cli',
        reason: 'Maintenance and tooling CLI scripts running in Node environment'
      },
      {
        glob: 'supabase/**',
        policy: 'scripts',
        reason: 'Docker Supabase local harness and credentials setup scripts'
      },
      {
        glob: 'supabase/**',
        policy: 'cli',
        reason: 'Docker Supabase local harness and credentials CLI setup tool'
      },
      {
        glob: 'src/data/**',
        policy: 'data',
        reason: 'Static game databases, items, moves, and assets catalogs'
      },
      {
        glob: 'ui-demo/**',
        policy: 'demo',
        reason: 'Interactive UI demo sandbox and test harness components'
      },
      { glob: 'ui-demo/src/data/**', policy: 'data', reason: 'UI demo mock catalogs' },
      {
        glob: 'test_aventura/data/**',
        policy: 'data',
        reason: 'Adventure mode map data and catalogs'
      }
    ]
  },
  testCoverage: {
    enabled: true,
    enforceInAudit: false,
    threshold: 80,
    directoryThresholds: {
      'src/logic/battle': 85,
      'src/stores': 80
    },
    path: 'scratch/coverage/coverage-final.json',
    runCommand: 'vp test --coverage',
    roots: ['src'],
    extensions: ['.ts', '.vue', '.js', '.jsx', '.tsx', '.mjs', '.cjs'],
    exemptGlobs: []
  },
  documentation: {
    allowedNpxBinaries: ['kill-port', 'playwright', 'tsx', 'vitest'],
    language: 'en',
    languageExemptions: ['docs/**', 'test_aventura/**'],
    enabled: true,
    chatLanguage: 'es',
    skillsRoots: ['.agents/skills']
  },
  secretLeaks: {
    enabled: true,
    exemptGlobs: ['tests/**', 'scripts/testing/**'],
    maskSecrets: true
  },
  persistence: {
    engine: 'hybrid',
    schemaQualified: false,
    supabaseDir: 'supabase',
    dockerContainer: 'supabase-db',
    allowedDatabaseFiles: ['AGENTS.md'],
    exemptRlsTables: ['_migrations', 'schema_migrations', 'supabase_migrations'],
    authorizedSaveFiles: [
      'src/logic/auth/saveCoordinator.ts',
      'src/stores/game/actions/saveActionHelpers.ts'
    ],
    saveKeyPrefixes: ['pokemon_local_save_', 'pvs_sandbox_save'],
    enabled: true,
    schemaParity: {
      enabled: true
    },
    sqlMigrations: {
      enabled: true
    }
  },
  valibot: {
    enabled: true,
    targets: [
      {
        id: 'gameState',
        typesFile: 'src/types/system/game.ts',
        interfaceName: 'GameState',
        schemaFile: 'src/logic/validation/schemas.ts',
        schemaVarName: 'saveDataSchema',
        ephemeralTypeAlias: 'EphemeralGameStateKeys',
        serializerFile: 'src/logic/auth/saveSerializer.ts',
        initialStateFile: 'src/stores/gameInitialState.ts',
        initialStateFunctionName: 'createInitialGameState',
        nestedTargets: [
          {
            id: 'playerClass',
            interfaceName: 'PlayerClassState',
            schemaVarName: 'classDataSchema',
            initialStateProperty: 'classData'
          },
          {
            id: 'activeMission',
            interfaceName: 'ActiveMission',
            schemaVarName: 'activeMissionSchema',
            serializerFunctionName: 'serializeClassActiveMission'
          }
        ],
        allowedNullableFields: [
          'activeBattle',
          'activeMission',
          'playerClass',
          'faction',
          'fishingRodType',
          'pickaxeType',
          'brushType',
          'incenseType',
          'lastRankedSeason',
          'nick_style',
          'avatar_style',
          'extortedRouteId',
          'extortedRouteTimestamp',
          'lastEggScanDate',
          'officialRouteId',
          'officialRouteTimestamp',
          'lastResolvedWeek',
          'last_renamed_at'
        ],
        allowedUnknownFields: ['chats']
      }
    ]
  },
  domain: {
    exemptSignatures: ['back|front'],
    exemptCollections: [
      'scalePool',
      'AUTO_SORT_CATEGORY_VALUES',
      'TERRAIN_CATEGORY_LIST',
      'MAJOR_SETTLEMENT_TYPE_LIST',
      'LAYOUT_CAPABLE_POI_TYPE_LIST',
      'URBAN_POI_TYPE_LIST',
      'MART_SCALE_LIST',
      'BASTION_SETTLEMENT_ID_LIST',
      'EXCLUDED_AQUATIC_TERRAIN_LIST',
      'NON_LAND_TERRAIN_LIST',
      'SKIPPED_TOPOLOGY_EDGE_KIND_LIST',
      'PLAIN_SETTLEMENT_TYPE_LIST',
      'EXCLUDED_TALL_GRASS_BIOME_LIST',
      'EXCLUDED_TALL_GRASS_NEIGHBOR_TERRAIN_LIST',
      'NON_METROPOLIS_SCALE_LIST'
    ],
    timezoneVariable: 'APP_TIMEZONE',
    timezoneHelperModule: 'src/logic/utils/timeUtils.ts',
    loggerModule: 'src/logic/utils/logger.ts',
    zLayersFile: 'src/logic/constants/visuals.ts',
    finiteDomainTypes: [
      'PokemonId',
      'MoveId',
      'AbilityId',
      'ItemId',
      'NatureId',
      'Type',
      'BattleStatus',
      'Weather',
      'Terrain',
      'Gender',
      'StatId',
      'FsmState'
    ],
    infraIdWhitelist: [
      'saveId',
      'userId',
      'sessionId',
      'combatantId',
      'slotId',
      'uuid',
      'roomId',
      'nationalId',
      'national_id',
      'nationalDexId',
      'national_dex_id',
      'dexId',
      'dex_id',
      'catId',
      'cat_id',
      'shadowId',
      'shadow_id',
      'sellerId',
      'seller_id',
      'listingId',
      'matchId',
      'inviteId',
      'friendId',
      'awardId',
      'last_save_id',
      'lastSaveId',
      'targetTrainerId',
      'challengerId',
      'offerId',
      'tradeId',
      'p_trade_id',
      'buyerId',
      'buyer_id',
      'senderId',
      'sender_id',
      'receiver_id',
      'p_receiver_id',
      'requestId',
      'requester_id',
      'addressee_id',
      'relId',
      'claimId',
      'currentSessionId',
      'current_session_id',
      'targetChatId',
      'seatId',
      'opponentId',
      'opponent_id',
      'player_id',
      'serverId',
      'server_id',
      'selectedServerId',
      'selected_server_id',
      'assetId',
      'asset_id'
    ],
    fallbackIdPatterns: [
      'heldItem',
      'item',
      'species',
      'ability',
      'move',
      'moveId',
      'itemId',
      'speciesId',
      'abilityId'
    ],
    o1CatalogPatterns: [
      {
        name: 'OFFICIAL_SERVERS',
        pattern: '\\bOFFICIAL_SERVERS\\.(?:find|filter|some|findLast)\\s*\\(',
        alternative: 'OFFICIAL_SERVERS_BY_ID[serverId]',
        definingFile: 'src/data/system/official_servers.ts'
      }
    ],
    allowedStoreSetterPrefixes: ['set', 'update', 'equip', 'clear'],
    caseNormalizationExemptTokens: [
      'rpg',
      'pvp',
      'pve',
      'fsm',
      'dex',
      'hp',
      'atk',
      'def',
      'spa',
      'spd',
      'spe',
      'iv',
      'ev'
    ],
    abilities: {
      enabled: true
    },
    enabled: true,
    items: {
      enabled: true
    },
    moves: {
      enabled: true
    },
    pokemon: {
      enabled: true
    },
    spanishIds: {
      enabled: true
    },
    spawnsWhitelist: {
      enabled: true
    },
    allowedNumericConstantPrefixes: [
      'GEN_',
      'ISO_',
      'UTF_8',
      'BASE_64',
      'RGB_',
      'RGBA_',
      'WASM_',
      'HTML_5',
      'CSS_3',
      'HTTP_',
      'D3_'
    ]
  },
  constants: {
    enabled: true
  },
  styles: {
    lineHeightOverlapCheck: true,
    stylelint: {
      enabled: true,
      rules: {},
      ignoreGlobs: [],
      order: {
        enabled: true,
        enforceHasBlockPartitioning: true
      }
    },
    zLayersEnabled: true,
    baseScssFile: 'src/styles/core/_base.scss',
    zLayersScssFile: 'src/styles/core/_base.scss',
    zLayersTsFile: 'src/logic/constants/visuals.ts',
    globalUtilityClasses: ['pv-button-retro'],
    enforceScss: true,
    exemptCssFiles: [],
    duplicates: {
      checkSimilar: true,
      checkColors: true,
      checkLongLines: true,
      minDeclarations: 2
    },
    enabled: true
  },
  bundle: {
    enabled: true,
    maxClientChunkWarnBytes: 1228800,
    maxClientChunkErrorBytes: 2048000,
    exemptChunkPrefixes: [
      'worker-vendor-pkmn',
      'worker-vendor-randoms',
      'worker-game-data',
      'vendor-pkmn-sim',
      'game-data-pokemon',
      'vendor-randoms',
      'db-migrations-data'
    ],
    statsFile: 'scratch/bundle_stats.html',
    distDir: 'dist/assets',
    budgets: [],
    duplicateModuleThresholdBytes: 512000,
    topModulesLimit: 15
  },
  templates: {
    requireInputIds: true,
    enabled: true
  },
  packageHygiene: {
    enabled: true,
    ignoreDependencies: ['markdownlint-cli', 'vue-tsc']
  },
  agentPlugin: {
    enabled: true,
    gitSafetyHook: true
  },
  fallow: {
    enabled: true,
    ignoreGlobs: ['.agents/**', 'src/**/*.scss', 'test_aventura/**/*.scss'],
    ignoreDependencies: [
      'postgres',
      '@pkmn/sim',
      '@rolldown/binding-wasm32-wasi',
      'ws',
      'sql.js',
      'html-validate-vue',
      'vue-tsc'
    ],
    security: {
      enabled: true
    },
    enforceTargets: true,
    maxTargetPriority: 35,
    similarCode: {
      enabled: true,
      threshold: 0.95,
      ignoreSameFile: true,
      minLines: 3
    },
    typeAware: true,
    showCascade: true,
    duplicates: {
      nearMiss: true,
      mode: 'strict',
      minOccurrences: 2,
      minLines: 15,
      minTokens: 100,
      enabled: true
    },
    viz: {
      enabled: true,
      outputPath: 'scratch/fallow_map.html'
    },
    flags: {
      enabled: true,
      trackRetirement: true
    },
    coverage: {
      enabled: true
    },
    health: {
      maxCognitive: 20,
      maxCyclomatic: 25,
      cyclomaticPolicy: 'standard'
    }
  },
  customFamilies: [
    {
      key: 'fsm',
      title: 'Finite State Machine & Turn Invariants',
      order: 5,
      icon: '🔄',
      description: 'Reglas e invariantes de FSM y combate'
    },
    {
      key: 'assets',
      title: 'Game Assets & Sprite Integrity',
      order: 6,
      icon: '🎨',
      description: 'Auditorías de sprites, audio y assets'
    }
  ],
  extensions: [
    './scripts/auditors/architecture/validate_battle_ui_branching.ts',
    './scripts/auditors/architecture/validate_client_sim_decoupling.ts',
    './scripts/auditors/assets/validate_item_sprite_collisions.ts',
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
    './scripts/auditors/persistence/validate_schema_parity.ts',
    './scripts/auditors/persistence/validate_sql_migrations.ts'
  ],
  accessibility: {
    enabled: true,
    rules: {}
  },
  dependencyVulnerabilities: {
    enabled: true,
    failOn: 'high',
    allowList: [],
    includeDev: false
  },
  oxlint: {
    enabled: true
  },
  htmlValidate: {
    enabled: true,
    disabledRules: ['prefer-button']
  },
  typeCoverage: {
    enabled: true,
    atLeast: 98,
    strict: true
  },
  fsm: {
    enabled: true,
    combatInvariants: {
      enabled: true
    },
    diagrams: {
      enabled: true
    },
    flowParity: {
      enabled: true
    },
    implementation: {
      enabled: true
    },
    showdownParity: {
      enabled: true
    }
  },
  assets: {
    enabled: true,
    itemSpriteCollisions: {
      enabled: true
    },
    assetUsage: {
      enabled: true
    },
    sprites: {
      enabled: true
    }
  },
  environment: {
    enabled: true
  },
  packageScripts: {
    enabled: true,
    enforceBuildAudit: true,
    recommendedScripts: true
  },
  auditorHygiene: {
    enabled: true,
    roots: ['scripts/auditors']
  },
  scriptExtensions: {
    enabled: true,
    enforceTypeScript: true,
    allowMjs: false,
    allowCjs: false,
    allowJsScripts: false,
    exemptFiles: []
  },
  codeSimplification: {
    enabled: true,
    allowMatrixLoops: true,
    maxNestingDepth: 4,
    exemptPaths: []
  },
  scssArchitecture: {
    enabled: true,
    maxNestingDepth: 5,
    scopedMaxNestingDepth: 4,
    allowPixelArtSpacing: true,
    allowScopedColors: false
  },
  queryPerformance: {
    enabled: true,
    excludeMigrationsDir: true,
    exemptSelectStarPaths: [],
    exemptPaths: []
  },
  webPerformance: {
    enabled: true,
    exemptSvgPaths: ['test_aventura/**', 'src/components/common/SVGFilters.vue'],
    maxDomDepth: 16,
    maxInlineSvgSize: 2048,
    exemptImgClasses: [],
    exemptPaths: []
  },
  securityHardening: {
    enabled: true
  },

  vitePlusConfig: {
    enabled: true,
    lint: {
      rules: {
        'unicorn/prefer-node-protocol': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'error',
          {
            prefer: 'type-imports',
            fixStyle: 'inline-type-imports'
          }
        ],
        'typescript/prefer-as-const': 'error',
        'typescript/no-for-in-array': 'error',
        'typescript/no-duplicate-enum-values': 'error',
        'typescript/no-duplicate-type-constituents': 'error',
        'typescript/no-extra-non-null-assertion': 'error',
        'typescript/no-useless-empty-export': 'error',
        'oxc/const-comparisons': 'error',
        'oxc/missing-throw': 'error',
        'oxc/uninvoked-array-callback': 'error',
        'unicorn/no-new-array': 'error',
        'unicorn/prefer-set-size': 'error',
        'typescript/no-wrapper-object-types': 'error',
        'typescript/no-unnecessary-type-assertion': 'error',
        'unicorn/no-instanceof-array': 'error',
        'unicorn/no-useless-fallback-in-spread': 'error',
        'unicorn/no-useless-promise-resolve-reject': 'error',
        'unicorn/prefer-string-starts-ends-with': 'error',
        'unicorn/throw-new-error': 'error',
        'promise/no-new-statics': 'error',
        'promise/valid-params': 'error',
        'node/no-exports-assign': 'error',
        'node/no-new-require': 'error',
        'import/no-duplicates': 'error',
        'import/no-self-import': 'error',
        'jsx-a11y/aria-props': 'error',
        'jsx-a11y/aria-unsupported-elements': 'error',
        'jsx-a11y/no-aria-hidden-on-focusable': 'error',
        'jsx-a11y/no-redundant-roles': 'error',
        'vitest/no-identical-title': 'error',
        'vitest/no-focused-tests': 'error',
        'vitest/no-import-node-test': 'error',
        'vitest/valid-title': 'error',
        'vue/prefer-import-from-vue': 'error',
        'vue/no-deprecated-destroyed-lifecycle': 'error',
        'vue/valid-next-tick': 'error',
        'vue/next-tick-style': 'error'
      },
      enabled: true,
      typeAware: true,
      typeCheck: true,
      plugins: ['vitest', 'node', 'promise', 'unicorn', 'typescript', 'vue', 'import', 'jsx-a11y']
    },
    fmt: {
      ignorePatterns: ['src/data/**'],
      enabled: true,
      singleQuote: true,
      semi: true,
      trailingComma: 'none',
      sortPackageJson: true,
      overrides: []
    },
    precompress: {
      enabled: true,
      server: 'nginx',
      spa: true,
      report: 'summary',
      threshold: 512
    },
    test: {
      enabled: true,
      projects: {
        unit: [
          'tests/unit/**/*.{test,spec}.ts',
          'tests/integration/**/*.{test,spec}.ts',
          'src/**/*.{test,spec}.ts'
        ],
        node: [
          'tests/node/**/*.test.ts',
          'packages/auditor/tests/**/*.test.ts',
          'test_aventura/tests/**/*.{test,spec}.ts'
        ],
        migrations: ['tests/node/**/backup_migration_real.test.ts']
      }
    },
    staged: {
      enabled: true,
      rules: {
        '*': 'vp check --fix'
      }
    },
    hooks: {
      enabled: true
    },
    vscode: {
      enabled: true,
      formatOnSave: true,
      defaultFormatter: 'oxc.oxc-vscode'
    },
    run: {
      cache: true
    }
  },

  oxfmt: {
    enabled: true
  },

  architecture: {
    enabled: true,
    battleUiBranching: {
      enabled: true
    },
    clientSimDecoupling: {
      enabled: true
    }
  },
  encoding: {
    enabled: true,
    defaultEncoding: 'utf-8',
    prohibitBom: true,
    detectMojibake: true,
    exemptGlobs: [
      'database/backups/**',
      'database/migrations/20260611120000_migrate_save_v3_ids.sql'
    ]
  },
  animation: {
    enabled: true
  },
  stylelint: {
    enabled: true,
    rules: {},
    strictValues: {
      enabled: true,
      ignoreValues: {
        'border-radius': ['inherit']
      }
    },
    order: {
      enabled: true,
      enforceHasBlockPartitioning: true
    }
  },
  types: {
    enabled: true
  },
  dox: {
    enabled: true,
    ignoreGlobs: ['.agents/**']
  },
  gitSafety: {
    enabled: true,
    preventDestructiveCommands: true
  },
  scriptCommands: {
    enabled: true
  },
  gitIgnore: {
    enabled: true,
    extraRequiredEntries: []
  },
  security: {
    enabled: true
  },
  packageDistribution: {
    enabled: false,
    level: 'warning'
  },
  version: {
    enabled: true,
    autoSyncPublicVersionJson: true,
    syncTargets: []
  },
  ratchet: {
    enabled: true,
    productionRef: 'origin/main',
    baselineFile: '.auditor/audit-baseline.json'
  },
  runner: {
    enabled: true,
    timeoutMs: 0,
    maxStalenessMinutes: 5
  }
});
