const INITIAL_RATE_CUMULATIVE_SUM = 0;

import { PERCENTAGE_SCALE_FACTOR } from '@/logic/constants/encounters'
import { cloneReactive } from '@/logic/utils/cloneUtils.ts'
import { getMapBiomeAndTags } from './biomeHelper.ts'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { logger } from '../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { mapVisualToOfficialWeather } from '../weather/weatherGenerationProvider.ts'
import { isWeatherId, requireWeatherId, resolveCurrentWeather, type WeatherId } from '../weather/weatherRegistry.ts'
import { ACTIVE_GENERATION } from '../../data/system/constants.ts'
import { generateNPCInventory } from './trainerInventory.ts'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireGymId } from '@/data/world/gyms'
import { requireNpcArchetype } from '@/logic/utils/npcSpriteRouter'
import { requireItemId } from '@/data/inventory/items'
import { isPlayerClassId } from '@/data/player/playerClasses'
import { requireNpcSpriteId, type NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import { isGenderId, type GenderId, type PlayerClassId } from '@/types/system/game'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker
} from './showdownWorkerClient.ts';
import { initBattleSequence } from './helpers/battleLifecycleInitializer.ts';

const DEFAULT_RARITY_WEIGHT_BASE = 50;

export {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker,
  initBattleSequence
};

import type { BattleOptions } from '@/types/system/stores.ts';
export type { BattleOptions };

interface ResolvedLocationData {
  resolvedLocationId: ReturnType<typeof requireMapRouteId>
  locationMap: (typeof MAPS_BY_ROUTE_ID)[keyof typeof MAPS_BY_ROUTE_ID] | undefined
  activeBiome: string
  mapTags: string[]
}

function extractLocationAndBiome(options: BattleOptions, rawMapLocation?: string): ResolvedLocationData {
  const rawLoc = options.locationId || rawMapLocation
  if (!rawLoc) {
    throw new Error('[Battle] locationId or gameStore.state.map.currentMap is required to start a battle')
  }
  const resolvedLocationId = requireMapRouteId(rawLoc)
  const locationMap = MAPS_BY_ROUTE_ID[resolvedLocationId]
  const { activeBiome, mapTags } = getMapBiomeAndTags(resolvedLocationId)
  return { resolvedLocationId, locationMap, activeBiome, mapTags }
}

function resolveArchetypeAndGym(options: BattleOptions) {
  const { trainerArchetype, battleOptions = {}, gymId } = options
  const optArch = typeof battleOptions.trainerArchetype === 'string'
    ? requireNpcArchetype(battleOptions.trainerArchetype)
    : undefined
  const resolvedTrainerArchetype = trainerArchetype ? requireNpcArchetype(trainerArchetype) : optArch
  const resolvedGymId = gymId ? requireGymId(gymId) : undefined
  return { resolvedTrainerArchetype, resolvedGymId }
}

function resolveDifficultyAndReward(options: BattleOptions) {
  const { difficulty, rewardTM } = options
  const resolvedDifficulty = difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard' ? difficulty : undefined
  const resolvedRewardTM = rewardTM ? requireItemId(rewardTM) : undefined
  return { resolvedDifficulty, resolvedRewardTM }
}

function extractBattleConfig(options: BattleOptions) {
  const {
    isGym = false,
    isTrainer = false, enemyTeam = undefined, trainerName = 'Entrenador',
    battleOptions = {}, minigame = options.minigame ?? null, wasSearching: wasSearchingOpt = options.wasSearching ?? null,
    trainerSprite = undefined, isRival = false, cannotEscape = false,
    trainerQuote = undefined,
    isPvP = false,
    pvpMatchId = undefined,
    pvpIsHost = undefined,
    pvpOpponentId = undefined,
    pvpOpponentName = undefined,
    playerTeam = undefined
  } = options

  const { resolvedTrainerArchetype, resolvedGymId } = resolveArchetypeAndGym(options)
  const { resolvedDifficulty, resolvedRewardTM } = resolveDifficultyAndReward(options)

  return {
    isGym, resolvedGymId,
    isTrainer, enemyTeam, trainerName,
    battleOptions, minigame, wasSearchingOpt,
    trainerSprite, resolvedTrainerArchetype, isRival,
    resolvedDifficulty, resolvedRewardTM, cannotEscape,
    trainerQuote,
    isPvP,
    pvpMatchId,
    pvpIsHost,
    pvpOpponentId,
    pvpOpponentName,
    playerTeam
  }
}

