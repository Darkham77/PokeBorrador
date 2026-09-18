import { describe, it, expect } from 'vitest'
import { mapDbRecordToBattleReplay, parseJsonSafe } from '@/components/social/chatBattleCodeHelper'
import {
  formatSoldDetails,
  getFriendlySourceType,
  getClaimAssetIcon,
  getClaimSpriteUrl
} from '@/components/social/claimCardHelper'
import type { ClaimItem } from '@/types/system/game'
import type { MarketListing } from '@/logic/economy/market'
import {
  extractBattleCode,
  canTrainerParticipateInGlobalChat,
  resolveChatMessageVisuals,
  GLOBAL_CHAT_MIN_LEVEL,
  GLOBAL_CHAT_MAX_CHARS
} from '@/components/social/globalChatHelper'
import type { ChatMessage } from '@/stores/social/chatPrivate'
import type { ProfileCacheItem } from '@/stores/social/chatCosmetics'
import { parseReplayRow } from '@/components/social/socialTheaterHelper'
import type { BattleCode } from '@/types/battle/pvp'
import {
  canFulfillTradeOffer,
  resolveTradeEmptyState
} from '@/components/social/socialTradesHelper'
import type { TradeOffer } from '@/types/system/stores'
import {
  isTradeGiftMode,
  resolveTradePokemonButtonText,
  resolveTradeCreditsLabel,
  formatTradeMaxMoney,
  mapInventoryItems,
  getItemQuantity
} from '@/components/social/tradeSidePanelHelper'
import { requireItemId } from '@/data/inventory/items'

