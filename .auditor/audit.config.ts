import { defineAuditConfig } from '@francogp/auditor';

export default defineAuditConfig({
  name: 'Poké Vicio',
  auditorVersion: '10.2.3-build.20261027-004334',
  paths: {
    srcRoots: ['src', 'test_aventura'],
    testRoots: ['tests', 'test_aventura/tests'],
    e2eRoots: ['scripts/e2e'],
    integrationRoots: ['tests/integration'],
    migrationsDir: 'database/migrations',
    scriptsRoots: ['scripts'],
    codeRoots: ['src', 'scripts', 'database', 'ui-demo', 'test_aventura'],
    cliRoots: ['scripts'],
    dataRoots: ['src/data', 'test_aventura/data'],
    componentsRoots: ['src/components', 'test_aventura/components'],
    viewsRoots: ['src/views', 'test_aventura/views'],
    storesRoots: ['src/stores', 'test_aventura/stores'],
    composablesRoots: ['src/composables', 'test_aventura/composables'],
    typesRoots: ['src/types', 'test_aventura/types'],
    stylesRoots: ['src/styles', 'test_aventura/styles'],
    logicRoots: ['src/logic', 'test_aventura/logic'],
    demoRoots: ['ui-demo'],
    exemptFiles: [],
    includeTestsInCodeAudit: false,
    ignoreGlobs: [
      'node_modules/**',
      'dist/**',
      'scratch/**',
      '.tsbuildinfo/**',
      'external/**',
      'showdown/**',
      'backup_legacy_code/**',
      'supabase/docker/**'
    ],
    ignoredDirs: ['external', 'showdown', 'backup_legacy_code', 'supabase/docker'],
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
        glob: 'src/data/**',
        policy: 'data',
        reason: 'Domain data catalogs and tabular game mini-databases'
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
        reason: 'Adventure map data presets and catalogs'
      }
    ]
  },
  testCoverage: {
    enabled: true,
    enforceInAudit: false
  },
  documentation: {
    allowedNpxBinaries: ['kill-port', 'playwright', 'tsx', 'vitest'],
    language: 'en',
    languageExemptions: [
      'docs/**',
      './docs/**',
      'docs',
      'test_aventura/docs/**',
      './test_aventura/docs/**',
      'test_aventura/docs',
      'test_aventura/**',
      './test_aventura/**'
    ]
  },
  secretLeaks: {
    enabled: true,
    exemptGlobs: ['tests/**', 'scripts/testing/**']
  },
  persistence: {
    engine: 'hybrid',
    schemaQualified: false,
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
    }
  },
  constants: {
    enabled: true
  },
  styles: {
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
    }
  },
  bundle: {
    enabled: true,
    maxClientChunkWarnBytes: 1500 * 1024,
    maxClientChunkErrorBytes: 2500 * 1024,
    exemptChunkPrefixes: [
      'worker-vendor-pkmn',
      'worker-vendor-randoms',
      'worker-game-data',
      'vendor-pkmn-sim',
      'game-data-pokemon',
      'vendor-randoms',
      'db-migrations-data'
    ]
  },
  templates: {
    requireInputIds: true
  },
  packageHygiene: {
    enabled: true,
    ignoreDependencies: ['markdownlint-cli', 'vue-tsc']
  },
  agentPlugin: {
    enabled: true
  },
  fallow: {
    enabled: true,
    security: {
      enabled: true
    },
    enforceTargets: true,
    maxTargetPriority: 'critical',
    similarCode: {
      enabled: true,
      threshold: 0.95,
      ignoreSameFile: true
    },
    typeAware: true,
    showCascade: true,
    duplicates: {
      nearMiss: true,
      mode: 'strict'
    },
    viz: {
      enabled: true,
      outputPath: 'scratch/fallow_map.html'
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
    enabled: true
  },
  dependencyVulnerabilities: {
    enabled: true,
    failOn: 'critical'
  },
  oxlint: {
    enabled: true
  },
  htmlValidate: {
    enabled: true
  },
  pinia: {
    enabled: true
  },
  typeCoverage: {
    enabled: true,
    atLeast: 95
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
    enabled: true
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
    allowMatrixLoops: true
  },
  scssArchitecture: {
    enabled: true,
    maxNestingDepth: 5,
    scopedMaxNestingDepth: 5,
    allowPixelArtSpacing: true,
    allowScopedColors: false
  },
  queryPerformance: {
    enabled: true
  },
  webPerformance: {
    enabled: true,
    exemptSvgPaths: ['test_aventura/**', 'src/components/common/SVGFilters.vue']
  },
  securityHardening: {
    enabled: true
  },

  vitePlusConfig: {
    enabled: true,
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
    exemptGlobs: ['database/backups/**', 'database/migrations/**']
  },
  animation: {
    enabled: true
  },
  stylelint: {
    enabled: true,
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
  }
});
