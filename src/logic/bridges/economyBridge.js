import { useTradeStore } from '@/stores/trade'
import { useShopStore } from '@/stores/shopStore'
import { useUIStore } from '@/stores/ui'
import * as marketLogic from '@/logic/market'
import * as marketUI from '@/logic/marketUI'

export function initEconomyBridge() {
  const tradeStore = useTradeStore()
  const shopStore = useShopStore()
  const uiStore = useUIStore()

  // Market Logic Bindings
  window.applyMarketFilters = marketLogic.applyMarketFilters;
  window.buyFromMarket = marketLogic.buyFromMarket;
  window.ensureMarketSoldSeenState = marketLogic.ensureMarketSoldSeenState;
  window.isMarketSoldSeen = marketLogic.isMarketSoldSeen;
  window.markMarketSoldSeen = marketLogic.markMarketSoldSeen;
  window.buildMarketSaleLabel = marketLogic.buildMarketSaleLabel;
  window.getOMFilterHTML = marketUI.getOMFilterHTML;

  // Trade Store Bindings
  window.openTradeModal = async (friendId, friendUsername) => {
    await tradeStore.openTradeModal(friendId, friendUsername)
    uiStore.isTradeOpen = true
  }

  window.openMarket = () => { uiStore.activeTab = 'market' }
  
  window.openTrainerShop = (level) => {
    uiStore.activeTab = 'market'
    shopStore.marketCategory = 'trainer'
  }

  // Realtime Subscriptions
  tradeStore.subscribeTradeNotifs()
  tradeStore.refreshPendingTrades()
  
  console.log('[EconomyBridge] Market and Trade bindings initialized.')
}
