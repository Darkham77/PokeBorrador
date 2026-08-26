/**
 * tests/node/system/illegal_market_and_trade_security.test.ts
 *
 * VITEST (node environment)
 *
 * Comprehensive security simulation suite testing anti-cheat and quarantine systems
 * across PC Box, GTS / Market, and P2P Trades against illegal Pokémon trafficking,
 * selling, trading, or team swapping.
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
import { checkPokemonLegality } from '@/logic/pokemon/pokemonLegality.ts'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider.ts'
import { requireItemId } from '@/data/inventory/items.ts'
import { emulatePublishListing } from '@/logic/db/rpcEmulations/marketRpc.ts'
import { emulateSendTradeOffer, emulateAcceptTrade } from '@/logic/db/rpcEmulations/tradeRpc.ts'
import { queryLocal } from '@/logic/db/sqliteEngine.ts'
import type { SQLiteDatabase } from '@/logic/db/sqliteEngine.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'

function createLegalPokemon(id: string, name: string, level = 10, uid = 'legal-uid-1', customAbility?: string): Pokemon {
  const abilities = pokemonDataProvider.getSpeciesAbilities(id)
  const ability = customAbility || abilities[0] || 'overgrow'
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
    moves: [{ id: 'tackle', name: 'Tackle', type: 'normal', cat: 'physical', power: 40, acc: 100, pp: 35, maxPP: 35 }],
    ability,
    isIllegal: false
  } as unknown as Pokemon
}

function createIllegalMovePokemon(uid = 'illegal-move-1'): Pokemon {
  // Caterpie cannot learn Hydro Pump
  return {
    uid,
    id: 'caterpie',
    name: 'Caterpie',
    species: 'Caterpie',
    level: 5,
    maxHp: 20,
    hp: 20,
    atk: 10,
    def: 10,
    spa: 10,
    spd: 10,
    spe: 10,
    moves: [{ id: 'hydropump', name: 'Hydro Pump', type: 'water', cat: 'special', power: 110, acc: 80, pp: 5, maxPP: 5 }],
    ability: 'shielddust',
    isIllegal: false
  } as unknown as Pokemon
}

function createIllegalAbilityPokemon(uid = 'illegal-ability-1'): Pokemon {
  // Rayquaza cannot have Wonder Guard
  return {
    uid,
    id: 'rayquaza',
    name: 'Rayquaza',
    species: 'Rayquaza',
    level: 70,
    maxHp: 200,
    hp: 200,
    atk: 150,
    def: 100,
    spa: 150,
    spd: 100,
    spe: 100,
    moves: [{ id: 'dragonclaw', name: 'Dragon Claw', type: 'dragon', cat: 'physical', power: 80, acc: 100, pp: 15, maxPP: 15 }],
    ability: 'wonderguard',
    isIllegal: false
  } as unknown as Pokemon
}

function createIllegalLevelPokemon(uid = 'illegal-level-1'): Pokemon {
  // Level 150 exceeds max level 100
  return {
    uid,
    id: 'pikachu',
    name: 'Pikachu',
    species: 'Pikachu',
    level: 150,
    maxHp: 300,
    hp: 300,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
    moves: [{ id: 'thunderbolt', name: 'Thunderbolt', type: 'electric', cat: 'special', power: 90, acc: 100, pp: 15, maxPP: 15 }],
    ability: 'static',
    isIllegal: false
  } as unknown as Pokemon
}

function createIllegalMoveCountPokemon(uid = 'illegal-movecount-1'): Pokemon {
  // Level 5 Pidgey having 5 moves (max allowed for lv5 is 2 or 4 max)
  return {
    uid,
    id: 'pidgey',
    name: 'Pidgey',
    species: 'Pidgey',
    level: 5,
    maxHp: 20,
    hp: 20,
    atk: 10,
    def: 10,
    spa: 10,
    spd: 10,
    spe: 10,
    moves: [
      { id: 'tackle', name: 'Tackle', pp: 35, maxPP: 35 },
      { id: 'sandattack', name: 'Sand Attack', pp: 15, maxPP: 15 },
      { id: 'gust', name: 'Gust', pp: 35, maxPP: 35 },
      { id: 'quickattack', name: 'Quick Attack', pp: 30, maxPP: 30 },
      { id: 'whirlwind', name: 'Whirlwind', pp: 20, maxPP: 20 }
    ],
    ability: 'keeneye',
    isIllegal: false
  } as unknown as Pokemon
}

describe('Illegal Pokémon Security System (Markets, GTS, Box, and Trades)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const gs = useGameStore()
    Object.assign(gs.state, {
      money: 10000,
      box: [],
      team: [createLegalPokemon('bulbasaur', 'Bulbasaur', 10, 'team-starter')],
      inventory: {},
      starterChosen: true,
      playerClass: 'rocket'
    })
    gs.save = vi.fn().mockResolvedValue({ success: true })
    gs.scheduleSave = vi.fn()
  })

  describe('1. Legality Checker Core Detection', () => {
    it('should detect illegal moves on species learnset', () => {
      const p = createIllegalMovePokemon()
      const report = checkPokemonLegality(p)
      expect(report.isLegal).toBe(false)
      expect(report.issues.some(msg => msg.includes('ilegal') || msg.includes('Hydro Pump'))).toBe(true)
    })

    it('should detect illegal abilities for species', () => {
      const p = createIllegalAbilityPokemon()
      const report = checkPokemonLegality(p)
      expect(report.isLegal).toBe(false)
      expect(report.issues.some(msg => msg.includes('Habilidad') || msg.includes('wonderguard'))).toBe(true)
    })

    it('should detect illegal levels exceeding boundary', () => {
      const p = createIllegalLevelPokemon()
      const report = checkPokemonLegality(p)
      expect(report.isLegal).toBe(false)
      expect(report.issues.some(msg => msg.includes('Nivel 150 fuera de rango'))).toBe(true)
    })

    it('should detect surplus move count for stage/level', () => {
      const p = createIllegalMoveCountPokemon()
      const report = checkPokemonLegality(p)
      expect(report.isLegal).toBe(false)
      expect(report.issues.some(msg => msg.includes('movimiento(s) según su etapa'))).toBe(true)
    })
  })

  describe('2. PC Box Quarantine & Team Movement Security', () => {
    it('should block moving illegal Pokémon from box to active team', () => {
      const gs = useGameStore()
      const box = useBoxStore()
      const illegalPoke = createIllegalMovePokemon('box-illegal-1')
      gs.state.box = [illegalPoke]

      const res = box.moveBoxToTeam(0)
      expect(res.success).toBe(false)
      expect(res.msg).toContain('ilegal')
      expect(gs.state.team.length).toBe(1)
      expect(gs.state.box.length).toBe(1)
      expect(illegalPoke.isIllegal).toBe(true)
    })

    it('should block swapping illegal Pokémon from box into active team slot', () => {
      const gs = useGameStore()
      const box = useBoxStore()
      const illegalPoke = createIllegalAbilityPokemon('box-illegal-2')
      gs.state.box = [illegalPoke]

      const res = box.swapBoxWithTeam(0, 0)
      expect(res.success).toBe(false)
      expect(res.msg).toContain('ilegal')
      expect(gs.state.team[0]?.id).toBe('bulbasaur')
      expect(illegalPoke.isIllegal).toBe(true)
    })

    it('should block Rocket Black Market selection of illegal Pokémon', () => {
      const gs = useGameStore()
      const box = useBoxStore()
      const illegalPoke = createIllegalLevelPokemon('box-illegal-3')
      const legalPoke = createLegalPokemon('pidgey', 'Pidgey', 10, 'box-legal-1')
      gs.state.box = [illegalPoke, legalPoke]

      box.toggleBoxRocketSelect(0) // Illegal -> Should be rejected
      expect(box.boxRocketSelected).toEqual([])
      expect(illegalPoke.isIllegal).toBe(true)

      box.toggleBoxRocketSelect(1) // Legal -> Selected
      expect(box.boxRocketSelected).toEqual([1])
    })

    it('should yield $0 and skip illegal Pokémon during Black Market sales', () => {
      const gs = useGameStore()
      const box = useBoxStore()
      const illegalPoke = createIllegalMovePokemon('box-illegal-4')
      gs.state.box = [illegalPoke]

      // Forcing selection in test state to verify execution defense
      box.boxRocketSelected = [0]
      expect(box.getRocketSellValue()).toBe(0)

      const soldResult = box.doBoxRocketSell()
      expect(soldResult.count).toBe(0)
      expect(soldResult.value).toBe(0)
      expect(gs.state.box.length).toBe(1) // Not sold, preserved in quarantine
    })

    it('should perform Pure Release of illegal Pokémon without returning held items', () => {
      const gs = useGameStore()
      const box = useBoxStore()
      const illegalPoke = createIllegalMovePokemon('box-illegal-5')
      illegalPoke.heldItem = requireItemId('masterball') // Exploit attempt
      gs.state.box = [illegalPoke]

      box.boxReleaseSelected = [0]
      const released = box.doBoxRelease()

      expect(released).toEqual(['Caterpie'])
      expect(gs.state.box.length).toBe(0)
      // Masterball was NOT returned to player inventory
      expect(gs.state.inventory['masterball']).toBeUndefined()
    })
  })

  describe('3. GTS & Market Security', () => {
    it('should filter out illegal Pokémon from the Market Publish computed list', () => {
      const gs = useGameStore()
      const legalBoxPoke = createLegalPokemon('pidgey', 'Pidgey', 10, 'pidgey-leg')
      const illegalBoxPoke = createIllegalMovePokemon('caterpie-illeg')
      const illegalTeamPoke = createIllegalAbilityPokemon('ray-illeg')

      gs.state.team = [createLegalPokemon('bulbasaur', 'Bulbasaur', 10, 'bulb-leg'), illegalTeamPoke]
      gs.state.box = [legalBoxPoke, illegalBoxPoke]

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
      expect(availableUids).toContain('bulb-leg')
      expect(availableUids).toContain('pidgey-leg')
      expect(availableUids).not.toContain('caterpie-illeg')
      expect(availableUids).not.toContain('ray-illeg')
    })

    it('should reject publishing illegal Pokémon in GTS store publishListing', async () => {
      const gts = useGTSStore()
      const illegalPoke = createIllegalLevelPokemon('gts-illegal-1')

      const success = await gts.publishListing('pokemon', illegalPoke, 5000)
      expect(success).toBe(false)
    })

    it('should reject direct backend RPC publish_listing_v2 with illegal Pokémon', async () => {
      const illegalPoke = createIllegalMovePokemon('rpc-illegal-1')
      const mockDb = {
        run: vi.fn(),
        query: vi.fn()
      } as unknown as SQLiteDatabase

      const res = await emulatePublishListing(
        mockDb,
        {
          p_listing_type: 'pokemon',
          p_asset_data: illegalPoke,
          p_price: 5000
        },
        { userId: 'test-user', username: 'Ash' }
      )

      expect(res.data).toBeNull()
      const errMsg = typeof res.error === 'object' && res.error !== null && 'message' in res.error ? (res.error as { message: string }).message : String(res.error)
      expect(errMsg).toContain('No se puede publicar un Pokémon ilegal')
    })
  })

  describe('4. P2P Trade Security', () => {
    it('should block offering illegal Pokémon in trade store sendTradeOffer', async () => {
      const trade = useTradeStore()
      const illegalPoke = createIllegalAbilityPokemon('trade-illegal-1')
      trade.tradeTarget = { id: 'friend_user_id', username: 'Gary' }
      trade.tradeOfferPoke = illegalPoke

      const success = await trade.sendTradeOffer({
        isGift: false,
        offerMoney: 0,
        requestMoney: 0,
        message: 'Illegal pokemon trade attempt'
      })

      expect(success).toBe(false)
    })

    it('should reject direct backend RPC send_trade_offer_v2 with illegal offered Pokémon', async () => {
      const illegalPoke = createIllegalMoveCountPokemon('trade-rpc-illegal-1')
      const mockDb = {
        run: vi.fn(),
        query: vi.fn()
      } as unknown as SQLiteDatabase

      const res = await emulateSendTradeOffer(
        mockDb,
        {
          p_receiver_id: 'target_id',
          p_offer_pokemon: illegalPoke,
          p_offer_items: null,
          p_offer_money: 0,
          p_request_pokemon: null,
          p_request_items: null,
          p_request_money: 0,
          p_message: 'Trafficking illegal pokemon'
        },
        { userId: 'sender_id' }
      )

      expect(res.data).toBeNull()
      const errMsg = typeof res.error === 'object' && res.error !== null && 'message' in res.error ? (res.error as { message: string }).message : String(res.error)
      expect(errMsg).toContain('No puedes ofrecer un Pokémon ilegal')
    })

    it('should reject backend RPC accept_trade_v2 if trade contains illegal Pokémon', async () => {
      const illegalPoke = createIllegalMovePokemon('trade-accept-illegal-1')
      const mockDb = {
        run: vi.fn(),
        query: vi.fn()
      } as unknown as SQLiteDatabase

      vi.mocked(queryLocal).mockResolvedValueOnce([
        {
          id: 'trade_123',
          sender_id: 'seller_id',
          receiver_id: 'buyer_id',
          offer_pokemon: JSON.stringify(illegalPoke),
          offer_items: null,
          offer_money: 0,
          request_pokemon: null,
          request_items: null,
          request_money: 0,
          status: 'pending'
        }
      ])

      const res = await emulateAcceptTrade(
        mockDb,
        { p_trade_id: 'trade_123' },
        { userId: 'buyer_id' }
      )

      expect(res.data).toBeNull()
      const errMsg = typeof res.error === 'object' && res.error !== null && 'message' in res.error ? (res.error as { message: string }).message : String(res.error)
      expect(errMsg).toContain('La oferta contiene un Pokémon ilegal')
    })
  })
})