async function validatePlayerTeamLegality(effectivePlayerTeam: Pokemon[], isDebugOrReplay: boolean): Promise<boolean> {
  if (isDebugOrReplay) return true
  const { checkPokemonLegality } = await import('@/logic/pokemon/pokemonLegality')
  const illegalPoke = effectivePlayerTeam.find((p: Pokemon) => {
    if (!p) return false
    if (p.isIllegal) return true
    const legality = checkPokemonLegality(p)
    if (!legality.isLegal) {
      p.isIllegal = true
      p.illegalReasons = legality.issues
      return true
    }
    return false
  })
  if (illegalPoke) {
    const { useUIStore } = await import('@/stores/ui')
    useUIStore().notify(`No puedes combatir: tu equipo contiene Pokémon ilegales (${illegalPoke.name}). Repáralos antes de continuar.`, '⚠️')
    return false
  }
  return true
}

function resetPvPStats(p: Pokemon): void {
  p.hp = p.maxHp
  p.fainted = false
  p.status = ''
  p.statusTurns = 0
  p.sleepTurns = 0
  p.isGuardian = false
}

function cleanTeamVolatileStatus(team: Pokemon[], isPvP: boolean, ctx: BattleContext): void {
  team.forEach((p: Pokemon) => {
    if (p) {
      ctx.clearVolatileStatus(p)
      if (isPvP) {
        resetPvPStats(p)
      }
    }
  })
}

function resolveBattleWeather(options: BattleOptions, battleOptions: Record<string, unknown>, isGym: boolean) {
  const rawFixedWeather = options.fixedWeather || (typeof battleOptions.fixedWeather === 'string' && isWeatherId(battleOptions.fixedWeather) ? battleOptions.fixedWeather : undefined)
  const activeWeatherId: WeatherId = rawFixedWeather || resolveCurrentWeather()
  const weather = {
    type: isGym ? requireWeatherId('none') : requireWeatherId(mapVisualToOfficialWeather(activeWeatherId, ACTIVE_GENERATION)),
    visual: isGym ? 'clear' : activeWeatherId,
    turns: -1
  }
  return { activeWeatherId, weather }
}

function calculateFishingRarity(
  minigame: string | null,
  locationMap: (typeof MAPS_BY_ROUTE_ID)[keyof typeof MAPS_BY_ROUTE_ID] | undefined,
  enemyPoke: Pokemon
): number {
  if (minigame !== 'fishing' || !locationMap?.fishing) {
    return DEFAULT_RARITY_WEIGHT_BASE
  }
  const { pool, rates } = locationMap.fishing
  const enemySpeciesId = requirePokemonSpeciesId(enemyPoke.id)
  const idx = pool.indexOf(enemySpeciesId)
  if (idx === -1) {
    return DEFAULT_RARITY_WEIGHT_BASE
  }
  const totalRate = rates.reduce((a, b) => a + b, INITIAL_RATE_CUMULATIVE_SUM)
  const rateVal = rates[idx] ?? INITIAL_RATE_CUMULATIVE_SUM
  return (rateVal / totalRate) * PERCENTAGE_SCALE_FACTOR
}

function setupSeatsProtocol(
  ctx: BattleContext,
  isTrainer: boolean,
  isGym: boolean,
  finalEnemyPoke: Pokemon,
  effectivePlayerTeam: Pokemon[]
): void {
  if (!ctx.activeBattle.value) return
  ctx.activeBattle.value.enemy = (!isTrainer && !isGym) ? finalEnemyPoke : null
  const currentP = ctx.activeBattle.value.player
  const firstAlive = effectivePlayerTeam.find(p => p && p.hp > 0)
  if (!currentP || !firstAlive || currentP.uid !== firstAlive.uid) {
    ctx.activeBattle.value.player = null
  }
}

function resolveTrainerSprite(rawSprite?: string): NpcSpriteId | PlayerClassId | undefined {
  if (!rawSprite) return undefined
  return isPlayerClassId(rawSprite) ? rawSprite : requireNpcSpriteId(rawSprite)
}

function pickTrainerGender(options: BattleOptions, rawGender: unknown): GenderId | undefined {
  if (options.trainerGender) return options.trainerGender
  return isGenderId(rawGender) ? rawGender : undefined
}

