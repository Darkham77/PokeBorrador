import { getItemName } from '@/data/inventory/items'
import { incrementRecordKey } from '@/logic/utils/mapUtils'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { makePokemon, recalcPokemonStats } from '@/logic/pokemon/pokemonFactory'
import { isNatureId } from '@/data/battle/natures'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { useGameStore } from '@/stores/game.ts'
import type { useUIStore } from '@/stores/ui.ts'

export type EventPrizeGameStore = ReturnType<typeof useGameStore>
export type EventPrizeUIStore = ReturnType<typeof useUIStore>

export function grantMoneyAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>): number {
  if (prize.type === 'money' || typeof prize.money === 'number') {
    const amount = Number(prize.amount || prize.money || 0)
    if (amount > 0) {
      gameStore.state.money = (gameStore.state.money || 0) + amount
      uiStore.notify(`¡Ganaste ₽${amount.toLocaleString()}!`, '💰')
      return 1
    }
  }
  return 0
}

export function grantBattleCoinsAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>): number {
  if (prize.type === 'bc' || typeof prize.battleCoins === 'number') {
    const amount = Number(prize.amount || prize.battleCoins || 0)
    if (amount > 0) {
      gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) + amount
      uiStore.notify(`¡Ganaste ${amount.toLocaleString()} Battle Coins!`, '🪙')
      return 1
    }
  }
  return 0
}

export function grantItemsAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>): number {
  let notified = 0
  if ((prize.type === 'item' && prize.item) || (typeof prize.item === 'string' && prize.item)) {
    const itemId = String(prize.item)
    const qty = Number(prize.qty || 1)
    if (!gameStore.state.inventory) gameStore.state.inventory = {}
    incrementRecordKey(gameStore.state.inventory, itemId, qty)
    const itemName = getItemName(itemId) || itemId
    uiStore.notify(`¡Obtuviste ${itemName}${qty > 1 ? ` x${qty}` : ''}!`, '🎒')
    notified++
  }

  if (prize.items && typeof prize.items === 'object') {
    if (!gameStore.state.inventory) gameStore.state.inventory = {}
    for (const [k, v] of Object.entries(prize.items as Record<string, number>)) { // open-record: Generic key-value data dictionary container
      if (v && v > 0) {
        incrementRecordKey(gameStore.state.inventory, k, v)
        const itemName = getItemName(k) || k
        uiStore.notify(`¡Obtuviste ${itemName}${v > 1 ? ` x${v}` : ''}!`, '🎒')
        notified++
      }
    }
  }
  return notified
}

export function grantPokemonAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>): number {
  if (prize.type === 'pokemon' || prize.species) {
    const rawSpecies = String(prize.species || '')
    if (rawSpecies && pokemonDataProvider.getPokemonData(rawSpecies)) {
      const speciesId = requirePokemonSpeciesId(rawSpecies)
      const level = Number(prize.level || 5)
      const isShiny = Boolean(prize.shiny)
      const nature = typeof prize.nature === 'string' && isNatureId(prize.nature) ? prize.nature : undefined
      const rawIvs = (prize.ivs && typeof prize.ivs === 'object') ? (prize.ivs as Record<string, number>) : null // open-record: Generic key-value data dictionary container
      const ivFloor = rawIvs ? Math.min(...Object.values(rawIvs).filter((v: number) => typeof v === 'number')) : 0

      const createdPoke = makePokemon(speciesId, level, {
        isShiny,
        nature,
        ivFloor: Number.isFinite(ivFloor) ? ivFloor : 0
      })

      if (createdPoke) {
        if (rawIvs) {
          if (typeof rawIvs.hp === 'number') createdPoke.ivs.hp = rawIvs.hp
          if (typeof rawIvs.atk === 'number') createdPoke.ivs.atk = rawIvs.atk
          if (typeof rawIvs.def === 'number') createdPoke.ivs.def = rawIvs.def
          if (typeof rawIvs.spa === 'number') createdPoke.ivs.spa = rawIvs.spa
          if (typeof rawIvs.spd === 'number') createdPoke.ivs.spd = rawIvs.spd
          if (typeof rawIvs.spe === 'number') createdPoke.ivs.spe = rawIvs.spe
          recalcPokemonStats(createdPoke)
        }
        gameStore.addPokemon(createdPoke, { notify: false })
        uiStore.notify(`¡Obtuviste a ${createdPoke.name}${isShiny ? ' ✨' : ''}!`, '🎁')
        return 1
      }
    }
  }
  return 0
}
