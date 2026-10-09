import { defineAuditConfig } from '@francogp/auditor';

export default defineAuditConfig({
  name: 'Poké Vicio',
  paths: {
    srcRoots: ['src'],
    testRoots: ['tests'],
    e2eRoots: ['scripts/e2e'],
    integrationRoots: ['tests/integration'],
    migrationsDir: 'database/migrations',
    scriptsRoots: ['scripts'],
    codeRoots: ['src', 'scripts', 'database', 'ui-demo'],
    cliRoots: ['test_aventura/scripts'],
    dataRoots: ['src/data'],
    constantsRoots: ['src/logic/constants'],
    componentsRoots: ['src/components'],
    viewsRoots: ['src/views'],
    storesRoots: ['src/stores'],
    composablesRoots: ['src/composables'],
    typesRoots: ['src/types'],
    stylesRoots: ['src/styles'],
    logicRoots: ['src/logic'],
    demoRoots: ['ui-demo'],
    exemptFiles: [],
    testFilePatterns: ['.spec.', '.test.', '.simulation.'],
    includeTestsInCodeAudit: false,
    testFragmentationWhitelist: ['src/logic/battle/battleEngine.ts'],
    ignoreGlobs: [
      'node_modules/**',
      'dist/**',
      'scratch/**',
      '.tsbuildinfo/**',
      'external/**',
      'showdown/**',
      'backup_legacy_code/**',
      'test_aventura/**',
      'supabase/docker/**'
    ],
    ignoredDirs: ['external', 'showdown', 'backup_legacy_code', 'supabase/docker'],
    ignoredPatterns: ['src/logic/db/migrations_data.ts']
  },
  coverage: {
    enabled: true,
    exemptGlobs: [
      { glob: 'src/data/ai/random-sets.json', reason: 'Heuristic AI random movesets database' }
    ],
    acknowledgedDegradations: [
      { glob: 'scripts/**', policy: 'scripts', reason: 'Maintenance and simulation scripts running in CLI Node environment' },
      { glob: 'src/data/**', policy: 'data', reason: 'Domain data catalogs and tabular game mini-databases' },
      { glob: 'ui-demo/**', policy: 'demo', reason: 'Interactive UI demo sandbox and test harness components' },
      { glob: 'ui-demo/src/data/**', policy: 'data', reason: 'UI demo mock catalogs' }
    ]
  },
  testCoverage: {
    enabled: true,
    enforceInAudit: false
  },
  documentation: {
    allowedNpxBinaries: ['kill-port'],
    language: 'en',
    languageExemptions: ['docs/**', './docs/**', 'docs']
  },
  secretLeaks: {
    enabled: true,
    exemptGlobs: [
      'tests/**',
      'scripts/testing/**'
    ]
  },
  persistence: {
    engine: 'hybrid',
    schemaQualified: false,
    authorizedSaveFiles: [
      'src/logic/auth/saveCoordinator.ts',
      'src/stores/game/actions/saveActionHelpers.ts'
    ],
    saveKeyPrefixes: ['pokemon_local_save_', 'pvs_sandbox_save']
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
      'saveId', 'userId', 'sessionId', 'combatantId', 'slotId', 'uuid', 'roomId',
      'nationalId', 'national_id', 'nationalDexId', 'national_dex_id', 'dexId', 'dex_id',
      'catId', 'cat_id', 'shadowId', 'shadow_id',
      'sellerId', 'seller_id', 'listingId', 'matchId', 'inviteId', 'friendId',
      'awardId', 'last_save_id', 'lastSaveId', 'targetTrainerId', 'challengerId',
      'offerId', 'tradeId', 'p_trade_id', 'buyerId', 'buyer_id', 'senderId', 'sender_id',
      'receiver_id', 'p_receiver_id', 'requestId', 'requester_id', 'addressee_id',
      'relId', 'claimId', 'currentSessionId', 'current_session_id', 'targetChatId',
      'seatId', 'opponentId', 'opponent_id', 'player_id', 'serverId', 'server_id',
      'selectedServerId', 'selected_server_id', 'assetId', 'asset_id'
    ],
    fallbackIdPatterns: ['heldItem', 'item', 'species', 'ability', 'move', 'moveId', 'itemId', 'speciesId', 'abilityId'],
    o1CatalogPatterns: [
      {
        name: 'OFFICIAL_SERVERS',
        pattern: '\\bOFFICIAL_SERVERS\\.(?:find|filter|some|findLast)\\s*\\(',
        alternative: 'OFFICIAL_SERVERS_BY_ID[serverId]',
        definingFile: 'src/data/system/official_servers.ts'
      }
    ],
    allowedStoreSetterPrefixes: ['set', 'update', 'equip', 'clear'],
    caseNormalizationExemptTokens: ['rpg', 'pvp', 'pve', 'fsm', 'dex', 'hp', 'atk', 'def', 'spa', 'spd', 'spe', 'iv', 'ev']
  },
  constants: {
    exemptGlobs: [
      'scripts/database/**',
      'scripts/maintenance/**',
      'scripts/data/**',
      'scripts/assets/**',
      'scripts/testing/**',
      'scripts/tools/**',
      'scripts/e2e/**',
      'scripts/auditors/**'
    ],
    exemptMagicNumbers: [1000, 3600, 24, 60]
  },
  styles: {
    zLayersEnabled: true,
    baseScssFile: 'src/styles/core/_base.scss',
    zLayersScssFile: 'src/styles/core/_base.scss',
    zLayersTsFile: 'src/logic/constants/visuals.ts',
    globalUtilityClasses: ['pv-button-retro'],
    duplicates: {
      checkSimilar: false,
      checkColors: false,
      checkLongLines: false,
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
    requireInputIds: false
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
    './scripts/auditors/persistence/validate_schema_parity.ts',
    './scripts/auditors/persistence/validate_sql_migrations.ts'
  ]
,
  accessibility: {
    enabled: true
  },
  architecture: {
    enabled: true
  },
  dependencyVulnerabilities: {
    enabled: true,
    failOn: "critical"
  },
  eslint: {
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
    enabled: true
  },
  assets: {
    enabled: true
  }
});
