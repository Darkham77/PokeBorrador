import { getItemName, isItemId, type ItemId } from '@/data/inventory/items'
import { incrementRecordKey } from '@/logic/utils/mapUtils'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import { makePokemon, recalcPokemonStats } from '@/logic/pokemon/pokemonFactory'
import { isNatureId } from '@/data/battle/natures'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import { POKEMON_STAT_KEYS, type Pokemon } from '@/types/pokemon/pokemon'
import type { useGameStore } from '@/stores/game.ts'
import type { useUIStore } from '@/stores/ui.ts'
import type { PendingAward } from '@/types/system/stores.ts'

export type EventPrizeGameStore = ReturnType<typeof useGameStore>
export type EventPrizeUIStore = ReturnType<typeof useUIStore>

export function getAvailablePokemonStorageSlots(gameStore: EventPrizeGameStore): number {
  const teamOccupied = gameStore.state?.team ? gameStore.state.team.filter(p => p != null).length : 0
  const boxCount = gameStore.state?.boxCount || 4
  const boxCapacity = boxCount * 50
  const boxOccupied = gameStore.state?.box ? gameStore.state.box.filter(p => p != null).length : 0
  const totalCapacity = 6 + boxCapacity
  const totalOccupied = teamOccupied + boxOccupied
  return Math.max(0, totalCapacity - totalOccupied)
}

export function countIncomingPokemonFromPrize(rawPrize: unknown): number {
  if (!rawPrize) return 0
  let prize: Record<string, unknown> | null = null // open-record: Generic key-value data dictionary container
  if (typeof rawPrize === 'string') {
    try {
      prize = JSON.parse(rawPrize) as Record<string, unknown> // open-record: Generic key-value data dictionary container
    } catch {
      return 0
    }
  } else if (rawPrize && typeof rawPrize === 'object') {
    prize = rawPrize as Record<string, unknown> // open-record: Generic key-value data dictionary container
  }

  if (!prize) return 0
  if (prize.type === 'pokemon' || prize.species) {
    return 1
  }
  if (Array.isArray(prize.pokemonList)) {
    return prize.pokemonList.length
  }
  if (Array.isArray(prize.pokemons)) {
    return prize.pokemons.length
  }
  return 0
}

export interface StorageCapacityCheckResult {
  ok: boolean
  required: number
  available: number
  errorMsg?: string
}

export function validateStorageCapacityForAwards(
  gameStore: EventPrizeGameStore,
  awards: PendingAward[]
): StorageCapacityCheckResult {
  let totalRequired = 0
  for (const award of awards) {
    if (award.received_at !== null) continue
    totalRequired += countIncomingPokemonFromPrize(award.prize)
  }

  const available = getAvailablePokemonStorageSlots(gameStore)
  if (totalRequired > available) {
    const errorMsg = totalRequired === 1
      ? 'No tienes suficiente espacio en tu equipo o cajas para recibir al Pokémon de recompensa. ¡Libera espacio o compra más cajas antes de reclamar!'
      : `Espacio insuficiente: estas recompensas otorgan ${totalRequired} Pokémon, pero solo tienes espacio para ${available}. Libera espacio en tus cajas antes de reclamar.`
    return { ok: false, required: totalRequired, available, errorMsg }
  }

  return { ok: true, required: totalRequired, available }
}

export function grantMoneyAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>, silent = false): number {
  if (prize.type === 'money' || typeof prize.money === 'number') {
    const amount = Number(prize.amount || prize.money || 0)
    if (amount > 0) {
      gameStore.state.money = (gameStore.state.money || 0) + amount
      if (!silent) uiStore.notify(`¡Ganaste ₽${amount.toLocaleString()}!`, '💰')
      return 1
    }
  }
  return 0
}

export function grantBattleCoinsAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>, silent = false): number {
  if (prize.type === 'bc' || typeof prize.battleCoins === 'number') {
    const amount = Number(prize.amount || prize.battleCoins || 0)
    if (amount > 0) {
      gameStore.state.battleCoins = (gameStore.state.battleCoins || 0) + amount
      if (!silent) uiStore.notify(`¡Ganaste ${amount.toLocaleString()} Battle Coins!`, '🪙')
      return 1
    }
  }
  return 0
}

