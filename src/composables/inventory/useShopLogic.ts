import { ref, computed, watch, nextTick, Ref } from 'vue'
import { gsap } from 'gsap'
import { useShopStore } from '@/stores/inventory/shop'

interface ShopItem {
  id: string
  name: string
  cat: string
  price: number
  bcPrice?: number
  desc: string
  sprite: string
  unlockLv?: number
  tier?: string
  icon?: string
  trainerShop?: boolean
  market?: boolean
  showInBCShop?: boolean
  showInNormalShop?: boolean
}

export function useShopLogic(options: {
  isBCShop: boolean
  initialCategory?: string
  show: Ref<boolean>
  cardSelector: string
}) {
  const shopStore = useShopStore()

  const activeMainTab = ref<'productos' | 'materiales'>('productos')
  const activeTab = ref(options.initialCategory || 'todos')
  const search = ref('')
  const sortKey = ref<'name' | 'price' | 'rarity'>('name')
  const sortOrder = ref<'asc' | 'desc'>('asc')

  const filteredItems = computed<ShopItem[]>(() => {
    const items = (shopStore.SHOP_ITEMS as ShopItem[]).filter(item => {
      const visibilityFlag = options.isBCShop ? item.showInBCShop : item.showInNormalShop
      if (!visibilityFlag) return false

      const resolvedCat = item.cat || 'otros'
      const isMaterialCat = ['raw_material', 'refined_material', 'component'].includes(resolvedCat)
      if (activeMainTab.value === 'materiales') {
        if (!isMaterialCat) return false
      } else {
        if (isMaterialCat) return false
      }
      if (activeTab.value !== 'todos' && resolvedCat !== activeTab.value) return false
      if (search.value && !item.name.toLowerCase().includes(search.value.toLowerCase())) return false
      return true
    })

    return [...items].sort((a, b) => {
      let comp = 0
      if (sortKey.value === 'price') {
        if (options.isBCShop) {
          const aPrice = a.bcPrice ?? a.price ?? 0
          const bPrice = b.bcPrice ?? b.price ?? 0
          comp = aPrice - bPrice
        } else {
          comp = (a.price || 0) - (b.price || 0)
        }
      } else if (sortKey.value === 'rarity') {
        const tiers: Record<string, number> = { common: 0, rare: 1, epic: 2, legend: 3 }
        const aT = tiers[a.tier || 'common'] ?? 0
        const bT = tiers[b.tier || 'common'] ?? 0
        comp = bT - aT
      } else {
        comp = a.name.localeCompare(b.name)
      }
      return sortOrder.value === 'asc' ? comp : -comp
    })
  })

  const availableCategories = computed<string[]>(() => {
    const cats = new Set<string>()
    for (const item of (shopStore.SHOP_ITEMS as ShopItem[])) {
      const visibilityFlag = options.isBCShop ? item.showInBCShop : item.showInNormalShop
      if (!visibilityFlag) continue
      cats.add(item.cat || 'otros')
    }
    return Array.from(cats)
  })

  const animateGrid = () => {
    nextTick(() => {
      const cards = document.querySelectorAll(options.cardSelector)
      if (cards.length > 0) {
        gsap.killTweensOf(cards)

        const maxAnimate = Math.min(cards.length, 24)
        const cardsToAnimate = Array.from(cards).slice(0, maxAnimate)
        const remainingCards = Array.from(cards).slice(maxAnimate)

        if (remainingCards.length > 0) {
          gsap.set(remainingCards, { opacity: 1, y: 0, scale: 1 })
        }

        gsap.fromTo(cardsToAnimate,
          { opacity: 0, y: 15, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.2,
            stagger: 0.01,
            ease: 'power1.out',
            clearProps: 'transform,scale'
          }
        )
      }
    })
  }

  watch([activeTab, search, activeMainTab], () => {
    animateGrid()
  })

  watch(() => options.show.value, (val) => {
    if (val) {
      activeTab.value = options.initialCategory || 'todos'
      search.value = ''
      animateGrid()
    }
  })

  return {
    activeMainTab,
    activeTab,
    search,
    sortKey,
    sortOrder,
    filteredItems,
    availableCategories,
    animateGrid
  }
}