function resolveTrainerDetails(cfg: ReturnType<typeof extractBattleConfig>, options: BattleOptions) {
  const { battleOptions } = cfg
  const nestedSprite = typeof battleOptions.trainerSprite === 'string' ? battleOptions.trainerSprite : undefined
  const sprite = resolveTrainerSprite(cfg.trainerSprite ?? nestedSprite)
  const gender = pickTrainerGender(options, battleOptions.trainerGender)
  const isNamed = [cfg.isTrainer, cfg.isGym, cfg.isPvP, cfg.isRival].some(Boolean)
  const name = isNamed ? cfg.trainerName : undefined
  const nestedQuote = typeof battleOptions.quote === 'string' ? battleOptions.quote : undefined
  const quote = cfg.trainerQuote ?? nestedQuote
  return { sprite, gender, name, quote }
}

function resolveReturnTab(options: BattleOptions, ctx: BattleContext, isGym: boolean, isPvP: boolean): string {
  if (options.returnTab) return options.returnTab
  if (ctx.uiStore?.activeTab) return ctx.uiStore.activeTab
  if (isGym) return 'gyms'
  if (isPvP) return 'arena'
  return 'map'
}

function buildInitialEnemiesMap(finalEnemyTeam: Pokemon[], startingEnemyPoke: Pokemon): Record<string, Pokemon> {
  if (finalEnemyTeam?.length) {
    return Object.fromEntries(finalEnemyTeam.filter(Boolean).map(pk => [pk.uid, cloneReactive(pk)]))
  }
  if (startingEnemyPoke?.uid) {
    return { [startingEnemyPoke.uid]: cloneReactive(startingEnemyPoke) }
  }
  return {}
}

interface BuildBattleStateParams {
  cfg: ReturnType<typeof extractBattleConfig>
  loc: ResolvedLocationData
  options: BattleOptions
  playerPoke: Pokemon
  startingEnemyPoke: Pokemon
  finalEnemyPoke: Pokemon
  finalEnemyTeam: Pokemon[]
  effectivePlayerTeam: Pokemon[]
  maxEnemyLv: number
  enemyInventory: Record<string, number> | undefined
  enemyMoney: number | undefined
  weather: { type: WeatherId; visual: WeatherId; turns: number }
  wasSearching: boolean
  ctx: BattleContext
}

function buildInitialBattleState(p: BuildBattleStateParams): BattleState {
  const { cfg, loc, options, playerPoke, startingEnemyPoke, finalEnemyTeam, effectivePlayerTeam, maxEnemyLv, enemyInventory, enemyMoney, weather, wasSearching, ctx } = p
  const { battleOptions } = cfg
  const trainer = resolveTrainerDetails(cfg, options)
  const locationMap = loc.locationMap
  const returnTab = resolveReturnTab(options, ctx, cfg.isGym, cfg.isPvP)

  return {
    ...battleOptions,
    returnTab,
    enemy: null,
    player: null,
    _initialEnemy: cloneReactive(startingEnemyPoke),
    _initialEnemies: buildInitialEnemiesMap(finalEnemyTeam, startingEnemyPoke),
    _rewardCombatants: [],
    isGym: cfg.isGym,
    gymId: cfg.resolvedGymId,
    isTrainer: cfg.isTrainer,
    enemyTeam: finalEnemyTeam,
    difficulty: cfg.resolvedDifficulty,
    rewardTM: cfg.resolvedRewardTM,
    isPvP: cfg.isPvP,
    pvpMatchId: cfg.pvpMatchId,
    pvpIsHost: cfg.pvpIsHost,
    pvpOpponentId: cfg.pvpOpponentId,
    pvpOpponentName: cfg.pvpOpponentName,
    fixedCycle: options.fixedCycle,
    fixedWeather: options.fixedWeather,
    enemyInventory,
    enemyMoney,
    enemyMaxLevel: maxEnemyLv,
    trainerSprite: trainer.sprite,
    trainerGender: trainer.gender,
    trainerArchetype: cfg.resolvedTrainerArchetype,
    isRival: cfg.isRival || battleOptions.isRival === true,
    playerTeam: effectivePlayerTeam,
    trainerName: trainer.name,
    locationId: loc.resolvedLocationId,
    quote: trainer.quote,
    isCave: locationMap?.isCave || false,
    isIndoors: locationMap?.isIndoors || false,
    isCrystalCave: locationMap?.isCrystalCave || false,
    turn: 'player',
    turnCount: 1,
    over: false,
    minigame: cfg.minigame,
    rarity: DEFAULT_RARITY_WEIGHT_BASE,
    wasSearching,
    cannotEscape: cfg.cannotEscape || Boolean(battleOptions.cannotEscape),
    weather,
    playerTeamIndex: effectivePlayerTeam.indexOf(playerPoke),
    enemyTeamIndex: 0,
    participants: [playerPoke.uid],
    learnQueue: [],
    escapeAttempts: 0,
    playerSideConditions: {},
    enemySideConditions: {}
  }
}

