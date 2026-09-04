/**
 * tests/node/system/busy_pokemon_market_trade_and_release_security.test.ts
 *
 * VITEST (node environment)
 *
 * Comprehensive security & lifecycle test suite verifying that Pokémon participating
 * in missions or events (contests/competitions) are visually badged, blocked from release,
 * Black Market sale, P2P trade, GTS listing, and team movement, and are completely
 * re-enabled once the mission is collected or the event concludes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

vi.mock('@/logic/db/sqliteEngine.ts', () => ({
  queryLocal: vi.fn(async () => []),
  persistSQLite: vi.fn(async () => {})
}))

import { useBoxStore } from '@/stores/box.ts'
import { useGameStore } from '@/stores/game.ts'
import { useGTSStore } from '@/stores/gts.ts'
import { useTradeStore } from '@/stores/trade.ts'
import { useMarketPublishPokemon } from '@/components/market/useMarketPublishPokemon.ts'
import { getPokemonVisualBadges, isPokemonBusy } from '@/logic/constants/tags.ts'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts'
import { emulatePublishListing } from '@/logic/db/rpcEmulations/marketRpc.ts'
import { emulateSendTradeOffer } from '@/logic/db/rpcEmulations/tradeRpc.ts'
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts'
import { type PokemonSpeciesId } from '@/data/pokemon/pokedex.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'

function createSamplePokemon(
  id: PokemonSpeciesId,
  name: string,
  level = 10,
  uid = 'sample-uid-1',
  options: Partial<Pokemon> = {}
): Pokemon {
  const abilities = pokemonDataProvider.getSpeciesAbilities(id)
  const ability = abilities[0] || 'overgrow'
  const moveId = id === 'pikachu' ? 'thundershock' : id === 'onix' ? 'tackle' : 'tackle'
  const moveName = id === 'pikachu' ? 'Thunder Shock' : 'Tackle'
  return {
    uid,
    id,
    name,
    species: name,
    level,
    maxHp: 35,
    hp: 35,
    atk: 20,
    def: 20,
    spa: 20,
    spd: 20,
    spe: 20,
    ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
    moves: [{ id: moveId, name: moveName, type: id === 'pikachu' ? 'electric' : 'normal', cat: 'physical', power: 40, acc: 100, pp: 35, maxPP: 35 }],
    ability,
    isIllegal: false,
    ...options
  } as unknown as Pokemon
}

describe('Busy Pokémon Security & Lifecycle System (Missions & Events)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      money: 10000,
      box: [],
      team: [createSamplePokemon('bulbasaur', 'Bulbasaur', 10, 'team-starter')],
      inventory: {},
      starterChosen: true,
      playerClass: 'rocket'
    })
    gs.save = vi.fn().mockResolvedValue({ success: true })
    gs.scheduleSave = vi.fn()
  })

  describe('1. Busy Helper & Badge Visual Identification', () => {
    it('should identify busy states correctly with isPokemonBusy helper', () => {
      const freePoke = createSamplePokemon('pidgey', 'Pidgey', 10, 'pidgey-free')
      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'rattata-mis', { onMission: true })
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'pikachu-eve', { onEvent: true })
      const daycarePoke = createSamplePokemon('eevee', 'Eevee', 10, 'eevee-day', { inDaycare: true })
      const defensePoke = createSamplePokemon('onix', 'Onix', 10, 'onix-def', { onDefense: true })

      expect(isPokemonBusy(freePoke)).toBe(false)
      expect(isPokemonBusy(missionPoke)).toBe(true)
      expect(isPokemonBusy(eventPoke)).toBe(true)
      expect(isPokemonBusy(daycarePoke)).toBe(true)
      expect(isPokemonBusy(defensePoke)).toBe(true)
    })

    it('should inject automatic badges for mission and event in getPokemonVisualBadges', () => {
      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'rattata-mis', { onMission: true })
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'pikachu-eve', { onEvent: true })

      const missionBadges = getPokemonVisualBadges(missionPoke)
      const eventBadges = getPokemonVisualBadges(eventPoke)

      const misBadge = missionBadges.find(b => b.id === 'mission')
      expect(misBadge).toBeDefined()
      expect(misBadge?.icon).toBe('🧭')
      expect(misBadge?.label).toBe('EN MISIÓN')
      expect(misBadge?.isAutomatic).toBe(true)

      const eveBadge = eventBadges.find(b => b.id === 'event')
      expect(eveBadge).toBeDefined()
      expect(eveBadge?.icon).toBe('🏆')
      expect(eveBadge?.label).toBe('EN EVENTO')
      expect(eveBadge?.isAutomatic).toBe(true)
    })
  })

  describe('2. PC Box Release & Black Market Selling Defense (Active Blocking)', () => {
    it('should block selection of Pokémon on mission or event in Box release mode', () => {
      const gs = useGameStore()
      const box = useBoxStore()

      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'box-mis', { onMission: true })
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'box-eve', { onEvent: true })
      const freePoke = createSamplePokemon('pidgey', 'Pidgey', 10, 'box-free')

      gs.state.box = [missionPoke, eventPoke, freePoke]

      box.toggleBoxReleaseSelect(0) // On mission -> ignored
      box.toggleBoxReleaseSelect(1) // On event -> ignored
      box.toggleBoxReleaseSelect(2) // Free -> selected

      expect(box.boxReleaseSelected).toEqual([2])
    })

    it('should skip busy Pokémon if force-selected in doBoxRelease', () => {
      const gs = useGameStore()
      const box = useBoxStore()

      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'box-mis', { onMission: true })
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'box-eve', { onEvent: true })
      const freePoke = createSamplePokemon('pidgey', 'Pidgey', 10, 'box-free')

      gs.state.box = [missionPoke, eventPoke, freePoke]
      box.boxReleaseSelected = [0, 1, 2]

      const released = box.doBoxRelease()

      expect(released).toEqual(['Pidgey'])
      expect(gs.state.box.length).toBe(2)
      expect(gs.state.box[0]?.uid).toBe('box-mis')
      expect(gs.state.box[1]?.uid).toBe('box-eve')
    })

    it('should block selection and yield $0 for Pokémon on mission or event in Rocket Black Market', () => {
      const gs = useGameStore()
      const box = useBoxStore()

      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'box-mis', { onMission: true })
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'box-eve', { onEvent: true })
      const freePoke = createSamplePokemon('pidgey', 'Pidgey', 10, 'box-free')

      gs.state.box = [missionPoke, eventPoke, freePoke]

      box.toggleBoxRocketSelect(0) // Mission -> ignored
      box.toggleBoxRocketSelect(1) // Event -> ignored
      box.toggleBoxRocketSelect(2) // Free -> selected

      expect(box.boxRocketSelected).toEqual([2])

      // If force selected, verify evaluation and execution ignore busy pokemon
      box.boxRocketSelected = [0, 1]
      expect(box.getRocketSellValue()).toBe(0)

      const soldResult = box.doBoxRocketSell()
      expect(soldResult.count).toBe(0)
      expect(soldResult.value).toBe(0)
      expect(gs.state.box.length).toBe(3) // None sold
    })

    it('should block moving or swapping busy Pokémon between Box and Team', () => {
      const gs = useGameStore()
      const box = useBoxStore()

      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'box-mis', { onMission: true })
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'box-eve', { onEvent: true })

      gs.state.box = [missionPoke, eventPoke]

      const moveRes1 = box.moveBoxToTeam(0)
      expect(moveRes1.success).toBe(false)
      expect(moveRes1.msg).toContain('misión')

      const moveRes2 = box.moveBoxToTeam(1)
      expect(moveRes2.success).toBe(false)
      expect(moveRes2.msg).toContain('evento')

      const swapRes = box.swapBoxWithTeam(0, 0)
      expect(swapRes.success).toBe(false)
      expect(swapRes.msg).toContain('ocupado')
    })
  })

  describe('3. P2P Trade & GTS Market Defense (Active Blocking)', () => {
    it('should block sending a trade offer with a Pokémon on mission or event', async () => {
      const trade = useTradeStore()
      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'trade-mis', { onMission: true })

      trade.tradeTarget = { id: 'friend_1', username: 'Misty' }
      trade.tradeOfferPoke = missionPoke

      const success = await trade.sendTradeOffer({
        isGift: false,
        offerMoney: 0,
        requestMoney: 0,
        message: 'Trying to trade busy pokemon'
      })

      expect(success).toBe(false)
    })

    it('should reject backend RPC send_trade_offer_v2 if offered Pokémon is on mission or event', async () => {
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'rpc-eve', { onEvent: true })
      const mockDb = {
        run: vi.fn(),
        query: vi.fn()
      } as unknown as SQLiteDatabase

      const res = await emulateSendTradeOffer(
        mockDb,
        {
          p_receiver_id: 'target_id',
          p_offer_pokemon: eventPoke,
          p_offer_items: null,
          p_offer_money: 0,
          p_request_pokemon: null,
          p_request_items: null,
          p_request_money: 0,
          p_message: 'Trading event pokemon'
        },
        { userId: 'sender_id' }
      )

      expect(res.data).toBeNull()
      const errMsg = typeof res.error === 'object' && res.error !== null && 'message' in res.error ? (res.error as { message: string }).message : String(res.error)
      expect(errMsg).toContain('misión')
    })

    it('should filter out busy Pokémon in useMarketPublishPokemon', () => {
      const gs = useGameStore()
      const freePoke = createSamplePokemon('pidgey', 'Pidgey', 10, 'pub-free')
      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'pub-mis', { onMission: true })
      const eventPoke = createSamplePokemon('pikachu', 'Pikachu', 10, 'pub-eve', { onEvent: true })

      gs.state.team = [createSamplePokemon('bulbasaur', 'Bulbasaur', 10, 'bulb-team')]
      gs.state.box = [freePoke, missionPoke, eventPoke]

      const searchQuery = ref('')
      const sortBy = ref('name')
      const sortOrder = ref('asc')
      const activeTags = ref<string[]>([])

      const { availablePokemon } = useMarketPublishPokemon(
        gs,
        searchQuery,
        sortBy,
        sortOrder,
        activeTags
      )

      const availableUids = availablePokemon.value.map(item => item.pokemon.uid)
      expect(availableUids).toContain('bulb-team')
      expect(availableUids).toContain('pub-free')
      expect(availableUids).not.toContain('pub-mis')
      expect(availableUids).not.toContain('pub-eve')
    })

    it('should reject publishing busy Pokémon in GTSStore and backend market RPC', async () => {
      const gts = useGTSStore()
      const missionPoke = createSamplePokemon('rattata', 'Rattata', 10, 'gts-mis', { onMission: true })

      const success = await gts.publishListing('pokemon', missionPoke, 5000)
      expect(success).toBe(false)

      const mockDb = {
        run: vi.fn(),
        query: vi.fn()
      } as unknown as SQLiteDatabase

      const res = await emulatePublishListing(
        mockDb,
        {
          p_listing_type: 'pokemon',
          p_asset_data: missionPoke,
          p_price: 5000
        },
        { userId: 'test-user', username: 'Ash' }
      )

      expect(res.data).toBeNull()
      const errMsg = typeof res.error === 'object' && res.error !== null && 'message' in res.error ? (res.error as { message: string }).message : String(res.error)
      expect(errMsg).toContain('misión')
    })
  })

  describe('4. Complete Lifecycle Rehabilitation (Post-Mission & Post-Event)', () => {
    it('should restore all trading, selling, releasing, and movement abilities after mission completion', async () => {
      const gs = useGameStore()
      const box = useBoxStore()

      // Pokémon finishes its deployment mission
      const poke = createSamplePokemon('rattata', 'Rattata', 10, 'rehab-mis', { onMission: true })
      gs.state.box = [poke]

      // 1. Initially busy: badges present and cannot be released
      expect(isPokemonBusy(poke)).toBe(true)
      box.toggleBoxReleaseSelect(0)
      expect(box.boxReleaseSelected).toEqual([])

      // 2. Mission completes -> flag cleared
      poke.onMission = false
      expect(isPokemonBusy(poke)).toBe(false)

      // Badges removed
      const badges = getPokemonVisualBadges(poke)
      expect(badges.some(b => b.id === 'mission')).toBe(false)

      // Re-enabled for Box release
      box.toggleBoxReleaseSelect(0)
      expect(box.boxReleaseSelected).toEqual([0])

      // Re-enabled for Rocket Black Market sale
      box.toggleBoxRocketSelect(0)
      expect(box.boxRocketSelected).toEqual([0])
      expect(box.getRocketSellValue()).toBeGreaterThan(0)

      // Re-enabled for Box to Team movement
      const moveRes = box.moveBoxToTeam(0)
      expect(moveRes.success).toBe(true)
      expect(gs.state.team.some(p => p.uid === 'rehab-mis')).toBe(true)
    })

    it('should restore all trading, selling, and releasing abilities after competition event concludes', async () => {
      const gs = useGameStore()
      const box = useBoxStore()

      // Pokémon participates in an event contest
      const poke = createSamplePokemon('pikachu', 'Pikachu', 10, 'rehab-eve', { onEvent: true })
      gs.state.box = [poke]

      // 1. Initially in event: badges present and cannot be sold
      expect(isPokemonBusy(poke)).toBe(true)
      box.toggleBoxRocketSelect(0)
      expect(box.boxRocketSelected).toEqual([])

      // 2. Event ends -> flag cleared
      poke.onEvent = false
      expect(isPokemonBusy(poke)).toBe(false)

      // Badges removed
      const badges = getPokemonVisualBadges(poke)
      expect(badges.some(b => b.id === 'event')).toBe(false)

      // Re-enabled for Rocket Black Market sale
      box.toggleBoxRocketSelect(0)
      expect(box.boxRocketSelected).toEqual([0])
      const sold = box.doBoxRocketSell()
      expect(sold.count).toBe(1)
      expect(sold.value).toBeGreaterThan(0)
      expect(gs.state.box.length).toBe(0)
    })
  })
})
