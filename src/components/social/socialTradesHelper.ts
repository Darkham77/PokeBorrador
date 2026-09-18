import { isItemId, getItemById } from '@/data/inventory/items'
import type { TradeOffer } from '@/types/system/stores'

export type TradeSubTab = 'received' | 'sent' | 'claims'

export interface TradeValidationContext {
  team?: readonly ({ uid?: string } | null | undefined)[]
  box?: readonly ({ uid?: string } | null | undefined)[]
  money: number
  inventory?: Readonly<Record<string, number | undefined>>
}

export interface TradeValidationResult {
  can: boolean
  reason?: string
}

export interface TradeEmptyStateConfig {
  icon: string
  message: string
}

export function canFulfillTradeOffer(
  t: TradeOffer,
  context: TradeValidationContext
): TradeValidationResult {
  if (t.request_pokemon) {
    const all = [...(context.team ?? []), ...(context.box ?? [])]
    if (!all.some(p => p && p.uid === t.request_pokemon!.uid)) {
      return { can: false, reason: `No tenés el Pokémon solicitado: ${t.request_pokemon.name}` }
    }
  }

  if (t.request_money > 0 && context.money < t.request_money) {
    return {
      can: false,
      reason: `Créditos insuficientes (tenés ₱${context.money.toLocaleString()} de ₱${t.request_money.toLocaleString()})`
    }
  }

  if (t.request_items) {
    for (const [id, qty] of Object.entries(t.request_items)) {
      if (isItemId(id) && qty !== undefined && qty > 0) {
        const owned = context.inventory?.[id] ?? 0
        if (owned < qty) {
          const item = getItemById(id)
          return { can: false, reason: `Objeto insuficiente: ${item.name} (tenés ${owned}/${qty})` }
        }
      }
    }
  }

  return { can: true }
}

export function resolveTradeEmptyState(
  subTab: TradeSubTab,
  receivedCount: number,
  sentCount: number,
  claimsCount: number
): TradeEmptyStateConfig | null {
  if (subTab === 'received' && receivedCount === 0) {
    return { icon: '📥', message: 'No tenés ofertas de intercambio recibidas.' }
  }
  if (subTab === 'sent' && sentCount === 0) {
    return { icon: '📤', message: 'No tenés ofertas de intercambio enviadas en espera.' }
  }
  if (subTab === 'claims' && claimsCount === 0) {
    return { icon: '📦', message: 'No tenés reclamos pendientes.' }
  }
  return null
}