function checkIsDebugOrReplay(isDebugOption?: boolean): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.__VITE_DEBUG__?.isDeterministicSimulation || window.__VITE_DEBUG__?.isScriptedReplayMode || isDebugOption)
}

async function handleOngoingBattleConflict(ctx: BattleContext): Promise<void> {
  const isConflict = ctx.isBattleActive.value && !ctx.isFinishing.value && !ctx.activeBattle.value?.over && !ctx.isSearching.value
  if (isConflict) {
    logger.warn('BATTLE', 'Combate en curso detectado. Forzando huida del anterior.')
    await ctx.endBattle(false, true)
  }
}

function registerEncounterPokedex(ctx: BattleContext, enemyPoke: Pokemon, cfg: ReturnType<typeof extractBattleConfig>): void {
  ctx.gs.registerPokedex(enemyPoke.id)
  if (cfg.isTrainer && cfg.enemyTeam) {
    cfg.enemyTeam.forEach((p: Pokemon) => ctx.gs.registerPokedex(p.id))
  }
}

function setupDebugLoopPokemon(ctx: BattleContext, enemyPoke: Pokemon, isDebug: unknown, wasSearching: boolean): void {
  if (!isDebug) return
  ctx.debugLoopPokemon.value = wasSearching ? (cloneReactive(enemyPoke) as Pokemon) : null
}

function pickActivePlayerTeam(cfg: ReturnType<typeof extractBattleConfig>, gsTeam: Pokemon[] | undefined): Pokemon[] {
  if (cfg.isPvP && cfg.playerTeam && cfg.playerTeam.length > 0) return cfg.playerTeam
  return gsTeam ?? []
}

function resolveStartingEnemyTeam(enemyPoke: Pokemon, enemyTeam?: Pokemon[]) {
  const finalEnemyTeam = enemyTeam && enemyTeam.length > 0 ? enemyTeam : [enemyPoke]
  const startingEnemyPoke = finalEnemyTeam.find(p => p && p.hp > 0) || enemyPoke
  return { finalEnemyTeam, startingEnemyPoke }
}

function generateNpcInventoryForBattle(cfg: ReturnType<typeof extractBattleConfig>, maxEnemyLv: number) {
  if (!cfg.isTrainer && !cfg.isGym) return null
  const isRival = cfg.isRival || cfg.battleOptions.isRival === true
  return generateNPCInventory(maxEnemyLv, cfg.resolvedDifficulty, cfg.isGym, isRival, cfg.resolvedTrainerArchetype)
}

/**
 * Orchestrates the start of a battle.
 * @param {BattleContext} ctx - The battle store context (refs, state, etc)
 */