describe('Social Component Helpers Domain Suite', () => {
  describe('chatBattleCodeHelper', () => {
    describe('parseJsonSafe', () => {
      it('parses valid JSON string', () => {
        expect(parseJsonSafe('{"a":1}', { a: 0 })).toEqual({ a: 1 })
      })

      it('returns fallback on invalid JSON string', () => {
        expect(parseJsonSafe('not json', { a: 0 })).toEqual({ a: 0 })
      })

      it('returns value directly when not a string', () => {
        expect(parseJsonSafe({ a: 2 }, { a: 0 })).toEqual({ a: 2 })
      })
    })

    describe('mapDbRecordToBattleReplay', () => {
      it('maps database record fields with defaults', () => {
        const raw = {
          id: 'rep-123',
          battle_code: 'CODE-999',
          season_id: 'season-1',
          theme_id: 'masters_allstars',
          turns_count: 5,
          winner_side: 'p2'
        }

        const replay = mapDbRecordToBattleReplay(raw)
        expect(replay.id).toBe('rep-123')
        expect(replay.battleCode).toBe('CODE-999')
        expect(replay.seasonId).toBe('season-1')
        expect(replay.themeId).toBe('masters_allstars')
        expect(replay.turnsCount).toBe(5)
        expect(replay.winnerSide).toBe('p2')
        expect(replay.p1.elo).toBe(1000)
        expect(replay.p2.elo).toBe(1000)
        expect(replay.choiceStream).toEqual([])
      })

      it('handles camelCase and string-encoded JSON payloads', () => {
        const raw = {
          battleCode: 'CODE-123',
          p1_data: JSON.stringify({ userId: 'u1', username: 'Ash', tier: 'oro', elo: 1400, team: [] }),
          initial_seed: '[1, 2, 3, 4]',
          isTop10Archived: true
        }

        const replay = mapDbRecordToBattleReplay(raw)
        expect(replay.battleCode).toBe('CODE-123')
        expect(replay.p1.username).toBe('Ash')
        expect(replay.initialSeed).toEqual([1, 2, 3, 4])
        expect(replay.isTop10Archived).toBe(true)
      })
    })
  })

  describe('claimCardHelper', () => {
    describe('formatSoldDetails', () => {
      it('returns null when asset_data.type is not money', () => {
        const claim: ClaimItem = {
          id: '1',
          asset_data: { type: 'item', data: { name: 'potion', qty: 1 } },
          source_type: 'gts',
          source_id: 's1',
          created_at: '2026-09-16'
        }
        expect(formatSoldDetails(claim)).toBeNull()
      })

      it('formats sold_item when present in asset_data', () => {
        const claim: ClaimItem = {
          id: '2',
          asset_data: {
            type: 'money',
            data: 500,
            sold_item: { name: 'potion', qty: 3 }
          },
          source_type: 'gts',
          source_id: 's2',
          created_at: '2026-09-16'
        }
        const result = formatSoldDetails(claim)
        expect(result).toContain('Venta:')
        expect(result).toContain('x3')
      })

      it('formats sold_pokemon when present in asset_data', () => {
        const claim: ClaimItem = {
          id: '3',
          asset_data: {
            type: 'money',
            data: 1000,
            sold_pokemon: { name: 'Pikachu', level: 25 }
          },
          source_type: 'gts',
          source_id: 's3',
          created_at: '2026-09-16'
        }
        expect(formatSoldDetails(claim)).toBe('Venta: Pikachu (Nv. 25)')
      })

      it('falls back to salesHistory if asset_data has no sold_item/sold_pokemon', () => {
        const claim: ClaimItem = {
          id: '4',
          asset_data: { type: 'money', data: 750 },
          source_type: 'gts',
          source_id: 'sale-99',
          created_at: '2026-09-16'
        }
        const salesHistory = [
          {
            id: 'sale-99',
            listing_type: 'pokemon',
            price: 750,
            status: 'sold',
            seller_id: 'u1',
            created_at: '2026-09-16',
            data: { name: 'Charmander', level: 12 }
          }
        ] as unknown as MarketListing[]

        expect(formatSoldDetails(claim, salesHistory)).toBe('Venta: Charmander (Nv. 12)')
      })

      it('returns null if matching sale is not found and no sold metadata exists', () => {
        const claim: ClaimItem = {
          id: '5',
          asset_data: { type: 'money', data: 200 },
          source_type: 'gts',
          source_id: 'missing',
          created_at: '2026-09-16'
        }
        expect(formatSoldDetails(claim, [])).toBeNull()
      })
    })

    describe('getFriendlySourceType', () => {
      it('translates known source types to Spanish labels', () => {
        expect(getFriendlySourceType('trade')).toBe('Intercambio')
        expect(getFriendlySourceType('gts')).toBe('Mercado GTS')
        expect(getFriendlySourceType('gts_cancel')).toBe('Cancelación GTS')
        expect(getFriendlySourceType('unknown_source')).toBe('unknown_source')
      })
    })

    describe('getClaimAssetIcon & getClaimSpriteUrl', () => {
      it('returns nugget icon for money', () => {
        const icon = getClaimAssetIcon({ type: 'money', data: 100 })
        expect(icon).toContain('nugget')
      })

      it('resolves item icon for item asset', () => {
        const icon = getClaimAssetIcon({ type: 'item', data: { name: 'potion', qty: 1 } })
        expect(icon).toBeTruthy()
      })

      it('resolves pokemon sprite url', () => {
        const sprite = getClaimSpriteUrl(25)
        expect(sprite).toBeTruthy()
      })
    })
  })

  describe('globalChatHelper', () => {
    describe('constants', () => {
      it('should declare expected constants', () => {
        expect(GLOBAL_CHAT_MIN_LEVEL).toBe(10)
        expect(GLOBAL_CHAT_MAX_CHARS).toBe(100)
      })
    })

    describe('extractBattleCode', () => {
      it('should extract battle code from text and uppercase it', () => {
        expect(extractBattleCode('Mira mi combate BTL-ABCD-EFGH estuvo genial')).toBe('BTL-ABCD-EFGH')
        expect(extractBattleCode('btl-1234-5678')).toBe('BTL-1234-5678')
      })

      it('should return null when no battle code is present or input is empty', () => {
        expect(extractBattleCode('Hola a todos!')).toBeNull()
        expect(extractBattleCode('')).toBeNull()
        expect(extractBattleCode(undefined)).toBeNull()
      })
    })

    describe('canTrainerParticipateInGlobalChat', () => {
      it('should check minimum level requirement', () => {
        expect(canTrainerParticipateInGlobalChat(1)).toBe(false)
        expect(canTrainerParticipateInGlobalChat(9)).toBe(false)
        expect(canTrainerParticipateInGlobalChat(10)).toBe(true)
        expect(canTrainerParticipateInGlobalChat(50)).toBe(true)
        expect(canTrainerParticipateInGlobalChat(undefined)).toBe(false)
      })
    })

    describe('resolveChatMessageVisuals', () => {
      it('should prioritize profileCosmetics over raw message data', () => {
        const msg: ChatMessage = {
          id: 'msg-1',
          user_id: 'user-123',
          username: 'OldName',
          player_class: 'novato',
          trainer_level: 5,
          gender: 'm',
          message: '¡Batalla en btl-9999-8888!',
          created_at: '2026-09-16T10:00:00Z'
        }

        const cosmetics: ProfileCacheItem = {
          username: 'ChampionAsh',
          player_class: 'campeon',
          trainer_level: 100,
          avatar_style: 'golden_frame',
          nick_style: 'fire_nick',
          gender: 'h'
        }

        const visuals = resolveChatMessageVisuals(msg, cosmetics)

        expect(visuals.username).toBe('ChampionAsh')
        expect(visuals.playerClass).toBe('campeon')
        expect(visuals.level).toBe(100)
        expect(visuals.avatarStyle).toBe('golden_frame')
        expect(visuals.nickStyle).toBe('fire_nick')
        expect(visuals.gender).toBe('h')
        expect(visuals.battleCode).toBe('BTL-9999-8888')
        expect(visuals.messageText).toBe('¡Batalla en btl-9999-8888!')
        expect(typeof visuals.time).toBe('string')
      })

      it('should fallback to raw message data and system defaults when cosmetics are absent', () => {
        const msg: ChatMessage = {
          id: 'msg-2',
          user_id: 'user-456',
          username: 'Misty',
          player_class: 'lider',
          trainer_level: 30,
          gender: 'm',
          text: 'Sin battle code'
        }

        const visuals = resolveChatMessageVisuals(msg, null)

        expect(visuals.username).toBe('Misty')
        expect(visuals.playerClass).toBe('lider')
        expect(visuals.level).toBe(30)
        expect(visuals.avatarStyle).toBeUndefined()
        expect(visuals.nickStyle).toBe('normal')
        expect(visuals.gender).toBe('m')
        expect(visuals.battleCode).toBeNull()
        expect(visuals.messageText).toBe('Sin battle code')
      })

      it('should use default values for empty message', () => {
        const msg: ChatMessage = {}

        const visuals = resolveChatMessageVisuals(msg, undefined)

        expect(visuals.username).toBe('Entrenador')
        expect(visuals.playerClass).toBe('entrenador')
        expect(visuals.level).toBe(1)
        expect(visuals.gender).toBe('h')
        expect(visuals.nickStyle).toBe('normal')
        expect(visuals.battleCode).toBeNull()
        expect(visuals.messageText).toBe('')
      })
    })
  })

  describe('socialTheaterHelper', () => {
    describe('parseReplayRow', () => {
      it('should parse database row with serialized JSON strings', () => {
        const p1Obj = {
          userId: 'user-1',
          username: 'Ash',
          tier: 'master',
          elo: 1500,
          team: []
        }
        const p2Obj = {
          userId: 'user-2',
          username: 'Gary',
          tier: 'ace',
          elo: 1400,
          team: []
        }
        const choiceStreamArr = [
          { turnNumber: 1, p1Choice: 'move 1', p2Choice: 'move 1', logLines: ['Turn 1'] }
        ]
        const initialSeedArr = [12, 34, 56, 78]

        const row = {
          id: 'replay-123',
          battle_code: 'BTL-ABCD-EFGH',
          season_id: 'season_01',
          theme_id: 'masters_allstars',
          p1_data: JSON.stringify(p1Obj),
          p2_data: JSON.stringify(p2Obj),
          choice_stream: JSON.stringify(choiceStreamArr),
          initial_seed: JSON.stringify(initialSeedArr),
          turns_count: 5,
          winner_side: 'p1',
          is_top10_archived: 1,
          views_count: 42,
          created_at: '2026-09-16T00:00:00Z'
        }

        const result = parseReplayRow(row)

        expect(result.id).toBe('replay-123')
        expect(result.battleCode).toBe('BTL-ABCD-EFGH' as BattleCode)
        expect(result.seasonId).toBe('season_01')
        expect(result.themeId).toBe('masters_allstars')
        expect(result.p1).toEqual(p1Obj)
        expect(result.p2).toEqual(p2Obj)
        expect(result.choiceStream).toEqual(choiceStreamArr)
        expect(result.initialSeed).toEqual(initialSeedArr)
        expect(result.turnsCount).toBe(5)
        expect(result.winnerSide).toBe('p1')
        expect(result.isTop10Archived).toBe(true)
        expect(result.viewsCount).toBe(42)
        expect(result.createdAt).toBe('2026-09-16T00:00:00Z')
      })

      it('should parse camelCase and object properties directly', () => {
        const p1Obj = { userId: 'u1', username: 'Red', tier: 'master', elo: 1800, team: [] }
        const p2Obj = { userId: 'u2', username: 'Blue', tier: 'master', elo: 1750, team: [] }

        const row = {
          id: 'replay-456',
          battleCode: 'BTL-XXXX-YYYY',
          seasonId: 'season_02',
          themeId: 'masters_allstars',
          p1: p1Obj,
          p2: p2Obj,
          choiceStream: [],
          initialSeed: [1, 2, 3, 4],
          turnsCount: 10,
          winnerSide: 'p2',
          isTop10Archived: false,
          viewsCount: 15,
          createdAt: '2026-09-16T12:00:00Z'
        }

        const result = parseReplayRow(row)

        expect(result.id).toBe('replay-456')
        expect(result.battleCode).toBe('BTL-XXXX-YYYY' as BattleCode)
        expect(result.winnerSide).toBe('p2')
        expect(result.turnsCount).toBe(10)
        expect(result.isTop10Archived).toBe(false)
        expect(result.viewsCount).toBe(15)
      })

      it('should fall back safely on malformed JSON and missing fields', () => {
        const row = {
          p1_data: '{invalid json',
          p2_data: null,
          choice_stream: 'not json',
          initial_seed: 'invalid seed',
          theme_id: 'non_existent_theme'
        }

        const result = parseReplayRow(row)

        expect(result.id).toBe('')
        expect(result.battleCode).toBe('' as BattleCode)
        expect(result.themeId).toBe('masters_allstars')
        expect(result.p1).toEqual({})
        expect(result.p2).toEqual({})
        expect(result.choiceStream).toEqual([])
        expect(result.initialSeed).toEqual([0, 0, 0, 0])
        expect(result.turnsCount).toBe(0)
        expect(result.winnerSide).toBe('p1')
        expect(result.isTop10Archived).toBe(false)
        expect(result.viewsCount).toBe(0)
        expect(result.createdAt).toBe('')
      })
    })
  })

  describe('socialTradesHelper', () => {
    describe('canFulfillTradeOffer', () => {
      it('returns true when no requirements are requested', () => {
        const offer = {
          id: 'trade-1',
          request_money: 0
        } as unknown as TradeOffer

        const result = canFulfillTradeOffer(offer, { money: 100 })
        expect(result.can).toBe(true)
      })

      it('validates requested pokemon presence in team or box', () => {
        const offer = {
          id: 'trade-2',
          request_money: 0,
          request_pokemon: { uid: 'p-target', name: 'Pikachu' }
        } as unknown as TradeOffer

        const failResult = canFulfillTradeOffer(offer, {
          money: 100,
          team: [{ uid: 'other' }]
        })
        expect(failResult.can).toBe(false)
        expect(failResult.reason).toContain('No tenés el Pokémon solicitado')

        const successResult = canFulfillTradeOffer(offer, {
          money: 100,
          box: [{ uid: 'p-target' }]
        })
        expect(successResult.can).toBe(true)
      })

      it('validates money requirement', () => {
        const offer = {
          id: 'trade-3',
          request_money: 500
        } as unknown as TradeOffer

        const fail = canFulfillTradeOffer(offer, { money: 200 })
        expect(fail.can).toBe(false)
        expect(fail.reason).toContain('Créditos insuficientes')

        const success = canFulfillTradeOffer(offer, { money: 500 })
        expect(success.can).toBe(true)
      })
    })

    describe('resolveTradeEmptyState', () => {
      it('returns appropriate empty state message for empty tabs', () => {
        expect(resolveTradeEmptyState('received', 0, 5, 5)?.icon).toBe('📥')
        expect(resolveTradeEmptyState('sent', 5, 0, 5)?.icon).toBe('📤')
        expect(resolveTradeEmptyState('claims', 5, 5, 0)?.icon).toBe('📦')
      })

      it('returns null when tab has items', () => {
        expect(resolveTradeEmptyState('received', 2, 0, 0)).toBeNull()
        expect(resolveTradeEmptyState('sent', 0, 2, 0)).toBeNull()
        expect(resolveTradeEmptyState('claims', 0, 0, 2)).toBeNull()
      })
    })
  })

  describe('tradeSidePanelHelper', () => {
    describe('isTradeGiftMode', () => {
      it('returns true only when isGift and isFriendSide are true', () => {
        expect(isTradeGiftMode(true, true)).toBe(true)
        expect(isTradeGiftMode(true, false)).toBe(false)
        expect(isTradeGiftMode(false, true)).toBe(false)
        expect(isTradeGiftMode(false, false)).toBe(false)
      })
    })

    describe('resolveTradePokemonButtonText', () => {
      it('returns appropriate text based on isFriendSide', () => {
        expect(resolveTradePokemonButtonText(true)).toBe('PEDIR POKÉMON')
        expect(resolveTradePokemonButtonText(false)).toBe('OFRECER POKÉMON')
      })
    })

    describe('resolveTradeCreditsLabel', () => {
      it('returns appropriate credits label based on isFriendSide', () => {
        expect(resolveTradeCreditsLabel(true)).toBe('PEDIR CRÉDITOS')
        expect(resolveTradeCreditsLabel(false)).toBe('OFRECER CRÉDITOS')
      })
    })

    describe('formatTradeMaxMoney', () => {
      it('formats maximum money with currency symbol', () => {
        expect(formatTradeMaxMoney(10000)).toBe(`MÁX: ₱${(10000).toLocaleString()}`)
        expect(formatTradeMaxMoney(0)).toBe(`MÁX: ₱${(0).toLocaleString()}`)
      })
    })

    describe('getItemQuantity', () => {
      it('returns quantity for selected item or 0 fallback', () => {
        const pId = requireItemId('antidote')
        const sId = requireItemId('airballoon')
        const inventory = { [pId]: 3 }
        expect(getItemQuantity(inventory, pId)).toBe(3)
        expect(getItemQuantity(inventory, sId)).toBe(0)
        expect(getItemQuantity(undefined, pId)).toBe(0)
      })
    })

    describe('mapInventoryItems', () => {
      it('returns empty array when inventory is undefined or empty', () => {
        expect(mapInventoryItems(undefined)).toEqual([])
        expect(mapInventoryItems({})).toEqual([])
      })

      it('filters out zero/negative quantities and maps valid items', () => {
        const pId = requireItemId('antidote')
        const sId = requireItemId('airballoon')
        const inventory = {
          [pId]: 5,
          [sId]: 0
        }
        const result = mapInventoryItems(inventory)
        expect(result).toHaveLength(1)
        expect(result[0]!.id).toBe('antidote')
        expect(result[0]!.qty).toBe(5)
        expect(result[0]!.name).toBeDefined()
      })
    })
  })
})
