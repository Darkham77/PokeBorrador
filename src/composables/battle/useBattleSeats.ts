import { ref } from 'vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { ItemId } from '@/data/inventory/items'

export interface AnimSlotState {
  animState: 'catching' | 'trapped' | 'releasing' | null;
  ballId: ItemId;
  isCaptureActive: boolean;
  isAnimatingCapture: boolean;
  isShaking: boolean;
  isBlinking: boolean;
  isHealing?: boolean;
  pokemonUid?: string | null;
}

export interface SeatState {
  entry: AnimSlotState;
  exit: AnimSlotState;
}

/**
 * Composable dedicated exclusively to managing and querying battle seats.
 * Adheres to the 4-seat architecture defined in the battle mechanics manual.
 */
export function useBattleSeats() {
  const createDefaultSlot = (): AnimSlotState => ({
    animState: null,
    ballId: 'pokeball',
    isCaptureActive: false,
    isAnimatingCapture: false,
    isShaking: false,
    isBlinking: false,
    isHealing: false,
    pokemonUid: null
  })

  const createDefaultSeat = (): SeatState => ({
    entry: createDefaultSlot(),
    exit: createDefaultSlot()
  })

  const seats = ref<{
    seat1: SeatState;
    seat2: SeatState;
    seat3: SeatState;
    seat4: SeatState;
    [key: string]: SeatState;
  }>({
    seat1: createDefaultSeat(),
    seat2: createDefaultSeat(),
    seat3: createDefaultSeat(),
    seat4: createDefaultSeat()
  })

  const resetSeats = () => {
    seats.value.seat1 = createDefaultSeat()
    seats.value.seat2 = createDefaultSeat()
    seats.value.seat3 = createDefaultSeat()
    seats.value.seat4 = createDefaultSeat()
  }

  const getSeatKey = (side: string): string => {
    if (side === 'player') return 'seat1'
    if (side === 'enemy') return 'seat2'
    if (side === 'ally') return 'seat3'
    if (side === 'enemy2') return 'seat4'
    return side
  }

  const getSeat = (side: string): SeatState => {
    const key = getSeatKey(side)
    if (!seats.value[key]) {
      seats.value[key] = createDefaultSeat()
    }
    return seats.value[key]
  }

  const getSeatProperty = <K extends keyof AnimSlotState>(
    side: string,
    pokemon: Pokemon | null | undefined,
    prop: K,
    fallback: AnimSlotState[K],
    activePlayerUid?: string | null,
    activeEnemyUid?: string | null
  ): AnimSlotState[K] => {
    if (!pokemon) return fallback
    const seat = getSeat(side)
    if (pokemon.uid && seat.entry.pokemonUid === pokemon.uid) return seat.entry[prop]
    if (pokemon.uid && seat.exit.pokemonUid === pokemon.uid) return seat.exit[prop]
    
    const isActive = side === 'player'
      ? (activePlayerUid === pokemon.uid)
      : (activeEnemyUid === pokemon.uid)
      
    const activeSlot = isActive ? seat.entry : seat.exit
    return activeSlot[prop] !== undefined ? activeSlot[prop] : fallback
  }

  return {
    seats,
    resetSeats,
    getSeatKey,
    getSeat,
    getSeatProperty
  }
}