export async function startBattleSequence(ctx: BattleContext, enemyPoke: Pokemon, options: BattleOptions = {}) {
  // ATOMIC ENTRY GUARD: Immediately put FSM into CONTEXT_SETUP before any imports or setup
  if (ctx.fsm.currentState.value !== ctx.BATTLE_STATES.CONTEXT_SETUP) {
    await ctx.fsm.transition(ctx.BATTLE_STATES.CONTEXT_SETUP, ctx.BATTLE_SUBSTATES.RECEIVE_CONFIG)
  }

  const loc = extractLocationAndBiome(options, ctx.gs.state.map?.currentMap)
  const cfg = extractBattleConfig(options)

  const tagsStr = loc.mapTags.join(', ') || 'ninguno'
  logger.info('Orchestrator', `startBattleSequence starting... Biome: ${loc.activeBiome} (Tags: ${tagsStr}) for location: ${loc.resolvedLocationId}`, { isTrainer: cfg.isTrainer, isGym: cfg.isGym, wasSearchingOpt: cfg.wasSearchingOpt })

  const effectivePlayerTeam = pickActivePlayerTeam(cfg, ctx.gs.state.team)
  const playerPoke = effectivePlayerTeam.find((p: Pokemon) => p.hp > 0 && !p.onMission && !p.onDefense)
  if (!playerPoke) {
    const { useUIStore } = await import('@/stores/ui')
    useUIStore().notify('No tienes Pokémon sanos para combatir', '❌')
    return
  }

  const isDebugOrReplay = checkIsDebugOrReplay(options.isDebug)
  const isPlayerLegal = await validatePlayerTeamLegality(effectivePlayerTeam, isDebugOrReplay)
  if (!isPlayerLegal) return

  await handleOngoingBattleConflict(ctx)

  const wasSearching = cfg.wasSearchingOpt !== null ? cfg.wasSearchingOpt : false
  logger.info('Orchestrator', `wasSearching evaluated: ${wasSearching} (wasSearchingOpt: ${cfg.wasSearchingOpt})`)

  const { validatePokemon } = await import('@/logic/pokemon/pokemonFactory')
  const finalEnemyPoke = enemyPoke
  const { finalEnemyTeam, startingEnemyPoke } = resolveStartingEnemyTeam(finalEnemyPoke, cfg.enemyTeam)

  validatePokemon(playerPoke, isDebugOrReplay)
  finalEnemyTeam.forEach((p: Pokemon) => p && validatePokemon(p, isDebugOrReplay))

  cleanTeamVolatileStatus(effectivePlayerTeam, cfg.isPvP, ctx)
  cleanTeamVolatileStatus(finalEnemyTeam, cfg.isPvP, ctx)

  const maxEnemyLv = Math.max(...finalEnemyTeam.map(p => p?.level || 1))
  const npcInvResult = generateNpcInventoryForBattle(cfg, maxEnemyLv)
  const { weather } = resolveBattleWeather(options, cfg.battleOptions, cfg.isGym)

  ctx.activeBattle.value = buildInitialBattleState({
    cfg, loc, options, playerPoke, startingEnemyPoke, finalEnemyPoke, finalEnemyTeam, effectivePlayerTeam, maxEnemyLv,
    enemyInventory: npcInvResult?.inventory,
    enemyMoney: npcInvResult?.remainingMoney,
    weather, wasSearching, ctx
  })

  setupDebugLoopPokemon(ctx, enemyPoke, cfg.battleOptions.isDebug, wasSearching)
  registerEncounterPokedex(ctx, enemyPoke, cfg)
  ctx.persistBattle()

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  ctx.isIntroAnimating.value = true
  setupSeatsProtocol(ctx, cfg.isTrainer, cfg.isGym, finalEnemyPoke, effectivePlayerTeam)
  ctx.clearLogs()

  logger.debug('Orchestrator', 'Transitions starting...')
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.RECEIVE_CONFIG)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.APPLY_ITEM_MODIFIERS)

  // Weight Calculation
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.WEIGHT_CALCULATION)
  const rarity = calculateFishingRarity(cfg.minigame, loc.locationMap, finalEnemyPoke)
  if (ctx.activeBattle.value) ctx.activeBattle.value.rarity = rarity

  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.INJECT_FILTERS)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.READY_FOR_GEN)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.VACATE_ALL_SEATS)

  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_CONTEXT)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.ASYNC_THREAD)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_TEAMS)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MARK_EVENT)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS, 0)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.SET_SEARCH_FLAG)
  logger.info('Orchestrator', `reached after SET_SEARCH_FLAG transition. wasSearching = ${wasSearching}`)

  if (wasSearching) {
    const { processSearchPhaseSequence } = await import('./orchestratorSearchPhaseHelper.ts')
    const handled = await processSearchPhaseSequence(ctx, finalEnemyPoke, cfg.minigame, cfg.isTrainer, cfg.isGym)
    if (handled) return
  }

  logger.info('Orchestrator', 'Calling initBattleSequence...')
  await initBattleSequence(ctx, {
    locationId: loc.resolvedLocationId,
    isTrainer: cfg.isTrainer,
    trainerName: cfg.trainerName,
    isGym: cfg.isGym,
    gymId: cfg.resolvedGymId,
    wasSearching,
    initialEnemy: startingEnemyPoke,
    initialPlayer: playerPoke
  })
}

export { restoreBattleState } from './orchestratorRestoreHelper.ts'