function grantSingleItem(
  gameStore: EventPrizeGameStore,
  uiStore: EventPrizeUIStore,
  itemId: ItemId,
  qty: number,
  silent: boolean
): void {
  if (!gameStore.state.inventory) {
    gameStore.state.inventory = {};
  }
  incrementRecordKey(gameStore.state.inventory, itemId, qty);
  const itemName = getItemName(itemId) || itemId;
  if (!silent) {
    uiStore.notify(`¡Obtuviste ${itemName}${qty > 1 ? ` x${qty}` : ''}!`, '🎒');
  }
}

function grantSingleItemEntry(
  gameStore: EventPrizeGameStore,
  uiStore: EventPrizeUIStore,
  prize: Record<string, unknown>,
  silent: boolean
): number {
  const rawItem = (prize.type === 'item' && prize.item) ? prize.item : (typeof prize.item === 'string' ? prize.item : null);
  if (!rawItem || !isItemId(rawItem)) return 0;
  const qty = Number(prize.qty || 1);
  grantSingleItem(gameStore, uiStore, rawItem, qty, silent);
  return 1;
}

function grantMultipleItemsEntry(
  gameStore: EventPrizeGameStore,
  uiStore: EventPrizeUIStore,
  prize: Record<string, unknown>,
  silent: boolean
): number {
  if (!prize.items || typeof prize.items !== 'object') return 0;
  let count = 0;
  for (const [key, qty] of Object.entries(prize.items as Record<string, number>)) { // open-record: Generic key-value data dictionary container
    if (isItemId(key) && qty && qty > 0) {
      grantSingleItem(gameStore, uiStore, key, qty, silent);
      count++;
    }
  }
  return count;
}

export function grantItemsAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>, silent = false): number {
  return grantSingleItemEntry(gameStore, uiStore, prize, silent) +
         grantMultipleItemsEntry(gameStore, uiStore, prize, silent);
}

function applyCustomIvs(poke: Pokemon, rawIvs: Record<string, number> | null): void {
  if (!rawIvs) return;
  for (const s of POKEMON_STAT_KEYS) {
    if (typeof rawIvs[s] === 'number') {
      poke.ivs[s] = rawIvs[s];
    }
  }
  recalcPokemonStats(poke);
}

function parsePokemonPrizeOptions(prize: Record<string, unknown>) {
  const rawSpecies = String(prize.species || '');
  if (!rawSpecies || !pokemonDataProvider.getPokemonData(rawSpecies)) return null;
  const speciesId = requirePokemonSpeciesId(rawSpecies);
  const level = Number(prize.level || 5);
  const isShiny = Boolean(prize.shiny);
  const nature = typeof prize.nature === 'string' && isNatureId(prize.nature) ? prize.nature : undefined;
  const rawIvs = (prize.ivs && typeof prize.ivs === 'object') ? (prize.ivs as Record<string, number>) : null; // open-record: Generic key-value data dictionary container
  const ivFloor = rawIvs ? Math.min(...Object.values(rawIvs).filter((v: number) => typeof v === 'number')) : 0;
  return { speciesId, level, isShiny, nature, rawIvs, ivFloor: Number.isFinite(ivFloor) ? ivFloor : 0 };
}

export function grantPokemonAward(gameStore: EventPrizeGameStore, uiStore: EventPrizeUIStore, prize: Record<string, unknown>, silent = false): number {
  if (prize.type !== 'pokemon' && !prize.species) return 0;
  const opts = parsePokemonPrizeOptions(prize);
  if (!opts) return 0;

  const createdPoke = makePokemon(opts.speciesId, opts.level, {
    isShiny: opts.isShiny,
    nature: opts.nature,
    ivFloor: opts.ivFloor,
    obtainedMethod: 'reward'
  });

  if (!createdPoke) return 0;

  applyCustomIvs(createdPoke, opts.rawIvs);
  gameStore.addPokemon(createdPoke, { notify: false });
  if (!silent) uiStore.notify(`¡Obtuviste a ${createdPoke.name}${opts.isShiny ? ' ✨' : ''}!`, '🎁');
  return 1;
}
